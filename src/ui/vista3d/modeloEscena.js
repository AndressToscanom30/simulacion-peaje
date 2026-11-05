/**
 * Modelo de escena: traduce una traza y un instante en lo que hay que dibujar
 * (DEC-036).
 *
 * **No importa three, ni React, ni el motor.** Solo la traza y las constantes
 * visuales, así que se prueba en entorno `node` sin WebGL.
 *
 * Avanza con el cursor de `crearReproductor`, así que un fotograma no recorre
 * todos los eventos: solo los que caen en el salto. Al rebobinar rehace el
 * estado desde el principio, que es el precio de poder ir hacia atrás.
 *
 * ## Qué miden las fases
 *
 * Las fases de un vehículo son **visuales**, y dos de ellas no son estados del
 * modelo sino interpolación (DEC-038, punto 3):
 *
 * | Fase | Desde | El motor lo cuenta en |
 * |---|---|---|
 * | `llegando` | el evento `llegada` | **la cola** |
 * | `enCola` | pasada la entrada visual | **la cola** |
 * | `enTransito` | el evento `ingresoACaseta` | **en servicio** |
 * | `enServicio` | pasado el tránsito visual | **en servicio** |
 * | `saliendo` | el evento `salida` | ya atendido, fuera |
 *
 * O sea: `cola` del motor = `llegando` + `enCola`, y `enServicio` del motor =
 * `enTransito` + `enServicio`. La entrada desde el borde y el avance a la
 * caseta ocurren **dentro** del tiempo que el motor ya le había asignado al
 * vehículo, así que no corren ni un instante ningún evento.
 */

import { crearReproductor } from '../reloj.js';
import { ESCENA_3D, ESTADOS_CASETA, FASES_VEHICULO } from '../../config/escena3d.js';

/** Cuánto dura el tránsito visual de un vehículo, acotado por su servicio. */
function transitoDe(duracionServicioSegundos, duraciones) {
  const tope = (duracionServicioSegundos ?? 0) * duraciones.fraccionMaximaDelServicio;
  return Math.max(0, Math.min(duraciones.transitoSegundos, tope));
}

/**
 * Crea el modelo de escena de una traza.
 *
 * @param {object} traza
 * @param {object} [opciones]
 * @param {object} [opciones.duraciones] duraciones visuales; por defecto las de
 *   `ESCENA_3D`. Con `reducirMovimiento` se ponen a 0 (DEC-039).
 * @param {boolean} [opciones.reducirMovimiento=false]
 */
