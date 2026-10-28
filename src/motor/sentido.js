/**
 * Lógica de **un sentido** del peaje: cola única FIFO, servicio gamma, llegadas
 * Poisson por tramos y control de `c(t)` programado o por regla.
 *
 * Este módulo no corre nada por su cuenta: no tiene reloj ni bucle de eventos.
 * Lo usan los dos motores, que son los que ponen el reloj y el calendario:
 *
 * - `simularSentido` (fase 1 y 2) crea **un** sentido con un pozo de su tamaño.
 * - `simularPeaje` (fase 3) crea **dos** sentidos sobre un pozo común de 6 y un
 *   solo reloj, con un árbitro que reparte las casetas.
 *
 * Así la regla de la fase 2 es la misma en los dos casos, sin copiarla.
 *
 * JS puro: no importa React, ni DOM, ni Three.js. Toda la aleatoriedad sale del
 * PRNG con semilla que le inyecta quien lo crea.
 */

import { exponencial, gamma, uniformeEnRango } from './aleatorios.js';
import { TIPO_EVENTO } from './colaEventos.js';

export const MODO_CASETAS = { PROGRAMADO: 'programado', REGLA: 'regla' };

/**
 * @typedef {object} ConfiguracionSentido
 * @property {string|number} id identificador del sentido dentro del pozo
 * @property {string} [etiqueta] nombre legible
 * @property {number[]} llegadas veh por intervalo, tal como se contaron
 * @property {number[]} casetasProgramadas casetas abiertas por intervalo; en
 *   modo `'regla'` solo se usa su primera posición, como casetas iniciales
 * @property {'programado'|'regla'} [modoCasetas='programado']
 * @property {object} [regla] obligatoria en modo `'regla'`
 * @property {number} [colaInicial=0]
 * @property {number} [casetasIniciales]
 * @property {number} [factorEscalaDemanda=1]
 * @property {number} duracionIntervaloSegundos
 * @property {number} gammaForma
 * @property {number} gammaEscalaSegundos
 * @property {number} maximoTolerableWqSegundos
 * @property {number} [maximoCasetas]
 * @property {boolean} [guardarEsperas=false]
 */

/**
 * Crea el estado y los manejadores de un sentido.
 *
 * @param {object} args
 * @param {ConfiguracionSentido} args.config
 * @param {{siguiente: () => number, cuenta: () => number}} args.prng flujo
 *   propio del sentido: lo que pase en el otro no debe alterar sus números
 * @param {object} args.eventos calendario compartido
 * @param {{ahora: number}} args.reloj reloj compartido, por referencia
 * @param {object} args.pozo pozo de casetas compartido
 * @param {object} args.arbitro quien reparte las casetas; ver `simularPeaje`
 */
