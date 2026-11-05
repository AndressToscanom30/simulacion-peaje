import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { trabajoLote, trabajoTraza, hacerTrabajo, TIPOS_RESPUESTA } from '../worker/trabajos.js';
import { crearClienteSimulacion } from '../worker/cliente.js';
import { catalogoFase4 } from '../../config/escenarios.js';
import { construirEscenario } from '../../config/escenario.js';

const SEGUNDOS_POR_MINUTO = 60;

const informe = readFileSync(
  resolve(import.meta.dirname, '..', '..', '..', 'docs', 'resultados', 'fase4-escenarios.md'),
  'utf8',
);

/**
 * Lee el `Wq` del peaje de un escenario del informe de la fase 4.
 *
 * Recorre el informe llevando la cuenta del régimen de servicio en el que va,
 * porque el mismo título de régimen aparece una vez por grupo de escenarios.
 */
function wqDelPeajeEnElInforme(nombre, regimenTitulo) {
  const lineas = informe.split('\n');
  let regimenActual = null;

  for (let i = 0; i < lineas.length; i += 1) {
    const linea = lineas[i];

    if (linea.startsWith('### ')) {
      regimenActual = linea.slice(4).trim();
      continue;
    }
    if (regimenActual !== regimenTitulo) continue;
    if (!linea.startsWith(`| **${nombre}**`)) continue;

    // La fila del peaje viene justo después de las de los sentidos.
    for (let j = i + 1; j < i + 6 && j < lineas.length; j += 1) {
      const encontrado = lineas[j].match(/\|\s*\*\*peaje\*\*\s*\|\s*\*\*([\d,]+)\*\*/);
      if (encontrado) return Number.parseFloat(encontrado[1].replace(',', '.'));
    }
  }
  return null;
}

describe('la corrida por lotes de la interfaz reproduce el informe de la fase 4', () => {
  const casosE2 = catalogoFase4().filter((caso) => caso.grupo === 'E2');

  it('el informe de la fase 4 existe y trae los escenarios E2', () => {
    expect(informe).toContain('# Fase 4: la matriz de escenarios');
    expect(informe).toContain('Regla sin reasignación');
  });

  const titulos = {
    base: 'servicio base (12,10 s, el medido)',
    lento: 'servicio lento (15,5 s, sensibilidad)',
  };

  it('E2 por el runner del worker da el mismo Wq del peaje que el informe', () => {
    const { resultados } = trabajoLote({ escenarios: casosE2 });
    expect(resultados).toHaveLength(casosE2.length);

    for (const resultado of resultados) {
      const esperado = wqDelPeajeEnElInforme(resultado.nombre, titulos[resultado.regimen]);
      expect(esperado, `${resultado.nombre} · ${resultado.regimen} no está en el informe`).not.toBeNull();
      const obtenido = resultado.resumen.total.wqHoraSegundos.media / SEGUNDOS_POR_MINUTO;
      expect(obtenido, `${resultado.nombre} · ${resultado.regimen}`).toBeCloseTo(esperado, 2);
    }
  });

  it('usa las semillas 1…30, las mismas en todos los escenarios', () => {
    const { resultados } = trabajoLote({ escenarios: casosE2 });
    const esperadas = Array.from({ length: 30 }, (_, i) => i + 1);
    for (const resultado of resultados) {
      expect(resultado.semillas, resultado.nombre).toEqual(esperadas);
      expect(resultado.resumen.replicas).toBe(30);
    }
  });

  it('el veredicto de cumplimiento coincide con el del informe', () => {
    const { resultados } = trabajoLote({ escenarios: casosE2 });
    // En el informe, con servicio base E2 cumple y con servicio lento no.
    for (const resultado of resultados) {
      expect(resultado.cumplimiento.mediaCumple, `${resultado.nombre} · ${resultado.regimen}`).toBe(
        resultado.regimen === 'base',
      );
    }
  });
});

describe('trabajos del worker', () => {
  it('el trabajo de traza devuelve una traza completa', () => {
    const { traza } = trabajoTraza({ escenario: {}, semilla: 1 });
    expect(traza.version).toBe(2);
    expect(traza.eventos.length).toBeGreaterThan(1000);
    expect(traza.metadatos.semilla).toBe(1);
  });

  it('completa un escenario parcial con el base', () => {
    const { traza } = trabajoTraza({ escenario: { pozo: { total: 8 } }, semilla: 2 });
    expect(traza.metadatos.pozoTotal).toBe(8);
    expect(traza.metadatos.escenario.servicio).toEqual(construirEscenario().servicio);
  });

  it('rechaza un escenario inválido con el mensaje de la validación', () => {
    expect(() => trabajoTraza({ escenario: { pozo: { total: 1 } } })).toThrow(/no alcanza para el mínimo/);
  });

  it('el lote avisa del progreso en orden', () => {
    const escenarios = catalogoFase4().filter((c) => c.grupo === 'E1' || c.grupo === 'E2');
    const avisos = [];
    trabajoLote({ escenarios, replicas: 3 }, { alProgresar: (p) => avisos.push(p) });
    expect(avisos.map((a) => a.hechos)).toEqual(escenarios.map((_, i) => i + 1));
    expect(avisos.at(-1).total).toBe(escenarios.length);
  });

  it('el lote se puede cancelar y no devuelve resultados a medias', () => {
    const escenarios = catalogoFase4().filter((c) => c.grupo === 'E2');
    let llamadas = 0;
    const { resultados, cancelado } = trabajoLote(
      { escenarios, replicas: 2 },
      { cancelado: () => ++llamadas > 2 },
    );
    expect(cancelado).toBe(true);
    expect(resultados.length).toBeLessThan(escenarios.length);
  });

  it('sobrescribir las réplicas afecta a todos los escenarios del lote', () => {
    const escenarios = catalogoFase4().filter((c) => c.grupo === 'E2');
    const { resultados } = trabajoLote({ escenarios, replicas: 5 });
    for (const resultado of resultados) {
      expect(resultado.resumen.replicas).toBe(5);
      expect(resultado.semillas).toHaveLength(5);
    }
  });

  it('despacha por tipo y rechaza lo que no conoce', () => {
    expect(hacerTrabajo({ tipo: 'traza', escenario: {}, semilla: 1 }).tipo).toBe(
      TIPOS_RESPUESTA.TRAZA_LISTA,
    );
    expect(hacerTrabajo({ tipo: 'lote', escenarios: [] }).tipo).toBe(TIPOS_RESPUESTA.LOTE_LISTO);
    expect(() => hacerTrabajo({ tipo: 'otra cosa' })).toThrow(/Trabajo desconocido/);
  });
});

describe('cliente del worker', () => {
  it('sin Workers corre en el mismo hilo y devuelve lo mismo', async () => {
    const cliente = crearClienteSimulacion();
    const respuesta = await cliente.pedir({ tipo: 'traza', escenario: {}, semilla: 1 });
    expect(cliente.enWorker).toBe(false); // en Node no hay Worker de módulo
    expect(respuesta.traza.eventos).toEqual(trabajoTraza({ escenario: {}, semilla: 1 }).traza.eventos);
  });

  it('pasa el progreso al que llama', async () => {
    const cliente = crearClienteSimulacion();
    const avisos = [];
    await cliente.pedir(
      { tipo: 'lote', escenarios: catalogoFase4().filter((c) => c.grupo === 'E1'), replicas: 2 },
      (p) => avisos.push(p),
    );
    expect(avisos.length).toBeGreaterThan(0);
  });
});
