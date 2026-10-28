/**
 * Constantes visuales de la escena 3D (DEC-039).
 *
 * Todo lo que se puede ajustar de la vista vive aquí: dimensiones, separaciones,
 * duraciones de las animaciones y colores. Los componentes no traen números.
 *
 * **Ninguna de estas constantes afecta a la simulación.** Las duraciones son
 * puramente visuales: el modelo no tiene distancias ni velocidades (DEC-038).
 *
 * JS puro: no importa React, ni DOM, ni three.
 */

/** Estados en que puede estar una caseta, con su forma y su texto (DEC-039). */
export const ESTADOS_CASETA = {
  cerrada: {
    clave: 'cerrada',
    etiqueta: 'en el pozo',
    texto: 'POZO',
    color: '#6b6b64',
    /** Alto del indicador del letrero: la forma distingue el estado sin color. */
    alturaIndicador: 0.15,
    /** `caja`, `prisma` o `cono`: la figura también lo distingue. */
    figura: 'caja',
  },
  reservada: {
    clave: 'reservada',
    etiqueta: 'reservada, abriendo',
    texto: 'ABRE EN',
    color: '#d9a400',
    alturaIndicador: 0.5,
    figura: 'cono',
  },
  abierta: {
    clave: 'abierta',
    etiqueta: 'abierta',
    texto: 'ABIERTA',
    color: '#2f8f3f',
    alturaIndicador: 1,
    figura: 'prisma',
  },
  marcada: {
    clave: 'marcada',
    etiqueta: 'marcada, cierra al terminar',
    texto: 'CIERRA',
    color: '#b5651d',
    alturaIndicador: 0.7,
    figura: 'cono',
  },
};

/** Fases visuales de un vehículo. Ver `modeloEscena.js` para lo que miden. */
export const FASES_VEHICULO = {
  llegando: { clave: 'llegando', etiqueta: 'entrando a la cola', cuentaComo: 'cola' },
  enCola: { clave: 'enCola', etiqueta: 'esperando en la cola', cuentaComo: 'cola' },
  enTransito: { clave: 'enTransito', etiqueta: 'avanzando a la caseta', cuentaComo: 'enServicio' },
  enServicio: { clave: 'enServicio', etiqueta: 'siendo atendido', cuentaComo: 'enServicio' },
  saliendo: { clave: 'saliendo', etiqueta: 'saliendo del peaje', cuentaComo: 'fuera' },
};

export const ESCENA_3D = {
  /** Duraciones **visuales**, en segundos de tiempo simulado. No miden nada. */
  duraciones: {
    /** Entrada desde el borde hasta el final de la cola. */
    llegadaSegundos: 6,
    /** Avance de la cabeza de la cola a la caseta. */
    transitoSegundos: 3,
    /**
     * Tope del tránsito como fracción del servicio: con servicios cortos el
     * tránsito se recorta para que nunca se coma la atención entera.
     */
    fraccionMaximaDelServicio: 0.5,
    /** Salida de la caseta hasta desaparecer. */
    salidaSegundos: 4,
    /** Cuánto se queda visible un aviso de reasignación o de bloqueo. */
    avisoSegundos: 25,
  },

  /** Geometría de la plaza, en unidades de escena (≈ 1 unidad = 1 vehículo corto). */
  plaza: {
    /** Separación entre los centros de dos carriles contiguos. */
    separacionCarriles: 4.4,
    /** Largo de la isleta de la caseta. */
    largoCaseta: 3.4,
    anchoCaseta: 2.2,
    altoCaseta: 2.6,
    /** Alto del letrero aéreo sobre el suelo. */
    alturaLetrero: 5.2,
    anchoLetrero: 3.6,
    altoLetrero: 1.5,
    /** Largo de la calzada a cada lado de la plaza. */
    largoCalzada: 34,
    anchoArcen: 1.2,
  },

  /** Cómo se dibuja la cola única de cada sentido (DEC-038, punto 1). */
  cola: {
    /** Separación entre vehículos consecutivos de la cola. */
    separacion: 2,
    /**
     * Cuántos vehículos de la cola se dibujan. Los que no caben se cuentan en
     * el contador de "no visibles", no se dibujan apilados.
     */
    visiblesMaximos: 45,
    /**
     * Ancho del embudo. La cola es **una sola** (DEC-038): las hileras son para
     * que quepa en pantalla, y por eso el embudo se mantiene más estrecho que
     * la línea de casetas, para que no se lea como una fila por caseta.
     */
    hileras: 7,
    separacionHileras: 2.3,
    /** Distancia del primero de la cola a la línea de casetas. */
    separacionDeLaPlaza: 6.5,
  },

  /** Vehículos. Todos de la misma clase: la categoría no entra al modelo (DEC-003). */
  vehiculo: {
    largo: 1.8,
    ancho: 1.1,
    alto: 0.85,
    /** Variación de largo y de tono, derivada del id para poder seguir uno. */
    variacionLargo: 0.3,
    /** Paleta de la que se elige por id. */
    colores: ['#3d6e8f', '#8f5a3d', '#4a7a52', '#7a4a6b', '#6b6b3d', '#3d5a7a'],
  },

  /** Niveles de calidad: lo único que cambian es cuánto se dibuja. */
  calidades: {
    alta: { clave: 'alta', etiqueta: 'alta', sombras: true, segmentos: 16, colaVisible: 45 },
    media: { clave: 'media', etiqueta: 'media', sombras: false, segmentos: 10, colaVisible: 30 },
    baja: { clave: 'baja', etiqueta: 'baja', sombras: false, segmentos: 6, colaVisible: 16 },
  },

  colores: {
    cielo: '#cfd8dd',
    cieloOscuro: '#1b1f24',
    asfalto: '#4a4a46',
    isleta: '#b8b4a8',
    caseta: '#d8d4c6',
    techoCaseta: '#8c8980',
    marca: '#e8e4d8',
    letrero: '#2a2d33',
    aviso: '#c23b22',
    reasignacion: '#d9a400',
  },

  /**
   * Preajustes de cámara. Las distancias **no son fijas**: se calculan en
   * `geometria.js` a partir del ancho de la plaza y del fondo de la cola, que
   * dependen del tamaño del pozo. Estos factores dicen cómo.
   *
   * `altura` y `distancia` multiplican la medida de referencia de cada vista.
   */
  camaras: {
    aerea: { clave: 'aerea', etiqueta: 'Aérea', altura: 1.45, distancia: 0.45, inclinacion: 0.04 },
    lateral: { clave: 'lateral', etiqueta: 'Lateral', altura: 0.26, distancia: 1.05, lado: true },
    todo: { clave: 'todo', etiqueta: 'Encuadrar todo', altura: 1, distancia: 0.9, inclinacion: 0 },
  },

  /** Campo de visión vertical de la cámara, en grados. */
  campoDeVision: 42,
};

/** Color de un vehículo, determinista por su id. */
export function colorDeVehiculo(vehiculoId, sentidoId = 0) {
  const paleta = ESCENA_3D.vehiculo.colores;
  // Se mezcla el sentido para que las dos colas no salgan con el mismo patrón.
  return paleta[(vehiculoId * 7 + sentidoId * 3) % paleta.length];
}

/** Largo de un vehículo, determinista por su id. */
export function largoDeVehiculo(vehiculoId) {
  const { largo, variacionLargo } = ESCENA_3D.vehiculo;
  // Secuencia determinista en [0, 1) sin usar Math.random.
  const fraccion = ((vehiculoId * 2654435761) % 1000) / 1000;
  return largo * (1 - variacionLargo / 2 + fraccion * variacionLargo);
}
