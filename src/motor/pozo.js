/**
 * Pozo común de casetas de efectivo (DEC-002).
 *
 * Las casetas son un recurso compartido: el peaje tiene 6 de efectivo y cada
 * sentido abre entre 1 y 5. El pozo es el dueño de las casetas físicas y lleva
 * la cuenta de quién tiene cada una. Que `c1 + c2 ≤ 6` se cumpla sale de aquí,
 * no de una comprobación aparte: no hay más casetas que repartir.
 *
 * Estados de una caseta:
 *
 * - **libre**: `duenio === null` y `reservadaPara === null`. Está en el pozo.
 * - **reservada**: `reservadaPara === <sentido>`. Ya tiene destino y nadie más
 *   puede tomarla, pero todavía no está operando: está cumpliendo la demora de
 *   apertura o el traslado de una reasignación.
 * - **de un sentido**: `duenio === <sentido>`. Está abierta y atendiendo.
 *   `marcada` indica que se cerrará al terminar su servicio en curso.
 *
 * Una caseta nunca está a la vez reservada por uno y en poder de otro: los dos
 * campos no pueden ser distintos de `null` al mismo tiempo.
 *
 * JS puro: no importa React, ni DOM, ni Three.js.
 */

/**
 * @param {object} args
 * @param {number} args.total casetas de efectivo del peaje
 */
export function crearPozo({ total }) {
  if (!Number.isInteger(total) || total < 1) {
    throw new RangeError(`El pozo necesita al menos una caseta, llegó: ${total}`);
  }

  const casetas = Array.from({ length: total }, (_, id) => ({
    id,
    /** Sentido que la tiene abierta, o `null` si está en el pozo. */
    duenio: null,
    /** Sentido al que está prometida mientras cumple la demora, o `null`. */
    reservadaPara: null,
    /** Se cerrará al terminar el servicio en curso (DEC-007). */
    marcada: false,
    /** Vehículo en atención, o `null`. */
    vehiculo: null,
  }));

  const estaLibre = (c) => c.duenio === null && c.reservadaPara === null;

  return {
    casetas,
    total,

    /** Casetas que nadie tiene ni tiene prometidas. */
    libres: () => casetas.filter(estaLibre),

    /** Casetas abiertas de un sentido, en orden de identificador. */
    casetasDe: (duenio) => casetas.filter((c) => c.duenio === duenio),

    /** Casetas reservadas por un sentido y todavía en tránsito. */
    reservadasDe: (duenio) => casetas.filter((c) => c.reservadaPara === duenio),

    /** ¿Están todas las casetas repartidas o prometidas? */
    agotado: () => !casetas.some(estaLibre),

    /**
     * Reserva la primera caseta libre para un sentido. Devuelve la caseta o
     * `null` si el pozo está agotado.
     */
    reservar(duenio) {
      const libre = casetas.find(estaLibre);
      if (!libre) return null;
      libre.reservadaPara = duenio;
      return libre;
    },

    /** Deshace una reserva sin entregar la caseta. */
    cancelarReserva(caseta) {
      caseta.reservadaPara = null;
    },

    /** Pasa una caseta reservada a estar abierta y operando. */
    entregar(caseta, duenio) {
      if (caseta.duenio !== null) {
        throw new Error(`La caseta ${caseta.id} ya es del sentido ${caseta.duenio}.`);
      }
      caseta.reservadaPara = null;
      caseta.duenio = duenio;
      caseta.marcada = false;
      caseta.vehiculo = null;
    },

    /**
     * Toma una caseta libre y la entrega en el acto, sin demora. Es lo que hace
     * el arranque de una réplica y el modo programado. Devuelve la caseta o
     * `null` si no había ninguna libre.
     */
    tomarYEntregar(duenio) {
      const libre = casetas.find(estaLibre);
      if (!libre) return null;
      libre.reservadaPara = duenio;
      this.entregar(libre, duenio);
      return libre;
    },

    /** Devuelve una caseta al pozo. */
    devolver(caseta) {
      caseta.duenio = null;
      caseta.reservadaPara = null;
      caseta.marcada = false;
      caseta.vehiculo = null;
    },
  };
}
