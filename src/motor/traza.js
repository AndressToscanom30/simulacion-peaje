/**
 * Grabador de trazas: convierte una réplica en una lista de eventos que la
 * interfaz puede **reproducir** (DEC-033).
 *
 * El grabador solo observa. No toca el estado del motor ni consume números
 * aleatorios, así que grabar o no grabar da exactamente el mismo resultado, y
 * hay una prueba que lo comprueba.
 *
 * El formato está documentado en `docs/traza.md` y está versionado: la fase 6
 * pinta el 3D desde la traza sin tener que leer el motor.
 *
 * JS puro: no importa React, ni DOM, ni Three.js.
 */

/** Versión del formato. Se sube si cambia de forma incompatible. */
export const VERSION_TRAZA = 2;

/** Eventos que el grabador reconoce, por familia. */
export const EVENTOS_TRAZA = {
  vehiculo: ['llegada', 'ingresoACaseta', 'salida'],
  caseta: [
    'casetaReservada',
    'casetaAbre',
    'casetaMarcada',
    'casetaCierra',
    'casetaReasignada',
    'cierreCancelado',
    'traspasoIniciado',
    'traspasoVencido',
  ],
  pozo: ['peticionBloqueada', 'prestamoIniciado'],
  medicion: ['lecturaCola'],
};

const TODOS_LOS_TIPOS = Object.values(EVENTOS_TRAZA).flat();

/**
 * Crea un grabador.
 *
 * @param {object} args
 * @param {{ahora: number}} args.reloj reloj del motor, por referencia: de ahí
 *   sale el instante de cada evento
 * @returns {{anotar: (tipo: string, datos: object) => void, eventos: object[]}}
 */
export function crearGrabador({ reloj }) {
  /** @type {object[]} */
  const eventos = [];

  return {
    eventos,

    anotar(tipo, datos) {
      if (!TODOS_LOS_TIPOS.includes(tipo)) {
        throw new TypeError(
          `Tipo de evento de traza desconocido: "${tipo}". Los válidos son: ${TODOS_LOS_TIPOS.join(', ')}.`,
        );
      }
      eventos.push({ t: reloj.ahora, tipo, ...datos });
    },
  };
}

/**
 * Arma la traza completa a partir de los eventos grabados, el escenario y el
 * resultado del motor.
 *
 * @param {object} args
 * @param {object[]} args.eventos los que anotó el grabador
 * @param {object} args.escenario escenario completo, serializable
 * @param {number} args.semilla
 * @param {object} args.resultado salida de `simularPeaje`
 * @returns {object} traza serializable a JSON
 */
export function armarTraza({ eventos, escenario, semilla, resultado }) {
  const duracionIntervalo = escenario.tiempo.duracionIntervaloSegundos;
  const intervalos = escenario.tiempo.intervalos;
  const horizonte = duracionIntervalo * intervalos;

  const sentidos = resultado.sentidos.map((medidas, id) => ({
    id,
    etiqueta: medidas.etiqueta,
    conteo: escenario.sentidos[id].conteo,
    modo: escenario.sentidos[id].modo,
    colaInicial: escenario.sentidos[id].colaInicial,
    casetasIniciales: escenario.sentidos[id].casetasIniciales,
  }));

  return {
    version: VERSION_TRAZA,

    metadatos: {
      escenario,
      semilla,
      horizonteSegundos: horizonte,
      duracionIntervaloSegundos: duracionIntervalo,
      intervalos,
      pozoTotal: escenario.pozo.total,
      minimoPorSentido: escenario.pozo.minimoPorSentido,
      maximoPorSentido: escenario.pozo.maximoPorSentido,
      sentidos,
      /** Último instante grabado: puede pasar del horizonte mientras drena la cola. */
      instanteFinalSegundos: eventos.length > 0 ? eventos[eventos.length - 1].t : 0,
    },

    /** Todos los eventos, en el orden en que ocurrieron. */
    eventos,

    /** Series por intervalo y sentido, para los gráficos sin recorrer eventos. */
    seriesPorIntervalo: sentidos.map((sentido) => {
      const medidas = resultado.sentidos[sentido.id];
      return {
        sentidoId: sentido.id,
        etiqueta: sentido.etiqueta,
        /** Llegadas contadas de los propios eventos de la traza. */
        llegadas: contarPorIntervalo(eventos, sentido.id, intervalos),
        wqSegundos: medidas.wqPorIntervaloSegundos,
        colaMuestreada: medidas.colaMuestreada,
      };
    }),

    /** Las medidas que el motor reporta, las mismas de los informes. */
    medidas: {
      sentidos: resultado.sentidos,
      total: resultado.total,
      pozo: resultado.pozo,
    },
  };
}

/** Llegadas por intervalo de un sentido, contadas de los eventos. */
function contarPorIntervalo(eventos, sentidoId, intervalos) {
  const cuenta = new Array(intervalos).fill(0);
  for (const evento of eventos) {
    if (evento.tipo === 'llegada' && evento.sentidoId === sentidoId && !evento.inicial) {
      cuenta[evento.intervalo] += 1;
    }
  }
  return cuenta;
}

// ------------------------------------------------------------ reconstrucción ---

