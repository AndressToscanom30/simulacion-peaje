/**
 * @vitest-environment jsdom
 *
 * Pruebas del panel de la vista 3D. jsdom **no tiene WebGL**, así que lo que se
 * comprueba aquí es justo lo que tiene que funcionar sin él: el aviso claro, que
 * el resto de la pestaña siga en pie, y el interruptor para ocultarlo.
 *
 * Lo que se dibuja se prueba en `modeloEscena.test.js`, que es puro y corre en
 * Node (DEC-036).
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';

import PanelVista3D from '../vista3d/PanelVista3D.jsx';
import TiempoReal from '../componentes/TiempoReal.jsx';
import { construirEscenario } from '../../config/escenario.js';
import { simularTraza } from '../../corridas.js';
import { PREAJUSTES_CAMARA } from '../vista3d/geometria.js';
import { ESCENA_3D, ESTADOS_CASETA } from '../../config/escena3d.js';

const escenario = construirEscenario();
const traza = simularTraza(escenario, 1);

afterEach(cleanup);

/** Monta el panel con el interruptor conectado, como lo usa TiempoReal. */
function montarPanel(propiedades = {}) {
  let visible = propiedades.visible ?? true;
  const vista = render(
    <PanelVista3D
      traza={traza}
      escenario={escenario}
      instante={1800}
      visible={visible}
      alCambiarVisible={(valor) => {
        visible = valor;
        vista.rerender(componente());
      }}
      {...propiedades}
    />,
  );
  function componente() {
    return (
      <PanelVista3D
        traza={traza}
        escenario={escenario}
        instante={1800}
        visible={visible}
        alCambiarVisible={(valor) => {
          visible = valor;
          vista.rerender(componente());
        }}
      />
    );
  }
  return {
    get visible() {
      return visible;
    },
  };
}

describe('panel de la vista 3D', () => {
  it('sin WebGL avisa con claridad y deja dicho que no calcula nada', () => {
    montarPanel();
    const aviso = screen.getByRole('alert');
    expect(aviso.textContent).toMatch(/no tiene WebGL/);
    expect(aviso.textContent).toMatch(/sigue funcionando/);
    expect(aviso.textContent).toMatch(/no calcula nada/);
  });

  it('se puede ocultar y entonces lo dice sin alarmar', () => {
    const panel = montarPanel();
    fireEvent.click(screen.getByLabelText('Mostrar'));
    expect(panel.visible).toBe(false);
    expect(screen.getByText(/La vista 3D está oculta/)).toBeDefined();
    expect(screen.getByText(/siguen funcionando igual/)).toBeDefined();
  });

  it('sin traza no dibuja nada', () => {
    const { container } = render(
      <PanelVista3D
        traza={null}
        escenario={escenario}
        instante={0}
        visible
        alCambiarVisible={() => {}}
      />,
    );
    expect(container.firstChild).toBeNull();
  });
});

describe('integración con la pestaña Tiempo real', () => {
  /** La pestaña entera, con una traza ya calculada. */
  function montarTiempoReal() {
    return render(
      <TiempoReal
        traza={traza}
        escenario={escenario}
        semilla={1}
        alCambiarSemilla={() => {}}
        alSimular={() => {}}
        ocupado={false}
        error={null}
      />,
    );
  }

  it('la vista 3D aparece dentro de la pestaña, con sus controles', () => {
    montarTiempoReal();
    expect(screen.getByText('Vista 3D')).toBeDefined();
    expect(screen.getByLabelText('Mostrar')).toBeDefined();
  });

  it('comparte el reloj con los tableros: no hay un segundo control de tiempo', () => {
    montarTiempoReal();
    // Un solo deslizador de instante en toda la pestaña (DEC-036).
    expect(screen.getAllByLabelText('Saltar a un instante')).toHaveLength(1);
    expect(screen.getAllByText(/⏮ Reinicio/)).toHaveLength(1);
  });

  it('sin WebGL los tableros 2D y el esquema de casetas siguen ahí', () => {
    montarTiempoReal();
    expect(screen.getByRole('alert').textContent).toMatch(/no tiene WebGL/);
    // Y lo demás de la pestaña no se ha caído.
    expect(screen.getByText(/Casetas del pozo/)).toBeDefined();
    expect(screen.getByText('Cola por sentido')).toBeDefined();
    expect(screen.getByText('Casetas abiertas por sentido')).toBeDefined();
    expect(screen.getByText('Espera media por intervalo')).toBeDefined();
  });

  it('saltar en el reloj mueve la pestaña entera, vista 3D incluida', () => {
    montarTiempoReal();
    fireEvent.change(screen.getByLabelText('Saltar a un instante'), { target: { value: '900' } });
    expect(screen.getByText(/t = 15:00/)).toBeDefined();
  });
});

describe('preajustes de cámara', () => {
  it('son los cinco que pide la fase 6, con etiqueta legible', () => {
    expect(PREAJUSTES_CAMARA.map((p) => p.clave)).toEqual([
      'aerea',
      'lateral',
      'cola0',
      'cola1',
      'todo',
    ]);
    for (const preajuste of PREAJUSTES_CAMARA) {
      expect(preajuste.etiqueta.length).toBeGreaterThan(3);
    }
  });
});

describe('constantes visuales', () => {
  it('cada estado de caseta se distingue por color, figura y texto (DEC-039)', () => {
    const estados = Object.values(ESTADOS_CASETA);
    expect(estados.length).toBeGreaterThan(1);
    // Ninguna de las tres señales se repite entre estados: el color no es la única.
    for (const campo of ['color', 'texto', 'alturaIndicador']) {
      const valores = estados.map((e) => e[campo]);
      expect(new Set(valores).size, `se repite ${campo}`).toBe(estados.length);
    }
    for (const estado of estados) {
      expect(['caja', 'prisma', 'cono']).toContain(estado.figura);
      expect(estado.etiqueta.length).toBeGreaterThan(3);
    }
  });

  it('las tres calidades solo cambian cuánto se dibuja, no la simulación', () => {
    const claves = Object.keys(ESCENA_3D.calidades);
    expect(claves).toEqual(['alta', 'media', 'baja']);
    const colas = claves.map((c) => ESCENA_3D.calidades[c].colaVisible);
    // A menos calidad, menos cola dibujada.
    expect(colas).toEqual([...colas].sort((a, b) => b - a));
    for (const clave of claves) {
      const calidad = ESCENA_3D.calidades[clave];
      expect(typeof calidad.sombras).toBe('boolean');
      expect(calidad.segmentos).toBeGreaterThan(2);
    }
  });
});
