/**
 * Formato de números y tiempos para la interfaz, en castellano.
 *
 * Puro: no toca el DOM. Se usa igual en los componentes y en las pruebas.
 */

import { conteos } from '../config/datos.js';
import { SEGUNDOS_POR_MINUTO } from '../config/parametros.js';

/** Coma decimal, como el resto del proyecto. */
export const coma = (texto) => String(texto).replace('.', ',');

/** Número con decimales fijos y coma decimal. */
export const num = (x, dec = 2) =>
  x === null || x === undefined || Number.isNaN(x) ? '—' : coma(x.toFixed(dec));

/** Segundos a minutos. */
export const enMinutos = (segundos, dec = 2) =>
  segundos === null || segundos === undefined ? '—' : num(segundos / SEGUNDOS_POR_MINUTO, dec);

/** Fracción a porcentaje. */
export const porcentaje = (fraccion, dec = 1) =>
  fraccion === null || fraccion === undefined ? '—' : `${num(fraccion * 100, dec)} %`;

/** Segundos a `mm:ss`, para el reloj de reproducción. */
export function relojSimulado(segundos) {
  const total = Math.max(0, Math.floor(segundos));
  const minutos = Math.floor(total / SEGUNDOS_POR_MINUTO);
  const resto = total % SEGUNDOS_POR_MINUTO;
  return `${String(minutos).padStart(2, '0')}:${String(resto).padStart(2, '0')}`;
}

/**
 * Hora de inicio del conteo, leída de su propia etiqueta.
 *
 * Las etiquetas de `datos.js` traen el tramo horario ("16:25–17:25"), que es el
 * dato de campo. No se inventa nada: si la etiqueta no lo trae, se devuelve
 * `null` y la interfaz muestra solo el tiempo simulado.
 *
 * @param {string} clave conteo
 * @returns {{horas: number, minutos: number}|null}
 */
export function horaInicioDelConteo(clave) {
  const etiqueta = conteos[clave]?.etiqueta ?? '';
  const encontrado = etiqueta.match(/(\d{1,2}):(\d{2})\s*[–-]/);
  if (!encontrado) return null;
  return { horas: Number(encontrado[1]), minutos: Number(encontrado[2]) };
}

/**
 * Hora del conteo más el tiempo simulado, como `16:30:12`.
 *
 * @param {string} conteo clave del conteo que da la hora de arranque
 * @param {number} segundos tiempo simulado
 */
export function horaDelConteo(conteo, segundos) {
  const inicio = horaInicioDelConteo(conteo);
  if (!inicio) return null;
  const desdeMedianoche =
    inicio.horas * 3600 + inicio.minutos * SEGUNDOS_POR_MINUTO + Math.floor(Math.max(0, segundos));
  const h = Math.floor(desdeMedianoche / 3600) % 24;
  const m = Math.floor((desdeMedianoche % 3600) / SEGUNDOS_POR_MINUTO);
  const s = desdeMedianoche % SEGUNDOS_POR_MINUTO;
  return [h, m, s].map((x) => String(x).padStart(2, '0')).join(':');
}

/** Formatea un valor de parámetro para mostrarlo en el formulario. */
export function valorLegible(valor) {
  if (valor === null) return 'automático';
  if (valor === undefined) return '—';
  if (typeof valor === 'boolean') return valor ? 'sí' : 'no';
  if (typeof valor === 'number') return coma(valor);
  if (Array.isArray(valor)) {
    const unicos = [...new Set(valor)];
    return unicos.length === 1 ? `${coma(unicos[0])} en los ${valor.length}` : valor.map(coma).join(', ');
  }
  if (typeof valor === 'object') {
    return Object.entries(valor)
      .map(([c, v]) => `${c}: ${v === null ? '—' : coma(v)}`)
      .join('  ');
  }
  return String(valor);
}

/** Convierte una tabla de medidas en CSV, con coma decimal y punto y coma. */
export function aCsv(filas, columnas) {
  const escapar = (x) => {
    const texto = x === null || x === undefined ? '' : String(x);
    return /[";\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
  };
  const cabecera = columnas.map((c) => escapar(c.titulo)).join(';');
  const cuerpo = filas.map((fila) => columnas.map((c) => escapar(c.valor(fila))).join(';'));
  return [cabecera, ...cuerpo].join('\n');
}
