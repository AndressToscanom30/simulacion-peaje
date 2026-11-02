/**
 * Cliente del worker: envuelve `postMessage` en promesas.
 *
 * Si el entorno no tiene Workers (las pruebas en jsdom, por ejemplo), corre los
 * trabajos **en el mismo hilo**. El resultado es el mismo; lo único que se
 * pierde es que la interfaz no se bloquee.
 *
 * **Descartar pedidos (DEC-054).** Una traza no se puede cortar a mitad: el
 * motor la corre de un tirón y `trabajoTraza` no acepta señal de cancelación
 * (a diferencia de los lotes, que sí la tienen). Para que «Cancelar» funcione
 * sin tocar el motor, el cliente lleva una **generación**: `descartarPendientes`
 * la sube, y toda respuesta de una generación anterior se tira. El trabajo
 * sigue corriendo hasta el final en su hilo, pero su resultado ya no llega a la
 * interfaz, que es lo que el usuario pidió.
 */

import { hacerTrabajo, TIPOS_RESPUESTA } from './trabajos.js';

/** Error con el que se rechaza un pedido descartado. */
export class PedidoDescartado extends Error {
  constructor() {
    super('El pedido se descartó porque llegó otro después, o se canceló.');
    this.name = 'PedidoDescartado';
    /** Para distinguirlo de un error de verdad sin mirar el mensaje. */
    this.descartado = true;
  }
}

/** ¿Este error es un pedido descartado y no un fallo? */
export const fueDescartado = (error) => Boolean(error?.descartado);

/** ¿Hay Workers de módulo disponibles? */
export const hayWorkers = () => typeof Worker !== 'undefined' && typeof URL !== 'undefined';

export function crearClienteSimulacion() {
  let worker = null;
  let siguienteId = 0;
  let cancelacionLocal = false;
  /** Sube con cada descarte; los pedidos de generaciones viejas se tiran. */
  let generacion = 0;

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
      const miGeneracion = generacion;
      /** ¿Este pedido sigue siendo el vigente? */
      const vigente = () => miGeneracion === generacion;

      if (!hayWorkers()) {
        // Sin Worker: mismo hilo. Útil en pruebas y como red de seguridad.
        //
        // Se cede el control **antes** de calcular, por dos motivos: la
        // interfaz alcanza a pintar «Recalculando…» antes de bloquearse, y
        // queda un hueco real en el que `descartarPendientes` puede actuar.
        // Sin esto, el trabajo empezaría y acabaría dentro de la misma vuelta
        // y «Cancelar» no tendría nada que cancelar.
        await Promise.resolve();
        if (!vigente()) throw new PedidoDescartado();

        const respuesta = hacerTrabajo(peticion, {
          alProgresar,
          cancelado: () => cancelacionLocal,
        });
        // Aunque el trabajo haya terminado, si se descartó por el camino su
        // resultado no vale: alguien pidió otra cosa o canceló.
        if (!vigente()) throw new PedidoDescartado();
        return respuesta;
      }

      const w = asegurarWorker();
      const peticionId = siguienteId++;

      return new Promise((resolver, rechazar) => {
        const alMensaje = (mensaje) => {
          const datos = mensaje.data;
          if (datos.tipo === TIPOS_RESPUESTA.PROGRESO) {
            // El progreso de un pedido descartado tampoco interesa.
            if (vigente()) alProgresar?.(datos);
            return;
          }
          if (datos.peticionId !== undefined && datos.peticionId !== peticionId) return;
          w.removeEventListener('message', alMensaje);
          if (!vigente()) {
            rechazar(new PedidoDescartado());
            return;
          }
          if (datos.tipo === TIPOS_RESPUESTA.ERROR) rechazar(new Error(datos.mensaje));
          else resolver(datos);
        };
        w.addEventListener('message', alMensaje);
        w.postMessage({ ...peticion, peticionId });
      });
    },

    /**
     * Deja de esperar lo que esté pidiendo: las respuestas que lleguen se
     * tiran. No corta el trabajo (una traza no se puede cortar), pero sí lo
     * desconecta de la interfaz.
     */
    descartarPendientes() {
      generacion += 1;
      cancelacionLocal = true;
      worker?.postMessage({ tipo: 'cancelar' });
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
