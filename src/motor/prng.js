/**
 * Generador de números pseudoaleatorios con semilla (DEC-011, DEC-016).
 *
 * mulberry32: estado de 32 bits, periodo 2^32. Prohibido `Math.random` en el
 * motor: sin semilla no hay réplicas reproducibles ni números aleatorios
 * comunes entre escenarios.
 *
 * JS puro: no importa React, ni DOM, ni Three.js.
 */

/** Máscara de 32 bits sin signo, usada para normalizar a [0, 1). */
const DIVISOR_32_BITS = 4294967296; // 2^32

/**
 * Crea un generador con la semilla dada.
 *
 * @param {number} semilla entero; se trunca a 32 bits.
 * @returns {{siguiente: () => number, semilla: number, cuenta: () => number}}
 *   `siguiente()` devuelve un número en [0, 1); `cuenta()` cuántos se han
 *   generado (útil para comparar réplicas).
 */
export function crearPrng(semilla) {
  if (!Number.isFinite(semilla)) {
    throw new TypeError(`La semilla debe ser un número finito, llegó: ${semilla}`);
  }

  let estado = semilla >>> 0;
  let generados = 0;

  return {
    semilla: semilla >>> 0,

    siguiente() {
      generados += 1;
      estado = (estado + 0x6d2b79f5) >>> 0;
      let t = estado;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / DIVISOR_32_BITS;
    },

    cuenta() {
      return generados;
    },
  };
}
