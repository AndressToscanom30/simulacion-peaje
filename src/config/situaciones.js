/**
 * Situaciones predefinidas: **día y hora** del escenario (DEC-052).
 *
 * El modelo simula siempre los dos sentidos, pero **cada conteo mide uno solo**
 * (contexto, sección 10). Así que el día y la hora no son campos libres: son
 * combinaciones de conteos que tienen sentido, cada una con lo que hay que
 * advertir de ella.
 *
 * `aplicarSituacion` solo toca los **sentidos**. El servicio, el pozo y la
 * regla se conservan tal cual, para que cambiar de día no deshaga lo que se
 * esté probando en el panel.
 *
 * El **orden de los sentidos importa**: el primero usa el flujo original del
 * PRNG (DEC-027 punto 1), así que cada situación fija el suyo y no se reordena.
 *
 * Ningún número aquí: todo sale de `datos.js` y de `parametros.js` (CLAUDE.md).
 *
 * JS puro: no importa React, ni DOM, ni Three.js.
 */

import { conteos } from './datos.js';
import { parametros } from './parametros.js';
import { COLA_INICIAL } from './escenarios.js';
import { MODO } from './escenario.js';

/** Etiquetas de sentido, que son la dirección y no el conteo. */
const P_C = 'P→C';
const C_P = 'C→P';

/**
 * Un sentido del escenario a partir de un conteo.
 *
 * `cola inicial` y `casetas iniciales` salen de los datos de campo; las
 * llegadas y las casetas fijas quedan en `null`, que es la marca de «las del
 * conteo» (DEC-035).
 */
function sentidoDeConteo({
  etiqueta,
  conteo,
  colaInicial,
  casetasIniciales,
  factorDemanda = 1,
  modo = MODO.REGLA,
}) {
  // El orden de las claves es el del escenario base a propósito: los escenarios
  // se exportan a JSON y así un escenario aplicado y el base se ven iguales.
  return {
    etiqueta,
    conteo,
    factorDemanda,
    colaInicial: colaInicial ?? COLA_INICIAL[conteo],
    casetasIniciales: casetasIniciales ?? conteos[conteo].casetas[0],
    modo,
    llegadas: null,
    casetasFijas: null,
  };
}

/**
 * Las tres situaciones. `sentidos(modos)` recibe el modo de cada sentido, que
 * `aplicarSituacion` conserva del escenario que ya había.
 */
export const SITUACIONES = {
  festivo: {
    clave: 'festivo',
    titulo: 'Festivo por la tarde',
    descripcion:
      'El retorno de un festivo, que es la hora más cargada que se midió. Es el caso para el que se diseñó la política.',
    aviso:
      'Es el caso real más exigente y el punto de referencia para la política. El C→P usa el sustituto del estudio, no el conteo bruto.',
    sentidos: (modos = []) => [
      sentidoDeConteo({ etiqueta: P_C, conteo: 'festivoPC', modo: modos[0] }),
      sentidoDeConteo({
        etiqueta: C_P,
        conteo: parametros.sustitutoFestivoCP.conteo,
        colaInicial: parametros.sustitutoFestivoCP.colaInicial,
        casetasIniciales: parametros.sustitutoFestivoCP.casetasIniciales,
        factorDemanda: parametros.sustitutoFestivoCP.factorDemanda,
        modo: modos[1],
      }),
    ],
  },

  domingo: {
    clave: 'domingo',
    titulo: 'Domingo al mediodía',
    descripcion:
      'Un domingo con tráfico moderado. Es el único día en que se midieron los dos sentidos.',
    aviso:
      'Los dos sentidos se midieron en horas distintas, así que es útil para comparar la respuesta del modelo en dos perfiles reales sin asumir simultaneidad.',
    sentidos: (modos = []) => [
      sentidoDeConteo({ etiqueta: P_C, conteo: 'domingoPC', modo: modos[0] }),
      sentidoDeConteo({ etiqueta: C_P, conteo: 'domingoCP', modo: modos[1] }),
    ],
  },

  diaNormal: {
    clave: 'diaNormal',
    titulo: 'Día normal',
    descripcion:
      'Un día cualquiera, con holgura de sobra. Sirve para ver que sin presión los dos sentidos no se pelean por las casetas.',
    aviso:
      'Se construye con dos días distintos para mostrar un caso tranquilo, sin que la presión de un mismo pico los fuerce a competir por el mismo pozo.',
    // El mismo orden que `escenarioDiaNormal` de escenarios.js: C→P primero.
    sentidos: (modos = []) => [
      sentidoDeConteo({ etiqueta: C_P, conteo: 'viernes', modo: modos[0] }),
      sentidoDeConteo({ etiqueta: P_C, conteo: 'domingoPC', modo: modos[1] }),
    ],
  },
};

