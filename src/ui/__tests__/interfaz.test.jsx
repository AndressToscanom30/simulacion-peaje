/**
 * @vitest-environment jsdom
 *
 * Pruebas de los componentes. **Solo este archivo pide jsdom** (DEC-034): las
 * del motor y de lo puro siguen en entorno `node`, que es lo que garantiza que
 * el motor no dependa del DOM (DEC-012).
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';

import App from '../../App.jsx';
import Formulario from '../componentes/Formulario.jsx';
import PanelSupuestos from '../componentes/PanelSupuestos.jsx';
import EsquemaCasetas from '../componentes/EsquemaCasetas.jsx';
import TablaMedidas from '../componentes/TablaMedidas.jsx';
import { construirEscenario } from '../../config/escenario.js';
import { cambiarCampo, restablecerCampo, SUPUESTOS } from '../modeloFormulario.js';
import { simularTraza } from '../../corridas.js';
import { crearClienteSimulacion, fueDescartado } from '../worker/cliente.js';
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
    expect(screen.getByText(/no se interrumpe ningún cobro a medias/)).toBeDefined();
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

/**
 * Pruebas de la aplicación entera.
 *
 * **Reescritas en la etapa 2 de la mejora del frontend (DEC-053, DEC-054).**
 * Las siete que había dependían de las tres pestañas y de que hubiera que
 * pulsar «Simular y reproducir» para ver algo. Ahora:
 *
 * - no hay pestañas, hay tres vistas por `#hash`;
 * - la traza se pide **al abrir**, sin pulsar nada;
 * - el panel edita un **borrador** y recalcular es explícito.
 *
 * Cada prueba dice qué cambió respecto de la que sustituye.
 */
