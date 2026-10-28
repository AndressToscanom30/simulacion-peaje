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

/**
 * Deriva la semilla del flujo `indice` a partir de la semilla de la réplica.
 *
 * Cada sentido del peaje usa su propio flujo (DEC-027): así lo que pase en uno
 * no corre los números aleatorios del otro, y un escenario con dos sentidos
 * reproduce exactamente el de un sentido solo cuando el otro no tiene demanda.
 *
 * El índice 0 devuelve la semilla tal cual, que es la que usaban las fases 1
 * y 2: por eso sus resultados se mantienen. Los demás se mezclan con la
 * constante de la razón áurea (la misma que usa mulberry32 internamente), que
 * separa bien semillas pequeñas y consecutivas como las 1…30 de las réplicas.
 *
 * @param {number} semilla semilla de la réplica
 * @param {number} indice flujo: 0 es el original
 */
export function derivarSemilla(semilla, indice) {
  if (!Number.isInteger(indice) || indice < 0) {
    throw new RangeError(`El índice del flujo debe ser un entero no negativo, llegó: ${indice}`);
  }
  if (indice === 0) return semilla >>> 0;

  let x = (semilla + Math.imul(indice, 0x9e3779b9)) >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x21f0aaad) >>> 0;
  x = Math.imul(x ^ (x >>> 15), 0x735a2d97) >>> 0;
  return (x ^ (x >>> 15)) >>> 0;
}
