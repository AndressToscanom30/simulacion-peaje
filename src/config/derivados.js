/**
 * Valores **derivados** del escenario: los que el panel de la vista 3D muestra
 * calculados en vez de guardados, y el único que además se puede editar.
 *
 * Hay dos clases de cosa aquí:
 *
 * 1. **Parámetros derivados** (`DERIVADOS`): se leen de rutas que el escenario
 *    sí tiene, y al escribirlos devuelven un **parche** de esas rutas. El
 *    parche lo aplica quien llame (`cambiarCampo`), así que este módulo no
 *    necesita saber escribir rutas y no depende de la interfaz.
 * 2. **Lecturas de solo lectura** (μ y λ): funciones puras, sin contrapartida
 *    editable.
 *
 * Ningún número vive aquí: las conversiones salen de `parametros.js` y los
 * datos de campo de `datos.js` (CLAUDE.md).
 *
 * JS puro: no importa React, ni DOM, ni Three.js.
 */

import { SEGUNDOS_POR_HORA } from './parametros.js';
import { conteos } from './datos.js';

/** Ruta virtual del promedio de atención: no existe en el escenario. */
export const RUTA_PROMEDIO_ATENCION = 'servicio.promedioAtencionSegundos';

/**
 * Parámetros derivados, indexados por su ruta virtual.
 *
 * `rutasAtadas` es lo que de verdad vive en el escenario. Importa para
 * **restablecer**: hay que devolver esas rutas a su valor del base, no volver a
 * escribir el derivado. Si se restableciera escribiendo, el promedio del base
 * (12,1016 s) daría θ = 12,1016 / 4,68 = 2,5858 s y **no** los 2,58 s de la
 * DEC-004: k · θ = 12,0744 s no es el nominal, y esa diferencia es a propósito
 * (DEC-027 punto 7).
 */
export const DERIVADOS = {
  [RUTA_PROMEDIO_ATENCION]: {
    rutasAtadas: ['servicio.gammaEscalaSegundos', 'servicio.mediaNominalSegundos'],
    /** Lo que el campo muestra: el nominal, que es el que la regla usa. */
    leer: (escenario) => escenario.servicio.mediaNominalSegundos,
    /**
     * Al editar, los dos valores a la vez y **k sin tocar**, igual que hace el
     * servicio lento de la DEC-025: mismo CV, otra media.
     */
    parche: (escenario, promedio) => ({
      'servicio.gammaEscalaSegundos': promedio / escenario.servicio.gammaForma,
      'servicio.mediaNominalSegundos': promedio,
    }),
  },
};

/** ¿Esta ruta es la de un parámetro derivado? */
export const esDerivado = (ruta) => Object.hasOwn(DERIVADOS, ruta);

/**
 * Valor que muestra un parámetro derivado.
 *
 * @param {object} escenario
 * @param {string} ruta ruta virtual
 */
export function leerDerivado(escenario, ruta) {
  const derivado = DERIVADOS[ruta];
  if (!derivado) throw new RangeError(`No hay parámetro derivado en la ruta: ${ruta}`);
  return derivado.leer(escenario);
}

/**
 * Rutas reales que hay que escribir para editar un derivado, con sus valores.
 *
 * Devuelve un objeto `{ruta: valor}`; no muta ni compone el escenario.
 *
 * @param {object} escenario
 * @param {string} ruta ruta virtual
 * @param {number} valor
 */
export function parcheDerivado(escenario, ruta, valor) {
  const derivado = DERIVADOS[ruta];
  if (!derivado) throw new RangeError(`No hay parámetro derivado en la ruta: ${ruta}`);
  return derivado.parche(escenario, valor);
}

/** Rutas reales que un derivado ata, para restablecerlas desde el base. */
export function rutasAtadas(ruta) {
  const derivado = DERIVADOS[ruta];
  if (!derivado) throw new RangeError(`No hay parámetro derivado en la ruta: ${ruta}`);
  return [...derivado.rutasAtadas];
}

// ----------------------------------------------------------- solo lectura ---

/**
 * Tasa de servicio μ por caseta, en veh/h, a partir del promedio de atención.
 *
 * Es el nominal, que es con el que la regla decide (DEC-027 punto 7), no la
 * media que genera la gamma.
 */
export function muVehHora(escenario) {
  return SEGUNDOS_POR_HORA / leerDerivado(escenario, RUTA_PROMEDIO_ATENCION);
}

/**
 * Llegadas de un sentido en el horizonte, en vehículos.
 *
 * Toma las llegadas escritas a mano si las hay (DEC-035) y si no las del
 * conteo, y aplica el factor de demanda del sentido (DEC-005: el factor escala
 * todos los tramos).
 */
export function llegadasDelSentido(escenario, indice) {
  const sentido = escenario.sentidos[indice];
  if (!sentido) throw new RangeError(`El escenario no tiene el sentido ${indice}`);
  const serie = sentido.llegadas ?? conteos[sentido.conteo]?.llegadas;
  if (!serie) return 0;
  return serie.reduce((a, b) => a + b, 0) * sentido.factorDemanda;
}

/**
 * λ resultante de un sentido, en **veh/h**.
 *
 * El horizonte no se supone de una hora: sale de `tiempo.intervalos` ×
 * `tiempo.duracionIntervaloSegundos`, así que un escenario de otra duración da
 * la tasa correcta.
 */
export function lambdaVehHora(escenario, indice) {
  const horizonteSegundos = escenario.tiempo.intervalos * escenario.tiempo.duracionIntervaloSegundos;
  if (!(horizonteSegundos > 0)) return 0;
  return (llegadasDelSentido(escenario, indice) * SEGUNDOS_POR_HORA) / horizonteSegundos;
}

/** λ de cada sentido, en el orden del escenario. */
export function lambdasVehHora(escenario) {
  return escenario.sentidos.map((_, indice) => lambdaVehHora(escenario, indice));
}
