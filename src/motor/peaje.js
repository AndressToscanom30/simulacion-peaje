/**
 * Motor de los **dos sentidos** del peaje sobre el pozo común de casetas
 * (fase 3).
 *
 * Un solo reloj y un solo calendario de eventos para los dos sentidos, que
 * comparten las 6 casetas de efectivo (DEC-002). La lógica de cada sentido es
 * la misma de las fases 1 y 2: sale de `crearSentido` (`sentido.js`), no está
 * copiada. Lo que añade este módulo es el **árbitro**, que decide quién se
 * queda con cada caseta.
 *
 * Que `c1 + c2 ≤ 6` se cumpla no se comprueba: sale de que no hay más casetas
 * en el pozo. Y `1 ≤ c ≤ 5` lo ponen el mínimo y el máximo por sentido.
 *
 * JS puro: no importa React, ni DOM, ni Three.js.
 */

import { crearPrng, derivarSemilla } from './prng.js';
import { crearColaEventos } from './colaEventos.js';
import { crearPozo } from './pozo.js';
import { crearSentido, validarConfiguracionSentido } from './sentido.js';
import { correrCalendario, capacidadNominal } from './simulador.js';
import { parametros } from '../config/parametros.js';

/**
 * @typedef {object} ConfiguracionPeaje
 * @property {number} semilla
 * @property {object[]} sentidos dos configuraciones de sentido. El **primero**
 *   de la lista usa el flujo original del PRNG, así que un escenario en el que
 *   el segundo no tiene demanda reproduce exactamente el de un sentido solo.
 * @property {number} [pozoTotal] casetas de efectivo; por defecto las 6 del peaje
 * @property {boolean} [reasignacionActiva=true] si una caseta liberada puede
 *   pasar al otro sentido por ρ (DEC-008)
 * @property {boolean} [ofrecerPozoPorRho=false] si una caseta **libre en el
 *   pozo** se ofrece por ρ sin esperar a que se libere otra. Solo sensibilidad:
 *   la lectura literal de la DEC-008 es `false`.
 * @property {number} [rhoReasignacion] umbral de ρ para reasignar
 * @property {number} [ventanaRhoSegundos] ventana móvil de llegadas para ρ
 * @property {number} [esperaDesempateSegundos] umbral del desempate
 * @property {number} [servicioNominalSegundos] tiempo de atención con el que la
 *   regla estima la espera: el que el operador conoce, no el real (DEC-027)
 * @property {number} [capacidadNominalPorCaseta] vehículos por caseta e
 *   intervalo con los que la regla calcula ρ (≈ 24,8)
 * @property {(estado: object) => void} [observador] se llama tras cada evento
 *   con `{instante, pozo, sentidos}`. Lo usan las pruebas de invariantes y lo
 *   usará el modo tiempo real de la fase 5 para pintar el estado.
 */

/**
 * Corre una réplica del peaje completo.
 *
 * @param {ConfiguracionPeaje} config
 */
