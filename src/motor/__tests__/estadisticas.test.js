import { describe, it, expect } from 'vitest';
import { media, desviacion, minimo, maximo, resumir } from '../estadisticas.js';
import { resumirLote } from '../lotes.js';
import { simularSentido } from '../simulador.js';
import { conteos } from '../../config/datos.js';
import { parametros } from '../../config/parametros.js';

describe('estadísticas', () => {
  it('calcula media, desviación muestral, mínimo y máximo', () => {
    const xs = [2, 4, 4, 4, 5, 5, 7, 9];
    expect(media(xs)).toBe(5);
    expect(desviacion(xs)).toBeCloseTo(2.138, 3); // divide por n − 1
    expect(minimo(xs)).toBe(2);
    expect(maximo(xs)).toBe(9);
  });

  it('descarta null, undefined y NaN', () => {
    expect(media([1, null, 3, undefined, Number.NaN])).toBe(2);
    expect(resumir([1, null, 3]).n).toBe(2);
  });

  it('devuelve null con series vacías o de un solo valor', () => {
    expect(media([])).toBeNull();
    expect(desviacion([5])).toBeNull();
    expect(resumir([]).media).toBeNull();
  });
});

describe('resumen de un lote', () => {
  const semillas = [1, 2, 3, 4, 5];
  const replicas = semillas.map((semilla) =>
    simularSentido({
      semilla,
      llegadas: conteos.domingoCP.llegadas,
      casetasProgramadas: conteos.domingoCP.casetas,
      duracionIntervaloSegundos: parametros.tiempo.duracionIntervaloSegundos,
      gammaForma: parametros.servicio.gammaForma,
      gammaEscalaSegundos: parametros.servicio.gammaEscalaSegundos,
      maximoTolerableWqSegundos: parametros.desempeno.maximoTolerableWqSegundos,
    }),
  );
  const resumen = resumirLote(replicas);

  it('cuenta las réplicas y resume las medidas escalares', () => {
    expect(resumen.replicas).toBe(5);
    expect(resumen.escalares.wqHoraSegundos.n).toBe(5);
    expect(resumen.escalares.colaMaximaContinua.media).toBeGreaterThan(0);
  });

  it('resume Wq y la cola muestreada intervalo por intervalo', () => {
    expect(resumen.porIntervalo).toHaveLength(12);
    expect(resumen.porIntervalo[0].wqSegundos.n).toBeLessThanOrEqual(5);
  });

  it('rechaza lotes vacíos', () => {
    expect(() => resumirLote([])).toThrow(RangeError);
  });
});
