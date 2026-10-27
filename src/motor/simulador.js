/**
 * Motor de simulación de eventos discretos de **un sentido** del peaje.
 *
 * Modelo (contexto, sección 2): cola única FIFO atendida por `c(t)` casetas
 * idénticas, servicio gamma, llegadas Poisson por tramos de 5 min.
 *
 * Dos modos de control de `c(t)` (contexto, sección 4):
 *
 * - `'programado'` (fase 1): copia el número de casetas que el operador tuvo
 *   abiertas en cada intervalo del conteo. Sirve para validar.
 * - `'regla'` (fase 2): aplica la regla de apertura y cierre por cola, evaluada
 *   tras cada llegada y cada fin de servicio.
 *
 * El reparto de casetas entre los dos sentidos es la fase 3 y no está aquí: este
 * motor simula un sentido con su propio tope de casetas.
 *
 * JS puro: no importa React, ni DOM, ni Three.js. Toda la aleatoriedad sale del
 * PRNG con semilla; no se usa `Math.random`.
 */

import { crearPrng } from './prng.js';
import { exponencial, gamma, uniformeEnRango } from './aleatorios.js';
import { crearColaEventos, TIPO_EVENTO } from './colaEventos.js';

/** Estados de una caseta. */
const CASETA = { ABIERTA: 'abierta', CERRADA: 'cerrada' };

export const MODO_CASETAS = { PROGRAMADO: 'programado', REGLA: 'regla' };

/**
 * @typedef {object} ConfiguracionRegla
 * @property {Record<number, number|null>} abrirSiColaMayorQue por casetas abiertas
 * @property {Record<number, number|null>} cerrarSiColaMenorQue por casetas abiertas
 * @property {number} demoraAperturaSegundos
 * @property {number} ventanaCierreSegundos la cola debe estar bajo el umbral
 *   este tiempo seguido antes de cerrar
 * @property {number} maximoCasetas
 * @property {number} minimoCasetas
 */

