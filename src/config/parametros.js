/**
 * Parámetros editables de la simulación.
 *
 * Todo número del contexto vive aquí (contexto, sección 9). La lógica del motor
 * no debe tener ninguna constante numérica escrita dentro: si hace falta un
 * valor nuevo, se añade a este archivo.
 */

import { DURACION_INTERVALO_SEGUNDOS, INTERVALOS_POR_CONTEO } from './datos.js';

const SEGUNDOS_POR_MINUTO = 60;
const MINUTOS_POR_HORA = 60;

/** Horizonte de una corrida, en segundos: la hora observada. */
export const HORIZONTE_SEGUNDOS = DURACION_INTERVALO_SEGUNDOS * INTERVALOS_POR_CONTEO;

export const parametros = {
  // ---------------------------------------------------------------- tiempo ---
  tiempo: {
    duracionIntervaloSegundos: DURACION_INTERVALO_SEGUNDOS,
    intervalos: INTERVALOS_POR_CONTEO,
    horizonteSegundos: HORIZONTE_SEGUNDOS,
  },

  // --------------------------------------------------------------- servicio ---
  /**
   * Servicio gamma (DEC-004). k × θ = 12,0744 s y √k × θ = 5,5813 s, que es la
   * gamma ajustada a las 50 mediciones (media 12,1016 s, desviación 5,59 s).
   * `mediaObservadaSegundos` se usa para μ y para las fórmulas M/M/c, no para
   * generar: generar usa k y θ.
   */
  servicio: {
    gammaForma: 4.68, // k
    gammaEscalaSegundos: 2.58, // θ
    mediaObservadaSegundos: 12.1016,
    desviacionObservadaSegundos: 5.59,
    minimoObservadoSegundos: 4.13,
    maximoObservadoSegundos: 29.18,
  },

  // --------------------------------------------------------------- llegadas ---
  llegadas: {
    /**
     * Multiplica la tasa de todos los intervalos. 1 = demanda observada.
     * Escenario 3: 1,10, 1,13 y 1,20 (el 1,13 viene de la ANI).
     */
    factorEscalaDemanda: 1,
    factoresDemandaAlta: [1.1, 1.13, 1.2],
  },

  // ---------------------------------------------------------------- casetas ---
  /** Pozo común de casetas de efectivo y límites por sentido (DEC-002). */
  casetas: {
    total: 6,
    minimoPorSentido: 1,
    maximoPorSentido: 5,
    /** Solo para el diagrama de la configuración base (contexto, sección 2). */
    baseDiagramaPorSentido: 3,
  },

  // ------------------------------------------------- regla de apertura/cierre ---
  /**
   * Umbrales de la regla, indexados por número de casetas abiertas (DEC-006).
   * `abrirSiColaMayorQue[c]`: con `c` abiertas, abrir otra si la cola supera el
   * valor. `cerrarSiColaMenorQue[c]`: con `c` abiertas, cerrar una si la cola
   * baja del valor. `null` = no aplica.
   *
   * Se usa en la fase 2; en la fase 1 `c(t)` es programado (ver PEN-006).
   */
  regla: {
    abrirSiColaMayorQue: { 1: 4, 2: 9, 3: 14, 4: 19, 5: null },
    cerrarSiColaMenorQue: { 1: null, 2: 2, 3: 4, 4: 7, 5: 9 },

    /** Demora entre decidir abrir y tener la caseta operando (caso base 5 min). */
    demoraAperturaSegundos: 5 * SEGUNDOS_POR_MINUTO,
    /** Sensibilidad de la demora: 0, 5 y 10 min. */
    demorasAperturaSensibilidadSegundos: [0, 5 * SEGUNDOS_POR_MINUTO, 10 * SEGUNDOS_POR_MINUTO],
    /** Una sola apertura pendiente por sentido. */
    aperturasPendientesMaximas: 1,

    /** La cola debe mantenerse bajo el umbral este tiempo seguido para cerrar. */
    ventanaCierreSegundos: 15 * SEGUNDOS_POR_MINUTO,

    /**
     * Reasignación de la caseta liberada al otro sentido si su ρ supera este
     * valor y tiene menos de `maximoPorSentido` casetas (DEC-008).
     * ρ = llegadas de los últimos 5 min ÷ (c × capacidad por caseta y 5 min).
     */
    rhoReasignacion: 0.6,
    ventanaRhoSegundos: DURACION_INTERVALO_SEGUNDOS,

    /**
     * Desempate cuando los dos sentidos piden caseta y no hay libres: gana el
     * que supere esta espera estimada, empezando por el peor.
     */
    esperaDesempateSegundos: 2.5 * SEGUNDOS_POR_MINUTO,
  },

  // ----------------------------------------------------------- desempeño ---
  /** Criterio de desempeño (DEC-009). */
  desempeno: {
    metaWqSegundos: 1 * SEGUNDOS_POR_MINUTO,
    maximoTolerableWqSegundos: 2.5 * SEGUNDOS_POR_MINUTO,
    /** Fracción de intervalos a la que se acepta superar el máximo tolerable. */
    fraccionIntervalosSobreMaximoAceptada: 0.05,
  },

  // ------------------------------------------------------------- corridas ---
  /** Réplicas y semillas (DEC-010). Las mismas semillas en todos los escenarios. */
  corridas: {
    replicas: 30,
    primeraSemilla: 1,
  },

  // ------------------------------------------------------------- tiempo real ---
  /** Modo tiempo real con tiempo simulado (contexto, sección 9). Fase 5. */
  tiempoReal: {
    velocidades: [1, 10, 60],
    velocidadPorDefecto: 1,
  },
};

/** Semillas de las réplicas: `primeraSemilla` … `primeraSemilla + replicas - 1`. */
export function semillasReplicas(corridas = parametros.corridas) {
  return Array.from({ length: corridas.replicas }, (_, i) => corridas.primeraSemilla + i);
}

/** Tasa de servicio μ por caseta, en veh/s. */
export function tasaServicioVehSegundo(servicio = parametros.servicio) {
  return 1 / servicio.mediaObservadaSegundos;
}

/** Tasa de servicio μ por caseta, en veh/h (≈ 297,48). */
export function tasaServicioVehHora(servicio = parametros.servicio) {
  return (MINUTOS_POR_HORA * SEGUNDOS_POR_MINUTO) / servicio.mediaObservadaSegundos;
}

/** Capacidad de una caseta en un intervalo de 5 min (≈ 24,8 veh). */
export function capacidadCasetaPorIntervalo(p = parametros) {
  return p.tiempo.duracionIntervaloSegundos / p.servicio.mediaObservadaSegundos;
}
