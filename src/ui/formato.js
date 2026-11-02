/**
 * Formato de números y tiempos para la interfaz, en castellano.
 *
 * Puro: no toca el DOM. Se usa igual en los componentes y en las pruebas.
 */

import { conteos } from '../config/datos.js';
import { MINUTOS_POR_HORA, SEGUNDOS_POR_MINUTO } from '../config/parametros.js';

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
 * Hora de inicio del conteo.
 *
 * Sale del campo `horaInicio` de `datos.js`, que es dato de campo (DEC-052). Si
 * faltara, se recurre a leerla del tramo horario de la etiqueta ("16:25–17:25"),
 * que es de dónde se sacaba antes. No se inventa nada: sin ninguna de las dos
 * se devuelve `null` y la interfaz muestra solo el tiempo simulado.
 *
 * @param {string} clave conteo
 * @returns {{horas: number, minutos: number}|null}
 */
export function horaInicioDelConteo(clave) {
  const conteo = conteos[clave];
  const partido = partirHora(conteo?.horaInicio);
  if (partido) return partido;

  const encontrado = (conteo?.etiqueta ?? '').match(/(\d{1,2}):(\d{2})\s*[–-]/);
  if (!encontrado) return null;
  return { horas: Number(encontrado[1]), minutos: Number(encontrado[2]) };
}

/**
 * Parte un `hh:mm` en horas y minutos. `null` si no es una hora válida.
 *
 * Acepta `9:05` y `09:05`; rechaza horas de más de 23 y minutos de más de 59,
 * que es lo que un campo de texto puede recibir.
 */
export function partirHora(texto) {
  const encontrado = String(texto ?? '').trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!encontrado) return null;
  const horas = Number(encontrado[1]);
  const minutos = Number(encontrado[2]);
  if (horas > 23 || minutos > 59) return null;
  return { horas, minutos };
}

/** Segundos desde medianoche de un `{horas, minutos}`. */
const desdeMedianoche = ({ horas, minutos }) =>
  horas * MINUTOS_POR_HORA * SEGUNDOS_POR_MINUTO + minutos * SEGUNDOS_POR_MINUTO;

/**
 * Instante simulado que corresponde a una hora del reloj `hh:mm`.
 *
 * La hora se refiere al conteo que se le pase, que en la interfaz es el del
 * **primer sentido**. Devuelve `null` si el texto no es una hora, si el conteo
 * no tiene hora de inicio o si la hora cae **fuera** de la ventana simulada:
 * así el campo puede avisar en vez de mover el reloj a un sitio que no existe.
 *
 * @param {string} texto `hh:mm`
 * @param {string} conteo clave del conteo que da la hora de arranque
 * @param {number} duracionSegundos duración de la traza
 * @returns {number|null} segundos desde el arranque
 */
export function instanteDeHora(texto, conteo, duracionSegundos) {
  const pedida = partirHora(texto);
  const inicio = horaInicioDelConteo(conteo);
  if (!pedida || !inicio) return null;

  const segundos = desdeMedianoche(pedida) - desdeMedianoche(inicio);
  if (segundos < 0 || segundos > duracionSegundos) return null;
  return segundos;
}

/**
 * Hora del reloj `hh:mm` de un instante simulado, sin los segundos.
 *
 * Es la inversa de `instanteDeHora`, y la que rellena el campo de hora cuando
 * el reloj se mueve por otro camino (la barra, el botón de reinicio).
 */
export function horaDeInstante(conteo, segundos) {
  const completa = horaDelConteo(conteo, segundos);
  return completa ? completa.slice(0, 5) : null;
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