describe('la aplicación entera monta', () => {
  /** Deja el hash en una vista antes de montar. */
  function enVista(hash) {
    window.location.hash = hash;
  }

  /** Monta la app y espera a que llegue la primera traza. */
  async function montarYEsperar() {
    const vista = render(<App />);
    // El cliente corre en el mismo hilo cuando no hay Worker (jsdom).
    await screen.findByLabelText('Saltar a un instante');
    return vista;
  }

  /** Lleva la reproducción al final, donde se ven los totales. */
  function alFinal() {
    const barra = screen.getByLabelText('Saltar a un instante');
    fireEvent.change(barra, { target: { value: barra.max } });
  }

  /** Los atendidos del primer sentido, que dependen de la traza. */
  function atendidosDelPrimerSentido() {
    alFinal();
    const sentido = screen.getAllByRole('heading', { level: 3 })
      .map((h) => h.parentElement)
      .find((e) => e?.className?.includes?.('hud__sentido'));
    return sentido.textContent;
  }

  beforeEach(() => {
    enVista('#/simulacion');
  });

  // Sustituye a «arranca en tiempo real, con los supuestos y las tres
  // pestañas»: ya no hay pestañas ni botón de simular, y la escena arranca sola.
  it('arranca en la simulación, con las tres vistas en la barra', async () => {
    await montarYEsperar();
    expect(screen.getByText('Peaje Los Acacios')).toBeDefined();
    for (const vista of ['Simulación 3D', 'Estudio por lotes', 'Configuración avanzada']) {
      expect(screen.getByRole('link', { name: vista }), vista).toBeDefined();
    }
    expect(screen.getByRole('link', { name: 'Simulación 3D' }).getAttribute('aria-current')).toBe('page');
  });

  // Nueva: lo que antes exigía pulsar un botón ahora pasa solo (DEC-054).
  it('al montar se pide una traza sin pulsar nada', async () => {
    await montarYEsperar();
    expect(screen.getByText(/▶ Iniciar/)).toBeDefined();
    expect(screen.getByText(/⏮ Reinicio/)).toBeDefined();
    expect(screen.getByText(/t = 00:00/)).toBeDefined();
    // Y no hay ningún botón de «simular»: ya no hace falta.
    expect(screen.queryByText(/Simular y reproducir/)).toBeNull();
  });

  // Sustituye a «se puede cambiar de pestaña»: ahora es el hash.
  it('el hash elige la vista, y la barra navega', async () => {
    await montarYEsperar();

    enVista('#/lotes');
    fireEvent(window, new Event('hashchange'));
    expect(screen.getByText('Corrida por lotes')).toBeDefined();

    enVista('#/configuracion');
    fireEvent(window, new Event('hashchange'));
    expect(screen.getByText(/Partir de un escenario del catálogo/)).toBeDefined();
  });

  it('un hash desconocido abre la simulación', async () => {
    enVista('#/lo-que-sea');
    await montarYEsperar();
    expect(screen.getByLabelText('Saltar a un instante')).toBeDefined();
  });

  // Sustituye a «saltar en la barra adelanta el estado en vivo»: los mismos
  // datos, ahora en el HUD sobre la escena.
  it('saltar en la barra adelanta el HUD', async () => {
    await montarYEsperar();
    fireEvent.change(screen.getByLabelText('Saltar a un instante'), { target: { value: '1800' } });
    expect(screen.getByText(/t = 30:00/)).toBeDefined();
    // La hora del conteo del festivo arranca a las 16:25.
    expect(screen.getByText(/16:55:00/)).toBeDefined();
  });

  // Sustituye a «al llegar al final aparece la tabla de medidas»: la tabla vive
  // ahora en el cajón, que hay que abrir.
  // En jsdom no hay WebGL, así que el cajón es el contenido principal y ya
  // está abierto: es justo el comportamiento que pide la etapa.
  it('la tabla de medidas aparece en el cajón al llegar al final', async () => {
    await montarYEsperar();
    expect(screen.getByRole('heading', { name: 'Gráficos y medidas' })).toBeDefined();
    alFinal();
    expect(screen.getByText(/Resultado de la réplica/)).toBeDefined();
    expect(screen.getByText('Wq de la hora (min)')).toBeDefined();
  });

  // Sustituye a «recuerda la configuración en localStorage»: lo que se guarda
  // es el escenario APLICADO, así que hay que aplicar para que se recuerde.
  it('localStorage guarda el escenario aplicado, no el borrador', async () => {
    const { unmount } = await montarYEsperar();
    enVista('#/configuracion');
    fireEvent(window, new Event('hashchange'));

    fireEvent.change(screen.getByLabelText(/Casetas del pozo/), { target: { value: '8' } });
    // Sin aplicar, lo guardado sigue siendo lo de antes.
    expect(JSON.parse(localStorage.getItem('peaje-los-acacios:escenario')).pozo.total).toBe(6);

    fireEvent.click(screen.getAllByRole('button', { name: 'Aplicar y recalcular' })[0]);
    await waitFor(() =>
      expect(JSON.parse(localStorage.getItem('peaje-los-acacios:escenario')).pozo.total).toBe(8),
    );

    unmount();
    enVista('#/configuracion');
    render(<App />);
    expect(screen.getByLabelText(/Casetas del pozo/).value).toBe('8');
  });

  // Igual que antes, con la vista nueva.
  it('si localStorage falla, arranca igual en el escenario base', () => {
    const original = Object.getOwnPropertyDescriptor(window, 'localStorage');
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get() {
        throw new Error('almacenamiento bloqueado');
      },
    });
    try {
      enVista('#/configuracion');
      render(<App />);
      expect(screen.getByText('Peaje Los Acacios')).toBeDefined();
      expect(screen.getByLabelText(/Casetas del pozo/).value).toBe('6');
    } finally {
      if (original) Object.defineProperty(window, 'localStorage', original);
    }
  });
});

