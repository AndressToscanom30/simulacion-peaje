import { describe, it, expect } from 'vitest';
import {
  camposDelFormulario,
  camposPlanos,
  cambiarCampo,
  escribirRuta,
  esSensibilidad,
  interpretarValor,
  leerRuta,
  opcionesDe,
  restablecerCampo,
  restablecerTodo,
  rutasModificadas,
  serieDelCampo,
  sonIguales,
  SUPUESTOS,
} from '../modeloFormulario.js';
import { CATALOGO_PARAMETROS, GRUPOS, CONTROLES } from '../../config/catalogoParametros.js';
import { ESCENARIO_BASE, construirEscenario, problemasDelEscenario, SERVICIO_LENTO } from '../../config/escenario.js';
import { conteos } from '../../config/datos.js';

const base = construirEscenario();

describe('los campos se generan del catálogo', () => {
  it('no hay ningún campo escrito a mano: salen todos del catálogo', () => {
    const rutasDelCatalogo = new Set(CATALOGO_PARAMETROS.map((p) => p.ruta));
    for (const campo of camposPlanos(base)) {
      const original = campo.sentidoIndice === null ? campo.ruta : campo.ruta.replace(/sentidos\.\d+/, 'sentidos[i]');
      expect(rutasDelCatalogo, campo.ruta).toContain(original);
    }
  });

  it('cada parámetro del catálogo aparece en el formulario', () => {
    const campos = camposPlanos(base);
    for (const parametro of CATALOGO_PARAMETROS) {
      const esperados = parametro.ruta.startsWith('sentidos[i]') ? base.sentidos.length : 1;
      const encontrados = campos.filter(
        (c) => (c.sentidoIndice === null ? c.ruta : c.ruta.replace(/sentidos\.\d+/, 'sentidos[i]')) === parametro.ruta,
      );
      expect(encontrados, parametro.ruta).toHaveLength(esperados);
    }
  });

  it('las secciones son las que pide la fase 5 y están en orden', () => {
    expect(camposDelFormulario(base).map((s) => s.titulo)).toEqual([
      'Demanda',
      'Servicio',
      'Pozo y casetas',
      'Regla de apertura y cierre',
      'Reparto entre sentidos',
      'Criterio de desempeño',
      'Corrida',
    ]);
  });

  it('todo campo lleva unidad, rango, origen y tipo de control', () => {
    for (const campo of camposPlanos(base)) {
      expect(campo.unidad, campo.ruta).toBeTruthy();
      expect(campo.rango, campo.ruta).toBeTruthy();
      expect(campo.origen, campo.ruta).toBeTruthy();
      expect(Object.values(CONTROLES), campo.ruta).toContain(campo.control);
      expect(campo.significado, campo.ruta).toBeTruthy();
    }
  });

  it('los parámetros por sentido generan un campo por sentido, etiquetado', () => {
    const porSentido = camposPlanos(base).filter((c) => c.sentidoIndice !== null);
    expect(porSentido.length).toBeGreaterThan(0);
    for (const campo of porSentido) {
      expect(campo.sentidoEtiqueta).toBe(base.sentidos[campo.sentidoIndice].etiqueta);
      expect(campo.nombreCompleto).toContain(campo.sentidoEtiqueta);
    }
  });

  it('todos los grupos del catálogo existen como sección', () => {
    for (const parametro of CATALOGO_PARAMETROS) {
      expect(Object.keys(GRUPOS), parametro.ruta).toContain(parametro.grupo);
    }
  });
});

describe('leer y escribir rutas', () => {
  it('lee rutas con punto, incluidos los sentidos', () => {
    expect(leerRuta(base, 'pozo.total')).toBe(6);
    expect(leerRuta(base, 'sentidos.0.conteo')).toBe('festivoPC');
    expect(leerRuta(base, 'no.existe')).toBeUndefined();
  });

  it('escribir no muta el original', () => {
    const antes = JSON.stringify(base);
    const nuevo = escribirRuta(base, 'pozo.total', 9);
    expect(nuevo.pozo.total).toBe(9);
    expect(base.pozo.total).toBe(6);
    expect(JSON.stringify(base)).toBe(antes);
  });

  it('escribir en un sentido no toca el otro', () => {
    const nuevo = escribirRuta(base, 'sentidos.1.factorDemanda', 1.5);
    expect(nuevo.sentidos[1].factorDemanda).toBe(1.5);
    expect(nuevo.sentidos[0].factorDemanda).toBe(1);
  });

  it('compara arreglos y tablas por contenido', () => {
    expect(sonIguales([1, 2], [1, 2])).toBe(true);
    expect(sonIguales([1, 2], [2, 1])).toBe(false);
    expect(sonIguales({ 1: 4 }, { 1: 4 })).toBe(true);
    expect(sonIguales(null, null)).toBe(true);
    expect(sonIguales(null, 0)).toBe(false);
  });
});

