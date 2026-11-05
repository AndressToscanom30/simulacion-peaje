import { describe, it, expect } from 'vitest';
import {
  camposDelFormulario,
  camposDelPanel,
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
  ADVERTENCIAS,
  FRANJA,
  problemas,
  valorDelCampo,
} from '../modeloFormulario.js';
import {
  CATALOGO_PARAMETROS,
  GRUPOS,
  CONTROLES,
  RUTAS_DEL_PANEL,
  TIPOS_ORIGEN,
} from '../../config/catalogoParametros.js';
import {
  RUTA_PROMEDIO_ATENCION,
  muVehHora,
  lambdasVehHora,
} from '../../config/derivados.js';
import { SEGUNDOS_POR_HORA } from '../../config/parametros.js';
import {
  ESCENARIO_BASE,
  construirEscenario,
  problemasDelEscenario,
  tablaUmbralesPorTasa,
  SERVICIO_LENTO,
} from '../../config/escenario.js';
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

/**
 * **Reescrita en la etapa 4a (DEC-057).** Antes comprobaba que `SUPUESTOS`
 * trajera las claves `PEN-010`, `PEN-013` y `PEN-008`, que además se pintaban
 * en pantalla. Ahora las advertencias no llevan numeración, así que lo que se
 * comprueba es que estén las cuatro y que ninguna cite nada interno.
 */
describe('las advertencias del estudio', () => {
  it('son cuatro, en lenguaje de usuario y sin numeración interna', () => {
    expect(ADVERTENCIAS).toHaveLength(4);
    for (const texto of ADVERTENCIAS) {
      expect(texto.length).toBeGreaterThan(40);
      expect(texto).not.toMatch(/\b(DEC|PEN)-\d/);
    }
  });

  it('cubren las cuatro cosas que no se pueden perder', () => {
    const todo = ADVERTENCIAS.join(' ').toLowerCase();
    // El modelo se queda corto en el pico y las casetas son un mínimo.
    expect(todo).toMatch(/mínimo/);
    // El contraflujo del festivo no se midió.
    expect(todo).toMatch(/supuesto/);
    // El servicio lento es una hipótesis.
    expect(todo).toMatch(/hipótesis/);
    // Lo que se ve en 3D es una animación, no una medida.
    expect(todo).toMatch(/animación/);
  });

  it('la franja dice para qué sirven los resultados, en una línea', () => {
    expect(FRANJA).toMatch(/comparar escenarios/);
    expect(FRANJA).not.toMatch(/\b(DEC|PEN)-\d/);
    expect(FRANJA.split('\n')).toHaveLength(1);
  });
});

describe('de dónde sale cada parámetro', () => {
  it('todos tienen un tipoOrigen de los cuatro válidos', () => {
    const validos = Object.values(TIPOS_ORIGEN);
    for (const parametro of CATALOGO_PARAMETROS) {
      expect(validos, parametro.ruta).toContain(parametro.tipoOrigen);
    }
  });

  it('los cuatro valores se usan al menos una vez', () => {
    const usados = new Set(CATALOGO_PARAMETROS.map((p) => p.tipoOrigen));
    for (const valor of Object.values(TIPOS_ORIGEN)) {
      expect(usados, valor).toContain(valor);
    }
  });

  it('`origen` se queda en el catálogo: genera docs/parametros.md', () => {
    for (const parametro of CATALOGO_PARAMETROS) {
      expect(parametro.origen, parametro.ruta).toBeTruthy();
    }
  });
});

// ===========================================================================
// Panel de la vista 3D: subconjunto del catálogo (DEC-050)
// ===========================================================================

