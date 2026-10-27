/**
 * M/M/c analítico de referencia, por Erlang C (DEC-020).
 *
 * Sirve solo para comparar: el servicio real es gamma, no exponencial, así que
 * el M/M/c es una aproximación. El contexto (sección 6) dice que coincide con
 * lo observado en los tres conteos normales y se queda unas 20 veces corto en
 * el festivo; cerrar esa brecha es justamente lo que se le pide a la simulación.
 *
 * JS puro: no importa React, ni DOM, ni Three.js.
 */

/**
 * Probabilidad de bloqueo de Erlang B, por la recursión numéricamente estable
 * B(0) = 1, B(n) = a·B(n−1) / (n + a·B(n−1)).
 *
 * @param {number} a intensidad de tráfico λ/μ (en erlangs)
 * @param {number} c servidores (entero ≥ 1)
 */
export function erlangB(a, c) {
  let b = 1;
  for (let n = 1; n <= c; n += 1) {
    b = (a * b) / (n + a * b);
  }
  return b;
}

/**
 * Probabilidad de espera de Erlang C: C = B / (1 − ρ(1 − B)), con ρ = a/c.
 * Solo tiene sentido si ρ < 1.
 */
export function erlangC(a, c) {
  const rho = a / c;
  if (rho >= 1) return 1;
  const b = erlangB(a, c);
  return b / (1 - rho * (1 - b));
}

/**
 * Medidas de un M/M/c en régimen estacionario.
 *
 * @param {number} lambda tasa de llegadas, veh/s
 * @param {number} mu tasa de servicio por servidor, veh/s
 * @param {number} c servidores
 * @returns {{rho: number, a: number, probabilidadEspera: number|null,
 *   wqSegundos: number|null, lq: number|null, estable: boolean}}
 */
export function mmc(lambda, mu, c) {
  const a = lambda / mu;
  const rho = a / c;

  if (!(rho < 1)) {
    // Sistema saturado: la cola crece sin límite, Wq no converge.
    return { rho, a, probabilidadEspera: 1, wqSegundos: null, lq: null, estable: false };
  }

  const pEspera = erlangC(a, c);
  const wq = pEspera / (c * mu - lambda);

  return {
    rho,
    a,
    probabilidadEspera: pEspera,
    wqSegundos: wq,
    lq: lambda * wq,
    estable: true,
  };
}

/**
 * M/M/c de un conteo completo: λ es el total de la hora repartido en el
 * horizonte y `c` el número modal de casetas abiertas (DEC-020).
 *
 * @param {object} args
 * @param {number} args.totalLlegadas veh en el horizonte
 * @param {number} args.horizonteSegundos
 * @param {number} args.mediaServicioSegundos
 * @param {number} args.casetas
 */
export function mmcDeConteo({ totalLlegadas, horizonteSegundos, mediaServicioSegundos, casetas }) {
  return mmc(totalLlegadas / horizonteSegundos, 1 / mediaServicioSegundos, casetas);
}

/** Número que más veces aparece en el arreglo; a igualdad, el menor. */
export function moda(xs) {
  const cuentas = new Map();
  for (const x of xs) cuentas.set(x, (cuentas.get(x) ?? 0) + 1);
  let mejor = null;
  let mejorCuenta = -1;
  for (const [valor, cuenta] of [...cuentas.entries()].sort((a, b) => a[0] - b[0])) {
    if (cuenta > mejorCuenta) {
      mejor = valor;
      mejorCuenta = cuenta;
    }
  }
  return mejor;
}
