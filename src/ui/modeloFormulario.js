/**
 * Modelo del formulario de configuración: la capa pura entre los campos de la
 * interfaz y el escenario.
 *
 * No toca el DOM ni React: lee y escribe rutas de un escenario, dice qué difiere
 * del base, y restablece campos. Así el formulario se puede probar sin montar
 * nada (DEC-034).
 *
 * Los campos **se generan** desde `catalogoParametros.js`; aquí no hay ninguna
 * lista de campos escrita a mano (DEC-030).
 *
 * JS puro: no importa React, ni DOM, ni Three.js.
 */

import {
  CATALOGO_PARAMETROS,
  GRUPOS,
  CONTROLES,
  RUTAS_DEL_PANEL,
} from '../config/catalogoParametros.js';
import { conteos } from '../config/datos.js';
import {
  esDerivado,
  leerDerivado,
  parcheDerivado,
  rutasAtadas,
} from '../config/derivados.js';
import {
  ESCENARIO_BASE,
  MODO,
  construirEscenario,
  problemasDelEscenario,
  tablaUmbralesPorTasa,
  tablasUmbrales,
} from '../config/escenario.js';

/** Ruta del tiempo nominal, de la que dependen las tablas por tasa (DEC-046). */
const RUTA_NOMINAL = 'servicio.mediaNominalSegundos';

/** ¿La ruta es de un parámetro que hay uno por sentido? */
export const esPorSentido = (ruta) => ruta.startsWith('sentidos[i]');

/** Convierte `sentidos[i].x` en `sentidos.0.x`. */
const rutaDeSentido = (ruta, indice) => ruta.replace('sentidos[i]', `sentidos.${indice}`);

/** Lee una ruta con puntos de un objeto. */
export function leerRuta(objeto, ruta) {
  return ruta.split('.').reduce((actual, clave) => actual?.[clave], objeto);
}

/** Devuelve una copia del objeto con la ruta cambiada. No muta el original. */
export function escribirRuta(objeto, ruta, valor) {
  const claves = ruta.split('.');
  const copia = Array.isArray(objeto) ? [...objeto] : { ...objeto };
  let actual = copia;
  for (let i = 0; i < claves.length - 1; i += 1) {
    const clave = claves[i];
    const hijo = actual[clave];
    actual[clave] = Array.isArray(hijo) ? [...hijo] : { ...hijo };
    actual = actual[clave];
  }
  actual[claves.at(-1)] = valor;
  return copia;
}

/**
 * Los campos del formulario, agrupados por sección, generados del catálogo.
 *
 * Un parámetro por sentido genera **un campo por sentido**, con su etiqueta.
 *
 * @param {object} escenario para saber cuántos sentidos hay y cómo se llaman
 */
export function camposDelFormulario(escenario) {
  const secciones = Object.entries(GRUPOS).map(([clave, titulo]) => ({
    clave,
    titulo,
    campos: [],
  }));
  const porClave = new Map(secciones.map((s) => [s.clave, s]));

  for (const parametro of CATALOGO_PARAMETROS) {
    const seccion = porClave.get(parametro.grupo);
    if (!seccion) continue;

    if (esPorSentido(parametro.ruta)) {
      escenario.sentidos.forEach((sentido, indice) => {
        seccion.campos.push({
          ...parametro,
          id: rutaDeSentido(parametro.ruta, indice),
          ruta: rutaDeSentido(parametro.ruta, indice),
          sentidoIndice: indice,
          sentidoEtiqueta: sentido.etiqueta,
          nombreCompleto: `${parametro.nombre} · ${sentido.etiqueta}`,
        });
      });
    } else {
      seccion.campos.push({
        ...parametro,
        id: parametro.ruta,
        sentidoIndice: null,
        nombreCompleto: parametro.nombre,
      });
    }
  }

  return secciones.filter((s) => s.campos.length > 0);
}

/** Todos los campos en una lista plana. */
export function camposPlanos(escenario) {
  return camposDelFormulario(escenario).flatMap((s) => s.campos);
}

/**
 * Los campos del **panel de la vista 3D**: un subconjunto del catálogo, en el
 * orden de `RUTAS_DEL_PANEL` (DEC-050).
 *
 * Reutiliza `camposDelFormulario` y filtra: no hay ni un campo escrito a mano,
 * así que el panel y el formulario completo no pueden discrepar en unidad,
 * rango, control ni significado.
 *
 * Una ruta por sentido devuelve **un campo por sentido**, en el orden de los
 * sentidos del escenario.
 *
 * @param {object} escenario
 * @returns {object[]} lista plana de campos, ordenada
 */
export function camposDelPanel(escenario) {
  const porRuta = new Map();
  for (const campo of camposPlanos(escenario)) {
    const original = esPorSentido(campo.ruta) || campo.sentidoIndice !== null
      ? campo.ruta.replace(/sentidos\.\d+/, 'sentidos[i]')
      : campo.ruta;
    if (!porRuta.has(original)) porRuta.set(original, []);
    porRuta.get(original).push(campo);
  }

  return RUTAS_DEL_PANEL.flatMap((ruta) => porRuta.get(ruta) ?? []);
}