/**
 * Reconstruye el estado del peaje a lo largo de la traza, sin usar el motor.
 *
 * Es lo que hace la interfaz al reproducir y lo que hará la fase 6 para pintar.
 * También sirve de comprobación: lo que sale de aquí tiene que coincidir con lo
 * que reportó el motor.
 *
 * @param {object} traza
 * @returns {object} `{porSentido, pozo, hitos}` con el estado final y las series
 */
export function reconstruirDesdeTraza(traza) {
  const { metadatos } = traza;
  const { intervalos, duracionIntervaloSegundos: duracion, horizonteSegundos: horizonte } = metadatos;

  const porSentido = metadatos.sentidos.map((sentido) => ({
    sentidoId: sentido.id,
    etiqueta: sentido.etiqueta,
    cola: 0,
    enServicio: 0,
    atendidos: 0,
    llegados: 0,
    casetasAbiertas: 0,
    colaMaxima: 0,
    /** Integral de casetas abiertas, para los carriles-intervalo. */
    integralCasetas: 0,
  }));

  /** Casetas por dueño: null = en el pozo. */
  const duenoDeCaseta = new Array(metadatos.pozoTotal).fill(null);
  const reservadaPara = new Array(metadatos.pozoTotal).fill(null);
  const marcada = new Array(metadatos.pozoTotal).fill(false);
  const enTraspaso = new Array(metadatos.pozoTotal).fill(false);

  /** Serie de hitos: un punto cada vez que algo cambia, para los gráficos. */
  const hitos = [];
  let ultimoInstante = 0;

  const integrar = (hasta) => {
    const tope = Math.min(hasta, horizonte);
    if (tope > ultimoInstante) {
      for (const s of porSentido) s.integralCasetas += s.casetasAbiertas * (tope - ultimoInstante);
      ultimoInstante = tope;
    }
  };

  for (const evento of traza.eventos) {
    integrar(evento.t);
    const s = porSentido[evento.sentidoId ?? evento.haciaSentidoId ?? 0];

    switch (evento.tipo) {
      case 'llegada':
        s.cola += 1;
        s.llegados += 1;
        if (evento.t <= horizonte) s.colaMaxima = Math.max(s.colaMaxima, s.cola);
        break;
      case 'ingresoACaseta':
        s.cola -= 1;
        s.enServicio += 1;
        break;
      case 'salida':
        s.enServicio -= 1;
        s.atendidos += 1;
        break;
      case 'casetaReservada':
        reservadaPara[evento.casetaId] = evento.sentidoId;
        break;
      case 'casetaAbre':
        reservadaPara[evento.casetaId] = null;
        duenoDeCaseta[evento.casetaId] = evento.sentidoId;
        marcada[evento.casetaId] = false;
        enTraspaso[evento.casetaId] = false;
        s.casetasAbiertas += 1;
        break;
      case 'casetaMarcada':
        marcada[evento.casetaId] = true;
        break;
      case 'cierreCancelado':
        marcada[evento.casetaId] = false;
        break;
      case 'casetaCierra':
        if (duenoDeCaseta[evento.casetaId] !== null) {
          porSentido[duenoDeCaseta[evento.casetaId]].casetasAbiertas -= 1;
        }
        duenoDeCaseta[evento.casetaId] = null;
        marcada[evento.casetaId] = false;
        enTraspaso[evento.casetaId] = false;
        break;
      case 'traspasoIniciado': {
        const id = evento.casetaId;
        if (duenoDeCaseta[id] === null) {
          duenoDeCaseta[id] = evento.desdeSentidoId;
          porSentido[evento.desdeSentidoId].casetasAbiertas += 1;
        }
        reservadaPara[id] = evento.haciaSentidoId;
        enTraspaso[id] = true;
        break;
      }
      case 'traspasoVencido':
        enTraspaso[evento.casetaId] = true;
        break;
      case 'casetaReasignada':
      case 'peticionBloqueada':
      case 'prestamoIniciado':
      case 'lecturaCola':
        break; // no cambian el estado reconstruido
      default:
        throw new Error(`Evento de traza no manejado al reconstruir: ${evento.tipo}`);
    }

    hitos.push({
      t: evento.t,
      tipo: evento.tipo,
      colas: porSentido.map((x) => x.cola),
      casetas: porSentido.map((x) => x.casetasAbiertas),
    });
  }

  integrar(horizonte);

  return {
    porSentido: porSentido.map((s) => ({
      ...s,
      carrilesIntervalo: s.integralCasetas / duracion,
    })),
    pozo: {
      total: metadatos.pozoTotal,
      libres: duenoDeCaseta.filter((d, i) => d === null && reservadaPara[i] === null).length,
      duenoDeCaseta: [...duenoDeCaseta],
      reservadaPara: [...reservadaPara],
      marcada: [...marcada],
      enTraspaso: [...enTraspaso],
    },
    hitos,
    intervalos,
  };
}

/**
 * Estado del peaje en un instante dado de la traza, para el modo tiempo real.
 *
 * Recorre los eventos hasta `instante`. Para reproducir hacia adelante conviene
 * usar `crearReproductor`, que no vuelve a empezar en cada fotograma.
 *
 * @param {object} traza
 * @param {number} instante segundos de tiempo simulado
 */
export function estadoEnInstante(traza, instante) {
  const recortada = {
    ...traza,
    eventos: traza.eventos.filter((evento) => evento.t <= instante),
  };
  return reconstruirDesdeTraza(recortada);
}
