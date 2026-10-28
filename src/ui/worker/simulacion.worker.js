/**
 * Web Worker de simulación: corre el motor fuera del hilo de la interfaz, para
 * que la pantalla no se congele mientras se calculan 30 réplicas (DEC-033).
 *
 * Solo traduce mensajes a llamadas de `trabajos.js` y de vuelta. La lógica está
 * allí, para poder probarla sin montar un Worker.
 *
 * Mensajes que acepta:
 *   {tipo: 'traza', escenario, semilla}
 *   {tipo: 'lote', escenarios, replicas}
 *   {tipo: 'cancelar'}
 */

import { hacerTrabajo, TIPOS_RESPUESTA } from './trabajos.js';

let cancelacionPedida = false;

self.onmessage = (mensaje) => {
  const peticion = mensaje.data;

  if (peticion?.tipo === 'cancelar') {
    cancelacionPedida = true;
    return;
  }

  cancelacionPedida = false;

  try {
    const respuesta = hacerTrabajo(peticion, {
      alProgresar: (progreso) => self.postMessage({ tipo: TIPOS_RESPUESTA.PROGRESO, ...progreso }),
      cancelado: () => cancelacionPedida,
    });
    self.postMessage({ ...respuesta, peticionId: peticion.peticionId });
  } catch (error) {
    self.postMessage({
      tipo: TIPOS_RESPUESTA.ERROR,
      mensaje: error.message,
      peticionId: peticion?.peticionId,
    });
  }
};