/** Las situaciones en el orden en que se ofrecen. */
export const ORDEN_SITUACIONES = ['festivo', 'domingo', 'diaNormal'];

/** Lista para un selector: clave, título, descripción y aviso. */
export const listaDeSituaciones = () =>
  ORDEN_SITUACIONES.map((clave) => {
    const { titulo, descripcion, aviso } = SITUACIONES[clave];
    return { clave, titulo, descripcion, aviso };
  });

/**
 * Aplica una situación a un escenario. **Pura**: devuelve uno nuevo.
 *
 * Cambia **solo los sentidos** —conteo, etiqueta, cola inicial, casetas
 * iniciales, factor a 1 y llegadas y casetas fijas a `null`— y conserva el
 * servicio, el pozo, la regla y todo lo demás.
 *
 * El **modo** de cada sentido se conserva por posición: cambiar de día no
 * cambia si `c(t)` lo decide la regla o el operador.
 *
 * @param {object} escenario
 * @param {string} clave `festivo`, `domingo` o `diaNormal`
 */
export function aplicarSituacion(escenario, clave) {
  const situacion = SITUACIONES[clave];
  if (!situacion) {
    throw new RangeError(
      `Situación desconocida: ${clave}. Las que hay: ${ORDEN_SITUACIONES.join(', ')}`,
    );
  }

  const modos = escenario.sentidos.map((sentido) => sentido.modo);
  return { ...escenario, sentidos: situacion.sentidos(modos) };
}

/**
 * ¿Qué situación describe estos sentidos? `null` si no es ninguna de las tres.
 *
 * Compara solo el conteo de cada sentido, que es lo que define el día: así un
 * escenario con el factor de demanda cambiado sigue reconociéndose.
 */
export function situacionDe(escenario) {
  const conteosDe = (sentidos) => sentidos.map((s) => s.conteo).join('|');
  const actual = conteosDe(escenario.sentidos);
  return ORDEN_SITUACIONES.find((clave) => conteosDe(SITUACIONES[clave].sentidos()) === actual) ?? null;
}

/**
 * Día y hora de cada sentido, derivados del conteo (DEC-052).
 *
 * La interfaz rotula con esto en vez de escribir el día a mano, así que no
 * puede quedar desfasado respecto de los datos de campo.
 *
 * @returns {{etiqueta: string, conteo: string, etiquetaConteo: string, horaInicio: string}[]}
 */
export function diaYHoraDeSentidos(escenario) {
  return escenario.sentidos.map((sentido) => {
    const conteo = conteos[sentido.conteo];
    return {
      etiqueta: sentido.etiqueta,
      conteo: sentido.conteo,
      etiquetaConteo: conteo?.etiqueta ?? '',
      horaInicio: conteo?.horaInicio ?? '',
    };
  });
}

/** ¿Los sentidos vienen de conteos de horas distintas? */
export const horasDistintas = (escenario) =>
  new Set(diaYHoraDeSentidos(escenario).map((s) => s.horaInicio)).size > 1;