export function simularPeaje(config) {
  const {
    semilla,
    sentidos: configuraciones,
    pozoTotal = parametros.casetas.total,
    reasignacionActiva = true,
    ofrecerPozoPorRho = false,
    rhoReasignacion = parametros.regla.rhoReasignacion,
    ventanaRhoSegundos = parametros.regla.ventanaRhoSegundos,
    esperaDesempateSegundos = parametros.regla.esperaDesempateSegundos,
    servicioNominalSegundos = parametros.servicio.mediaObservadaSegundos,
    capacidadNominalPorCaseta = capacidadNominal(),
    observador = null,
  } = config;

  if (!Array.isArray(configuraciones) || configuraciones.length !== 2) {
    throw new TypeError('`sentidos` debe traer exactamente dos configuraciones.');
  }
  for (const c of configuraciones) validarConfiguracionSentido(c);

  const minimos = configuraciones.map(
    (c) => c.regla?.minimoCasetas ?? parametros.casetas.minimoPorSentido,
  );
  if (minimos[0] + minimos[1] > pozoTotal) {
    throw new RangeError(
      `Los mínimos por sentido (${minimos.join(' + ')}) no caben en un pozo de ${pozoTotal}.`,
    );
  }

  const eventos = crearColaEventos();
  const reloj = { ahora: 0 };
  const pozo = crearPozo({ total: pozoTotal });

  // ------------------------------------------------------------- árbitro ---

  /** @type {object[]} */
  const sentidos = [];

  let reasignaciones = 0;
  let entregasPorBloqueo = 0;
  let ofrecimientosPorPozo = 0;
  let bloqueosDescartados = 0;
  let segundosPozoAgotado = 0;
  let ultimoInstanteIntegrado = 0;
  const horizonte = configuraciones[0].llegadas.length * configuraciones[0].duracionIntervaloSegundos;

  /** Acumula el tiempo con el pozo agotado hasta `t`, acotado al horizonte. */
  function integrarPozo(t) {
    const hasta = Math.min(t, horizonte);
    if (hasta > ultimoInstanteIntegrado) {
      if (pozo.agotado()) segundosPozoAgotado += hasta - ultimoInstanteIntegrado;
      ultimoInstanteIntegrado = hasta;
    }
  }

  const otro = (id) => sentidos.find((s) => s.id !== id);

  /**
   * Desempate de la DEC-008: entre varios candidatos, gana el que supere la
   * espera estimada de corte, empezando por el peor; si ninguno la supera, el
   * de mayor cola total. A igualdad, el de menor `id`, para que el resultado no
   * dependa del orden del arreglo.
   */
  function desempatar(candidatos) {
    if (candidatos.length === 0) return null;
    if (candidatos.length === 1) return candidatos[0];

    const sobreCorte = candidatos.filter(
      (s) => s.esperaEstimadaSegundos() > esperaDesempateSegundos,
    );
    const elegibles = sobreCorte.length > 0 ? sobreCorte : candidatos;
    const criterio =
      sobreCorte.length > 0 ? (s) => s.esperaEstimadaSegundos() : (s) => s.enEspera();

    return [...elegibles].sort((a, b) => criterio(b) - criterio(a) || a.id - b.id)[0];
  }

  /** ¿Este sentido admite una caseta más por ρ? */
  function admitePorRho(s) {
    return (
      s.porRegla &&
      s.rho() > rhoReasignacion &&
      s.casetasEfectivas() < s.maximoCasetas &&
      !s.tienePeticionEnCurso()
    );
  }

  /**
   * Coloca una caseta que acaba de quedar libre en el pozo. El orden está
   * fijado en DEC-027: primero las peticiones bloqueadas, que son demanda
   * explícita (la cola pasó el umbral), y solo después la reasignación por ρ,
   * que es un indicador más indirecto.
   */
  function colocarCasetaLibre(deId) {
    // 1. Peticiones bloqueadas. Se reintenta la condición de apertura: la
    //    petición nunca llegó a ser una orden, así que si la cola ya bajó se
    //    descarta en vez de consumirse una caseta (DEC-027).
    const bloqueados = sentidos.filter((s) => s.estaBloqueada());
    const vigentes = [];
    for (const s of bloqueados) {
      if (s.condicionDeApertura()) {
        vigentes.push(s);
      } else {
        s.descartarBloqueo();
        bloqueosDescartados += 1;
      }
    }
    const ganador = desempatar(vigentes);
    if (ganador) {
      const caseta = pozo.reservar(ganador.id);
      if (caseta && ganador.recibirCaseta(caseta)) {
        entregasPorBloqueo += 1;
        return;
      }
      if (caseta) pozo.cancelarReserva(caseta);
    }

    // 2. Reasignación por ρ al otro sentido (DEC-008).
    if (!reasignacionActiva || deId === null) return;
    const destino = otro(deId);
    if (destino && admitePorRho(destino)) {
      const caseta = pozo.reservar(destino.id);
      if (caseta && destino.recibirCaseta(caseta, { porReasignacion: true })) {
        reasignaciones += 1;
        sentidos.find((s) => s.id === deId)?.anotarReasignacionCedida();
        return;
      }
      if (caseta) pozo.cancelarReserva(caseta);
    }
    // 3. Si nadie la quiere, se queda en el pozo.
  }

  const arbitro = {
    capacidadNominalPorCaseta,
    servicioNominalSegundos,
    ventanaRhoSegundos,

    reservar: (id) => pozo.reservar(id),

    liberar(caseta, deId) {
      pozo.devolver(caseta);
      colocarCasetaLibre(deId);
    },
  };

  /**
   * Sensibilidad `ofrecerPozoPorRho`: ofrece una caseta que ya estaba libre en
   * el pozo a un sentido con ρ alto, sin esperar a que otro la libere. La
   * DEC-008 solo contempla reasignar al **liberarse** una caseta, así que esto
   * no es la regla del contexto; está para medir cuánto cambiaría (DEC-027).
   */
  function ofrecerPozoLibre() {
    if (!ofrecerPozoPorRho) return;
    while (!pozo.agotado()) {
      const candidatos = sentidos.filter((s) => admitePorRho(s));
      const ganador = desempatar(candidatos);
      if (!ganador) return;
      const caseta = pozo.reservar(ganador.id);
      if (!caseta) return;
      if (!ganador.recibirCaseta(caseta, { porReasignacion: true })) {
        pozo.cancelarReserva(caseta);
        return;
      }
      reasignaciones += 1;
      ofrecimientosPorPozo += 1;
    }
  }

  // -------------------------------------------------------------- montaje ---

  configuraciones.forEach((configuracion, indice) => {
    sentidos.push(
      crearSentido({
        config: { ...configuracion, id: indice },
        // Cada sentido con su propio flujo. El primero usa la semilla tal cual,
        // que es la de las fases 1 y 2 (DEC-027).
        prng: crearPrng(derivarSemilla(semilla, indice)),
        eventos,
        reloj,
        pozo,
        arbitro,
      }),
    );
  });

  for (const s of sentidos) s.inicializar();
  ofrecerPozoLibre();

  const avisar = () => {
    if (observador) observador({ instante: reloj.ahora, pozo, sentidos });
  };
  avisar();

  correrCalendario({
    eventos,
    reloj,
    sentidos,
    alAvanzar: integrarPozo,
    trasEvento: () => {
      ofrecerPozoLibre();
      avisar();
    },
  });

  integrarPozo(horizonte);
  for (const s of sentidos) s.cerrarMedidas();

  const medidas = sentidos.map((s) => s.medidas());

  return {
    semilla,
    sentidos: medidas,
    total: agregar(medidas),
    pozo: {
      total: pozoTotal,
      segundosAgotado: segundosPozoAgotado,
      reasignaciones,
      entregasPorBloqueo,
      ofrecimientosPorPozo,
      bloqueosDescartados,
      peticionesBloqueadas: medidas.reduce((a, m) => a + m.peticionesBloqueadas, 0),
      segundosBloqueados: medidas.reduce((a, m) => a + m.segundosBloqueados, 0),
    },
  };
}