describe('el panel es un subconjunto del catálogo', () => {
  it('devuelve los campos en el orden de la lista, con un factor por sentido', () => {
    expect(camposDelPanel(base).map((c) => c.id)).toEqual([
      'sentidos.0.factorDemanda',
      'sentidos.1.factorDemanda',
      RUTA_PROMEDIO_ATENCION,
      'regla.abrirSiColaMayorQue',
      'regla.cerrarSiColaMenorQue',
      'regla.demoraAperturaSegundos',
      'regla.ventanaCierreSegundos',
      'regla.atenderDuranteTraspaso',
      'regla.prestamoPorColapso',
      'regla.rhoColapso',
    ]);
  });

  it('no hay ni un campo escrito a mano: todos salen del catálogo', () => {
    const rutasDelCatalogo = new Set(CATALOGO_PARAMETROS.map((p) => p.ruta));
    for (const campo of camposDelPanel(base)) {
      const original =
        campo.sentidoIndice === null ? campo.ruta : campo.ruta.replace(/sentidos\.\d+/, 'sentidos[i]');
      expect(rutasDelCatalogo, campo.ruta).toContain(original);
    }
  });

  it('cada campo del panel es el mismo objeto que el del formulario completo', () => {
    const delFormulario = new Map(camposPlanos(base).map((c) => [c.id, c]));
    for (const campo of camposDelPanel(base)) {
      expect(delFormulario.get(campo.id), campo.id).toEqual(campo);
    }
  });

  it('todo campo del panel lleva unidad, rango, origen y control', () => {
    for (const campo of camposDelPanel(base)) {
      expect(campo.unidad, campo.ruta).toBeTruthy();
      expect(campo.rango, campo.ruta).toBeTruthy();
      expect(campo.origen, campo.ruta).toBeTruthy();
      expect(campo.significado, campo.ruta).toBeTruthy();
      expect(Object.values(CONTROLES), campo.ruta).toContain(campo.control);
    }
  });

  it('las rutas por sentido siguen a los sentidos del escenario', () => {
    const factores = camposDelPanel(base).filter((c) => c.ruta.endsWith('factorDemanda'));
    expect(factores).toHaveLength(base.sentidos.length);
    factores.forEach((campo, indice) => {
      expect(campo.sentidoEtiqueta).toBe(base.sentidos[indice].etiqueta);
    });
  });

  it('toda ruta de la lista del panel existe en el catálogo', () => {
    const rutasDelCatalogo = new Set(CATALOGO_PARAMETROS.map((p) => p.ruta));
    for (const ruta of RUTAS_DEL_PANEL) {
      expect(rutasDelCatalogo, ruta).toContain(ruta);
    }
  });
});

// ===========================================================================
// Promedio de atención derivado (DEC-051)
// ===========================================================================

describe('el promedio de atención es derivado y no se escribe por mirarlo', () => {
  it('generar los campos del panel no cambia el escenario', () => {
    const antes = JSON.stringify(base);
    camposDelPanel(base);
    camposPlanos(base);
    expect(JSON.stringify(base)).toBe(antes);
  });

  it('el escenario base conserva θ = 2,58 exacto', () => {
    camposDelPanel(base);
    expect(base.servicio.gammaEscalaSegundos).toBe(2.58);
    expect(base.servicio.gammaForma).toBe(4.68);
    expect(base.servicio.mediaNominalSegundos).toBe(12.1016);
  });

  it('k · θ no es el nominal, y eso es a propósito', () => {
    // 4,68 × 2,58 = 12,0744 contra 12,1016 del nominal (DEC-004 y DEC-027.7).
    expect(base.servicio.gammaForma * base.servicio.gammaEscalaSegundos).toBeCloseTo(12.0744, 6);
    expect(base.servicio.mediaNominalSegundos).not.toBe(
      base.servicio.gammaForma * base.servicio.gammaEscalaSegundos,
    );
  });

  it('el campo muestra el nominal', () => {
    expect(valorDelCampo(base, RUTA_PROMEDIO_ATENCION)).toBe(12.1016);
    const campo = camposDelPanel(base).find((c) => c.ruta === RUTA_PROMEDIO_ATENCION);
    expect(campo.derivado).toBe(true);
    expect(valorDelCampo(base, campo)).toBe(12.1016);
  });

  it('el base no aparece como modificado por tener un campo derivado', () => {
    expect(rutasModificadas(base).size).toBe(0);
  });

  it('editarlo mueve θ y el nominal juntos, con k fijo', () => {
    const editado = cambiarCampo(base, RUTA_PROMEDIO_ATENCION, 15.5);
    expect(editado.servicio.gammaForma).toBe(base.servicio.gammaForma);
    expect(editado.servicio.mediaNominalSegundos).toBe(15.5);
    expect(editado.servicio.gammaEscalaSegundos).toBeCloseTo(15.5 / 4.68, 10);
    // Es el mismo θ del servicio lento de la DEC-025.
    expect(editado.servicio.gammaEscalaSegundos).toBeCloseTo(3.312, 3);
    // Y el CV se conserva, porque CV = 1/√k.
    expect(editado.servicio.gammaForma).toBe(base.servicio.gammaForma);
  });

  it('editarlo no toca nada más del escenario', () => {
    const editado = cambiarCampo(base, RUTA_PROMEDIO_ATENCION, 15.5);
    expect(editado.sentidos).toEqual(base.sentidos);
    expect(editado.pozo).toEqual(base.pozo);
    expect(editado.desempeno).toEqual(base.desempeno);
    expect(editado.servicio.regimen).toBe(base.servicio.regimen);
  });

  it('restablecerlo devuelve exactamente k = 4,68, θ = 2,58 y nominal = 12,1016', () => {
    const editado = cambiarCampo(base, RUTA_PROMEDIO_ATENCION, 15.5);
    const vuelto = restablecerCampo(editado, RUTA_PROMEDIO_ATENCION);
    expect(vuelto.servicio.gammaForma).toBe(4.68);
    expect(vuelto.servicio.gammaEscalaSegundos).toBe(2.58);
    expect(vuelto.servicio.mediaNominalSegundos).toBe(12.1016);
    // Nada de 12,1016 / 4,68 = 2,5858: restablecer no pasa por la escritura.
    expect(vuelto.servicio.gammaEscalaSegundos).not.toBeCloseTo(12.1016 / 4.68, 6);
  });

  it('restablecerlo deja el escenario igual al base', () => {
    const editado = cambiarCampo(base, RUTA_PROMEDIO_ATENCION, 20);
    expect(restablecerCampo(editado, RUTA_PROMEDIO_ATENCION)).toEqual(base);
  });

  it('tras editarlo, el campo derivado se marca como modificado', () => {
    const editado = cambiarCampo(base, RUTA_PROMEDIO_ATENCION, 15.5);
    const modificadas = rutasModificadas(editado);
    expect(modificadas).toContain(RUTA_PROMEDIO_ATENCION);
    expect(modificadas).toContain('servicio.gammaEscalaSegundos');
    expect(modificadas).toContain('servicio.mediaNominalSegundos');
  });

  it('un escenario con el promedio editado sigue validando', () => {
    const editado = cambiarCampo(base, RUTA_PROMEDIO_ATENCION, 15.5);
    expect(problemas(editado)).toEqual([]);
  });
});

