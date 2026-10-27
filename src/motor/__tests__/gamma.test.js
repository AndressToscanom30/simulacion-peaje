import { describe, it, expect } from 'vitest';
import { crearPrng } from '../prng.js';
import { gamma } from '../aleatorios.js';
import { parametros } from '../../config/parametros.js';

const { gammaForma, gammaEscalaSegundos, mediaObservadaSegundos, desviacionObservadaSegundos } =
  parametros.servicio;

/** Media y desviación teóricas de la gamma: k·θ y √k·θ. */
const MEDIA_TEORICA = gammaForma * gammaEscalaSegundos; // 12,0744 s
const DESVIACION_TEORICA = Math.sqrt(gammaForma) * gammaEscalaSegundos; // 5,5814 s

function muestrear(semilla, n) {
  const prng = crearPrng(semilla);
  const xs = new Float64Array(n);
  for (let i = 0; i < n; i += 1) xs[i] = gamma(prng, gammaForma, gammaEscalaSegundos);
  return xs;
}

function mediaYDesviacion(xs) {
  let suma = 0;
  for (const x of xs) suma += x;
  const media = suma / xs.length;
  let sumaCuadrados = 0;
  for (const x of xs) sumaCuadrados += (x - media) ** 2;
  return { media, desviacion: Math.sqrt(sumaCuadrados / (xs.length - 1)) };
}

describe('servicio gamma por Marsaglia–Tsang (k = 4,68; θ = 2,58 s)', () => {
  const { media, desviacion } = mediaYDesviacion(muestrear(2026, 400000));

  it('se acerca a la media observada de 12,10 s', () => {
    // La gamma ajustada tiene media teórica 12,0744 s, a 0,027 s de las 50
    // mediciones (12,1016 s). Una tolerancia de 0,1 s cubre las dos cosas.
    expect(media).toBeGreaterThan(mediaObservadaSegundos - 0.1);
    expect(media).toBeLessThan(mediaObservadaSegundos + 0.1);
    expect(Math.abs(media - MEDIA_TEORICA)).toBeLessThan(0.05);
  });

  it('se acerca a la desviación observada de 5,59 s', () => {
    expect(desviacion).toBeGreaterThan(desviacionObservadaSegundos - 0.1);
    expect(desviacion).toBeLessThan(desviacionObservadaSegundos + 0.1);
    expect(Math.abs(desviacion - DESVIACION_TEORICA)).toBeLessThan(0.05);
  });

  it('reproduce el coeficiente de variación observado (0,46)', () => {
    expect(desviacion / media).toBeCloseTo(0.46, 2);
  });

  it('no genera tiempos de atención negativos o nulos', () => {
    const xs = muestrear(7, 50000);
    for (const x of xs) expect(x).toBeGreaterThan(0);
  });

  it('es reproducible con la misma semilla', () => {
    expect(Array.from(muestrear(99, 500))).toEqual(Array.from(muestrear(99, 500)));
  });

  it('usa el truco de potenciación para k < 1 y mantiene la media k·θ', () => {
    const prng = crearPrng(17);
    const n = 200000;
    let suma = 0;
    for (let i = 0; i < n; i += 1) suma += gamma(prng, 0.5, 2);
    expect(suma / n).toBeCloseTo(1, 1); // media = 0,5 × 2
  });
});
