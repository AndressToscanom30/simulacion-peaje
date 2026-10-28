/**
 * Texto de los letreros, dibujado en un `<canvas>` 2D y usado como textura
 * (DEC-037): procedural, sin ninguna fuente ni imagen externa.
 *
 * Necesita DOM (crea un canvas), así que este módulo no se usa en las pruebas
 * del modelo de escena, que corren en Node.
 */

import { CanvasTexture, LinearFilter, SRGBColorSpace } from 'three';

const ANCHO = 512;
const ALTO = 256;
/** Margen a cada lado dentro del que tiene que caber el texto. */
const MARGEN = 0.92;

/** Las texturas se reutilizan: el mismo rótulo no se dibuja dos veces. */
const cache = new Map();

/**
 * Textura con el texto de un letrero de carril.
 *
 * @param {object} args
 * @param {string} args.titulo línea grande: el número de caseta y la flecha
 * @param {string} args.estado línea pequeña: el estado, en texto
 * @param {string} args.color color de la línea de estado
 * @param {string} args.fondo
 */
export function texturaDeLetrero({ titulo, estado, color, fondo }) {
  const clave = `${titulo}|${estado}|${color}|${fondo}`;
  if (cache.has(clave)) return cache.get(clave);

  const lienzo = document.createElement('canvas');
  lienzo.width = ANCHO;
  lienzo.height = ALTO;
  const pincel = lienzo.getContext('2d');

  pincel.fillStyle = fondo;
  pincel.fillRect(0, 0, ANCHO, ALTO);

  pincel.textAlign = 'center';
  pincel.textBaseline = 'middle';

  pincel.fillStyle = '#f2f0e8';
  escribirQueQuepa(pincel, titulo, 108, ALTO * 0.34);

  pincel.fillStyle = color;
  pincel.fillRect(ANCHO * 0.08, ALTO * 0.58, ANCHO * 0.84, 10);

  pincel.fillStyle = '#f2f0e8';
  escribirQueQuepa(pincel, estado, 58, ALTO * 0.79);

  const textura = new CanvasTexture(lienzo);
  textura.colorSpace = SRGBColorSpace;
  textura.minFilter = LinearFilter;
  textura.magFilter = LinearFilter;
  // Los letreros se ven casi siempre en escorzo: sin anisotropía el texto se
  // emborrona y deja de leerse.
  textura.anisotropy = 8;
  cache.set(clave, textura);
  return textura;
}

/**
 * Escribe centrado, encogiendo la letra hasta que el texto quepa.
 *
 * Hace falta porque la cuenta atrás de una caseta reservada ("ABRE 273 s") es
 * bastante más larga que "ABIERTA", y con tamaño fijo se saldría del letrero.
 */
function escribirQueQuepa(pincel, texto, tamanoMaximo, y) {
  let tamano = tamanoMaximo;
  do {
    pincel.font = `bold ${tamano}px system-ui, sans-serif`;
    if (pincel.measureText(texto).width <= ANCHO * MARGEN) break;
    tamano -= 4;
  } while (tamano > 12);
  pincel.fillText(texto, ANCHO / 2, y);
}

/** Flecha del sentido para el letrero: `null` cuando la caseta está en el pozo. */
export function flechaDe(sentidoId) {
  if (sentidoId === null || sentidoId === undefined) return '·';
  return sentidoId === 0 ? '▼' : '▲';
}

/** Vacía la caché. Solo para las pruebas. */
export function olvidarTexturas() {
  cache.clear();
}