describe('borrador y recalcular explícito', () => {
  async function montarYEsperar() {
    const vista = render(<App />);
    await screen.findByLabelText('Saltar a un instante');
    return vista;
  }

  /** El λ que el panel muestra para el primer sentido. */
  const lambdaDelPanel = () => screen.getAllByText(/vehículos por hora/)[0].textContent;

  /** El texto del HUD del primer sentido, que depende de la traza. */
  function hudDelPrimerSentido() {
    const barra = screen.getByLabelText('Saltar a un instante');
    fireEvent.change(barra, { target: { value: barra.max } });
    return document.querySelector('.hud__sentido').textContent;
  }

  beforeEach(() => {
    window.location.hash = '#/simulacion';
  });

  it('editar en el panel marca «Cambios sin aplicar» y NO cambia la traza', async () => {
    await montarYEsperar();
    const antes = hudDelPrimerSentido();
    expect(screen.queryByText('Cambios sin aplicar')).toBeNull();

    // El factor de demanda del primer sentido, que está en el panel.
    const factor = screen.getByLabelText(/Factor de demanda · P→C/);
    fireEvent.change(factor, { target: { value: '2' } });

    expect(screen.getAllByText('Cambios sin aplicar').length).toBeGreaterThan(0);
    // El panel ya muestra el λ nuevo…
    expect(lambdaDelPanel()).toMatch(/2128/);
    // …pero lo que se ve sigue siendo la traza de antes.
    expect(hudDelPrimerSentido()).toBe(antes);
  });

  it('aplicar pide una traza nueva con el borrador', async () => {
    await montarYEsperar();
    const antes = hudDelPrimerSentido();

    fireEvent.change(screen.getByLabelText(/Factor de demanda · P→C/), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar y recalcular' }));

    await waitFor(() => expect(hudDelPrimerSentido()).not.toBe(antes));
    // Ya no quedan cambios pendientes.
    expect(screen.queryByText('Cambios sin aplicar')).toBeNull();
  });

  it('con la traza nueva el reloj vuelve a 0 y en pausa', async () => {
    await montarYEsperar();
    fireEvent.change(screen.getByLabelText('Saltar a un instante'), { target: { value: '1800' } });
    expect(screen.getByText(/t = 30:00/)).toBeDefined();

    fireEvent.change(screen.getByLabelText(/Factor de demanda · P→C/), { target: { value: '1.2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar y recalcular' }));

    await waitFor(() => expect(screen.getByText(/t = 00:00/)).toBeDefined());
    expect(screen.getByText(/▶ Iniciar/)).toBeDefined();
  });

  it('con problemas de validación el botón de aplicar queda deshabilitado', async () => {
    await montarYEsperar();
    fireEvent.change(screen.getByLabelText(/Factor de demanda · P→C/), { target: { value: '-5' } });

    const boton = screen.getByRole('button', { name: /Aplicar y recalcular/ });
    expect(boton.disabled).toBe(true);
    const avisos = screen.getAllByRole('alert').map((e) => e.textContent).join(' ');
    expect(avisos).toMatch(/que corregir/);
  });

  it('descartar devuelve el borrador al aplicado', async () => {
    await montarYEsperar();
    const factor = screen.getByLabelText(/Factor de demanda · P→C/);
    fireEvent.change(factor, { target: { value: '2' } });
    expect(screen.getAllByText('Cambios sin aplicar').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: 'Descartar cambios' }));

    expect(screen.queryByText('Cambios sin aplicar')).toBeNull();
    expect(screen.getByLabelText(/Factor de demanda · P→C/).value).toBe('1');
  });

  it('el panel y la configuración avanzada editan el mismo borrador', async () => {
    await montarYEsperar();
    fireEvent.change(screen.getByLabelText(/Factor de demanda · P→C/), { target: { value: '1.5' } });

    window.location.hash = '#/configuracion';
    fireEvent(window, new Event('hashchange'));
    // El formulario completo ve el mismo cambio.
    expect(screen.getByLabelText(/Factor de demanda · P→C/).value).toBe('1.5');

    // Y al revés: lo que se cambia aquí lo ve el panel.
    fireEvent.change(screen.getByLabelText(/Demora de apertura/), { target: { value: '0' } });
    window.location.hash = '#/simulacion';
    fireEvent(window, new Event('hashchange'));
    expect(screen.getByLabelText(/Demora de apertura/).value).toBe('0');
  });

  it('el botón de lotes se bloquea con cambios sin aplicar y navega sin ellos', async () => {
    await montarYEsperar();
    const boton = screen.getByRole('button', { name: /Correr 30 réplicas/ });
    expect(boton.disabled).toBe(false);

    fireEvent.change(screen.getByLabelText(/Factor de demanda · P→C/), { target: { value: '2' } });
    expect(screen.getByRole('button', { name: /Correr 30 réplicas/ }).disabled).toBe(true);
    expect(screen.getByRole('button', { name: /Correr 30 réplicas/ }).title).toMatch(
      /Aplica los cambios primero/,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Aplicar y recalcular' }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Correr 30 réplicas/ }).disabled).toBe(false),
    );

    fireEvent.click(screen.getByRole('button', { name: /Correr 30 réplicas/ }));
    fireEvent(window, new Event('hashchange'));
    expect(screen.getByText('Corrida por lotes')).toBeDefined();
  });

  it('la semilla está en «Avanzado» y también pasa por aplicar', async () => {
    await montarYEsperar();
    const semilla = screen.getByLabelText(/Semilla del azar/);
    fireEvent.change(semilla, { target: { value: '7' } });
    expect(screen.getAllByText('Cambios sin aplicar').length).toBeGreaterThan(0);
  });

  it('la situación se elige de la lista y marca cambios sin aplicar', async () => {
    await montarYEsperar();
    const selector = screen.getByLabelText('Situación');
    expect(selector.value).toBe('festivo');

    fireEvent.change(selector, { target: { value: 'domingo' } });
    expect(screen.getAllByText('Cambios sin aplicar').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/horas distintas/).length).toBeGreaterThan(0);
  });
});

