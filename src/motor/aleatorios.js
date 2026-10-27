/**
 * Variables aleatorias construidas sobre el PRNG con semilla.
 *
 * JS puro: no importa React, ni DOM, ni Three.js.
 */

/**
 * Uniforme en (0, 1). Evita el 0 exacto, que rompe `Math.log`.
 *
 * @param {{siguiente: () => number}} prng
 */
export function uniformeAbierto(prng) {
  let u = prng.siguiente();
  while (u <= 0) u = prng.siguiente();
  return u;
}

/**
 * Uniforme en [a, b).
 */
export function uniformeEnRango(prng, a, b) {
  return a + (b - a) * prng.siguiente();
}

/**
 * Exponencial de tasa `tasa` (en las unidades de `tasa`, por transformada
 * inversa). Es el tiempo entre llegadas de un proceso de Poisson.
 *
 * @param {{siguiente: () => number}} prng
 * @param {number} tasa > 0
 */
export function exponencial(prng, tasa) {
  if (!(tasa > 0)) {
    throw new RangeError(`La tasa de la exponencial debe ser positiva, llegó: ${tasa}`);
  }
  return -Math.log(uniformeAbierto(prng)) / tasa;
}

/**
 * Normal estándar por Box–Muller (forma polar, un valor por llamada).
 *
 * No se cachea el segundo valor a propósito: así cada llamada consume un número
 * fijo de uniformes y el consumo del PRNG no depende del orden de las llamadas,
 * que es lo que hace comparables dos réplicas con la misma semilla.
 */
export function normalEstandar(prng) {
  const u1 = uniformeAbierto(prng);
  const u2 = prng.siguiente();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

/**
 * Gamma(forma `k`, escala `theta`) por el método de Marsaglia–Tsang (DEC-004).
 *
 * Para k ≥ 1 usa el método de compresión-rechazo con la transformación
 * d = k - 1/3, c = 1/√(9d). Para k < 1 usa el truco de potenciación
 * Gamma(k) = Gamma(k+1) · U^(1/k).
 *
 * Media = k·theta, varianza = k·theta².
 *
 * @param {{siguiente: () => number}} prng
 * @param {number} forma k > 0
 * @param {number} escala theta > 0
 */
export function gamma(prng, forma, escala) {
  if (!(forma > 0)) {
    throw new RangeError(`La forma de la gamma debe ser positiva, llegó: ${forma}`);
  }
  if (!(escala > 0)) {
    throw new RangeError(`La escala de la gamma debe ser positiva, llegó: ${escala}`);
  }

  if (forma < 1) {
    const u = uniformeAbierto(prng);
    return gamma(prng, forma + 1, escala) * Math.pow(u, 1 / forma);
  }

  const d = forma - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);

  // El bucle casi siempre acepta en la primera vuelta (tasa de aceptación
  // > 95 % para k ≥ 1), así que no hace falta un tope de iteraciones.
  for (;;) {
    let x;
    let v;
    do {
      x = normalEstandar(prng);
      v = 1 + c * x;
    } while (v <= 0);

    v = v * v * v;
    const u = uniformeAbierto(prng);
    const x2 = x * x;

    if (u < 1 - 0.0331 * x2 * x2) {
      return d * v * escala;
    }
    if (Math.log(u) < 0.5 * x2 + d * (1 - v + Math.log(v))) {
      return d * v * escala;
    }
  }
}
