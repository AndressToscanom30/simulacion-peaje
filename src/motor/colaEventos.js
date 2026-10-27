/**
 * Calendario de eventos: montículo binario ordenado por instante.
 *
 * El desempate entre eventos simultáneos está fijado en DEC-017: primero el
 * tipo (según `PRIORIDAD_EVENTO`) y, a igual tipo, el que se programó antes.
 * Sin ese orden el resultado de una réplica dependería del orden de inserción
 * en el montículo y dejaría de ser reproducible.
 *
 * JS puro: no importa React, ni DOM, ni Three.js.
 */

export const TIPO_EVENTO = {
  FIN_SERVICIO: 'FIN_SERVICIO',
  CAMBIO_INTERVALO: 'CAMBIO_INTERVALO',
  APERTURA_CASETA: 'APERTURA_CASETA',
  LLEGADA: 'LLEGADA',
  MUESTREO_COLA: 'MUESTREO_COLA',
};

/**
 * Menor número = se atiende primero cuando dos eventos caen en el mismo
 * instante (DEC-017). `APERTURA_CASETA` entra entre el cambio de intervalo y la
 * llegada (DEC-026): la caseta que ya estaba ordenada abre antes de que llegue
 * el vehículo de ese instante, así que el vehículo puede usarla.
 */
export const PRIORIDAD_EVENTO = {
  [TIPO_EVENTO.FIN_SERVICIO]: 0,
  [TIPO_EVENTO.CAMBIO_INTERVALO]: 1,
  [TIPO_EVENTO.APERTURA_CASETA]: 2,
  [TIPO_EVENTO.LLEGADA]: 3,
  [TIPO_EVENTO.MUESTREO_COLA]: 4,
};

function esAnterior(a, b) {
  if (a.instante !== b.instante) return a.instante < b.instante;
  const pa = PRIORIDAD_EVENTO[a.tipo];
  const pb = PRIORIDAD_EVENTO[b.tipo];
  if (pa !== pb) return pa < pb;
  return a.orden < b.orden;
}

export function crearColaEventos() {
  /** @type {{instante: number, tipo: string, orden: number, datos: object}[]} */
  const monticulo = [];
  let siguienteOrden = 0;

  function subir(i) {
    while (i > 0) {
      const padre = (i - 1) >> 1;
      if (!esAnterior(monticulo[i], monticulo[padre])) break;
      [monticulo[i], monticulo[padre]] = [monticulo[padre], monticulo[i]];
      i = padre;
    }
  }

  function bajar(i) {
    for (;;) {
      const izq = 2 * i + 1;
      const der = izq + 1;
      let menor = i;
      if (izq < monticulo.length && esAnterior(monticulo[izq], monticulo[menor])) menor = izq;
      if (der < monticulo.length && esAnterior(monticulo[der], monticulo[menor])) menor = der;
      if (menor === i) break;
      [monticulo[i], monticulo[menor]] = [monticulo[menor], monticulo[i]];
      i = menor;
    }
  }

  return {
    /**
     * Programa un evento.
     *
     * @param {number} instante segundos de tiempo simulado
     * @param {string} tipo uno de `TIPO_EVENTO`
     * @param {object} [datos] carga del evento (p. ej. la caseta o el vehículo)
     */
    programar(instante, tipo, datos = {}) {
      if (!Number.isFinite(instante)) {
        throw new TypeError(`Instante de evento no finito: ${instante}`);
      }
      if (PRIORIDAD_EVENTO[tipo] === undefined) {
        throw new TypeError(`Tipo de evento desconocido: ${tipo}`);
      }
      monticulo.push({ instante, tipo, orden: siguienteOrden, datos });
      siguienteOrden += 1;
      subir(monticulo.length - 1);
    },

    /** Saca el evento más próximo, o `null` si no queda ninguno. */
    sacar() {
      if (monticulo.length === 0) return null;
      const primero = monticulo[0];
      const ultimo = monticulo.pop();
      if (monticulo.length > 0) {
        monticulo[0] = ultimo;
        bajar(0);
      }
      return primero;
    },

    /** Mira el evento más próximo sin sacarlo. */
    proximo() {
      return monticulo.length > 0 ? monticulo[0] : null;
    },

    get tamano() {
      return monticulo.length;
    },
  };
}