/**
 * Valor que un campo muestra.
 *
 * Los parámetros derivados no viven en el escenario: se calculan (DEC-051).
 * Para todo lo demás es `leerRuta`.
 */
export function valorDelCampo(escenario, campo) {
  const ruta = typeof campo === 'string' ? campo : campo.ruta;
  return esDerivado(ruta) ? leerDerivado(escenario, ruta) : leerRuta(escenario, ruta);
}

/** Compara dos valores de parámetro, incluidos arreglos y tablas. */
export function sonIguales(a, b) {
  if (a === b) return true;
  if (a === null || b === null || a === undefined || b === undefined) return false;
  if (typeof a === 'object' || typeof b === 'object') {
    return JSON.stringify(a) === JSON.stringify(b);
  }
  return false;
}

/**
 * Rutas que difieren del escenario base, para marcarlas en la interfaz.
 *
 * @param {object} escenario
 * @param {object} [base=ESCENARIO_BASE]
 * @returns {Set<string>} rutas con punto, ya resueltas por sentido
 */
export function rutasModificadas(escenario, base = ESCENARIO_BASE) {
  const completo = construirEscenario({}, base);
  const modificadas = new Set();
  for (const campo of camposPlanos(escenario)) {
    if (!sonIguales(valorDelCampo(escenario, campo), valorDelCampo(completo, campo))) {
      modificadas.add(campo.ruta);
    }
  }
  return modificadas;
}

/**
 * Cambia un campo y devuelve el escenario nuevo, ya recompuesto.
 *
 * Si el campo cambia el tope o el mínimo por sentido, **se regeneran las tablas
 * de umbrales** para que sigan al tope (DEC-031): si no, un pozo de 8 quedaría
 * con umbrales de tope 5 y el escenario no validaría.
 *
 * @param {object} escenario
 * @param {string} ruta ruta con punto
 * @param {*} valor
 */
export function cambiarCampo(escenario, ruta, valor) {
  let siguiente;

  if (esDerivado(ruta)) {
    // Un derivado no se escribe en su propia ruta —no existe—: se aplica el
    // parche de las rutas que ata (DEC-051).
    siguiente = escenario;
    for (const [atada, suValor] of Object.entries(parcheDerivado(escenario, ruta, valor))) {
      siguiente = escribirRuta(siguiente, atada, suValor);
    }
  } else {
    siguiente = escribirRuta(escenario, ruta, valor);
  }

  // Las tablas por tasa salen de la capacidad nominal (DEC-046), así que un
  // nominal nuevo las desfasa. Solo se regeneran si están en `null`, que es la
  // marca de "generadas, no escritas a mano".
  if (ruta === RUTA_NOMINAL || (esDerivado(ruta) && rutasAtadas(ruta).includes(RUTA_NOMINAL))) {
    if (siguiente.regla.abrirSiTasaMayorQue === null) {
      const { abrirSiTasaMayorQue } = tablaUmbralesPorTasa({
        minimoPorSentido: siguiente.pozo.minimoPorSentido,
        maximoPorSentido: siguiente.pozo.maximoPorSentido,
        capacidadNominalPorCaseta:
          siguiente.tiempo.duracionIntervaloSegundos / siguiente.servicio.mediaNominalSegundos,
        factor: siguiente.regla.factorUmbrales,
      });
      siguiente = escribirRuta(siguiente, 'regla.abrirSiTasaMayorQue', abrirSiTasaMayorQue);
    }
  }

  if (ruta === 'pozo.maximoPorSentido' || ruta === 'pozo.minimoPorSentido') {
    const tablas = tablasUmbrales({
      minimoPorSentido: siguiente.pozo.minimoPorSentido,
      maximoPorSentido: siguiente.pozo.maximoPorSentido,
      factor: siguiente.regla.factorUmbrales,
    });
    siguiente = escribirRuta(siguiente, 'regla.abrirSiColaMayorQue', tablas.abrirSiColaMayorQue);
    siguiente = escribirRuta(siguiente, 'regla.cerrarSiColaMenorQue', tablas.cerrarSiColaMenorQue);
  }

  if (ruta === 'regla.factorUmbrales') {
    const tablas = tablasUmbrales({
      minimoPorSentido: siguiente.pozo.minimoPorSentido,
      maximoPorSentido: siguiente.pozo.maximoPorSentido,
      factor: valor,
    });
    siguiente = escribirRuta(siguiente, 'regla.abrirSiColaMayorQue', tablas.abrirSiColaMayorQue);
    siguiente = escribirRuta(siguiente, 'regla.cerrarSiColaMenorQue', tablas.cerrarSiColaMenorQue);
  }

  return siguiente;
}

/**
 * Devuelve un campo a su valor del base.
 *
 * Un **derivado** no se restablece volviendo a escribirlo: se devuelven sus
 * rutas atadas al valor del base (DEC-051). Si se escribiera, el promedio del
 * base (12,1016 s) daría θ = 2,5858 s y no los 2,58 s de la DEC-004, porque
 * k · θ y el nominal son distintos a propósito (DEC-027 punto 7).
 */
