/**
 * Motor de **un sentido** del peaje (fases 1 y 2).
 *
 * Es un envoltorio delgado sobre `crearSentido` (`sentido.js`), que es donde
 * vive la lógica: cola única FIFO, servicio gamma, llegadas Poisson por tramos
 * y control de `c(t)` programado o por regla. El motor de los dos sentidos
 * (`simularPeaje`, fase 3) usa ese mismo módulo, así que la regla no está
 * duplicada en ningún sitio.
 *
 * Aquí el sentido tiene el pozo para él solo, del tamaño de su tope de casetas:
 * nunca compite por un carril y nunca se le bloquea una petición. Es justo el
 * supuesto de las fases 1 y 2.
 *
 * La API de esta función no cambió con la fase 3: `docs/resultados/
 * validacion-fase1.md` y `fase2-regla.md` se reproducen tal cual, y hay pruebas
 * de regresión que lo comprueban.
 *
 * JS puro: no importa React, ni DOM, ni Three.js. Toda la aleatoriedad sale del
 * PRNG con semilla; no se usa `Math.random`.
 */

import { crearPrng } from './prng.js';
import { crearColaEventos, TIPO_EVENTO } from './colaEventos.js';
import { crearPozo } from './pozo.js';
import { crearSentido, validarConfiguracionSentido, MODO_CASETAS } from './sentido.js';
import { parametros } from '../config/parametros.js';

export { MODO_CASETAS };

/** Identificador del único sentido de esta simulación. */
const UNICO = 0;

/**
 * @typedef {import('./sentido.js').ConfiguracionSentido} ConfiguracionSentido
 */

/**
 * Corre una réplica de un sentido.
 *
 * @param {ConfiguracionSentido & {semilla: number}} config
 * @returns {object} medidas de la réplica
 */
export function simularSentido(config) {
  validarConfiguracionSentido(config);

  const { semilla, modoCasetas = MODO_CASETAS.PROGRAMADO, regla = null } = config;

  const porRegla = modoCasetas === MODO_CASETAS.REGLA;
  const maximoCasetas = porRegla
    ? (config.maximoCasetas ?? regla.maximoCasetas)
    : (config.maximoCasetas ??
      Math.max(...config.casetasProgramadas, config.casetasIniciales ?? config.casetasProgramadas[0]));

  const prng = crearPrng(semilla);
  const eventos = crearColaEventos();
  const reloj = { ahora: 0 };
  // El pozo es exactamente del tamaño del tope del sentido: hay carril para
  // cada caseta que la regla pueda querer abrir, así que no hay competencia.
  const pozo = crearPozo({ total: maximoCasetas });

  /**
   * Árbitro trivial: sin un segundo sentido no hay a quién reasignar ni con
   * quién competir, así que reservar es tomar del pozo y liberar es devolver.
   */
  const arbitro = {
    capacidadNominalPorCaseta: config.capacidadNominalPorCaseta ?? capacidadNominal(),
    servicioNominalSegundos:
      config.servicioNominalSegundos ?? parametros.servicio.mediaObservadaSegundos,
    ventanaRhoSegundos: config.ventanaRhoSegundos ?? parametros.regla.ventanaRhoSegundos,
    reservar: (id) => pozo.reservar(id),
    liberar: (caseta) => pozo.devolver(caseta),
  };

  const sentido = crearSentido({
    config: { ...config, id: UNICO },
    prng,
    eventos,
    reloj,
    pozo,
    arbitro,
  });

  sentido.inicializar();
  correrCalendario({ eventos, reloj, sentidos: [sentido] });
  sentido.cerrarMedidas();

  return { semilla, ...sentido.medidas() };
}

/** Capacidad nominal de una caseta en un intervalo, en vehículos. */
export function capacidadNominal(p = parametros) {
  return p.tiempo.duracionIntervaloSegundos / p.servicio.mediaObservadaSegundos;
}

/**
 * Bucle de eventos compartido por los dos motores.
 *
 * Las llegadas se cortan en el horizonte, pero la simulación sigue hasta
 * atender a todos los que ya llegaron, para no perder su espera (DEC-019).
 *
 * @param {object} args
 * @param {object} args.eventos calendario
 * @param {{ahora: number}} args.reloj reloj compartido
 * @param {object[]} args.sentidos los sentidos, indexados por su `id`
 * @param {(instante: number) => void} [args.alAvanzar] se llama con el instante
 *   del evento **antes** de que nada cambie; el árbitro lo usa para integrar el
 *   tiempo con el pozo agotado
 * @param {(evento: object) => void} [args.trasEvento] gancho del árbitro
 */
export function correrCalendario({ eventos, reloj, sentidos, alAvanzar, trasEvento }) {
  const porId = new Map(sentidos.map((s) => [s.id, s]));

  for (;;) {
    const evento = eventos.sacar();
    if (!evento) break;

    // Todos los sentidos integran hasta el instante del evento antes de que el
    // estado cambie: así ∫c(t)dt no depende de quién reciba el evento.
    for (const s of sentidos) s.integrarHasta(evento.instante);
    if (alAvanzar) alAvanzar(evento.instante);
    reloj.ahora = evento.instante;

    const sentido = porId.get(evento.datos.sentidoId);
    if (!sentido) {
      throw new Error(`Evento sin sentido conocido: ${JSON.stringify(evento.datos)}`);
    }

    switch (evento.tipo) {
      case TIPO_EVENTO.FIN_SERVICIO:
        sentido.manejarFinServicio(evento.datos.casetaId);
        break;
      case TIPO_EVENTO.CAMBIO_INTERVALO:
        sentido.manejarCambioIntervalo(evento.datos.intervalo);
        break;
      case TIPO_EVENTO.APERTURA_CASETA:
        sentido.manejarApertura();
        break;
      case TIPO_EVENTO.LLEGADA:
        sentido.manejarLlegada();
        break;
      case TIPO_EVENTO.MUESTREO_COLA:
        sentido.manejarMuestreoCola(evento.datos.intervalo);
        break;
      default:
        throw new Error(`Tipo de evento no manejado: ${evento.tipo}`);
    }

    if (trasEvento) trasEvento(evento);
  }
}
