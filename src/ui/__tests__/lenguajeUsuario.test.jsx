/**
 * @vitest-environment jsdom
 *
 * La interfaz no muestra numeración interna (DEC-056).
 *
 * Esta es la prueba que **invierte** la que había antes: la vieja exigía que el
 * formulario mostrara el `origen` con su «DEC-», porque entonces se consideraba
 * parte de la información del campo. Ahora falla si aparece.
 *
 * Los comentarios del código, los documentos de `docs/` y los informes
 * generados **conservan** la numeración: eso no cambia, y por eso la prueba
 * mira solo lo que el navegador pinta.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';

import App from '../../App.jsx';
import PanelVista3D, { Leyenda } from '../vista3d/PanelVista3D.jsx';
import { construirEscenario } from '../../config/escenario.js';
import { simularTraza } from '../../corridas.js';
import { VISTAS } from '../rutas.js';
import { ADVERTENCIAS, FRANJA } from '../modeloFormulario.js';
import { ESTADOS_CASETA } from '../../config/escena3d.js';

/** Numeración interna: `DEC-42`, `PEN-8`… */
const NUMERACION = /\b(DEC|PEN)-\d/;

/** Claves de conteo, que son identificadores de código y no días. */
const CLAVES_DE_CONTEO = /\b(festivoPC|domingoCP|domingoPC)\b/;

const escenario = construirEscenario();
const traza = simularTraza(escenario, 1);

afterEach(cleanup);
beforeEach(() => {
  try {
    localStorage.clear();
  } catch {
    // En jsdom siempre hay localStorage, pero no se depende de él.
  }
});

/** Todo el texto visible más los atributos que el usuario puede leer. */
function textoYAtributos() {
  const partes = [document.body.textContent ?? ''];
  for (const atributo of ['title', 'aria-label', 'placeholder', 'alt']) {
    for (const nodo of document.querySelectorAll(`[${atributo}]`)) {
      partes.push(nodo.getAttribute(atributo) ?? '');
    }
  }
  return partes.join(' \n ');
}

describe('ninguna vista muestra numeración interna', () => {
  /** Abre todo lo plegable que haya: cajón, leyenda, detalles. */
  function desplegarTodo() {
    for (const detalle of document.querySelectorAll('details')) {
      detalle.open = true;
    }
    for (const boton of document.querySelectorAll('button')) {
      const etiqueta = boton.textContent ?? '';
      if (/Gráficos y medidas|Avanzado|Leyenda/.test(etiqueta)) fireEvent.click(boton);
    }
  }

  it.each(VISTAS.map((v) => [v.titulo, v.clave]))(
    'la vista «%s» no muestra DEC- ni PEN-',
    async (titulo, clave) => {
      window.location.hash = `#/${clave}`;
      render(<App />);

      // La vista de simulación llega con traza; las otras dos no la necesitan.
      if (clave === 'simulacion') {
        const barra = await screen.findByLabelText('Saltar a un instante');
        // Hasta el final, que es donde aparece la tabla de medidas.
        fireEvent.change(barra, { target: { value: barra.max } });
      } else {
        await waitFor(() => expect(document.body.textContent).toBeTruthy());
      }

      desplegarTodo();

      expect(textoYAtributos(), titulo).not.toMatch(NUMERACION);
      // Y tampoco las claves de conteo, que son nombres de código.
      expect(textoYAtributos(), titulo).not.toMatch(CLAVES_DE_CONTEO);
    },
  );

  it('tampoco se ven las claves de conteo, que son nombres de código', async () => {
    window.location.hash = '#/simulacion';
    render(<App />);
    await screen.findByLabelText('Saltar a un instante');
    desplegarTodo();
    expect(textoYAtributos()).not.toMatch(CLAVES_DE_CONTEO);
  });

  it('la vista de lotes, con una corrida hecha, tampoco', async () => {
    window.location.hash = '#/lotes';
    render(<App />);

    const correr = await screen.findByRole('button', { name: /Correr/ });
    fireEvent.click(correr);
    await waitFor(() => expect(screen.queryByText(/Corriendo/)).toBeNull(), { timeout: 20000 });

    desplegarTodo();
    expect(textoYAtributos()).not.toMatch(NUMERACION);
    expect(textoYAtributos()).not.toMatch(CLAVES_DE_CONTEO);
  }, 30000);
});

describe('el panel de la vista 3D, montado solo', () => {
  /** Monta el panel como lo usa la vista de simulación. */
  function montar() {
    return render(
      <PanelVista3D
        traza={traza}
        escenario={escenario}
        instante={1800}
        visible
        alCambiarVisible={() => {}}
        conInterruptor={false}
      />,
    );
  }

  it('no muestra numeración interna, ni con la leyenda abierta', () => {
    montar();
    for (const detalle of document.querySelectorAll('details')) {
      detalle.open = true;
    }
    expect(textoYAtributos()).not.toMatch(NUMERACION);
  });

  it('el aviso de que no hay WebGL sigue estando, y es funcional', () => {
    montar();
    // En jsdom no hay WebGL: el panel avisa.
    const aviso = screen.getByRole('alert');
    expect(aviso.textContent).toMatch(/no tiene WebGL/);
    expect(aviso.textContent).not.toMatch(NUMERACION);
  });
});

describe('la franja de advertencias está donde hace falta', () => {
  it.each([['simulacion'], ['lotes']])('aparece en la vista %s', async (clave) => {
    window.location.hash = `#/${clave}`;
    render(<App />);
    await waitFor(() => expect(screen.getByText(FRANJA)).toBeDefined());
    expect(screen.getByRole('button', { name: 'Cómo leer los resultados' })).toBeDefined();
  });

  it('no aparece en la configuración avanzada, que no muestra resultados', async () => {
    window.location.hash = '#/configuracion';
    render(<App />);
    await waitFor(() => expect(document.body.textContent).toBeTruthy());
    expect(screen.queryByText(FRANJA)).toBeNull();
  });

  it('el botón abre el panel con las cuatro advertencias', async () => {
    window.location.hash = '#/lotes';
    render(<App />);
    await waitFor(() => expect(screen.getByText(FRANJA)).toBeDefined());
    for (const texto of ADVERTENCIAS) {
      expect(screen.getByText(texto), texto.slice(0, 25)).toBeDefined();
    }
  });
});

describe('la leyenda compacta conserva las señales', () => {
  it('cada estado de caseta trae muestra, texto y figura', () => {
    // Se monta la leyenda sola: en jsdom no hay WebGL, así que el panel no
    // llega a dibujar la escena ni lo que va con ella.
    render(<Leyenda />);
    for (const detalle of document.querySelectorAll('details')) detalle.open = true;

    const elementos = [...document.querySelectorAll('.leyenda-3d__lista li')];
    expect(elementos).toHaveLength(Object.keys(ESTADOS_CASETA).length);
    for (const estado of Object.values(ESTADOS_CASETA)) {
      const suyo = elementos.find((e) => e.textContent.includes(estado.etiqueta));
      expect(suyo, estado.clave).toBeDefined();
      // El color no es la única señal: también el texto y la figura (DEC-039).
      expect(suyo.querySelector('.muestra'), estado.clave).not.toBeNull();
      expect(suyo.textContent, estado.clave).toContain(estado.texto);
      expect(suyo.textContent, estado.clave).toContain(estado.figura);
    }
  });
});