export function restablecerCampo(escenario, ruta, base = ESCENARIO_BASE) {
  const completo = construirEscenario({}, base);

  if (esDerivado(ruta)) {
    let siguiente = escenario;
    for (const atada of rutasAtadas(ruta)) {
      siguiente = escribirRuta(siguiente, atada, leerRuta(completo, atada));
    }
    return siguiente;
  }

  return cambiarCampo(escenario, ruta, leerRuta(completo, ruta));
}

/** Devuelve todo el escenario al base, conservando el nombre. */
export function restablecerTodo(base = ESCENARIO_BASE) {
  return construirEscenario({}, base);
}

/**
 * Convierte el texto de un campo al tipo que el parámetro espera.
 *
 * Los campos de la interfaz llegan como cadenas; esto es lo que decide si se
 * leen como entero, número, booleano o se dejan tal cual.
 *
 * @param {object} campo del catálogo
 * @param {string|boolean} crudo
 */
export function interpretarValor(campo, crudo) {
  switch (campo.control) {
    case CONTROLES.ENTERO: {
      const numero = Number.parseInt(crudo, 10);
      return Number.isNaN(numero) ? null : numero;
    }
    case CONTROLES.NUMERO: {
      const numero = Number.parseFloat(String(crudo).replace(',', '.'));
      return Number.isNaN(numero) ? null : numero;
    }
    case CONTROLES.BOOLEANO:
      return typeof crudo === 'boolean' ? crudo : crudo === 'true';
    default:
      return crudo;
  }
}

/** Opciones de los campos de selección. */
export function opcionesDe(campo) {
  if (campo.control === CONTROLES.CONTEO) {
    return Object.entries(conteos).map(([clave, conteo]) => ({
      valor: clave,
      etiqueta: `${clave} — ${conteo.llegadas.reduce((a, b) => a + b, 0)} veh/h`,
      titulo: conteo.etiqueta,
    }));
  }
  if (campo.control === CONTROLES.MODO) {
    return [
      { valor: MODO.REGLA, etiqueta: 'regla por cola' },
      { valor: MODO.PROGRAMADO, etiqueta: 'programado (el operador)' },
    ];
  }
  return [];
}

/**
 * Serie que un campo de intervalos debe mostrar. Si el escenario la tiene en
 * `null`, se muestra la del conteo, para poder editarla a partir de ahí.
 *
 * @returns {{valores: number[], propia: boolean}}
 */
export function serieDelCampo(escenario, campo) {
  const valor = leerRuta(escenario, campo.ruta);
  if (Array.isArray(valor)) return { valores: valor, propia: true };

  const sentido = escenario.sentidos[campo.sentidoIndice];
  const conteo = conteos[sentido?.conteo];
  if (!conteo) return { valores: new Array(escenario.tiempo.intervalos).fill(0), propia: false };

  const deLaRuta = campo.ruta.endsWith('casetasFijas') ? conteo.casetas : conteo.llegadas;
  return { valores: [...deLaRuta], propia: false };
}

/** Problemas del escenario, ya listos para mostrar. */
export function problemas(escenario) {
  return problemasDelEscenario(escenario);
}

/** ¿Es un parámetro que hay que rotular como sensibilidad, no como medición? */
export function esSensibilidad(campo, escenario) {
  if (campo.sensibilidad) return true;
  if (campo.ruta === 'servicio.regimen') return escenario.servicio.regimen !== 'base';
  if (campo.ruta.endsWith('.conteo')) {
    const sentido = escenario.sentidos[campo.sentidoIndice];
    // El sustituto de C→P por defecto es `viernes` (DEC-029); los otros dos son
    // sensibilidad y hay que decirlo (PEN-013).
    return (
      campo.sentidoIndice === 1 && sentido.conteo !== ESCENARIO_BASE.sentidos[1].conteo
    );
  }
  return false;
}

/**
 * Los tres supuestos no medidos de los que depende todo, para el panel fijo de
 * la interfaz. Son los mismos que declara el informe de la fase 4.
 */
export const SUPUESTOS = [
  {
    clave: 'PEN-010',
    titulo: 'El servicio del pico no se midió en el pico',
    texto:
      'Los 50 tiempos de atención son de otro sentido y otro día. El régimen de servicio lento (15,5 s) es una hipótesis de sensibilidad, no una medición.',
  },
  {
    clave: 'PEN-013',
    titulo: 'La demanda de Cúcuta→Pamplona en el festivo no se midió',
    texto:
      'Por defecto se usa el conteo del viernes, que sí se tomó en ese sentido, por un factor configurable. Es la sensibilidad que más mueve el resultado.',
  },
  {
    clave: 'PEN-008',
    titulo: 'El modelo subestima la congestión del pico',
    texto:
      'La cola de campo es el total de vehículos esperando por sentido (DEC-042), la misma variable que simula el modelo, así que las dos se comparan de frente. En el festivo la simulada queda por debajo en los 12 intervalos, así que las casetas que salgan de aquí son una cota inferior.',
  },
];
