/**
 * Motor de simulación de eventos discretos de **un sentido** del peaje.
 *
 * Fase 1 del plan: `c(t)` en modo **programado**, es decir copiando el número
 * de casetas que el operador tuvo abiertas en cada intervalo del conteo. La
 * regla de apertura y cierre es la fase 2 y todavía no está aquí.
 *
 * Modelo (contexto, sección 2): cola única FIFO atendida por `c(t)` casetas
 * idénticas, servicio gamma, llegadas Poisson por tramos de 5 min.
 *
 * JS puro: no importa React, ni DOM, ni Three.js. Toda la aleatoriedad sale del
 * PRNG con semilla; no se usa `Math.random`.
 */

import { crearPrng } from './prng.js';
import { exponencial, gamma, uniformeEnRango } from './aleatorios.js';
import { crearColaEventos, TIPO_EVENTO } from './colaEventos.js';

/** Estados de una caseta. */
const CASETA = { ABIERTA: 'abierta', CERRADA: 'cerrada' };

/**
 * @typedef {object} ConfiguracionSentido
 * @property {number} semilla
 * @property {number[]} llegadas veh por intervalo, tal como se contaron
 * @property {number[]} casetasProgramadas casetas abiertas por intervalo
 * @property {number} [colaInicial=0] vehículos esperando en t = 0
 * @property {number} [casetasIniciales] casetas abiertas en t = 0; por defecto
 *   las del primer intervalo programado
 * @property {number} [factorEscalaDemanda=1]
 * @property {number} duracionIntervaloSegundos
 * @property {number} gammaForma
 * @property {number} gammaEscalaSegundos
 * @property {number} maximoTolerableWqSegundos umbral del % de intervalos
 * @property {number} [maximoCasetas] tope de casetas del sentido
 * @property {boolean} [guardarEsperas=false] devolver la espera de cada vehículo
 */

/**
 * Corre una réplica de un sentido.
 *
 * @param {ConfiguracionSentido} config
 * @returns {object} medidas de la réplica
 */