describe('el modelo y el escenario van y vuelven sin pérdida', () => {
  it('el base no tiene nada modificado', () => {
    expect(rutasModificadas(base).size).toBe(0);
  });

  it('cambiar y restablecer un campo devuelve el escenario exacto', () => {
    const rutas = [
      ['pozo.total', 9],
      ['sentidos.0.colaInicial', 0],
      ['sentidos.1.factorDemanda', 1.5],
      ['regla.demoraAperturaSegundos', 0],
      ['regla.reasignacionActiva', true],
      ['desempeno.metaWqSegundos', 90],
      ['corridas.replicas', 10],
      ['servicio.gammaEscalaSegundos', 3],
    ];
    for (const [ruta, valor] of rutas) {
      const cambiado = cambiarCampo(base, ruta, valor);
      expect(rutasModificadas(cambiado).has(ruta), ruta).toBe(true);
      expect(JSON.stringify(restablecerCampo(cambiado, ruta)), ruta).toBe(JSON.stringify(base));
    }
  });

  it('restablecer todo vuelve al base', () => {
    let e = cambiarCampo(base, 'pozo.total', 10);
    e = cambiarCampo(e, 'sentidos.0.colaInicial', 99);
    expect(JSON.stringify(restablecerTodo())).toBe(JSON.stringify(base));
  });

  it('un escenario modificado sigue siendo serializable sin perder nada', () => {
    let e = cambiarCampo(base, 'sentidos.0.llegadas', new Array(12).fill(70));
    e = cambiarCampo(e, 'pozo.total', 8);
    expect(JSON.parse(JSON.stringify(e))).toEqual(e);
  });
});

describe('las tablas de umbrales siguen al tope', () => {
  it('subir el tope regenera los umbrales y el escenario sigue válido', () => {
    let e = cambiarCampo(base, 'pozo.total', 8);
    e = cambiarCampo(e, 'pozo.maximoPorSentido', 7);
    expect(e.regla.abrirSiColaMayorQue).toEqual({ 1: 4, 2: 9, 3: 14, 4: 19, 5: 24, 6: 29, 7: null });
    expect(problemasDelEscenario(e)).toEqual([]);
  });

  it('un pozo de 10 con tope 9 también queda válido', () => {
    let e = cambiarCampo(base, 'pozo.total', 10);
    e = cambiarCampo(e, 'pozo.maximoPorSentido', 9);
    expect(problemasDelEscenario(e)).toEqual([]);
    expect(Object.keys(e.regla.abrirSiColaMayorQue)).toHaveLength(9);
  });

  it('el factor de umbrales los reescala sin dejar el escenario inválido', () => {
    const e = cambiarCampo(base, 'regla.factorUmbrales', 1.4);
    expect(e.regla.abrirSiColaMayorQue[1]).toBe(Math.round(4 * 1.4));
    expect(problemasDelEscenario(e)).toEqual([]);
  });

  it('bajar el tope recorta las tablas y avisa de las casetas iniciales', () => {
    // Bajar el tope a 3 deja las 4 casetas iniciales del base fuera de rango.
    // El formulario tiene que decirlo, no simular mal en silencio (DEC-032).
    let e = cambiarCampo(base, 'pozo.maximoPorSentido', 3);
    expect(e.regla.abrirSiColaMayorQue[3]).toBeNull();
    expect(Object.keys(e.regla.abrirSiColaMayorQue)).toHaveLength(3);
    expect(problemasDelEscenario(e).join(' ')).toMatch(/casetasIniciales.*entre el mínimo \(1\) y el tope por sentido \(3\)/);

    // Y al corregir las casetas iniciales, queda válido.
    e = cambiarCampo(e, 'sentidos.0.casetasIniciales', 3);
    expect(problemasDelEscenario(e)).toEqual([]);
  });
});

