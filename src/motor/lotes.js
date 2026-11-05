/**
 * Corridas por lotes: N réplicas de la misma configuración, con las semillas
 * fijadas (DEC-010), y resumen de las medidas.
 *
 * JS puro: no importa React, ni DOM, ni Three.js.
 */

import { simularSentido } from './simulador.js';
import { resumir } from './estadisticas.js';

/**
 * Corre una réplica por semilla.
 *
 * @param {object} configuracionBase configuración sin `semilla`
 * @param {number[]} semillas
 * @param {(config: object) => object} [simular=simularSentido] motor a usar:
 *   `simularSentido` para un sentido, `simularPeaje` para los dos
 * @returns {object[]} una réplica por semilla
 */
export function correrReplicas(configuracionBase, semillas, simular = simularSentido) {
  return semillas.map((semilla) => simular({ ...configuracionBase, semilla }));
}

/** Medidas escalares que se resumen entre réplicas. */
const MEDIDAS_ESCALARES = [
  'llegadasSimuladas',
  'caudalEnHorizonte',
  'atendidosTotal',
  'wqHoraSegundos',
  'wqHoraSinColaInicialSegundos',
  'colaMaximaContinua',
  'colaMaximaMuestreada',
  'colaFinal',
  'fraccionIntervalosSobreUmbral',
  'carrilesIntervalo',
  'aperturas',
  'cierres',
  'cierresCancelados',
  'cambiosDeC',
  // Aperturas que solo explica el disparador por tasa (DEC-046).
  'aperturasAnticipadas',
];

/**
 * Resume un lote de réplicas: cada medida escalar y, aparte, `Wq` y la cola
 * muestreada intervalo por intervalo.
 *
 * @param {object[]} replicas
 */
export function resumirLote(replicas) {
  if (replicas.length === 0) throw new RangeError('El lote no tiene réplicas.');

  const escalares = {};
  for (const medida of MEDIDAS_ESCALARES) {
    escalares[medida] = resumir(replicas.map((r) => r[medida]));
  }

  // Tiempo con cada número de casetas abiertas, en segundos. Las réplicas
  // pueden traer arreglos de distinto largo según el tope de casetas del caso,
  // así que se resume hasta el mayor y lo que falte cuenta como 0.
  const nivelesMaximos = Math.max(...replicas.map((r) => r.tiempoPorCasetasAbiertas.length));
  const tiempoPorCasetasAbiertas = Array.from({ length: nivelesMaximos }, (_, c) =>
    resumir(replicas.map((r) => r.tiempoPorCasetasAbiertas[c] ?? 0)),
  );

  const intervalos = replicas[0].wqPorIntervaloSegundos.length;
  const porIntervalo = Array.from({ length: intervalos }, (_, i) => ({
    intervalo: i,
    wqSegundos: resumir(replicas.map((r) => r.wqPorIntervaloSegundos[i])),
    colaMuestreada: resumir(replicas.map((r) => r.colaMuestreada[i])),
  }));

  return { replicas: replicas.length, escalares, porIntervalo, tiempoPorCasetasAbiertas };
}

/**
 * Corre el lote y lo resume de una vez.
 *
 * @param {object} configuracionBase
 * @param {number[]} semillas
 */
export function correrYResumir(configuracionBase, semillas) {
  const replicas = correrReplicas(configuracionBase, semillas);
  return { ...resumirLote(replicas), replicasCrudas: replicas };
}

/** Medidas del pozo que se resumen entre réplicas (fase 3). */
const MEDIDAS_POZO = [
  'segundosAgotado',
  'reasignaciones',
  'entregasPorBloqueo',
  'ofrecimientosPorPozo',
  'prestamos',
  'bloqueosDescartados',
  'peticionesBloqueadas',
  'segundosBloqueados',
];

/** Medidas por sentido que se resumen entre réplicas (fase 3). */
const MEDIDAS_SENTIDO = [
  ...MEDIDAS_ESCALARES,
  'peticionesBloqueadas',
  'segundosBloqueados',
  'reasignacionesRecibidas',
  'reasignacionesCedidas',
  'prestamosRecibidos',
  'prestamosCedidos',
];

/** Medidas del total del peaje que se resumen entre réplicas (fase 3). */
const MEDIDAS_TOTAL = [
  'llegadasSimuladas',
  'caudalEnHorizonte',
  'atendidosTotal',
  'wqHoraSegundos',
  'fraccionIntervalosSobreUmbral',
  'sumaColaMaximaMuestreada',
  'sumaColaMaximaContinua',
  'carrilesIntervalo',
  'cambiosDeC',
  'aperturas',
  'cierres',
  'aperturasAnticipadas',
];

const resumirCampos = (replicas, campos, extraer) =>
  Object.fromEntries(campos.map((campo) => [campo, resumir(replicas.map((r) => extraer(r)[campo]))]));

/**
 * Corre N réplicas del peaje completo y resume las medidas por sentido, el
 * total y el reparto del pozo.
 *
 * @param {object} configuracionBase config de `simularPeaje` sin `semilla`
 * @param {number[]} semillas
 * @param {(config: object) => object} simular normalmente `simularPeaje`
 */
export function correrYResumirPeaje(configuracionBase, semillas, simular) {
  return resumirLotePeaje(correrReplicas(configuracionBase, semillas, simular));
}

/**
 * Resume un lote de réplicas del peaje completo: por sentido, el total y el
 * reparto del pozo.
 *
 * @param {object[]} replicas salidas de `simularPeaje`
 */
export function resumirLotePeaje(replicas) {
  if (replicas.length === 0) throw new RangeError('El lote no tiene réplicas.');

  const numeroDeSentidos = replicas[0].sentidos.length;

  return {
    replicas: replicas.length,
    sentidos: Array.from({ length: numeroDeSentidos }, (_, i) => ({
      etiqueta: replicas[0].sentidos[i].etiqueta,
      escalares: resumirCampos(replicas, MEDIDAS_SENTIDO, (r) => r.sentidos[i]),
      tiempoPorCasetasAbiertas: Array.from(
        { length: Math.max(...replicas.map((r) => r.sentidos[i].tiempoPorCasetasAbiertas.length)) },
        (_, c) => resumir(replicas.map((r) => r.sentidos[i].tiempoPorCasetasAbiertas[c] ?? 0)),
      ),
    })),
    total: resumirCampos(replicas, MEDIDAS_TOTAL, (r) => r.total),
    pozo: resumirCampos(replicas, MEDIDAS_POZO, (r) => r.pozo),
    replicasCrudas: replicas,
  };
}
