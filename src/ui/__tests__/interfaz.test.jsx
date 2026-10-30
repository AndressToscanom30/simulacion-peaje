/**
 * @vitest-environment jsdom
 *
 * Pruebas de los componentes. **Solo este archivo pide jsdom** (DEC-034): las
 * del motor y de lo puro siguen en entorno `node`, que es lo que garantiza que
 * el motor no dependa del DOM (DEC-012).
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';

import App from '../../App.jsx';
import Formulario from '../componentes/Formulario.jsx';
import PanelSupuestos from '../componentes/PanelSupuestos.jsx';
import EsquemaCasetas from '../componentes/EsquemaCasetas.jsx';
import TablaMedidas from '../componentes/TablaMedidas.jsx';
import { construirEscenario } from '../../config/escenario.js';
import { cambiarCampo, restablecerCampo, SUPUESTOS } from '../modeloFormulario.js';
import { simularTraza } from '../../corridas.js';
import { reconstruirDesdeTraza } from '../../motor/traza.js';

const base = construirEscenario();

afterEach(cleanup);
beforeEach(() => {
  try {
    localStorage.clear();
  } catch {
    // En jsdom siempre hay localStorage, pero la interfaz no debe depender de él.
  }
});

describe('panel de supuestos', () => {
  it('muestra los tres supuestos no medidos con su pendiente', () => {
    render(<PanelSupuestos />);
    for (const supuesto of SUPUESTOS) {
      expect(screen.getByText(supuesto.clave)).toBeDefined();
      expect(screen.getByText(supuesto.titulo)).toBeDefined();
    }
  });

  it('dice que la cola de campo es el total por sentido y es comparable (DEC-042)', () => {
    render(<PanelSupuestos />);
    expect(
      screen.getAllByText(/total de vehículos esperando\s+por sentido/).length,
    ).toBeGreaterThan(0);
    // Lo que decía antes era lo contrario de lo cierto (DEC-024, superada).
    expect(screen.queryByText(/fila más larga de una caseta/)).toBeNull();
    expect(screen.queryByText(/no son comparables de frente/)).toBeNull();
  });
});

describe('formulario generado', () => {
  /** Monta el formulario con estado, como lo usa App. */
  function montar(escenarioInicial = base) {
    let actual = escenarioInicial;
    const vista = render(
      <Formulario
        escenario={actual}
        alCambiar={(ruta, valor) => {
          actual = cambiarCampo(actual, ruta, valor);
          vista.rerender(componente());
        }}
        alRestablecer={(ruta) => {
          actual = restablecerCampo(actual, ruta);
          vista.rerender(componente());
        }}
        alReemplazar={(nuevo) => {
          actual = nuevo;
          vista.rerender(componente());
        }}
      />,
    );
    function componente() {
      return (
        <Formulario
          escenario={actual}
          alCambiar={(ruta, valor) => {
            actual = cambiarCampo(actual, ruta, valor);
            vista.rerender(componente());
          }}
          alRestablecer={(ruta) => {
            actual = restablecerCampo(actual, ruta);
            vista.rerender(componente());
          }}
          alReemplazar={(nuevo) => {
            actual = nuevo;
            vista.rerender(componente());
          }}
        />
      );
    }
    return { get escenario() { return actual; } };
  }

  it('dibuja las siete secciones que pide la fase 5', () => {
    montar();
    for (const titulo of [
      'Demanda',
      'Servicio',
      'Pozo y casetas',
      'Regla de apertura y cierre',
      'Reparto entre sentidos',
      'Criterio de desempeño',
      'Corrida',
    ]) {
      expect(screen.getByText(titulo), titulo).toBeDefined();
    }
  });

  it('arranca diciendo que es igual al base', () => {
    montar();
    expect(screen.getByText(/Igual al escenario base/)).toBeDefined();
  });

  it('cambiar un campo lo marca como modificado y permite restablecerlo', () => {
    const estado = montar();
    const campo = screen.getByLabelText(/Casetas del pozo/);
    fireEvent.change(campo, { target: { value: '8' } });
    expect(estado.escenario.pozo.total).toBe(8);
    expect(screen.getByText(/parámetro\(s\) distintos del escenario base/)).toBeDefined();

    fireEvent.click(screen.getAllByText('restablecer')[0]);
    expect(estado.escenario.pozo.total).toBe(6);
  });

  it('muestra unidad, valor por defecto, rango y origen de cada campo', () => {
    montar();
    expect(screen.getAllByText(/\(casetas\)/).length).toBeGreaterThan(0);
    const metas = document.querySelectorAll('.campo__meta');
    expect(metas.length).toBeGreaterThan(5);
    expect([...metas].some((m) => m.textContent.includes('Por defecto'))).toBe(true);
    expect([...metas].some((m) => m.textContent.includes('Rango:'))).toBe(true);
    expect([...metas].some((m) => m.textContent.includes('DEC-'))).toBe(true);
  });

  it('un valor absurdo muestra todos los problemas juntos', () => {
    const estado = montar();
    fireEvent.change(screen.getByLabelText(/Casetas del pozo/), { target: { value: '1' } });
    expect(screen.getByRole('alert').textContent).toMatch(/problema\(s\) en la configuración/);
    expect(estado.escenario.pozo.total).toBe(1);
  });

  it('la demanda es editable por intervalo, con los 12 valores por sentido', () => {
    const estado = montar();
    const primero = screen.getByLabelText(/Llegadas por intervalo · P→C, intervalo 1$/);
    expect(primero.value).toBe('92'); // el conteo del festivo
    fireEvent.change(primero, { target: { value: '120' } });
    expect(estado.escenario.sentidos[0].llegadas[0]).toBe(120);
    expect(estado.escenario.sentidos[0].llegadas).toHaveLength(12);
    for (const sentido of ['P→C', 'C→P']) {
      for (const intervalo of [1, 12]) {
        expect(
          screen.getByLabelText(new RegExp(`Llegadas por intervalo · ${sentido}, intervalo ${intervalo}$`)),
        ).toBeDefined();
      }
    }
  });

  it('las casetas del operador y las tablas de umbrales son editables', () => {
    const estado = montar();
    fireEvent.change(screen.getByLabelText(/Casetas fijas por intervalo · P→C, intervalo 1$/), {
      target: { value: '5' },
    });
    expect(estado.escenario.sentidos[0].casetasFijas[0]).toBe(5);

    fireEvent.change(screen.getByLabelText(/Umbrales de apertura, c=1/), { target: { value: '7' } });
    expect(estado.escenario.regla.abrirSiColaMayorQue[1]).toBe(7);
  });

  it('se puede configurar un pozo de 8 y de 10 con topes mayores de 5', () => {
    for (const [total, tope] of [[8, 7], [10, 9]]) {
      cleanup();
      const estado = montar();
      fireEvent.change(screen.getByLabelText(/Casetas del pozo/), { target: { value: String(total) } });
      fireEvent.change(screen.getByLabelText(/Tope por sentido/), { target: { value: String(tope) } });
      expect(estado.escenario.pozo.total, `pozo ${total}`).toBe(total);
      expect(estado.escenario.pozo.maximoPorSentido).toBe(tope);
      // Los umbrales se regeneraron para el tope nuevo y no hay problemas.
      expect(Object.keys(estado.escenario.regla.abrirSiColaMayorQue)).toHaveLength(tope);
      expect(screen.queryByRole('alert')).toBeNull();
      expect(screen.getAllByText(/extrapolados/).length).toBeGreaterThan(0);
    }
  });

  it('el régimen lento se rotula como sensibilidad', () => {
    montar();
    fireEvent.change(screen.getByLabelText(/Régimen de servicio/), { target: { value: 'lento' } });
    expect(screen.getByText(/es una hipótesis/)).toBeDefined();
  });

  it('exporta e importa JSON sin perder nada', () => {
    const estado = montar();
    fireEvent.change(screen.getByLabelText(/Casetas del pozo/), { target: { value: '7' } });
    fireEvent.click(screen.getByText('Exportar el actual'));
    const area = screen.getByLabelText('JSON del escenario');
    expect(JSON.parse(area.value).pozo.total).toBe(7);

    fireEvent.change(area, { target: { value: '{"nombre":"importado","pozo":{"total":9}}' } });
    fireEvent.click(screen.getByText('Importar'));
    expect(estado.escenario.nombre).toBe('importado');
    expect(estado.escenario.pozo.total).toBe(9);
  });

  it('un JSON roto muestra el error y no cambia el escenario', () => {
    const estado = montar();
    fireEvent.change(screen.getByLabelText('JSON del escenario'), { target: { value: '{roto' } });
    fireEvent.click(screen.getByText('Importar'));
    expect(screen.getByRole('alert').textContent).toMatch(/no se pudo leer/);
    expect(estado.escenario.pozo.total).toBe(6);
  });

  it('se puede partir de un escenario del catálogo', () => {
    const estado = montar();
    const selector = screen.getByLabelText(/Partir de un escenario del catálogo/);
    fireEvent.change(selector, { target: { value: 'E1|base' } });
    // E1 es el operador: los dos sentidos en modo programado.
    expect(estado.escenario.sentidos.every((s) => s.modo === 'programado')).toBe(true);
  });
});

