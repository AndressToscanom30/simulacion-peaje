/**
 * Navegación por `#hash`, sin librería de rutas (DEC-034, DEC-053).
 *
 * Tres vistas y nada más. La traducción entre el hash y la vista está aquí,
 * **pura**, para poder probarla sin montar la aplicación: los componentes solo
 * leen `location.hash` y llaman a estas funciones.
 *
 * Puro: no toca el DOM ni React.
 */

/** Claves de las vistas. */
export const VISTA = {
  SIMULACION: 'simulacion',
  LOTES: 'lotes',
  CONFIGURACION: 'configuracion',
};

/** La vista de arranque, y la de cualquier hash que no se reconozca. */
export const VISTA_POR_DEFECTO = VISTA.SIMULACION;

/**
 * Las tres vistas, en el orden en que se muestran en la barra superior.
 *
 * `titulo` es lo que ve el usuario; `descripcion` es el texto accesible del
 * enlace, para quien navegue con lector de pantalla.
 */
export const VISTAS = [
  {
    clave: VISTA.SIMULACION,
    titulo: 'Simulación 3D',
    descripcion: 'Ver el peaje funcionando, con los controles al lado',
  },
  {
    clave: VISTA.LOTES,
    titulo: 'Estudio por lotes',
    descripcion: 'Correr muchas réplicas y comparar escenarios',
  },
  {
    clave: VISTA.CONFIGURACION,
    titulo: 'Configuración avanzada',
    descripcion: 'Todos los parámetros, uno por uno',
  },
];

const CLAVES = new Set(VISTAS.map((v) => v.clave));

/** ¿Esta clave es una de las tres vistas? */
export const esVista = (clave) => CLAVES.has(clave);

/**
 * Hash de una vista, tal como va en la barra de direcciones.
 *
 * @param {string} clave
 * @returns {string} por ejemplo `#/lotes`
 */
export function hashDeVista(clave) {
  return `#/${esVista(clave) ? clave : VISTA_POR_DEFECTO}`;
}

/**
 * Vista que corresponde a un hash.
 *
 * Acepta las formas que de verdad aparecen en la barra de direcciones: vacío,
 * `#`, `#/lotes`, `#lotes`, con barra final y con mayúsculas. Cualquier cosa
 * que no se reconozca cae en la vista por defecto, que es la simulación: así un
 * enlace viejo o mal escrito abre algo útil en vez de una pantalla en blanco.
 *
 * @param {string} hash
 * @returns {string} clave de vista
 */
export function vistaDeHash(hash) {
  if (typeof hash !== 'string') return VISTA_POR_DEFECTO;
  const limpio = hash
    .trim()
    .replace(/^#/, '')
    .replace(/^\//, '')
    .replace(/\/+$/, '')
    .toLowerCase();
  return esVista(limpio) ? limpio : VISTA_POR_DEFECTO;
}

/** Título de una vista, para la barra superior y el documento. */
export function tituloDeVista(clave) {
  return VISTAS.find((v) => v.clave === clave)?.titulo ?? VISTAS[0].titulo;
}