describe('las tablas por tasa siguen al nominal nuevo', () => {
  it('si están en null se regeneran con la capacidad nominal nueva', () => {
    // `null` es la marca de "generadas", no escritas a mano (DEC-046).
    const conNull = { ...base, regla: { ...base.regla, abrirSiTasaMayorQue: null } };
    const editado = cambiarCampo(conNull, RUTA_PROMEDIO_ATENCION, 15.5);

    expect(editado.regla.abrirSiTasaMayorQue).not.toBeNull();
    // Con un servicio más lento cabe menos demanda por caseta, así que los
    // umbrales por tasa bajan respecto de los del base.
    expect(editado.regla.abrirSiTasaMayorQue[1]).toBeLessThan(base.regla.abrirSiTasaMayorQue[1]);

    const esperadas = tablaUmbralesPorTasa({
      minimoPorSentido: editado.pozo.minimoPorSentido,
      maximoPorSentido: editado.pozo.maximoPorSentido,
      capacidadNominalPorCaseta: editado.tiempo.duracionIntervaloSegundos / 15.5,
      factor: editado.regla.factorUmbrales,
    }).abrirSiTasaMayorQue;
    expect(editado.regla.abrirSiTasaMayorQue).toEqual(esperadas);
  });

  it('una tabla escrita a mano no se toca', () => {
    const aMano = { 1: 7, 2: 8, 3: 9, 4: 10, 5: null };
    const conTabla = { ...base, regla: { ...base.regla, abrirSiTasaMayorQue: aMano } };
    const editado = cambiarCampo(conTabla, RUTA_PROMEDIO_ATENCION, 15.5);
    expect(editado.regla.abrirSiTasaMayorQue).toEqual(aMano);
  });

  it('el escenario sigue válido con el disparador por tasa encendido', () => {
    const conTasa = {
      ...base,
      regla: { ...base.regla, disparadorPorTasa: true, abrirSiTasaMayorQue: null },
    };
    const editado = cambiarCampo(conTasa, RUTA_PROMEDIO_ATENCION, 15.5);
    expect(problemas(editado)).toEqual([]);
  });
});

describe('μ y λ de solo lectura, para el panel', () => {
  it('μ sale del promedio que muestra el campo', () => {
    expect(muVehHora(base)).toBeCloseTo(297.48, 2);
    const editado = cambiarCampo(base, RUTA_PROMEDIO_ATENCION, 15.5);
    expect(muVehHora(editado)).toBeCloseTo(SEGUNDOS_POR_HORA / 15.5, 6);
  });

  it('hay un λ por cada factor de demanda del panel', () => {
    const factores = camposDelPanel(base).filter((c) => c.ruta.endsWith('factorDemanda'));
    expect(lambdasVehHora(base)).toHaveLength(factores.length);
  });

  it('cambiar el factor desde el panel mueve el λ de ese sentido y no el otro', () => {
    const editado = cambiarCampo(base, 'sentidos.0.factorDemanda', 1.5);
    expect(lambdasVehHora(editado)[0]).toBeCloseTo(1064 * 1.5, 6);
    expect(lambdasVehHora(editado)[1]).toBeCloseTo(lambdasVehHora(base)[1], 6);
  });
});