export function simularSentido(config) {
  const {
    semilla,
    llegadas,
    casetasProgramadas,
    colaInicial = 0,
    factorEscalaDemanda = 1,
    duracionIntervaloSegundos,
    gammaForma,
    gammaEscalaSegundos,
    maximoTolerableWqSegundos,
    guardarEsperas = false,
  } = config;

  validar(config);

  const intervalos = llegadas.length;
  const horizonte = intervalos * duracionIntervaloSegundos;
  const casetasIniciales = config.casetasIniciales ?? casetasProgramadas[0];
  const maximoCasetas = config.maximoCasetas ?? Math.max(...casetasProgramadas, casetasIniciales);

  const prng = crearPrng(semilla);
  const eventos = crearColaEventos();

  // Tasas de llegada por intervalo, en veh/s.
  const tasas = llegadas.map((n) => (n * factorEscalaDemanda) / duracionIntervaloSegundos);

  // ------------------------------------------------------------- estado ---
  let reloj = 0;
  /** @type {{id: number, instanteLlegada: number, intervaloLlegada: number}[]} */
  const cola = [];
  let cabeza = 0; // índice del primer vehículo en espera: FIFO sin desplazar el arreglo

  const casetas = Array.from({ length: maximoCasetas }, (_, i) => ({
    id: i,
    estado: CASETA.CERRADA,
    marcadaParaCerrar: false,
    vehiculo: null,
  }));

  let siguienteIdVehiculo = 0;
  let llegadasSimuladas = 0;
  let salidasEnHorizonte = 0;
  let atendidosTotal = 0;
  let colaMaximaContinua = 0;

  const esperas = [];
  const esperasPorIntervalo = Array.from({ length: intervalos }, () => []);
  const colaMuestreada = Array.from({ length: intervalos }, () => null);

  // Integral de c(t) para los carriles-intervalo, y último instante integrado.
  let integralCasetasAbiertas = 0;
  let ultimoInstanteIntegrado = 0;

  // ------------------------------------------------------------ funciones ---

  const enEspera = () => cola.length - cabeza;

  const indiceIntervalo = (t) =>
    Math.min(Math.floor(t / duracionIntervaloSegundos), intervalos - 1);

  const finDeIntervalo = (i) => (i + 1) * duracionIntervaloSegundos;

  /** Casetas físicamente abiertas, incluidas las marcadas que siguen atendiendo. */
  const casetasAbiertas = () => casetas.filter((c) => c.estado === CASETA.ABIERTA).length;

  /** Casetas que pueden tomar un vehículo nuevo. */
  const casetasDisponibles = () =>
    casetas.filter((c) => c.estado === CASETA.ABIERTA && !c.marcadaParaCerrar && !c.vehiculo);

  /** Acumula ∫c(t)dt hasta `t`, acotado al horizonte. */
  function integrarHasta(t) {
    const hasta = Math.min(t, horizonte);
    if (hasta > ultimoInstanteIntegrado) {
      integralCasetasAbiertas += casetasAbiertas() * (hasta - ultimoInstanteIntegrado);
      ultimoInstanteIntegrado = hasta;
    }
  }

  /**
   * Siguiente llegada a partir de `tDesde`, con la tasa del intervalo en curso.
   * Si el candidato cae después del cambio de intervalo se descarta y se vuelve
   * a generar desde el cambio, con la tasa nueva (contexto, sección 3).
   * Devuelve `null` si ya no hay más llegadas dentro del horizonte.
   */
  function proximaLlegada(tDesde) {
    let t = tDesde;
    for (;;) {
      if (t >= horizonte) return null;
      const i = indiceIntervalo(t);
      const fin = finDeIntervalo(i);
      const tasa = tasas[i];
      if (tasa <= 0) {
        t = fin;
        continue;
      }
      const candidato = t + exponencial(prng, tasa);
      if (candidato < fin) return candidato;
      t = fin; // se regenera con la tasa del intervalo siguiente
    }
  }

  /** Ajusta el número de casetas abiertas al valor programado `objetivo`. */
  function ajustarCasetas(objetivo) {
    // Primero desmarcar las que estaban en vías de cerrar: si hace falta
    // capacidad, retener una caseta ya abierta cuesta menos que abrir otra.
    let disponibles = casetas.filter(
      (c) => c.estado === CASETA.ABIERTA && !c.marcadaParaCerrar,
    ).length;

    if (disponibles < objetivo) {
      for (const c of casetas) {
        if (disponibles >= objetivo) break;
        if (c.estado === CASETA.ABIERTA && c.marcadaParaCerrar) {
          c.marcadaParaCerrar = false;
          disponibles += 1;
        }
      }
    }

    while (disponibles < objetivo) {
      const cerrada = casetas.find((c) => c.estado === CASETA.CERRADA);
      if (!cerrada) break; // tope de casetas del sentido
      cerrada.estado = CASETA.ABIERTA;
      cerrada.marcadaParaCerrar = false;
      disponibles += 1;
    }

    // Para cerrar: primero las que están libres (cierran ya), después las
    // ocupadas, que se marcan y cerrarán al terminar su servicio. Una caseta
    // marcada NUNCA interrumpe el servicio en curso (DEC-007).
    let sobran = disponibles - objetivo;
    if (sobran > 0) {
      for (const c of casetas) {
        if (sobran <= 0) break;
        if (c.estado === CASETA.ABIERTA && !c.marcadaParaCerrar && !c.vehiculo) {
          c.estado = CASETA.CERRADA;
          sobran -= 1;
        }
      }
      for (const c of casetas) {
        if (sobran <= 0) break;
        if (c.estado === CASETA.ABIERTA && !c.marcadaParaCerrar && c.vehiculo) {
          c.marcadaParaCerrar = true;
          sobran -= 1;
        }
      }
    }
  }

  /** Pasa vehículos de la cola a las casetas libres mientras haya de los dos. */
  function despachar() {
    for (;;) {
      if (enEspera() === 0) break;
      const libres = casetasDisponibles();
      if (libres.length === 0) break;

      const caseta = libres[0];
      const vehiculo = cola[cabeza];
      cabeza += 1;

      const espera = reloj - vehiculo.instanteLlegada;
      esperas.push(espera);
      esperasPorIntervalo[vehiculo.intervaloLlegada].push(espera);

      caseta.vehiculo = vehiculo;
      const duracion = gamma(prng, gammaForma, gammaEscalaSegundos);
      eventos.programar(reloj + duracion, TIPO_EVENTO.FIN_SERVICIO, { casetaId: caseta.id });
    }
  }

  function encolar(instanteLlegada) {
    cola.push({
      id: siguienteIdVehiculo++,
      instanteLlegada,
      intervaloLlegada: indiceIntervalo(instanteLlegada),
    });
    if (instanteLlegada <= horizonte) {
      colaMaximaContinua = Math.max(colaMaximaContinua, enEspera());
    }
  }

  // ------------------------------------------------------- inicialización ---

  ajustarCasetas(casetasIniciales);

  // Cola inicial: vehículos con llegada en t = 0 (DEC-018, PEN-003).
  for (let i = 0; i < colaInicial; i += 1) encolar(0);

  for (let i = 1; i < intervalos; i += 1) {
    eventos.programar(i * duracionIntervaloSegundos, TIPO_EVENTO.CAMBIO_INTERVALO, {
      intervalo: i,
    });
  }

  // Un muestreo de cola por intervalo, en un instante aleatorio dentro de él
  // (contexto, sección 6). Se sortean todos al inicio para que el consumo del
  // PRNG no dependa de cuántos eventos ocurran en la réplica.
  for (let i = 0; i < intervalos; i += 1) {
    const inicio = i * duracionIntervaloSegundos;
    eventos.programar(
      uniformeEnRango(prng, inicio, inicio + duracionIntervaloSegundos),
      TIPO_EVENTO.MUESTREO_COLA,
      { intervalo: i },
    );
  }

  const primera = proximaLlegada(0);
  if (primera !== null) eventos.programar(primera, TIPO_EVENTO.LLEGADA, {});

  despachar();

  // ------------------------------------------------------------ bucle ---
  // Las llegadas se cortan en el horizonte, pero la simulación sigue hasta
  // atender a todos los que ya llegaron, para no perder su espera (DEC-019).

  for (;;) {
    const evento = eventos.sacar();
    if (!evento) break;

    integrarHasta(evento.instante);
    reloj = evento.instante;

    switch (evento.tipo) {
      case TIPO_EVENTO.FIN_SERVICIO: {
        const caseta = casetas[evento.datos.casetaId];
        caseta.vehiculo = null;
        atendidosTotal += 1;
        if (reloj <= horizonte) salidasEnHorizonte += 1;
        if (caseta.marcadaParaCerrar) {
          caseta.estado = CASETA.CERRADA;
          caseta.marcadaParaCerrar = false;
        }
        despachar();
        break;
      }

      case TIPO_EVENTO.CAMBIO_INTERVALO: {
        ajustarCasetas(casetasProgramadas[evento.datos.intervalo]);
        despachar();
        break;
      }

      case TIPO_EVENTO.LLEGADA: {
        llegadasSimuladas += 1;
        encolar(reloj);
        despachar();
        const siguiente = proximaLlegada(reloj);
        if (siguiente !== null) eventos.programar(siguiente, TIPO_EVENTO.LLEGADA, {});
        break;
      }

      case TIPO_EVENTO.MUESTREO_COLA: {
        colaMuestreada[evento.datos.intervalo] = enEspera();
        break;
      }

      default:
        throw new Error(`Tipo de evento no manejado: ${evento.tipo}`);
    }
  }

  integrarHasta(horizonte);

  // ---------------------------------------------------------- medidas ---

  const media = (xs) => (xs.length === 0 ? null : xs.reduce((a, b) => a + b, 0) / xs.length);

  const wqPorIntervaloSegundos = esperasPorIntervalo.map(media);

  const intervalosConDato = wqPorIntervaloSegundos.filter((w) => w !== null);
  const intervalosSobreUmbral = intervalosConDato.filter((w) => w > maximoTolerableWqSegundos);

  const esperasSinColaInicial = esperas.slice(colaInicial);

  return {
    semilla,

    /** Llegadas generadas dentro del horizonte (comparable con el conteo). */
    llegadasSimuladas,
    /** Caudal: vehículos cuyo servicio terminó dentro del horizonte (PEN-005). */
    caudalEnHorizonte: salidasEnHorizonte,
    atendidosTotal,

    /** Espera en cola (llegada → inicio de servicio), en segundos. */
    wqHoraSegundos: media(esperas),
    /** Igual, pero sin los vehículos de la cola inicial (PEN-003). */
    wqHoraSinColaInicialSegundos: media(esperasSinColaInicial),
    wqPorIntervaloSegundos,

    /** Cola máxima continua de la hora. */
    colaMaximaContinua,
    /** Lectura puntual de cola, una por intervalo, en instante aleatorio. */
    colaMuestreada,
    /** Máximo de las 12 lecturas puntuales: lo comparable con lo observado (PEN-004). */
    colaMaximaMuestreada: Math.max(...colaMuestreada.map((c) => c ?? 0)),
    colaFinal: enEspera(),

    /** Fracción de intervalos con Wq por encima del máximo tolerable. */
    fraccionIntervalosSobreUmbral:
      intervalosConDato.length === 0 ? null : intervalosSobreUmbral.length / intervalosConDato.length,
    intervalosSobreUmbral: intervalosSobreUmbral.length,
    intervalosConDato: intervalosConDato.length,

    /** Carriles-intervalo: ∫c(t)dt ÷ duración del intervalo (contexto, sección 6). */
    carrilesIntervalo: integralCasetasAbiertas / duracionIntervaloSegundos,

    /** Instante en que se atendió al último vehículo. */
    instanteFinal: reloj,
    numerosAleatoriosUsados: prng.cuenta(),

    ...(guardarEsperas ? { esperas, vehiculos: cola } : {}),
  };
}

function validar(config) {
  const { llegadas, casetasProgramadas, duracionIntervaloSegundos } = config;

  if (!Array.isArray(llegadas) || llegadas.length === 0) {
    throw new TypeError('`llegadas` debe ser un arreglo no vacío de veh/intervalo.');
  }
  if (!Array.isArray(casetasProgramadas) || casetasProgramadas.length !== llegadas.length) {
    throw new TypeError(
      `\`casetasProgramadas\` debe tener ${llegadas.length} posiciones, una por intervalo.`,
    );
  }
  if (casetasProgramadas.some((c) => !Number.isInteger(c) || c < 0)) {
    throw new RangeError('`casetasProgramadas` debe traer enteros no negativos.');
  }
  if (!(duracionIntervaloSegundos > 0)) {
    throw new RangeError('`duracionIntervaloSegundos` debe ser positivo.');
  }
}
