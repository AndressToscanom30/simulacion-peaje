import { describe, it, expect } from 'vitest';
import { erlangB, erlangC, mmc, mmcDeConteo, moda } from '../mmc.js';
import { conteos, observado, mmcDeclaradoMinutos, ordenConteos } from '../../config/datos.js';
import { parametros, HORIZONTE_SEGUNDOS } from '../../config/parametros.js';

describe('Erlang B y C', () => {
  it('con un servidor, Erlang B es a/(1+a)', () => {
    expect(erlangB(0.5, 1)).toBeCloseTo(0.5 / 1.5, 10);
    expect(erlangB(2, 1)).toBeCloseTo(2 / 3, 10);
  });

  it('Erlang C vale 1 cuando el sistema está saturado', () => {
    expect(erlangC(5, 5)).toBe(1);
    expect(erlangC(6, 5)).toBe(1);
  });

  it('con un servidor, M/M/1 da Wq = ρ/(μ(1−ρ))', () => {
    const lambda = 0.5;
    const mu = 1;
    const { wqSegundos } = mmc(lambda, mu, 1);
    const rho = lambda / mu;
    expect(wqSegundos).toBeCloseTo(rho / (mu * (1 - rho)), 10);
  });

  it('marca como inestable un sistema con ρ ≥ 1', () => {
    const r = mmc(1, 1, 1);
    expect(r.estable).toBe(false);
    expect(r.wqSegundos).toBeNull();
  });

  it('la espera baja al añadir servidores', () => {
    const esperas = [2, 3, 4, 5].map((c) => mmc(1.5, 1, c).wqSegundos);
    for (let i = 1; i < esperas.length; i += 1) {
      expect(esperas[i]).toBeLessThan(esperas[i - 1]);
    }
  });
});

describe('moda', () => {
  it('toma el valor más frecuente y, a igualdad, el menor', () => {
    expect(moda([1, 2, 2, 3])).toBe(2);
    expect(moda([3, 3, 1, 1])).toBe(1);
    expect(moda(conteos.festivoPC.casetas)).toBe(5);
    expect(moda(conteos.domingoPC.casetas)).toBe(1);
    expect(moda(conteos.domingoCP.casetas)).toBe(2);
    expect(moda(conteos.viernes.casetas)).toBe(2);
  });
});

describe('M/M/c de referencia de los cuatro conteos (DEC-020)', () => {
  it('reproduce los valores declarados en el contexto con menos de 0,05 min de diferencia', () => {
    for (const clave of ordenConteos) {
      const r = mmcDeConteo({
        totalLlegadas: observado[clave].caudalVehHora,
        horizonteSegundos: HORIZONTE_SEGUNDOS,
        mediaServicioSegundos: parametros.servicio.mediaObservadaSegundos,
        casetas: moda(conteos[clave].casetas),
      });
      expect(r.estable).toBe(true);
      const minutos = r.wqSegundos / 60;
      expect(Math.abs(minutos - mmcDeclaradoMinutos[clave])).toBeLessThan(0.05);
    }
  });

  it('la moda de casetas de datos.js coincide con la de los conteos', () => {
    for (const clave of ordenConteos) {
      expect(observado[clave].casetasModa).toBe(moda(conteos[clave].casetas));
    }
  });
});
