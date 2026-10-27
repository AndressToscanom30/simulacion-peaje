/**
 * Punto de entrada del motor de simulación (DEC-014).
 *
 * Todo lo que la interfaz y los scripts necesiten sale de aquí; nadie importa
 * archivos internos del motor directamente.
 *
 * El motor es JavaScript puro: no importa React, ni DOM, ni Three.js, y corre
 * con Node (DEC-012).
 */

export { crearPrng } from './prng.js';
export { uniformeAbierto, uniformeEnRango, exponencial, normalEstandar, gamma } from './aleatorios.js';
export { crearColaEventos, TIPO_EVENTO, PRIORIDAD_EVENTO } from './colaEventos.js';
export { simularSentido, MODO_CASETAS } from './simulador.js';
export { media, desviacion, minimo, maximo, semiamplitudIc95, resumir } from './estadisticas.js';
export { erlangB, erlangC, mmc, mmcDeConteo, moda } from './mmc.js';
export { correrReplicas, resumirLote, correrYResumir } from './lotes.js';