describe('esquema de casetas', () => {
  it('muestra cada caseta con su dueño y su estado', () => {
    const traza = simularTraza(base, 1);
    const estado = reconstruirDesdeTraza(traza);
    render(<EsquemaCasetas pozo={estado.pozo} etiquetas={['P→C', 'C→P']} />);
    expect(screen.getByText(/Casetas del pozo \(6\)/)).toBeDefined();
    expect(document.querySelectorAll('.caseta')).toHaveLength(6);
    expect(screen.getByText(/no se interrumpe ningún servicio/)).toBeDefined();
  });
});

describe('tabla de medidas', () => {
  it('muestra las mismas medidas de los informes y el veredicto por sentido', () => {
    const traza = simularTraza(base, 1);
    render(<TablaMedidas medidas={traza.medidas} desempeno={base.desempeno} />);
    for (const titulo of [
      'Wq de la hora (min)',
      'Carriles-intervalo',
      'Cola máxima continua (veh)',
      'Peticiones bloqueadas',
      'Cumple el criterio',
    ]) {
      expect(screen.getByText(titulo), titulo).toBeDefined();
    }
    expect(screen.getByText(/en cada sentido/)).toBeDefined();
  });
});

describe('la aplicación entera monta', () => {
  it('arranca en tiempo real, con los supuestos y las tres pestañas', () => {
    render(<App />);
    expect(screen.getByText('Peaje Los Acacios')).toBeDefined();
    expect(screen.getByText('Supuestos y limitaciones')).toBeDefined();
    for (const pestana of ['Tiempo real', 'Por lotes', 'Configuración']) {
      expect(screen.getByRole('button', { name: pestana }), pestana).toBeDefined();
    }
    expect(screen.getByText(/Simular y reproducir/)).toBeDefined();
  });

  it('se puede cambiar de pestaña', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Por lotes' }));
    expect(screen.getByText('Corrida por lotes')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Configuración' }));
    expect(screen.getByText(/Partir de un escenario del catálogo/)).toBeDefined();
  });

  it('simular una traza deja los controles de reproducción listos', async () => {
    render(<App />);
    fireEvent.click(screen.getByText(/Simular y reproducir/));
    // El cliente corre en el mismo hilo cuando no hay Worker (jsdom).
    await screen.findByText(/▶ Iniciar/);
    expect(screen.getByText(/⏮ Reinicio/)).toBeDefined();
    expect(screen.getByLabelText('Saltar a un instante')).toBeDefined();
    expect(screen.getByText(/t = 00:00/)).toBeDefined();
  });

  it('saltar en la barra adelanta el estado en vivo', async () => {
    render(<App />);
    fireEvent.click(screen.getByText(/Simular y reproducir/));
    const barra = await screen.findByLabelText('Saltar a un instante');
    fireEvent.change(barra, { target: { value: '1800' } });
    expect(screen.getByText(/t = 30:00/)).toBeDefined();
    // La hora del conteo del festivo arranca a las 16:25.
    expect(screen.getByText(/16:55:00/)).toBeDefined();
  });

  it('al llegar al final aparece la tabla de medidas', async () => {
    render(<App />);
    fireEvent.click(screen.getByText(/Simular y reproducir/));
    const barra = await screen.findByLabelText('Saltar a un instante');
    fireEvent.change(barra, { target: { value: barra.max } });
    expect(screen.getByText(/Resultado de la réplica/)).toBeDefined();
    expect(screen.getByText('Wq de la hora (min)')).toBeDefined();
  });

  it('recuerda la configuración en localStorage', () => {
    const { unmount } = render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Configuración' }));
    fireEvent.change(screen.getByLabelText(/Casetas del pozo/), { target: { value: '8' } });
    unmount();

    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Configuración' }));
    expect(screen.getByLabelText(/Casetas del pozo/).value).toBe('8');
  });

  it('si localStorage falla, arranca igual en el escenario base', () => {
    const original = Object.getOwnPropertyDescriptor(window, 'localStorage');
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get() {
        throw new Error('almacenamiento bloqueado');
      },
    });
    try {
      render(<App />);
      expect(screen.getByText('Peaje Los Acacios')).toBeDefined();
      fireEvent.click(screen.getByRole('button', { name: 'Configuración' }));
      expect(screen.getByLabelText(/Casetas del pozo/).value).toBe('6');
    } finally {
      if (original) Object.defineProperty(window, 'localStorage', original);
    }
  });
});