export function crearSentido({ config, prng, eventos, reloj, pozo, arbitro }) {
  const {
    id,
    etiqueta = String(id),
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

  const porRegla = modoCasetas === MODO_CASETAS.REGLA;
  const intervalos = llegadas.length;
  const horizonte = intervalos * duracionIntervaloSegundos;
  const casetasIniciales = config.casetasIniciales ?? casetasProgramadas[0];

  const maximoCasetas = porRegla
    ? (config.maximoCasetas ?? regla.maximoCasetas)
    : (config.maximoCasetas ?? Math.max(...casetasProgramadas, casetasIniciales));
  const minimoCasetas = porRegla ? regla.minimoCasetas : 0;

  // Tasas de llegada por intervalo, en veh/s.
  const tasas = llegadas.map((n) => (n * factorEscalaDemanda) / duracionIntervaloSegundos);

  // ------------------------------------------------------------- estado ---
  /** @type {{id: number, instanteLlegada: number, intervaloLlegada: number}[]} */
  const cola = [];
  let cabeza = 0; // índice del primer vehículo en espera: FIFO sin desplazar el arreglo

  let siguienteIdVehiculo = 0;
  let llegadasSimuladas = 0;
  let salidasEnHorizonte = 0;
  let atendidosTotal = 0;
  let colaMaximaContinua = 0;

  const esperas = [];
  const esperasPorIntervalo = Array.from({ length: intervalos }, () => []);
  const colaMuestreada = Array.from({ length: intervalos }, () => null);

  let integralCasetasAbiertas = 0;
  let ultimoInstanteIntegrado = 0;
  const tiempoPorCasetasAbiertas = new Array(maximoCasetas + 1).fill(0);

  // ------------------------------------------------- estado de la regla ---
  /** Instante en que abrirá la caseta ya reservada, o `null`. */
  let aperturaPendiente = null;
  /** Caseta reservada que está cumpliendo la demora, o `null`. */
  let casetaReservada = null;
  /** Instante desde el que hay una petición sin atender por falta de casetas. */
  let bloqueadaDesde = null;
  /**
   * Instante desde el que la cola está continuamente bajo el umbral de cierre,
   * o `null`. Se reinicia si la cola sube o si cambia `c`.
   */
  let desdeCuandoBajoUmbral = null;

  let aperturas = 0;
  let cierres = 0;
  let cierresCancelados = 0;
  let peticionesBloqueadas = 0;
  let segundosBloqueados = 0;
  let reasignacionesRecibidas = 0;
  let reasignacionesCedidas = 0;
  let contandoCambios = false;

  /** Instantes de llegada dentro de la ventana móvil de ρ. */
  const llegadasRecientes = [];

  // ------------------------------------------------------------ consultas ---

  const enEspera = () => cola.length - cabeza;

  const indiceIntervalo = (t) =>
    Math.min(Math.floor(t / duracionIntervaloSegundos), intervalos - 1);

  const finDeIntervalo = (i) => (i + 1) * duracionIntervaloSegundos;

  /** Casetas físicamente abiertas, incluidas las marcadas que siguen atendiendo. */
  const casetasAbiertas = () => pozo.casetasDe(id).length;

  /**
   * Casetas que van a atender vehículos nuevos: abiertas y no marcadas para
   * cerrar. Es la `c` con la que la regla mira sus umbrales (DEC-026).
   */
  const casetasEfectivas = () => pozo.casetasDe(id).filter((c) => !c.marcada).length;

  /** Casetas que pueden tomar un vehículo ahora mismo. */
  const casetasDisponibles = () =>
    pozo.casetasDe(id).filter((c) => !c.marcada && !c.vehiculo);

  /** ¿Hay una apertura en curso, ya reservada o esperando caseta? */
  const tienePeticionEnCurso = () => aperturaPendiente !== null || bloqueadaDesde !== null;

  /**
   * ρ del sentido: llegadas de la ventana móvil ÷ (c efectiva × capacidad
   * nominal por caseta). La capacidad es **nominal** a propósito: el operador no
   * conoce el servicio real, así que decide con los 24,8 veh/5 min de siempre,
   * también en el escenario de servicio lento (DEC-027).
   */
  function rho() {
    const c = casetasEfectivas();
    if (c <= 0) return Infinity;
    return llegadasRecientes.length / (c * arbitro.capacidadNominalPorCaseta);
  }

  /**
   * Espera estimada en cola con la fórmula del contexto (sección 3):
   * `Wq_est = Lq × 12,1 / c`, en segundos. También con el tiempo **nominal**,
   * por lo mismo que ρ.
   */
  function esperaEstimadaSegundos() {
    const c = casetasEfectivas();
    if (c <= 0) return Infinity;
    return (enEspera() * arbitro.servicioNominalSegundos) / c;
  }

  /** Poda la ventana móvil de ρ al instante actual. */
  function podarVentanaRho() {
    const limite = reloj.ahora - arbitro.ventanaRhoSegundos;
    while (llegadasRecientes.length > 0 && llegadasRecientes[0] <= limite) {
      llegadasRecientes.shift();
    }
  }

  // ------------------------------------------------------------ mecánica ---

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

  /** Toma una caseta del pozo y la abre en el acto. */
  function abrirUna() {
    const caseta = pozo.tomarYEntregar(id);
    if (!caseta) return false;
    if (contandoCambios) aperturas += 1;
    return true;
  }

  /**
   * Marca una caseta para cerrar. Si está libre vuelve al pozo en el acto; si
   * está atendiendo, se cierra al terminar su servicio: **nunca se interrumpe
   * una atención en curso** (DEC-007).
   *
   * Prefiere una caseta libre, que no hace esperar al recurso (DEC-026).
   *
   * @returns {'cerrada'|'marcada'|null}
   */
  function cerrarUna() {
    const mias = pozo.casetasDe(id);
    const libre = mias.find((c) => !c.marcada && !c.vehiculo);
    if (libre) {
      if (contandoCambios) cierres += 1;
      arbitro.liberar(libre, id);
      return 'cerrada';
    }
    const ocupada = mias.find((c) => !c.marcada && c.vehiculo);
    if (ocupada) {
      ocupada.marcada = true;
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
      for (const c of pozo.casetasDe(id)) {
        if (disponibles >= objetivo) break;
        if (c.marcada) {
          c.marcada = false;
          disponibles += 1;
        }
      }
    }

    while (disponibles < objetivo) {
      if (!abrirUna()) break; // el pozo no tiene más que dar
      disponibles += 1;
    }

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

      const espera = reloj.ahora - vehiculo.instanteLlegada;
      esperas.push(espera);
      esperasPorIntervalo[vehiculo.intervaloLlegada].push(espera);

      caseta.vehiculo = vehiculo;
      const duracion = gamma(prng, gammaForma, gammaEscalaSegundos);
      eventos.programar(reloj.ahora + duracion, TIPO_EVENTO.FIN_SERVICIO, {
        sentidoId: id,
        casetaId: caseta.id,
      });
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
      if (desdeCuandoBajoUmbral === null) desdeCuandoBajoUmbral = reloj.ahora;
    } else {
      desdeCuandoBajoUmbral = null;
    }
  }

  /** ¿Se cumple ahora mismo la condición de abrir otra caseta? */
  function condicionDeApertura() {
    const c = casetasEfectivas();
    const umbral = regla.abrirSiColaMayorQue[c];
    if (umbral === null || umbral === undefined) return false; // ya está en el tope
    if (c >= maximoCasetas) return false;
    return enEspera() > umbral;
  }

  /**
   * Programa la apertura de una caseta ya reservada, para `t + demora`.
   * La orden no se revoca: al llegar la hora abre aunque la cola haya bajado.
   */
  function ordenarApertura(caseta) {
    casetaReservada = caseta;
    aperturaPendiente = reloj.ahora + regla.demoraAperturaSegundos;
    eventos.programar(aperturaPendiente, TIPO_EVENTO.APERTURA_CASETA, { sentidoId: id });
  }

  /**
   * ¿Hay que abrir? Pide una caseta al árbitro. Ordenar la apertura exige tener
   * una caseta **reservada** desde ya (DEC-027): si el pozo está agotado la
   * petición queda bloqueada y se reintenta cuando se libere una.
   */
  function intentarAbrir() {
    if (!condicionDeApertura()) return false;

    // Si hay una caseta propia marcada para cerrar, cancelar ese cierre da
    // capacidad en el acto y gratis: mejor que pedir otra con demora (DEC-026).
    const marcada = pozo.casetasDe(id).find((c) => c.marcada);
    if (marcada) {
      marcada.marcada = false;
      cierresCancelados += 1;
      desdeCuandoBajoUmbral = null; // cambió c efectiva: el conteo arranca de nuevo
      despachar();
      return true;
    }

    if (tienePeticionEnCurso()) return false; // una sola apertura pendiente

    const caseta = arbitro.reservar(id);
    if (!caseta) {
      bloqueadaDesde = reloj.ahora;
      peticionesBloqueadas += 1;
      return false;
    }
    ordenarApertura(caseta);
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
    if (reloj.ahora - desdeCuandoBajoUmbral < regla.ventanaCierreSegundos) return false;

    if (cerrarUna() === null) return false;
    desdeCuandoBajoUmbral = null; // tras cerrar una, el conteo empieza de nuevo
    return true;
  }

  /**
   * Evalúa la regla. Se llama tras cada llegada y cada fin de servicio
   * (contexto, sección 4). Abrir tiene prioridad sobre cerrar.
   */
  function evaluarRegla() {
    if (!porRegla) return;
    actualizarVentanaCierre();
    if (intentarAbrir()) return;
    intentarCerrar();
  }

  // ------------------------------------------------------------- interfaz ---

  const sentido = {
    id,
    etiqueta,
    porRegla,
    maximoCasetas,
    minimoCasetas,
    horizonte,

    // consultas que necesita el árbitro
    casetasAbiertas,
    casetasEfectivas,
    enEspera,
    rho,
    esperaEstimadaSegundos,
    condicionDeApertura,
    tienePeticionEnCurso,
    estaBloqueada: () => bloqueadaDesde !== null,
    integrarHasta,

    /** Arranca el sentido: casetas iniciales, cola inicial y primeros eventos. */
    inicializar() {
      ajustarCasetas(casetasIniciales);
      contandoCambios = true;

      // Cola inicial: vehículos con llegada en t = 0 (DEC-018, PEN-003). No
      // entran a la ventana móvil de ρ: son rezago, no demanda medida (DEC-027).
      for (let i = 0; i < colaInicial; i += 1) encolar(0);

      if (!porRegla) {
        for (let i = 1; i < intervalos; i += 1) {
          eventos.programar(i * duracionIntervaloSegundos, TIPO_EVENTO.CAMBIO_INTERVALO, {
            sentidoId: id,
            intervalo: i,
          });
        }
      }

      // Un muestreo de cola por intervalo, en un instante aleatorio dentro de
      // él (contexto, sección 6). Se sortean todos al inicio para que el
      // consumo del PRNG no dependa de cuántos eventos ocurran en la réplica.
      for (let i = 0; i < intervalos; i += 1) {
        const inicio = i * duracionIntervaloSegundos;
        eventos.programar(
          uniformeEnRango(prng, inicio, inicio + duracionIntervaloSegundos),
          TIPO_EVENTO.MUESTREO_COLA,
          { sentidoId: id, intervalo: i },
        );
      }

      const primera = proximaLlegada(0);
      if (primera !== null) eventos.programar(primera, TIPO_EVENTO.LLEGADA, { sentidoId: id });

      despachar();
      evaluarRegla();
    },

    manejarFinServicio(casetaId) {
      const caseta = pozo.casetas[casetaId];
      caseta.vehiculo = null;
      atendidosTotal += 1;
      if (reloj.ahora <= horizonte) salidasEnHorizonte += 1;
      if (caseta.marcada) {
        // La caseta marcada ya terminó: ahora sí vuelve al pozo (o se reasigna).
        if (contandoCambios) cierres += 1;
        desdeCuandoBajoUmbral = null; // cambió c: el conteo arranca de nuevo
        arbitro.liberar(caseta, id);
      }
      despachar();
      evaluarRegla();
    },

    manejarCambioIntervalo(intervalo) {
      ajustarCasetas(casetasProgramadas[intervalo]);
      despachar();
    },

    manejarApertura() {
      // La orden ya se dio: la caseta abre aunque la cola haya bajado (DEC-026).
      aperturaPendiente = null;
      const caseta = casetaReservada;
      casetaReservada = null;
      if (caseta) {
        pozo.entregar(caseta, id);
        if (contandoCambios) aperturas += 1;
        desdeCuandoBajoUmbral = null; // cambió c: el conteo arranca de nuevo
      }
      despachar();
    },

    manejarLlegada() {
      llegadasSimuladas += 1;
      encolar(reloj.ahora);
      llegadasRecientes.push(reloj.ahora);
      podarVentanaRho();
      despachar();
      const siguiente = proximaLlegada(reloj.ahora);
      if (siguiente !== null) {
        eventos.programar(siguiente, TIPO_EVENTO.LLEGADA, { sentidoId: id });
      }
      evaluarRegla();
    },

    manejarMuestreoCola(intervalo) {
      colaMuestreada[intervalo] = enEspera();
    },

    /**
     * El árbitro le entrega una caseta tras una petición bloqueada o una
     * reasignación. Devuelve `true` si la aceptó.
     */
    recibirCaseta(caseta, { porReasignacion = false } = {}) {
      if (tienePeticionEnCurso() && aperturaPendiente !== null) return false;
      if (bloqueadaDesde !== null) {
        segundosBloqueados += reloj.ahora - bloqueadaDesde;
        bloqueadaDesde = null;
      }
      if (porReasignacion) reasignacionesRecibidas += 1;
      ordenarApertura(caseta);
      return true;
    },

    /** Descarta una petición bloqueada que ya no tiene razón de ser. */
    descartarBloqueo() {
      if (bloqueadaDesde === null) return;
      segundosBloqueados += reloj.ahora - bloqueadaDesde;
      bloqueadaDesde = null;
    },

    anotarReasignacionCedida() {
      reasignacionesCedidas += 1;
    },

    /** Cierra las cuentas al final de la réplica. */
    cerrarMedidas() {
      integrarHasta(horizonte);
      if (bloqueadaDesde !== null) {
        segundosBloqueados += Math.min(reloj.ahora, horizonte) - bloqueadaDesde;
        bloqueadaDesde = null;
      }
    },

    medidas() {
      const media = (xs) => (xs.length === 0 ? null : xs.reduce((a, b) => a + b, 0) / xs.length);
      const wqPorIntervaloSegundos = esperasPorIntervalo.map(media);
      const intervalosConDato = wqPorIntervaloSegundos.filter((w) => w !== null);
      const intervalosSobreUmbral = intervalosConDato.filter((w) => w > maximoTolerableWqSegundos);
      const esperasSinColaInicial = esperas.slice(colaInicial);

      return {
        etiqueta,
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

        colaMaximaContinua,
        colaMuestreada,
        /** Máximo de las lecturas puntuales (PEN-004, DEC-024). */
        colaMaximaMuestreada: Math.max(...colaMuestreada.map((c) => c ?? 0)),
        colaFinal: enEspera(),

        fraccionIntervalosSobreUmbral:
          intervalosConDato.length === 0
            ? null
            : intervalosSobreUmbral.length / intervalosConDato.length,
        intervalosSobreUmbral: intervalosSobreUmbral.length,
        intervalosConDato: intervalosConDato.length,

        /** Carriles-intervalo: ∫c(t)dt ÷ duración del intervalo. */
        carrilesIntervalo: integralCasetasAbiertas / duracionIntervaloSegundos,

        // ---------------------------------------------- actividad de la regla ---
        aperturas,
        cierres,
        cierresCancelados,
        cambiosDeC: aperturas + cierres,
        tiempoPorCasetasAbiertas: [...tiempoPorCasetasAbiertas],
        tiempoEnMaximoCasetas: tiempoPorCasetasAbiertas[maximoCasetas] ?? 0,

        // ------------------------------------------------ reparto del pozo ---
        /** Veces que pidió caseta y el pozo estaba agotado. */
        peticionesBloqueadas,
        /** Segundos que pasó esperando una caseta del pozo. */
        segundosBloqueados,
        reasignacionesRecibidas,
        reasignacionesCedidas,

        numerosAleatoriosUsados: prng.cuenta(),

        ...(guardarEsperas ? { esperas, vehiculos: cola } : {}),
      };
    },
  };

  return sentido;
}

/** Comprueba la configuración de un sentido. Lanza si algo no cuadra. */
export function validarConfiguracionSentido(config) {
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
      if (regla[campo] === undefined) throw new TypeError(`Falta \`regla.${campo}\`.`);
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
