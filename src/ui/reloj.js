/**
 * Reloj de reproducción: convierte tiempo real en tiempo simulado (DEC-033).
 *
 * Es **puro**: no toca el DOM, no usa `Date.now` ni `requestAnimationFrame`. El
 * tiempo se le inyecta llamando a `avanzar(dtReal)`, así que se puede probar
 * exactamente y adelantar una hora simulada en una línea.
 *
 * Quien lo use se encarga de medir el tiempo real (en la interfaz, un
 * `requestAnimationFrame`).
 *
 * JS puro: no importa React, ni DOM, ni Three.js.
 */

/** Velocidades de la sección 9 del contexto, más una configurable. */
export const VELOCIDADES = [1, 10, 60];

/**
 * @param {object} args
 * @param {number} args.duracionSegundos tiempo simulado total de la traza
 * @param {number} [args.velocidad=1] segundos simulados por segundo real
 * @param {number} [args.instante=0] desde dónde arranca
 * @param {boolean} [args.enMarcha=false]
 */
export function crearRelojReproduccion({
  duracionSegundos,
  velocidad = 1,
  instante = 0,
  enMarcha = false,
}) {
  if (!(duracionSegundos > 0)) {
    throw new RangeError(`La duración tiene que ser mayor que 0, llegó: ${duracionSegundos}`);
  }
  if (!(velocidad > 0)) {
    throw new RangeError(`La velocidad tiene que ser mayor que 0, llegó: ${velocidad}`);
  }

  const acotar = (t) => Math.min(Math.max(t, 0), duracionSegundos);

  let ahora = acotar(instante);
  let factor = velocidad;
  let corriendo = enMarcha;

  const estado = () => ({
    instante: ahora,
    velocidad: factor,
    enMarcha: corriendo,
    duracionSegundos,
    /** Fracción reproducida, entre 0 y 1. */
    progreso: ahora / duracionSegundos,
    terminado: ahora >= duracionSegundos,
  });

  return {
    estado,

    /**
     * Avanza el tiempo simulado según el tiempo real transcurrido.
     *
     * No pasa del final: al llegar se detiene, para que quien lo use no tenga
     * que comprobarlo en cada fotograma.
     *
     * @param {number} dtRealSegundos
     * @returns {object} el estado nuevo
     */
    avanzar(dtRealSegundos) {
      if (!corriendo || !(dtRealSegundos > 0)) return estado();
      ahora = acotar(ahora + dtRealSegundos * factor);
      if (ahora >= duracionSegundos) corriendo = false;
      return estado();
    },

    /** Pone en marcha la reproducción. Si ya terminó, vuelve a empezar. */
    iniciar() {
      if (ahora >= duracionSegundos) ahora = 0;
      corriendo = true;
      return estado();
    },

    pausar() {
      corriendo = false;
      return estado();
    },

    /** Alterna entre marcha y pausa. */
    alternar() {
      return corriendo ? this.pausar() : this.iniciar();
    },

    /** Vuelve al principio y se queda en pausa. */
    reiniciar() {
      ahora = 0;
      corriendo = false;
      return estado();
    },

    /**
     * Salta a un instante. Se acota al rango y **no cambia** si estaba en
     * marcha o en pausa: saltar mientras se reproduce sigue reproduciendo.
     */
    saltarA(instanteNuevo) {
      ahora = acotar(Number.isFinite(instanteNuevo) ? instanteNuevo : 0);
      if (ahora >= duracionSegundos) corriendo = false;
      return estado();
    },

    /** Salta a una fracción del total, entre 0 y 1. */
    saltarAProgreso(fraccion) {
      return this.saltarA(fraccion * duracionSegundos);
    },

    /**
     * Cambia la velocidad sin perder el instante en el que va, así que se puede
     * cambiar en marcha.
     */
    cambiarVelocidad(velocidadNueva) {
      if (!(velocidadNueva > 0)) {
        throw new RangeError(`La velocidad tiene que ser mayor que 0, llegó: ${velocidadNueva}`);
      }
      factor = velocidadNueva;
      return estado();
    },
  };
}

/**
 * Reproductor sobre una traza: mantiene un cursor en la lista de eventos, así
 * que avanzar un fotograma no vuelve a recorrerla desde el principio.
 *
 * Al saltar hacia atrás sí rehace el estado desde el principio, que es el
 * precio de poder rebobinar y cuesta milisegundos.
 *
 * @param {object} traza
 * @param {(estado: object, eventos: object[]) => void} [alAvanzar] se llama con
 *   el estado nuevo y los eventos consumidos en ese salto
 */
export function crearReproductor(traza, alAvanzar) {
  let cursor = 0;

  /** Eventos con instante ≤ `t` que todavía no se habían consumido. */
  function consumirHasta(t) {
    const consumidos = [];
    while (cursor < traza.eventos.length && traza.eventos[cursor].t <= t) {
      consumidos.push(traza.eventos[cursor]);
      cursor += 1;
    }
    return consumidos;
  }

  return {
    get cursor() {
      return cursor;
    },

    /** Mueve el cursor a `t`. Devuelve los eventos consumidos (vacío al rebobinar). */
    irA(t) {
      if (t < (traza.eventos[cursor - 1]?.t ?? 0)) {
        // Rebobinado: hay que rehacer desde el principio.
        cursor = 0;
        const todos = consumirHasta(t);
        if (alAvanzar) alAvanzar({ instante: t, rebobinado: true }, todos);
        return { eventos: todos, rebobinado: true };
      }
      const consumidos = consumirHasta(t);
      if (alAvanzar) alAvanzar({ instante: t, rebobinado: false }, consumidos);
      return { eventos: consumidos, rebobinado: false };
    },

    reiniciar() {
      cursor = 0;
    },
  };
}
