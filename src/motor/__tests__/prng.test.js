import { describe, it, expect } from 'vitest';
import { crearPrng } from '../prng.js';
import { exponencial, gamma, normalEstandar, uniformeEnRango } from '../aleatorios.js';

describe('PRNG con semilla', () => {
  it('es reproducible: la misma semilla da la misma secuencia', () => {
    const a = crearPrng(42);
    const b = crearPrng(42);
    const secuenciaA = Array.from({ length: 1000 }, () => a.siguiente());
    const secuenciaB = Array.from({ length: 1000 }, () => b.siguiente());
    expect(secuenciaA).toEqual(secuenciaB);
  });

  it('da secuencias distintas con semillas distintas', () => {
    const a = Array.from({ length: 100 }, (_, i) => crearPrng(1).siguiente());
    const prng1 = crearPrng(1);
    const prng2 = crearPrng(2);
    const s1 = Array.from({ length: 100 }, () => prng1.siguiente());
    const s2 = Array.from({ length: 100 }, () => prng2.siguiente());
    expect(s1).not.toEqual(s2);
    // Todas las llamadas a crearPrng(1).siguiente() dan el mismo primer valor.
    expect(new Set(a).size).toBe(1);
  });

  it('devuelve valores en [0, 1)', () => {
    const prng = crearPrng(7);
    for (let i = 0; i < 100000; i += 1) {
      const u = prng.siguiente();
      expect(u).toBeGreaterThanOrEqual(0);
      expect(u).toBeLessThan(1);
    }
  });

  it('tiene media ≈ 0,5 y varianza ≈ 1/12 en una muestra grande', () => {
    const prng = crearPrng(99);
    const n = 500000;
    let suma = 0;
    let sumaCuadrados = 0;
    for (let i = 0; i < n; i += 1) {
      const u = prng.siguiente();
      suma += u;
      sumaCuadrados += u * u;
    }
    const media = suma / n;
    expect(media).toBeCloseTo(0.5, 2);
    expect(sumaCuadrados / n - media * media).toBeCloseTo(1 / 12, 3);
  });

  it('reparte los valores de forma pareja en 10 cajones', () => {
    const prng = crearPrng(2026);
    const n = 200000;
    const cajones = new Array(10).fill(0);
    for (let i = 0; i < n; i += 1) cajones[Math.floor(prng.siguiente() * 10)] += 1;
    for (const cuenta of cajones) {
      expect(cuenta / n).toBeGreaterThan(0.09);
      expect(cuenta / n).toBeLessThan(0.11);
    }
  });

  it('cuenta cuántos números ha generado', () => {
    const prng = crearPrng(3);
    expect(prng.cuenta()).toBe(0);
    prng.siguiente();
    prng.siguiente();
    expect(prng.cuenta()).toBe(2);
  });

  it('rechaza semillas que no son números finitos', () => {
    expect(() => crearPrng(undefined)).toThrow(TypeError);
    expect(() => crearPrng(Number.NaN)).toThrow(TypeError);
    expect(() => crearPrng(Infinity)).toThrow(TypeError);
  });
});

describe('variables aleatorias derivadas', () => {
  it('la exponencial tiene media ≈ 1/tasa', () => {
    const prng = crearPrng(11);
    const tasa = 0.25;
    const n = 300000;
    let suma = 0;
    for (let i = 0; i < n; i += 1) suma += exponencial(prng, tasa);
    expect(suma / n).toBeCloseTo(1 / tasa, 1);
  });

  it('la exponencial rechaza tasas no positivas', () => {
    const prng = crearPrng(1);
    expect(() => exponencial(prng, 0)).toThrow(RangeError);
    expect(() => exponencial(prng, -1)).toThrow(RangeError);
  });

  it('la normal estándar tiene media ≈ 0 y desviación ≈ 1', () => {
    const prng = crearPrng(13);
    const n = 300000;
    let suma = 0;
    let sumaCuadrados = 0;
    for (let i = 0; i < n; i += 1) {
      const z = normalEstandar(prng);
      suma += z;
      sumaCuadrados += z * z;
    }
    const media = suma / n;
    expect(Math.abs(media)).toBeLessThan(0.02);
    expect(Math.sqrt(sumaCuadrados / n - media * media)).toBeCloseTo(1, 1);
  });

  it('la uniforme en rango se queda dentro del rango', () => {
    const prng = crearPrng(5);
    for (let i = 0; i < 10000; i += 1) {
      const x = uniformeEnRango(prng, 300, 600);
      expect(x).toBeGreaterThanOrEqual(300);
      expect(x).toBeLessThan(600);
    }
  });

  it('la gamma rechaza parámetros no positivos', () => {
    const prng = crearPrng(1);
    expect(() => gamma(prng, 0, 1)).toThrow(RangeError);
    expect(() => gamma(prng, 1, 0)).toThrow(RangeError);
  });
});