describe('cancelar un recálculo', () => {
  beforeEach(() => {
    window.location.hash = '#/simulacion';
  });

  it('conserva la traza anterior y el borrador como estaba', async () => {
    render(<App />);
    const barra = await screen.findByLabelText('Saltar a un instante');
    fireEvent.change(barra, { target: { value: barra.max } });
    const antes = document.querySelector('.hud__sentido').textContent;

    // Se descarta lo pendiente directamente en el cliente, que es lo que hace
    // el botón «Cancelar»: una traza no se puede cortar a mitad, así que lo que
    // se corta es su respuesta (DEC-054).
    const cliente = crearClienteSimulacion();
    const pedido = cliente.pedir({ tipo: 'traza', escenario: construirEscenario(), semilla: 1 });
    cliente.descartarPendientes();
    await expect(pedido).rejects.toThrow(/descartó/);

    // La traza que se veía sigue ahí.
    const despues = screen.getByLabelText('Saltar a un instante');
    fireEvent.change(despues, { target: { value: despues.max } });
    expect(document.querySelector('.hud__sentido').textContent).toBe(antes);
  });

  it('un pedido descartado se distingue de un error de verdad', async () => {
    const cliente = crearClienteSimulacion();
    const pedido = cliente.pedir({ tipo: 'traza', escenario: construirEscenario(), semilla: 1 });
    cliente.descartarPendientes();
    try {
      await pedido;
      throw new Error('tenía que haber fallado');
    } catch (e) {
      expect(fueDescartado(e)).toBe(true);
      expect(e.name).toBe('PedidoDescartado');
    }
    // Un trabajo que no existe sí es un error.
    const otro = crearClienteSimulacion();
    await expect(otro.pedir({ tipo: 'inventado' })).rejects.toThrow(/desconocido/);
  });
});
