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

/**
 * Estados en que puede estar una caseta, con su forma y su texto (DEC-039).
 *
 * Los colores son los de la dirección visual (DEC-058), aclarados lo justo
 * para que se lean sobre el letrero, que va en asfalto: el gris del hormigón
 * para el pozo, el amarillo de demarcación para la que abre, el verde de guía
 * para la abierta y el ámbar de obra para la que cierra. `figura`, `texto` y
 * `alturaIndicador` siguen siendo lo que distingue el estado sin el color.
 */
export const ESTADOS_CASETA = {
  cerrada: {
    clave: 'cerrada',
    etiqueta: 'en el pozo',
    texto: 'POZO',
    color: '#9aa4ab',
    /** Alto del indicador del letrero: la forma distingue el estado sin color. */
    alturaIndicador: 0.15,
    /** `caja`, `prisma` o `cono`: la figura también lo distingue. */
    figura: 'caja',
  },
  reservada: {
    clave: 'reservada',
    etiqueta: 'reservada, abriendo',
    texto: 'ABRE EN',
    color: '#e8a302',
    alturaIndicador: 0.5,
    figura: 'cono',
  },
  abierta: {
    clave: 'abierta',
    etiqueta: 'abierta',
    texto: 'ABIERTA',
    color: '#1a8f55',
    alturaIndicador: 1,
    figura: 'prisma',
  },
  marcada: {
    clave: 'marcada',
    etiqueta: 'marcada, cierra al terminar',
    texto: 'CIERRA',
    color: '#c06a1f',
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
    /**
     * Opacidad del **reverso** de la calzada. Con la vista libre se puede
     * orbitar por debajo (DEC-041), y una calzada opaca taparía la escena
     * entera; vista desde abajo se vuelve un velo translúcido.
     */
    opacidadReverso: 0.3,
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
    /**
     * Paleta de la que se elige por id. Tonos apagados y de la misma
     * temperatura que el hormigón (DEC-058): los vehículos son el fondo, y lo
     * que tiene que destacar es el estado de las casetas.
     */
    colores: ['#43657f', '#7d5540', '#4a7059', '#6d4a63', '#6b6a44', '#3f5570'],
  },

  /**
   * Modelo 3D del vehículo: `public/models/carro.glb` (DEC-040, que supera la
   * parte de la DEC-037 que descartaba modelos externos).
   *
   * El archivo trae 26 materiales y 82 602 triángulos, demasiados para dibujar
   * ciento y pico de copias. Al cargarlo se agrupan los materiales en unos
   * pocos **papeles**, se tiran los que no se ven desde fuera y se simplifica
   * la malla por rejilla (ver `modeloCarro.js`). Nada de esto toca al motor:
   * el modelo sigue siendo de una sola clase de vehículo (DEC-003).
   */
  carro: {
    /** Ruta dentro del sitio publicado; se le pone delante la base de Vite. */
    ruta: 'models/carro.glb',
    /**
     * Papeles en que se agrupan los materiales del archivo. El papel se elige
     * por el **nombre** del material, en minúsculas, buscando el patrón más
     * largo que encaje; lo que no encaja en ninguno va a `rolPorDefecto`.
     *
     * Las texturas del archivo no se usan: a la escala de la escena un coche
     * mide unos pocos píxeles, así que cada papel lleva un material plano.
     */
    roles: {
      pintura: {
        clave: 'pintura',
        etiqueta: 'carrocería',
        patrones: ['carpaint'],
        color: '#9aa0a6',
        metalico: 0.45,
        rugosidad: 0.4,
      },
      cromo: {
        clave: 'cromo',
        etiqueta: 'cromados y llantas',
        patrones: ['chrome', 'nickel', 'trim', 'plate', 'mirror', 'caliper', 'calliper'],
        color: '#b7bcc2',
        metalico: 0.85,
        rugosidad: 0.25,
      },
      cristal: {
        clave: 'cristal',
        etiqueta: 'cristales',
        patrones: ['window', 'light_glass', 'red_glass'],
        color: '#2b3238',
        metalico: 0.1,
        rugosidad: 0.08,
        opacidad: 0.5,
      },
      rueda: {
        clave: 'rueda',
        etiqueta: 'neumáticos',
        patrones: ['wheel', 'phong21sg1'],
        color: '#22242a',
        metalico: 0.05,
        rugosidad: 0.9,
      },
      luces: {
        clave: 'luces',
        etiqueta: 'faros',
        patrones: ['lights', 'tiked'],
        color: '#e6e0cc',
        metalico: 0.2,
        rugosidad: 0.3,
      },
      detalle: {
        clave: 'detalle',
        etiqueta: 'plásticos y molduras',
        patrones: [],
        color: '#3b3e44',
        metalico: 0.25,
        rugosidad: 0.65,
      },
      /** Interior, motor y chasis: no se ven desde fuera y son el 22 % de la malla. */
      interno: {
        clave: 'interno',
        etiqueta: 'interior y mecánica',
        patrones: ['interior', 'engine', 'chassis'],
        oculto: true,
      },
    },
    /** Papel al que va un material cuyo nombre no encaja en ningún patrón. */
    rolPorDefecto: 'detalle',
    /** Papel que toma el color del vehículo; el resto conserva el suyo. */
    rolDePintura: 'pintura',
    /** Factor sobre `vehiculo.largo`: a 1 el modelo ocupa lo mismo que la caja. */
    factorDeLargo: 1,
    /** Altura del suelo a la que ruedan los vehículos. */
    alturaDeRodadura: 0.2,
    /**
     * En el archivo el morro mira a +Z y la escena también avanza en +Z, así
     * que no hace falta girarlo. Se deja configurable porque el eje largo y el
     * frente se detectan al cargar y un archivo distinto puede venir al revés.
     */
    frenteHaciaZPositivo: true,
    /**
     * Niveles de detalle. `celdasALoLargo` es la resolución de la rejilla con
     * que se simplifica: cuantas más celdas caben a lo largo del coche, más
     * triángulos sobreviven.
     */
    niveles: {
      completo: {
        clave: 'completo',
        celdasALoLargo: 84,
        roles: ['pintura', 'cromo', 'cristal', 'rueda', 'luces', 'detalle'],
      },
      reducido: {
        clave: 'reducido',
        celdasALoLargo: 40,
        roles: ['pintura', 'cromo', 'cristal', 'rueda'],
      },
    },
  },

  /** Niveles de calidad: lo único que cambian es cuánto se dibuja. */
  calidades: {
    alta: { clave: 'alta', etiqueta: 'alta', sombras: true, segmentos: 16, colaVisible: 45, carro: 'completo' },
    media: { clave: 'media', etiqueta: 'media', sombras: false, segmentos: 10, colaVisible: 30, carro: 'reducido' },
    baja: { clave: 'baja', etiqueta: 'baja', sombras: false, segmentos: 6, colaVisible: 16, carro: null },
  },

  /**
   * Colores de la plaza, en la paleta de la dirección visual (DEC-058): el
   * asfalto y el hormigón de la interfaz son los mismos materiales de aquí, así
   * que comparten los tonos. El letrero va en el asfalto oscuro, igual que el
   * pórtico del HUD, y el aviso en el rojo de señal.
   *
   * No hay cielo oscuro: la interfaz es solo de modo claro (DEC-058).
   */
  colores: {
    cielo: '#e6e9eb',
    asfalto: '#3a4248',
    isleta: '#b9c0c5',
    caseta: '#f2f4f5',
    techoCaseta: '#8a949b',
    marca: '#eef1f2',
    letrero: '#262b30',
    aviso: '#a8201a',
    reasignacion: '#e8a302',
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

  /**
   * Navegación libre (DEC-041). La cámara orbita, se acerca y se desplaza
   * **desde cualquier ángulo**, incluido por debajo de la calzada, y los
   * preajustes son solo viajes a un encuadre: en cuanto se arrastra, el ratón
   * manda.
   *
   * Los topes no son distancias fijas: `limitesDeNavegacion` en `geometria.js`
   * los saca del contenido con estos factores, para que el peaje no se pueda
   * perder de vista.
   */
  navegacion: {
    /** Tope de acercamiento, en unidades de escena. */
    distanciaMinima: 2.5,
    /** Tope de alejamiento, como factor de la medida de referencia. */
    factorDistanciaMaxima: 2.4,
    /** Ángulo polar permitido, en fracciones de π: 0 es cenital y 1, nadiral. */
    anguloPolarMinimo: 0.015,
    anguloPolarMaximo: 0.985,
    /** Lado del cubo en que puede moverse el punto al que mira, sobre la referencia. */
    factorLimiteObjetivo: 0.55,
    alturaMinimaObjetivo: -2,
    alturaMaximaObjetivo: 9,
    velocidadRotacion: 0.85,
    velocidadZoom: 0.8,
    velocidadDesplazamiento: 0.9,
    amortiguacion: 0.08,
    /** Suavizado del viaje a un preajuste: más alto, más rápido. */
    suavizadoPreajuste: 4,
    /** A esta distancia del destino el viaje se da por terminado. */
    toleranciaPreajuste: 0.25,
  },

  /**
   * Niebla, como factores de la medida de referencia. Empieza más allá de
   * cualquier preajuste para que mirar el peaje entero no lo deje en bruma.
   */
  niebla: { desde: 2.2, hasta: 4.6 },

  /**
   * Luces. La de **hemisferio** no es decorativa: ilumina las caras que miran
   * hacia abajo, que es lo único que se ve cuando la cámara libre se mete por
   * debajo de la calzada (DEC-041). Sin ella el reverso queda negro, porque la
   * direccional viene de arriba y además la calzada recibe sombra.
   *
   * Solo hay intensidades de día: la interfaz es únicamente de modo claro
   * (DEC-058), así que la escena ya no se oscurece con el sistema.
   */
  luces: {
    ambiente: { claro: 0.75 },
    direccional: { claro: 1.1, posicion: [24, 38, 20], resolucionSombra: 1024 },
    hemisferio: { claro: 0.8, suelo: '#b9c0c5' },
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

/**
 * Papel de un material del modelo del carro, por su nombre (DEC-040).
 *
 * Gana el patrón **más largo** que aparezca en el nombre, para que
 * `light_glass` no se lo lleve `lights`. Puro: no toca three ni el DOM.
 *
 * @param {string} nombre nombre del material en el archivo
 * @returns {object} el papel de `ESCENA_3D.carro.roles`
 */
export function rolDeMaterial(nombre) {
  const { roles, rolPorDefecto } = ESCENA_3D.carro;
  const buscado = String(nombre ?? '').toLowerCase();
  let ganador = null;
  let largoGanador = 0;
  for (const rol of Object.values(roles)) {
    for (const patron of rol.patrones) {
      if (buscado.includes(patron) && patron.length > largoGanador) {
        ganador = rol;
        largoGanador = patron.length;
      }
    }
  }
  return ganador ?? roles[rolPorDefecto];
}
