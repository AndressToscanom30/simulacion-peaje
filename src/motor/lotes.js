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
 * @param {object} configuracionBase config de `simularSentido` sin `semilla`
 * @param {number[]} semillas
 * @returns {object[]} una réplica por semilla
 */
export function correrReplicas(configuracionBase, semillas) {
  return semillas.map((semilla) => simularSentido({ ...configuracionBase, semilla }));
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
