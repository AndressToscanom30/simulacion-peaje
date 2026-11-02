/**
 * Los trabajos que el worker sabe hacer, sin nada de `postMessage`.
 *
 * Están aquí separados del worker para poder probarlos sin montar un Worker:
 * el worker es solo el cable que los conecta a los mensajes.
 *
 * JS puro: no importa React, ni DOM, ni Three.js.
 */

import { simularTraza, correrEscenario } from '../../corridas.js';
import { construirEscenario, validarEscenario, semillasDe } from '../../config/escenario.js';

/** Tipos de mensaje que acepta el worker. */
export const TIPOS_TRABAJO = { TRAZA: 'traza', LOTE: 'lote' };

/** Tipos de mensaje que el worker devuelve. */
export const TIPOS_RESPUESTA = {
  TRAZA_LISTA: 'trazaLista',
  PROGRESO: 'progreso',
  LOTE_LISTO: 'loteListo',
  CANCELADO: 'cancelado',
  ERROR: 'error',
};

/**
 * Corre una réplica y devuelve su traza, para el modo tiempo real.
 *
 * @param {object} args
 * @param {object} args.escenario completo o parcial (se completa con el base)
 * @param {number} [args.semilla=1]
 */
export function trabajoTraza({ escenario, semilla = 1 }) {
  const completo = validarEscenario(construirEscenario(escenario));
  return { traza: simularTraza(completo, semilla) };
}

/**
 * Corre un lote de escenarios, avisando del progreso y pudiéndose cancelar.
 *
 * Las semillas son las mismas para todos los escenarios (DEC-010), así que las
 * comparaciones usan números aleatorios comunes.
 *
 * @param {object} args
 * @param {object[]} args.escenarios `[{codigo, nombre, cambia, cambiaUsuario, regimen, escenario}]`
 * @param {number} [args.replicas] sobrescribe las réplicas de cada escenario
 * @param {object} [opciones]
 * @param {(progreso: object) => void} [opciones.alProgresar]
 * @param {() => boolean} [opciones.cancelado] si devuelve true, se corta
 */
export function trabajoLote({ escenarios, replicas }, { alProgresar, cancelado } = {}) {
  const resultados = [];

  escenarios.forEach((entrada, indice) => {
    if (cancelado?.()) return;

    const escenario = validarEscenario(
      construirEscenario(
        replicas ? { ...entrada.escenario, corridas: { ...entrada.escenario.corridas, replicas } } : entrada.escenario,
      ),
    );

    const resultado = correrEscenario({ ...entrada, escenario });

    resultados.push({
      codigo: entrada.codigo ?? escenario.nombre,
      nombre: entrada.nombreUsuario ?? entrada.nombre ?? escenario.nombre,
      cambia: entrada.cambia ?? '',
      /** El mismo texto en lenguaje de usuario, que es el que se muestra. */
      cambiaUsuario: entrada.cambiaUsuario ?? entrada.cambia ?? '',
      regimen: entrada.regimen ?? escenario.servicio.regimen,
      nombreEscenario: escenario.nombre,
      semillas: semillasDe(escenario),
      resumen: resultado.resumen,
      cumplimiento: resultado.cumplimiento,
    });

    alProgresar?.({
      hechos: indice + 1,
      total: escenarios.length,
      ultimo: entrada.nombre ?? escenario.nombre,
    });
  });

  return { resultados, cancelado: Boolean(cancelado?.()) };
}

/** Despacha un trabajo por su tipo. */
export function hacerTrabajo(mensaje, opciones) {
  switch (mensaje.tipo) {
    case TIPOS_TRABAJO.TRAZA:
      return { tipo: TIPOS_RESPUESTA.TRAZA_LISTA, ...trabajoTraza(mensaje) };
    case TIPOS_TRABAJO.LOTE: {
      const { resultados, cancelado } = trabajoLote(mensaje, opciones);
      return {
        tipo: cancelado ? TIPOS_RESPUESTA.CANCELADO : TIPOS_RESPUESTA.LOTE_LISTO,
        resultados,
      };
    }
    default:
      throw new TypeError(
        `Trabajo desconocido: "${mensaje.tipo}". Los válidos son: ${Object.values(TIPOS_TRABAJO).join(', ')}.`,
      );
  }
}
