import { describe, expect, it } from 'vitest';
import { catalogoTraspasos } from '../escenarios.js';

describe('catálogo comparativo de traspasos', () => {
  const casos = catalogoTraspasos();

  it('incluye cuatro variantes para el festivo y cuatro para demanda ×1,13', () => {
    expect(casos).toHaveLength(8);
    expect(casos.filter((caso) => caso.grupo === 'festivo')).toHaveLength(4);
    expect(casos.filter((caso) => caso.grupo === 'demanda-alta')).toHaveLength(4);
  });

  it('mantiene activa la reasignación y combina las dos opciones nuevas', () => {
    for (const caso of casos) {
      expect(caso.escenario.regla.reasignacionActiva).toBe(true);
    }

    expect(casos.find((caso) => caso.codigo === 'festivo-base').escenario.regla).toMatchObject({
      atenderDuranteTraspaso: false,
      prestamoPorColapso: false,
    });
    expect(casos.find((caso) => caso.codigo === 'festivo-prestamo').escenario.regla).toMatchObject({
      atenderDuranteTraspaso: false,
      prestamoPorColapso: true,
    });
    expect(casos.find((caso) => caso.codigo === 'festivo-traspaso').escenario.regla).toMatchObject({
      atenderDuranteTraspaso: true,
      prestamoPorColapso: false,
    });
    expect(casos.find((caso) => caso.codigo === 'festivo-ambos').escenario.regla).toMatchObject({
      atenderDuranteTraspaso: true,
      prestamoPorColapso: true,
    });
  });

  it('aplica ×1,13 a los dos sentidos solo en el perfil de demanda alta', () => {
    const festivo = casos.find((caso) => caso.grupo === 'festivo');
    const alta = casos.find((caso) => caso.grupo === 'demanda-alta');
    expect(festivo.escenario.sentidos.map((sentido) => sentido.factorDemanda)).toEqual([1, 1]);
    expect(alta.escenario.sentidos.map((sentido) => sentido.factorDemanda)).toEqual([1.13, 1.13]);
  });
});