export function crearModeloEscena(traza, { duraciones, reducirMovimiento = false } = {}) {
  const base = duraciones ?? ESCENA_3D.duraciones;
  const tiempos = reducirMovimiento
    ? { ...base, llegadaSegundos: 0, transitoSegundos: 0, salidaSegundos: 0 }
    : base;

  const numeroDeSentidos = traza.metadatos.sentidos.length;
  const pozoTotal = traza.metadatos.pozoTotal;

  /** @type {object[]} vehículos activos, en orden de llegada por sentido */
  let porSentido = [];
  /** @type {object[]} una entrada por caseta del pozo */
  let casetas = [];
  /** @type {object[]} avisos recientes (reasignaciones, bloqueos) */
  let avisos = [];
  let atendidos = [];
  let llegados = [];

  let reproductor = crearReproductor(traza);

  function reiniciar() {
    porSentido = Array.from({ length: numeroDeSentidos }, () => []);
    casetas = Array.from({ length: pozoTotal }, (_, id) => ({
      id,
      estado: ESTADOS_CASETA.cerrada.clave,
      sentidoId: null,
      sentidoDestinoId: null,
      vehiculoId: null,
      abreEn: null,
      traspasoVencido: false,
    }));
    avisos = [];
    atendidos = new Array(numeroDeSentidos).fill(0);
    llegados = new Array(numeroDeSentidos).fill(0);
    reproductor = crearReproductor(traza);
  }

  reiniciar();

  /** Aplica un evento al estado acumulado. */
  function aplicar(evento) {
    switch (evento.tipo) {
      case 'llegada': {
        porSentido[evento.sentidoId].push({
          id: evento.vehiculoId,
          sentidoId: evento.sentidoId,
          tLlegada: evento.t,
          inicial: Boolean(evento.inicial),
          tIngreso: null,
          casetaId: null,
          duracionServicioSegundos: null,
          tSalida: null,
        });
        llegados[evento.sentidoId] += 1;
        break;
      }

      case 'ingresoACaseta': {
        const vehiculo = buscarVehiculo(evento.sentidoId, evento.vehiculoId);
        if (vehiculo) {
          vehiculo.tIngreso = evento.t;
          vehiculo.casetaId = evento.casetaId;
          vehiculo.duracionServicioSegundos = evento.duracionServicioSegundos;
        }
        casetas[evento.casetaId].vehiculoId = evento.vehiculoId;
        break;
      }

      case 'salida': {
        const vehiculo = buscarVehiculo(evento.sentidoId, evento.vehiculoId);
        if (vehiculo) vehiculo.tSalida = evento.t;
        casetas[evento.casetaId].vehiculoId = null;
        atendidos[evento.sentidoId] += 1;
        break;
      }

      case 'casetaReservada': {
        const caseta = casetas[evento.casetaId];
        caseta.estado = ESTADOS_CASETA.reservada.clave;
        caseta.sentidoId = evento.sentidoId;
        caseta.abreEn = evento.abreEn;
        break;
      }

      case 'casetaAbre': {
        const caseta = casetas[evento.casetaId];
        caseta.estado = ESTADOS_CASETA.abierta.clave;
        caseta.sentidoId = evento.sentidoId;
        caseta.sentidoDestinoId = null;
        caseta.abreEn = null;
        caseta.traspasoVencido = false;
        break;
      }

      case 'traspasoIniciado': {
        const caseta = casetas[evento.casetaId];
        caseta.estado = ESTADOS_CASETA.traspaso.clave;
        caseta.sentidoId = evento.desdeSentidoId;
        caseta.sentidoDestinoId = evento.haciaSentidoId;
        caseta.abreEn = evento.abreEn;
        caseta.traspasoVencido = false;
        break;
      }

      case 'traspasoVencido':
        casetas[evento.casetaId].traspasoVencido = true;
        break;

      case 'casetaMarcada':
        casetas[evento.casetaId].estado = ESTADOS_CASETA.marcada.clave;
        break;

      case 'cierreCancelado':
        casetas[evento.casetaId].estado = ESTADOS_CASETA.abierta.clave;
        break;

      case 'casetaCierra': {
        const caseta = casetas[evento.casetaId];
        caseta.estado = ESTADOS_CASETA.cerrada.clave;
        caseta.sentidoId = null;
        caseta.sentidoDestinoId = null;
        caseta.abreEn = null;
        caseta.traspasoVencido = false;
        break;
      }

      case 'casetaReasignada':
        avisos.push({
          t: evento.t,
          tipo: 'reasignacion',
          casetaId: evento.casetaId,
          desdeSentidoId: evento.desdeSentidoId,
          sentidoId: evento.haciaSentidoId,
        });
        break;

      case 'peticionBloqueada':
        avisos.push({ t: evento.t, tipo: 'bloqueo', sentidoId: evento.sentidoId, cola: evento.cola });
        break;

      case 'prestamoIniciado':
        avisos.push({
          t: evento.t,
          tipo: 'prestamo',
          casetaId: evento.casetaId,
          desdeSentidoId: evento.desdeSentidoId,
          sentidoId: evento.haciaSentidoId,
        });
        break;

      case 'lecturaCola':
        avisos.push({ t: evento.t, tipo: 'lecturaCola', sentidoId: evento.sentidoId, cola: evento.cola });
        break;

      default:
        throw new Error(`Evento de traza no manejado en la escena: ${evento.tipo}`);
    }
  }

  /** Busca un vehículo activo. Se recorre desde el final: los recientes están ahí. */
  function buscarVehiculo(sentidoId, vehiculoId) {
    const lista = porSentido[sentidoId];
    for (let i = lista.length - 1; i >= 0; i -= 1) {
      if (lista[i].id === vehiculoId) return lista[i];
    }
    return null;
  }

  /** Fase y progreso de un vehículo en el instante `t`, o `null` si no se ve. */
  function faseDe(vehiculo, t) {
    if (t < vehiculo.tLlegada) return null;

    if (vehiculo.tSalida !== null && t >= vehiculo.tSalida) {
      const transcurrido = t - vehiculo.tSalida;
      if (tiempos.salidaSegundos <= 0 || transcurrido >= tiempos.salidaSegundos) return null;
      return {
        fase: FASES_VEHICULO.saliendo.clave,
        progreso: tiempos.salidaSegundos > 0 ? transcurrido / tiempos.salidaSegundos : 1,
      };
    }

    if (vehiculo.tIngreso !== null && t >= vehiculo.tIngreso) {
      const transcurrido = t - vehiculo.tIngreso;
      const transito = transitoDe(vehiculo.duracionServicioSegundos, tiempos);
      if (transcurrido < transito) {
        return { fase: FASES_VEHICULO.enTransito.clave, progreso: transcurrido / transito };
      }
      const servicio = vehiculo.duracionServicioSegundos ?? 0;
      const restante = Math.max(0, servicio - transito);
      return {
        fase: FASES_VEHICULO.enServicio.clave,
        progreso: restante > 0 ? Math.min(1, (transcurrido - transito) / restante) : 1,
      };
    }

    const transcurrido = t - vehiculo.tLlegada;
    // Los de la cola inicial ya estaban ahí: no entran desde el borde.
    if (!vehiculo.inicial && tiempos.llegadaSegundos > 0 && transcurrido < tiempos.llegadaSegundos) {
      return { fase: FASES_VEHICULO.llegando.clave, progreso: transcurrido / tiempos.llegadaSegundos };
    }
    return { fase: FASES_VEHICULO.enCola.clave, progreso: 1 };
  }

  /** Quita de las listas los vehículos que ya no se ven. */
  function podar(t) {
    for (const lista of porSentido) {
      let cuantos = 0;
      while (cuantos < lista.length && faseDe(lista[cuantos], t) === null && lista[cuantos].tSalida !== null) {
        cuantos += 1;
      }
      if (cuantos > 0) lista.splice(0, cuantos);
    }
    const limite = t - tiempos.avisoSegundos;
    if (avisos.length > 0 && avisos[0].t <= limite) {
      avisos = avisos.filter((aviso) => aviso.t > limite);
    }
  }

  return {
    /** Cuántos eventos lleva consumidos: para comprobar que es incremental. */
    get eventosConsumidos() {
      return reproductor.cursor;
    },

    /**
     * Modelo de escena en el instante `t`.
     *
     * @param {number} t segundos de tiempo simulado
     * @returns {object} vehículos, casetas, contadores y avisos
     */
    enInstante(t) {
      const { rebobinado, eventos } = reproductor.irA(t);
      if (rebobinado) {
        // El reproductor ya volvió al principio: hay que rehacer el estado.
        const cursorPrevio = reproductor.cursor;
        reiniciar();
        for (const evento of reproductor.irA(t).eventos) aplicar(evento);
        void cursorPrevio;
      } else {
        for (const evento of eventos) aplicar(evento);
      }

      podar(t);

      const vehiculos = [];
      const contadores = Array.from({ length: numeroDeSentidos }, (_, sentidoId) => ({
        sentidoId,
        etiqueta: traza.metadatos.sentidos[sentidoId].etiqueta,
        cola: 0,
        enServicio: 0,
        saliendo: 0,
        atendidos: atendidos[sentidoId],
        llegados: llegados[sentidoId],
        casetasAbiertas: 0,
        /** Los de la cola que no caben en la longitud visible. */
        colaNoVisible: 0,
      }));

      porSentido.forEach((lista, sentidoId) => {
        let posicionCola = 0;
        for (const vehiculo of lista) {
          const estado = faseDe(vehiculo, t);
          if (estado === null) continue;

          const cuentaComo = FASES_VEHICULO[estado.fase].cuentaComo;
          if (cuentaComo === 'cola') contadores[sentidoId].cola += 1;
          else if (cuentaComo === 'enServicio') contadores[sentidoId].enServicio += 1;
          else contadores[sentidoId].saliendo += 1;

          const enLaCola = cuentaComo === 'cola';
          vehiculos.push({
            id: vehiculo.id,
            sentidoId,
            fase: estado.fase,
            progreso: estado.progreso,
            /** Posición FIFO en la cola: 0 es la cabeza. `null` si no está en cola. */
            posicionCola: enLaCola ? posicionCola : null,
            casetaId: vehiculo.casetaId,
            inicial: vehiculo.inicial,
          });
          if (enLaCola) posicionCola += 1;
        }
      });

      // Casetas **abiertas**: las que están operando. Una marcada sigue abierta
      // hasta terminar su servicio (DEC-007), pero una **reservada** todavía no
      // atiende, así que no cuenta: es el mismo criterio que el motor.
      for (const caseta of casetas) {
        const operando =
          caseta.estado === ESTADOS_CASETA.abierta.clave ||
          caseta.estado === ESTADOS_CASETA.marcada.clave ||
          caseta.estado === ESTADOS_CASETA.traspaso.clave;
        if (operando && caseta.sentidoId !== null) {
          contadores[caseta.sentidoId].casetasAbiertas += 1;
        }
      }

      const visiblesMaximos = ESCENA_3D.cola.visiblesMaximos;
      for (const contador of contadores) {
        contador.colaNoVisible = Math.max(0, contador.cola - visiblesMaximos);
      }

      return {
        instante: t,
        vehiculos,
        casetas: casetas.map((caseta) => ({
          ...caseta,
          ocupada: caseta.vehiculoId !== null,
          /** Segundos que faltan para que abra, si está reservada. */
          faltaParaAbrir: caseta.abreEn === null ? null : Math.max(0, caseta.abreEn - t),
        })),
        contadores,
        pozo: {
          total: pozoTotal,
          libres: casetas.filter((c) => c.sentidoId === null).length,
          porEstado: Object.fromEntries(
            Object.keys(ESTADOS_CASETA).map((clave) => [
              clave,
              casetas.filter((c) => c.estado === clave).length,
            ]),
          ),
        },
        avisos: avisos.filter((aviso) => aviso.t <= t && aviso.t > t - tiempos.avisoSegundos),
      };
    },

    reiniciar,
  };
}

/**
 * Modelo de escena en un instante, sin mantener estado entre llamadas.
 *
 * Es lo cómodo para las pruebas y para una captura puntual; para reproducir
 * conviene `crearModeloEscena`, que avanza con el cursor.
 */
export function escenaEnInstante(traza, t, opciones) {
  return crearModeloEscena(traza, opciones).enInstante(t);
}