describe('la validación rechaza lo absurdo desde el formulario', () => {
  const casos = [
    ['pozo.total', 1, /no alcanza para el mínimo/],
    ['pozo.maximoPorSentido', 99, /no puede pasar del tamaño del pozo/],
    ['sentidos.0.factorDemanda', 0, /factorDemanda/],
    ['sentidos.0.colaInicial', -5, /colaInicial/],
    ['sentidos.0.casetasIniciales', 9, /casetasIniciales/],
    ['servicio.gammaForma', 0, /gammaForma/],
    ['desempeno.metaWqSegundos', 9999, /no puede ser mayor que el máximo tolerable/],
    ['corridas.replicas', 0, /corridas.replicas/],
    ['sentidos.0.llegadas', [1, 2, 3], /llegadas/],
    ['sentidos.0.modo', 'inventado', /modo/],
  ];

  for (const [ruta, valor, patron] of casos) {
    it(`${ruta} = ${JSON.stringify(valor)} da un mensaje claro`, () => {
      const problemas = problemasDelEscenario(cambiarCampo(base, ruta, valor));
      expect(problemas.length).toBeGreaterThan(0);
      expect(problemas.join(' ')).toMatch(patron);
    });
  }
});

describe('interpretar los valores que llegan del formulario', () => {
  const campoDe = (ruta) => camposPlanos(base).find((c) => c.ruta === ruta);

  it('lee enteros, números con coma y booleanos', () => {
    expect(interpretarValor(campoDe('pozo.total'), '8')).toBe(8);
    expect(interpretarValor(campoDe('pozo.total'), 'nada')).toBeNull();
    expect(interpretarValor(campoDe('regla.rhoReasignacion'), '0,75')).toBe(0.75);
    expect(interpretarValor(campoDe('regla.reasignacionActiva'), true)).toBe(true);
    expect(interpretarValor(campoDe('regla.reasignacionActiva'), 'false')).toBe(false);
  });

  it('las opciones de conteo y de modo salen de los datos', () => {
    const opcionesConteo = opcionesDe(campoDe('sentidos.0.conteo'));
    expect(opcionesConteo.map((o) => o.valor).sort()).toEqual(Object.keys(conteos).sort());
    expect(opcionesDe(campoDe('sentidos.0.modo')).map((o) => o.valor)).toEqual(['regla', 'programado']);
  });
});

describe('series por intervalo', () => {
  const campoLlegadas = () => camposPlanos(base).find((c) => c.ruta === 'sentidos.0.llegadas');

  it('con null muestra las del conteo, marcadas como no propias', () => {
    const serie = serieDelCampo(base, campoLlegadas());
    expect(serie.propia).toBe(false);
    expect(serie.valores).toEqual(conteos.festivoPC.llegadas);
  });

  it('con un arreglo muestra el propio', () => {
    const e = cambiarCampo(base, 'sentidos.0.llegadas', new Array(12).fill(40));
    const serie = serieDelCampo(e, campoLlegadas());
    expect(serie.propia).toBe(true);
    expect(serie.valores).toEqual(new Array(12).fill(40));
  });

  it('las casetas fijas salen de las observadas del conteo', () => {
    const campo = camposPlanos(base).find((c) => c.ruta === 'sentidos.0.casetasFijas');
    expect(serieDelCampo(base, campo).valores).toEqual(conteos.festivoPC.casetas);
  });
});

describe('rótulo de sensibilidad', () => {
  const campoDe = (escenario, ruta) => camposPlanos(escenario).find((c) => c.ruta === ruta);

  it('el servicio base no es sensibilidad y el lento sí', () => {
    expect(esSensibilidad(campoDe(base, 'servicio.regimen'), base)).toBe(false);
    const lento = construirEscenario({ servicio: SERVICIO_LENTO });
    expect(esSensibilidad(campoDe(lento, 'servicio.regimen'), lento)).toBe(true);
  });

  it('el sustituto por defecto de C→P no es sensibilidad y los otros sí', () => {
    expect(esSensibilidad(campoDe(base, 'sentidos.1.conteo'), base)).toBe(false);
    for (const conteo of ['domingoPC', 'domingoCP']) {
      const e = construirEscenario({ sentidos: [{}, { conteo }] });
      expect(esSensibilidad(campoDe(e, 'sentidos.1.conteo'), e), conteo).toBe(true);
    }
  });

  it('ofrecerPozoPorRho va marcado como sensibilidad', () => {
    expect(esSensibilidad(campoDe(base, 'regla.ofrecerPozoPorRho'), base)).toBe(true);
  });

  it('el conteo de P→C no se marca: es el dato de campo del festivo', () => {
    expect(esSensibilidad(campoDe(base, 'sentidos.0.conteo'), base)).toBe(false);
  });
});

describe('los supuestos del panel fijo', () => {
  it('son los tres no medidos, con su pendiente', () => {
    expect(SUPUESTOS.map((s) => s.clave)).toEqual(['PEN-010', 'PEN-013', 'PEN-008']);
    for (const supuesto of SUPUESTOS) {
      expect(supuesto.titulo).toBeTruthy();
      expect(supuesto.texto.length).toBeGreaterThan(40);
    }
  });
});
