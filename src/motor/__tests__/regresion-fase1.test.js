import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { correrYResumir } from '../lotes.js';
import { conteos, ordenConteos } from '../../config/datos.js';
import { parametros, semillasReplicas } from '../../config/parametros.js';

/**
 * Regresión: el modo programado tiene que seguir dando exactamente los mismos
 * números que `docs/resultados/validacion-fase1.md`. La fase 2 añadió el modo
 * regla al mismo motor, y esta prueba es la que garantiza que no movió nada de
 * la fase 1.
 *
 * Se lee el informe publicado y se comparan las cifras con las que salen de
 * correr las 30 réplicas aquí mismo.
 */

const p = parametros;
const semillas = semillasReplicas();
const SEGUNDOS_POR_MINUTO = 60;

const COLA_INICIAL = { viernes: 0, domingoCP: 0, domingoPC: 0, festivoPC: 23 };

const informe = readFileSync(
  resolve(import.meta.dirname, '..', '..', '..', 'docs', 'resultados', 'validacion-fase1.md'),
  'utf8',
);

/** Lee una celda del resumen: `| clave | ... |` → columnas sin formato. */
function filaDelResumen(clave) {
  const linea = informe
    .split('\n')
    .find((l) => l.startsWith(`| ${clave} |`) && l.includes('±'));
  if (!linea) throw new Error(`No se encontró la fila de ${clave} en el informe.`);
  return linea
    .split('|')
    .slice(1, -1)
    .map((celda) => celda.trim());
}

/** "1.064,4 ± 11,2" → 1064.4 ; "**0,28**" → 0.28 */
function numero(celda) {
  const limpio = celda
    .replace(/\*\*/g, '')
    .split('±')[0]
    .trim()
    .replace(/\./g, '')
    .replace(',', '.');
  return Number.parseFloat(limpio);
}

function configuracionDe(clave) {
  return {
    llegadas: conteos[clave].llegadas,
    casetasProgramadas: conteos[clave].casetas,
    colaInicial: COLA_INICIAL[clave],
    factorEscalaDemanda: p.llegadas.factorEscalaDemanda,
    duracionIntervaloSegundos: p.tiempo.duracionIntervaloSegundos,
    gammaForma: p.servicio.gammaForma,
    gammaEscalaSegundos: p.servicio.gammaEscalaSegundos,
    maximoTolerableWqSegundos: p.desempeno.maximoTolerableWqSegundos,
  };
}

describe('regresión: el modo programado reproduce validacion-fase1.md', () => {
  it('el informe existe y trae los cuatro conteos', () => {
    expect(informe).toContain('# Validación de la fase 1');
    for (const clave of ordenConteos) expect(informe).toContain(`| ${clave} |`);
  });

  for (const clave of ordenConteos) {
    it(`${clave}: llegadas, caudal, colas y Wq coinciden con el informe`, () => {
      const { escalares } = correrYResumir(configuracionDe(clave), semillas);
      const fila = filaDelResumen(clave);

      // Orden de columnas del resumen: conteo | llegadas obs. | llegadas sim. |
      // caudal sim. | cola máx. obs. | cola máx. muestreada | cola máx. continua
      // | Wq obs. decl. | Wq M/M/c | Wq sim.
      const [, , llegadasSim, caudalSim, , colaMuestreada, colaContinua, , , wqSim] = fila;

      expect(escalares.llegadasSimuladas.media).toBeCloseTo(numero(llegadasSim), 1);
      expect(escalares.caudalEnHorizonte.media).toBeCloseTo(numero(caudalSim), 1);
      expect(escalares.colaMaximaMuestreada.media).toBeCloseTo(numero(colaMuestreada), 1);
      expect(escalares.colaMaximaContinua.media).toBeCloseTo(numero(colaContinua), 1);
      expect(escalares.wqHoraSegundos.media / SEGUNDOS_POR_MINUTO).toBeCloseTo(numero(wqSim), 2);
    });
  }

  it('festivoPC con cola inicial 0 también coincide', () => {
    const { escalares } = correrYResumir(
      { ...configuracionDe('festivoPC'), colaInicial: 0 },
      semillas,
    );
    const fila = filaDelResumen('festivoPC (cola inicial 0)');
    const [, , llegadasSim, caudalSim, , colaMuestreada, colaContinua, , , wqSim] = fila;

    expect(escalares.llegadasSimuladas.media).toBeCloseTo(numero(llegadasSim), 1);
    expect(escalares.caudalEnHorizonte.media).toBeCloseTo(numero(caudalSim), 1);
    expect(escalares.colaMaximaMuestreada.media).toBeCloseTo(numero(colaMuestreada), 1);
    expect(escalares.colaMaximaContinua.media).toBeCloseTo(numero(colaContinua), 1);
    expect(escalares.wqHoraSegundos.media / SEGUNDOS_POR_MINUTO).toBeCloseTo(numero(wqSim), 2);
  });
});