/**
 * @typedef {object} ConfiguracionSentido
 * @property {number} semilla
 * @property {number[]} llegadas veh por intervalo, tal como se contaron
 * @property {number[]} casetasProgramadas casetas abiertas por intervalo; en
 *   modo `'regla'` solo se usa su primera posición, como casetas iniciales
 * @property {'programado'|'regla'} [modoCasetas='programado']
 * @property {ConfiguracionRegla} [regla] obligatoria en modo `'regla'`
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
    modoCasetas = MODO_CASETAS.PROGRAMADO,
    regla = null,
    colaInicial = 0,
    factorEscalaDemanda = 1,
    duracionIntervaloSegundos,
    gammaForma,
    gammaEscalaSegundos,
    maximoTolerableWqSegundos,
    guardarEsperas = false,
  } = config;

  validar(config);

  const porRegla = modoCasetas === MODO_CASETAS.REGLA;
  const intervalos = llegadas.length;
  const horizonte = intervalos * duracionIntervaloSegundos;
  const casetasIniciales = config.casetasIniciales ?? casetasProgramadas[0];

  // En modo regla el tope lo pone la regla; en modo programado, el conteo.
  const maximoCasetas = porRegla
    ? (config.maximoCasetas ?? regla.maximoCasetas)
    : (config.maximoCasetas ?? Math.max(...casetasProgramadas, casetasIniciales));
  const minimoCasetas = porRegla ? regla.minimoCasetas : 0;

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
  /** Tiempo acumulado con exactamente i casetas abiertas, en segundos. */
  const tiempoPorCasetasAbiertas = new Array(maximoCasetas + 1).fill(0);

  // ------------------------------------------------- estado de la regla ---
  /** Instante en que abrirá la caseta ordenada, o `null` si no hay ninguna. */
  let aperturaPendiente = null;
  /**
   * Instante desde el que la cola está continuamente bajo el umbral de cierre,
   * o `null` si no lo está. Se reinicia si la cola sube o si cambia `c`.
   */
  let desdeCuandoBajoUmbral = null;

  let aperturas = 0;
  let cierres = 0;
  let cierresCancelados = 0;
  /**
   * Las casetas que se abren en `t = 0` son el punto de partida, no un cambio.
   * El conteo arranca después de la inicialización, y cuenta igual en los dos
   * modos para que el operador y la regla sean comparables (DEC-026).
   */
  let contandoCambios = false;

  // ------------------------------------------------------------ funciones ---

  const enEspera = () => cola.length - cabeza;

  const indiceIntervalo = (t) =>
    Math.min(Math.floor(t / duracionIntervaloSegundos), intervalos - 1);

  const finDeIntervalo = (i) => (i + 1) * duracionIntervaloSegundos;

  /** Casetas físicamente abiertas, incluidas las marcadas que siguen atendiendo. */
  const casetasAbiertas = () => casetas.filter((c) => c.estado === CASETA.ABIERTA).length;

  /**
   * Casetas que van a atender vehículos nuevos: abiertas y no marcadas para
   * cerrar. Es la `c` con la que la regla mira sus umbrales (DEC-026).
   */
  const casetasEfectivas = () =>
    casetas.filter((c) => c.estado === CASETA.ABIERTA && !c.marcadaParaCerrar).length;

  /** Casetas que pueden tomar un vehículo ahora mismo. */
  const casetasDisponibles = () =>
    casetas.filter((c) => c.estado === CASETA.ABIERTA && !c.marcadaParaCerrar && !c.vehiculo);

  /** Acumula ∫c(t)dt y el tiempo por nivel de `c` hasta `t`, acotado al horizonte. */
  function integrarHasta(t) {
    const hasta = Math.min(t, horizonte);
    if (hasta > ultimoInstanteIntegrado) {
      const abiertas = casetasAbiertas();
      const lapso = hasta - ultimoInstanteIntegrado;
      integralCasetasAbiertas += abiertas * lapso;
      tiempoPorCasetasAbiertas[abiertas] += lapso;
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

  /** Abre una caseta cerrada. Devuelve `true` si había alguna que abrir. */
  function abrirUna() {
    const cerrada = casetas.find((c) => c.estado === CASETA.CERRADA);
    if (!cerrada) return false;
    cerrada.estado = CASETA.ABIERTA;
    cerrada.marcadaParaCerrar = false;
    if (contandoCambios) aperturas += 1;
    return true;
  }

  /**
   * Marca una caseta para cerrar. Si está libre cierra en el acto; si está
   * atendiendo, se cierra al terminar su servicio: **nunca se interrumpe una
   * atención en curso** (DEC-007).
   *
   * Prefiere una caseta libre, que no hace esperar al recurso (DEC-026).
   *
   * @returns {'cerrada'|'marcada'|null}
   */
  function cerrarUna() {
    const libre = casetas.find(
      (c) => c.estado === CASETA.ABIERTA && !c.marcadaParaCerrar && !c.vehiculo,
    );
    if (libre) {
      libre.estado = CASETA.CERRADA;
      if (contandoCambios) cierres += 1;
      return 'cerrada';
    }
    const ocupada = casetas.find(
      (c) => c.estado === CASETA.ABIERTA && !c.marcadaParaCerrar && c.vehiculo,
    );
    if (ocupada) {
      ocupada.marcadaParaCerrar = true;
      return 'marcada';
    }
    return null;
  }

  /** Ajusta el número de casetas abiertas al valor programado `objetivo`. */
  function ajustarCasetas(objetivo) {
    // Primero desmarcar las que estaban en vías de cerrar: si hace falta
    // capacidad, retener una caseta ya abierta cuesta menos que abrir otra.
    let disponibles = casetasEfectivas();

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
      if (!abrirUna()) break; // tope de casetas del sentido
      disponibles += 1;
    }

    // Para cerrar: primero las libres (cierran ya), después las ocupadas, que
    // se marcan y cerrarán al terminar su servicio.
    let sobran = disponibles - objetivo;
    while (sobran > 0) {
      if (cerrarUna() === null) break;
      sobran -= 1;
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

  // -------------------------------------------------------------- regla ---

  /**
   * Pone al día la ventana de cierre: arranca el conteo si la cola está bajo el
   * umbral y lo reinicia si no.
   */
  function actualizarVentanaCierre() {
    const c = casetasEfectivas();
    const umbral = regla.cerrarSiColaMenorQue[c];
    if (umbral === null || umbral === undefined || c <= minimoCasetas) {
      desdeCuandoBajoUmbral = null;
      return;
    }
    if (enEspera() < umbral) {
      if (desdeCuandoBajoUmbral === null) desdeCuandoBajoUmbral = reloj;
    } else {
      desdeCuandoBajoUmbral = null;
    }
  }

  /**
   * ¿Hay que abrir? Si sí, ordena la apertura para `t + demora` y devuelve
   * `true`. La orden no se revoca: al llegar la hora la caseta abre aunque la
   * cola ya haya bajado.
   */
  function intentarAbrir() {
    const c = casetasEfectivas();
    const umbral = regla.abrirSiColaMayorQue[c];
    if (umbral === null || umbral === undefined) return false; // ya está en el tope
    if (c >= maximoCasetas) return false;
    if (enEspera() <= umbral) return false;

    // Si hay una caseta marcada para cerrar, cancelar ese cierre da capacidad
    // en el acto y gratis: es preferible a ordenar una apertura con demora
    // (DEC-026).
    const marcada = casetas.find((c2) => c2.estado === CASETA.ABIERTA && c2.marcadaParaCerrar);
    if (marcada) {
      marcada.marcadaParaCerrar = false;
      cierresCancelados += 1;
      desdeCuandoBajoUmbral = null; // cambió c efectiva: el conteo arranca de nuevo
      despachar();
      return true;
    }

    if (aperturaPendiente !== null) return false; // una sola apertura pendiente

    aperturaPendiente = reloj + regla.demoraAperturaSegundos;
    eventos.programar(aperturaPendiente, TIPO_EVENTO.APERTURA_CASETA, {});
    return true;
  }

  /**
   * ¿Hay que cerrar? Exige que la cola haya estado bajo el umbral
   * `ventanaCierreSegundos` seguidos. Tras cerrar, el conteo arranca de nuevo.
   */
  function intentarCerrar() {
    const c = casetasEfectivas();
    if (c <= minimoCasetas) return false;
    const umbral = regla.cerrarSiColaMenorQue[c];
    if (umbral === null || umbral === undefined) return false;
    if (enEspera() >= umbral) return false;
    if (desdeCuandoBajoUmbral === null) return false;
    if (reloj - desdeCuandoBajoUmbral < regla.ventanaCierreSegundos) return false;

    if (cerrarUna() === null) return false;
    desdeCuandoBajoUmbral = null; // tras cerrar una, el conteo empieza de nuevo
    return true;
  }

  /**
   * Evalúa la regla. Se llama tras cada llegada y cada fin de servicio
   * (contexto, sección 4). Abrir tiene prioridad sobre cerrar: la congestión
   * urge y los umbrales no se solapan, así que nunca se cumplen las dos.
   */
  function evaluarRegla() {
    if (!porRegla) return;
    actualizarVentanaCierre();
    if (intentarAbrir()) return;
    intentarCerrar();
  }

  // ------------------------------------------------------- inicialización ---

  ajustarCasetas(casetasIniciales);
  contandoCambios = true;

  // Cola inicial: vehículos con llegada en t = 0 (DEC-018, PEN-003).
  for (let i = 0; i < colaInicial; i += 1) encolar(0);

  if (!porRegla) {
    for (let i = 1; i < intervalos; i += 1) {
      eventos.programar(i * duracionIntervaloSegundos, TIPO_EVENTO.CAMBIO_INTERVALO, {
        intervalo: i,
      });
    }
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
  evaluarRegla();

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
          if (contandoCambios) cierres += 1;
          desdeCuandoBajoUmbral = null; // cambió c: el conteo arranca de nuevo
        }
        despachar();
        evaluarRegla();
        break;
      }

      case TIPO_EVENTO.CAMBIO_INTERVALO: {
        ajustarCasetas(casetasProgramadas[evento.datos.intervalo]);
        despachar();
        break;
      }

      case TIPO_EVENTO.APERTURA_CASETA: {
        // La orden ya se dio: la caseta abre aunque la cola haya bajado.
        aperturaPendiente = null;
        if (abrirUna()) {
          desdeCuandoBajoUmbral = null; // cambió c: el conteo arranca de nuevo
        }
        despachar();
        break;
      }

      case TIPO_EVENTO.LLEGADA: {
        llegadasSimuladas += 1;
        encolar(reloj);
        despachar();
        const siguiente = proximaLlegada(reloj);
        if (siguiente !== null) eventos.programar(siguiente, TIPO_EVENTO.LLEGADA, {});
        evaluarRegla();
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
    modoCasetas,

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
    /** Máximo de las 12 lecturas puntuales (PEN-004, DEC-024). */
    colaMaximaMuestreada: Math.max(...colaMuestreada.map((c) => c ?? 0)),
    colaFinal: enEspera(),

    /** Fracción de intervalos con Wq por encima del máximo tolerable. */
    fraccionIntervalosSobreUmbral:
      intervalosConDato.length === 0 ? null : intervalosSobreUmbral.length / intervalosConDato.length,
    intervalosSobreUmbral: intervalosSobreUmbral.length,
    intervalosConDato: intervalosConDato.length,

    /** Carriles-intervalo: ∫c(t)dt ÷ duración del intervalo (contexto, sección 6). */
    carrilesIntervalo: integralCasetasAbiertas / duracionIntervaloSegundos,

    // ------------------------------------------------ actividad de la regla ---
    /** Casetas abiertas después del arranque (por la regla o por el programa). */
    aperturas,
    /** Casetas cerradas después del arranque (por la regla o por el programa). */
    cierres,
    /** Cierres cancelados por un repunte de la cola antes de consumarse. */
    cierresCancelados,
    /** Veces que cambió el número de casetas abiertas. */
    cambiosDeC: aperturas + cierres,
    /** Segundos con exactamente i casetas abiertas, indexado por i. */
    tiempoPorCasetasAbiertas: [...tiempoPorCasetasAbiertas],
    /** Segundos con el máximo de casetas abiertas. */
    tiempoEnMaximoCasetas: tiempoPorCasetasAbiertas[maximoCasetas] ?? 0,

    /** Instante en que se atendió al último vehículo. */
    instanteFinal: reloj,
    numerosAleatoriosUsados: prng.cuenta(),

    ...(guardarEsperas ? { esperas, vehiculos: cola } : {}),
  };
}

function validar(config) {
  const {
    llegadas,
    casetasProgramadas,
    duracionIntervaloSegundos,
    modoCasetas = MODO_CASETAS.PROGRAMADO,
    regla,
  } = config;

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

  if (modoCasetas !== MODO_CASETAS.PROGRAMADO && modoCasetas !== MODO_CASETAS.REGLA) {
    throw new TypeError(
      `\`modoCasetas\` debe ser '${MODO_CASETAS.PROGRAMADO}' o '${MODO_CASETAS.REGLA}', llegó: ${modoCasetas}`,
    );
  }

  if (modoCasetas === MODO_CASETAS.REGLA) {
    if (!regla) throw new TypeError("El modo 'regla' necesita la configuración `regla`.");
    for (const campo of [
      'abrirSiColaMayorQue',
      'cerrarSiColaMenorQue',
      'demoraAperturaSegundos',
      'ventanaCierreSegundos',
      'maximoCasetas',
      'minimoCasetas',
    ]) {
      if (regla[campo] === undefined) {
        throw new TypeError(`Falta \`regla.${campo}\`.`);
      }
    }
    if (!(regla.minimoCasetas >= 1)) {
      throw new RangeError('`regla.minimoCasetas` debe ser al menos 1.');
    }
    if (!(regla.maximoCasetas >= regla.minimoCasetas)) {
      throw new RangeError('`regla.maximoCasetas` debe ser mayor o igual que el mínimo.');
    }
    if (!(regla.demoraAperturaSegundos >= 0)) {
      throw new RangeError('`regla.demoraAperturaSegundos` no puede ser negativa.');
    }
    if (!(regla.ventanaCierreSegundos >= 0)) {
      throw new RangeError('`regla.ventanaCierreSegundos` no puede ser negativa.');
    }
  }
}
