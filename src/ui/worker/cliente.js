/**
 * Cliente del worker: envuelve `postMessage` en promesas.
 *
 * Si el entorno no tiene Workers (las pruebas en jsdom, por ejemplo), corre los
 * trabajos **en el mismo hilo**. El resultado es el mismo; lo único que se
 * pierde es que la interfaz no se bloquee.
 */

import { hacerTrabajo, TIPOS_RESPUESTA } from './trabajos.js';

/** ¿Hay Workers de módulo disponibles? */
export const hayWorkers = () => typeof Worker !== 'undefined' && typeof URL !== 'undefined';

export function crearClienteSimulacion() {
  let worker = null;
  let siguienteId = 0;
  let cancelacionLocal = false;

  function asegurarWorker() {
    if (worker) return worker;
    worker = new Worker(new URL('./simulacion.worker.js', import.meta.url), { type: 'module' });
    return worker;
  }

  return {
    /** `true` si de verdad se está usando un worker. */
    get enWorker() {
      return worker !== null;
    },

    /**
     * Envía un trabajo y espera el resultado.
     *
     * @param {object} peticion `{tipo, …}`
     * @param {(progreso: object) => void} [alProgresar]
     */
    async pedir(peticion, alProgresar) {
      cancelacionLocal = false;

      if (!hayWorkers()) {
        // Sin Worker: mismo hilo. Útil en pruebas y como red de seguridad.
        return hacerTrabajo(peticion, {
          alProgresar,
          cancelado: () => cancelacionLocal,
        });
      }

      const w = asegurarWorker();
      const peticionId = siguienteId++;

      return new Promise((resolver, rechazar) => {
        const alMensaje = (mensaje) => {
          const datos = mensaje.data;
          if (datos.tipo === TIPOS_RESPUESTA.PROGRESO) {
            alProgresar?.(datos);
            return;
          }
          if (datos.peticionId !== undefined && datos.peticionId !== peticionId) return;
          w.removeEventListener('message', alMensaje);
          if (datos.tipo === TIPOS_RESPUESTA.ERROR) rechazar(new Error(datos.mensaje));
          else resolver(datos);
        };
        w.addEventListener('message', alMensaje);
        w.postMessage({ ...peticion, peticionId });
      });
    },

    cancelar() {
      cancelacionLocal = true;
      worker?.postMessage({ tipo: 'cancelar' });
    },

    terminar() {
      worker?.terminate();
      worker = null;
    },
  };
}
