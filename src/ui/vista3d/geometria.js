/**
 * Dónde va cada cosa en la escena. **Puro**: devuelve coordenadas, no dibuja.
 *
 * El eje X recorre la línea de casetas, el eje Z va de un sentido al otro (los
 * dos sentidos entran por extremos opuestos) y el eje Y es la altura.
 *
 * El sentido 0 entra desde Z positivo y el 1 desde Z negativo. Las colas se
 * dibujan como **un solo embudo por sentido** en varias hileras cortas, porque
 * el modelo es de cola única (DEC-038, punto 1): las hileras son una forma de
 * que quepan en pantalla, no filas por caseta.
 *
 * JS puro: no importa React, ni DOM, ni three.
 */

import { ESCENA_3D } from '../../config/escena3d.js';

/** Hacia dónde avanza un sentido: +1 va hacia Z negativo. */
export const direccionDe = (sentidoId) => (sentidoId === 0 ? 1 : -1);

/** Centro del carril de una caseta. El pozo se reparte simétrico sobre el eje X. */
export function posicionDeCaseta(casetaId, pozoTotal) {
  const { separacionCarriles } = ESCENA_3D.plaza;
  const desplazamiento = ((pozoTotal - 1) / 2) * separacionCarriles;
  return [casetaId * separacionCarriles - desplazamiento, 0, 0];
}

/** Dónde se para un vehículo que está siendo atendido en una caseta. */
export function posicionDeServicio(casetaId, pozoTotal, sentidoId) {
  const [x] = posicionDeCaseta(casetaId, pozoTotal);
  // Se para justo antes de la isleta, por el lado por el que entra.
  const z = direccionDe(sentidoId) * (ESCENA_3D.plaza.largoCaseta / 2 + 1);
  return [x, 0, z];
}

/**
 * Posición de un vehículo en la cola única de su sentido.
 *
 * `posicion` 0 es la cabeza. La cola crece alejándose de la plaza y se reparte
 * en `hileras` para que quepa, no porque el modelo tenga varias filas.
 */
export function posicionEnCola(posicion, sentidoId, { hileras, separacion, separacionHileras, separacionDeLaPlaza } = ESCENA_3D.cola) {
  const hilera = posicion % hileras;
  const fondo = Math.floor(posicion / hileras);
  const centroHileras = ((hileras - 1) / 2) * separacionHileras;
  const x = hilera * separacionHileras - centroHileras;
  const z = direccionDe(sentidoId) * (separacionDeLaPlaza + fondo * separacion);
  return [x, 0, z];
}

/**
 * Dónde aparece un vehículo que entra desde el borde.
 *
 * Se reparte en X según el identificador del vehículo: si todos entraran por el
 * mismo punto, una ráfaga de llegadas en el mismo instante se dibujaría
 * apilada en un solo sitio.
 */
export function posicionDeEntrada(sentidoId, vehiculoId = 0, cola = ESCENA_3D.cola) {
  const carriles = cola.hileras;
  const x = ((vehiculoId % carriles) - (carriles - 1) / 2) * cola.separacionHileras;
  return [x, 0, direccionDe(sentidoId) * ESCENA_3D.plaza.largoCalzada];
}

/**
 * Desde dónde arranca el avance de la cola a la caseta.
 *
 * No es exactamente la cabeza de la cola: se desplaza hacia la X de su caseta,
 * porque cuando varias casetas se liberan a la vez hay varios vehículos
 * avanzando al mismo tiempo, y saliendo todos del mismo punto se dibujarían
 * unos encima de otros. Es un detalle **cosmético** (DEC-038, punto 3).
 */
export function posicionDeArranque(casetaId, pozoTotal, sentidoId, cola = ESCENA_3D.cola) {
  const cabeza = posicionEnCola(0, sentidoId, cola);
  const [xCaseta] = posicionDeCaseta(casetaId, pozoTotal);
  const ABANICO = 0.45;
  /** Se adelanta un hueco respecto de la cabeza, para no pisar la primera fila. */
  const adelanto = cola.separacion * 0.9;
  return [
    cabeza[0] + (xCaseta - cabeza[0]) * ABANICO,
    0,
    cabeza[2] - direccionDe(sentidoId) * adelanto,
  ];
}

/** Dónde desaparece un vehículo que sale: por el extremo contrario. */
export function posicionDeSalida(casetaId, pozoTotal, sentidoId) {
  const [x] = posicionDeCaseta(casetaId, pozoTotal);
  return [x, 0, -direccionDe(sentidoId) * ESCENA_3D.plaza.largoCalzada];
}

/** Interpola entre dos puntos. */
export const entre = (a, b, fraccion) => [
  a[0] + (b[0] - a[0]) * fraccion,
  a[1] + (b[1] - a[1]) * fraccion,
  a[2] + (b[2] - a[2]) * fraccion,
];

