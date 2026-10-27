/**
 * Resúmenes estadísticos de las réplicas.
 *
 * JS puro: no importa React, ni DOM, ni Three.js.
 */

/** Descarta `null`, `undefined` y `NaN`. */
const limpiar = (xs) => xs.filter((x) => typeof x === 'number' && Number.isFinite(x));

export function media(xs) {
  const v = limpiar(xs);
  return v.length === 0 ? null : v.reduce((a, b) => a + b, 0) / v.length;
}

/** Desviación estándar muestral (divide por n − 1). */
export function desviacion(xs) {
  const v = limpiar(xs);
  if (v.length < 2) return null;
  const m = media(v);
  return Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / (v.length - 1));
}

export function minimo(xs) {
  const v = limpiar(xs);
  return v.length === 0 ? null : Math.min(...v);
}

export function maximo(xs) {
  const v = limpiar(xs);
  return v.length === 0 ? null : Math.max(...v);
}

/**
 * Semiamplitud del intervalo de confianza al 95 % de la media, por la
 * aproximación normal (1,96 · s / √n). Con 30 réplicas la t de Student al 95 %
 * es 2,045, así que esto queda ligeramente optimista; se usa igual porque es lo
 * habitual en el reporte de simulaciones y la diferencia es del 4 %.
 */
const Z_95 = 1.96;

export function semiamplitudIc95(xs) {
  const v = limpiar(xs);
  const s = desviacion(v);
  return s === null ? null : (Z_95 * s) / Math.sqrt(v.length);
}

/**
 * Resumen de una serie: media, desviación, mínimo, máximo e IC al 95 %.
 *
 * @param {number[]} xs
 */
export function resumir(xs) {
  const v = limpiar(xs);
  return {
    n: v.length,
    media: media(v),
    desviacion: desviacion(v),
    minimo: minimo(v),
    maximo: maximo(v),
    semiamplitudIc95: semiamplitudIc95(v),
  };
}