/**
 * Agrega las medidas de los dos sentidos.
 *
 * `Wq` se pondera por vehículos atendidos, que es la media de espera de un
 * vehículo cualquiera del peaje. El `%` de intervalos sobre el máximo tolerable
 * se calcula sobre todos los intervalos-sentido juntos. Los carriles-intervalo
 * y los cambios de `c` se suman, que es lo que cuesta operar el peaje.
 *
 * Las colas máximas se suman **por sentido** y van rotuladas como suma: los dos
 * máximos no tienen por qué darse en el mismo instante, así que el total es una
 * cota superior de la cola simultánea del peaje, no una medición de ella
 * (DEC-027).
 */
function agregar(medidas) {
  const vehiculos = medidas.map((m) => m.atendidosTotal);
  const totalVehiculos = vehiculos.reduce((a, b) => a + b, 0);

  const wqPonderado =
    totalVehiculos === 0
      ? null
      : medidas.reduce((a, m, i) => a + (m.wqHoraSegundos ?? 0) * vehiculos[i], 0) / totalVehiculos;

  const intervalosConDato = medidas.reduce((a, m) => a + m.intervalosConDato, 0);
  const intervalosSobreUmbral = medidas.reduce((a, m) => a + m.intervalosSobreUmbral, 0);

  return {
    atendidosTotal: totalVehiculos,
    llegadasSimuladas: medidas.reduce((a, m) => a + m.llegadasSimuladas, 0),
    caudalEnHorizonte: medidas.reduce((a, m) => a + m.caudalEnHorizonte, 0),

    /** Espera media de un vehículo cualquiera del peaje, en segundos. */
    wqHoraSegundos: wqPonderado,
    fraccionIntervalosSobreUmbral:
      intervalosConDato === 0 ? null : intervalosSobreUmbral / intervalosConDato,
    intervalosSobreUmbral,
    intervalosConDato,

    /** Suma de los máximos de cada sentido: cota superior, no simultánea. */
    sumaColaMaximaMuestreada: medidas.reduce((a, m) => a + m.colaMaximaMuestreada, 0),
    sumaColaMaximaContinua: medidas.reduce((a, m) => a + m.colaMaximaContinua, 0),

    carrilesIntervalo: medidas.reduce((a, m) => a + m.carrilesIntervalo, 0),
    cambiosDeC: medidas.reduce((a, m) => a + m.cambiosDeC, 0),
    aperturas: medidas.reduce((a, m) => a + m.aperturas, 0),
    cierres: medidas.reduce((a, m) => a + m.cierres, 0),
    colaFinal: medidas.reduce((a, m) => a + m.colaFinal, 0),
  };
}