/**
 * Posición y giro de un vehículo según su fase.
 *
 * Las fases `llegando`, `enTransito` y `saliendo` interpolan: son cosméticas y
 * no significan nada en el modelo (DEC-038, punto 3).
 *
 * @param {object} vehiculo del modelo de escena
 * @param {number} pozoTotal
 * @param {object} [cola] constantes de la cola, por si la calidad las recorta
 * @returns {{posicion: number[], giro: number}}
 */
export function situarVehiculo(vehiculo, pozoTotal, cola = ESCENA_3D.cola) {
  const { sentidoId, fase, progreso, posicionCola, casetaId } = vehiculo;
  const giro = direccionDe(sentidoId) > 0 ? Math.PI : 0;

  switch (fase) {
    case 'llegando': {
      // Desde el borde hasta el sitio que le toca al final de la cola.
      const destino = posicionEnCola(posicionCola ?? 0, sentidoId, cola);
      const desde = posicionDeEntrada(sentidoId, vehiculo.id ?? 0, cola);
      return { posicion: entre(desde, destino, progreso), giro };
    }

    case 'enCola':
      return { posicion: posicionEnCola(posicionCola ?? 0, sentidoId, cola), giro };

    case 'enTransito': {
      // De la cabeza de la cola a la caseta, abriéndose en abanico para que
      // dos vehículos que salen a la vez no se dibujen encima.
      const desde = posicionDeArranque(casetaId, pozoTotal, sentidoId, cola);
      const hasta = posicionDeServicio(casetaId, pozoTotal, sentidoId);
      return { posicion: entre(desde, hasta, progreso), giro };
    }

    case 'enServicio':
      return { posicion: posicionDeServicio(casetaId, pozoTotal, sentidoId), giro };

    case 'saliendo': {
      const desde = posicionDeServicio(casetaId, pozoTotal, sentidoId);
      const hasta = posicionDeSalida(casetaId, pozoTotal, sentidoId);
      return { posicion: entre(desde, hasta, progreso), giro };
    }

    default:
      throw new Error(`Fase de vehículo desconocida al situarlo: ${fase}`);
  }
}

/** Fondo que alcanza la cola visible de un sentido, en unidades de escena. */
export function fondoDeLaCola(cola = ESCENA_3D.cola) {
  const profundidad = Math.ceil(cola.visiblesMaximos / cola.hileras) * cola.separacion;
  return cola.separacionDeLaPlaza + profundidad;
}

/** Ancho que ocupa la línea de casetas. */
export const anchoDeLaPlaza = (pozoTotal) => pozoTotal * ESCENA_3D.plaza.separacionCarriles;

/**
 * Encuadre de cámara para un preajuste.
 *
 * Las distancias **se calculan del contenido**, no son números fijos: con un
 * pozo de 10 la plaza es casi el doble de ancha que con uno de 6, y una cámara
 * fija dejaría medio peaje fuera o la plaza diminuta.
 *
 * La medida de referencia es la mayor de las dos extensiones de la escena: lo
 * que ocupa de ancho la línea de casetas, y lo que ocupa de fondo la cola de
 * los dos sentidos ajustado a la proporción de la pantalla.
 *
 * @param {string} clave preajuste o `cola0` / `cola1`
 * @param {number} pozoTotal
 * @param {object} [cola] constantes de la cola, por si la calidad las recorta
 */
export function encuadre(clave, pozoTotal, cola = ESCENA_3D.cola) {
  const ancho = anchoDeLaPlaza(pozoTotal);
  const fondo = fondoDeLaCola(cola);

  // Seguir la cola de un sentido: se mira solo ese lado.
  if (clave === 'cola0' || clave === 'cola1') {
    const sentidoId = clave === 'cola1' ? 1 : 0;
    const direccion = direccionDe(sentidoId);
    return {
      posicion: [0, fondo * 0.42, direccion * fondo * 1.15],
      objetivo: [0, 0, direccion * fondo * 0.45],
    };
  }

  const preajuste = ESCENA_3D.camaras[clave] ?? ESCENA_3D.camaras.todo;
  // La vista lateral se mide con el ancho; las demás, con el fondo de las dos
  // colas, que es lo que de verdad hay que encuadrar.
  const referencia = preajuste.lado ? ancho : Math.max(ancho * 0.8, fondo * 1.55);

  if (preajuste.lado) {
    return {
      posicion: [referencia * preajuste.distancia, referencia * preajuste.altura, fondo * 0.55],
      objetivo: [0, 1.5, 0],
    };
  }

  return {
    posicion: [0, referencia * preajuste.altura, referencia * preajuste.distancia],
    objetivo: [0, 0, referencia * (preajuste.inclinacion ?? 0)],
  };
}

/** Los preajustes de cámara, con sus etiquetas, para los botones. */
export const PREAJUSTES_CAMARA = [
  { clave: 'aerea', etiqueta: 'Aérea' },
  { clave: 'lateral', etiqueta: 'Lateral' },
  { clave: 'cola0', etiqueta: 'Seguir cola P→C' },
  { clave: 'cola1', etiqueta: 'Seguir cola C→P' },
  { clave: 'todo', etiqueta: 'Encuadrar todo' },
];
