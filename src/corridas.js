/**
 * Runner de escenarios: toma el catálogo declarativo y lo corre con el motor.
 *
 * Es la capa que une las dos mitades del proyecto. `src/config/` describe qué
 * correr (escenarios serializables, sin funciones) y `src/motor/` sabe cómo
 * correrlo (sin saber qué es un conteo ni un festivo). Este archivo traduce de
 * lo uno a lo otro y devuelve los resúmenes con intervalo de confianza.
 *
 * Lo usan los scripts por lotes y, en la fase 5, lo usará la interfaz: el mismo
 * runner para la corrida de 30 réplicas y para la de una sola.
 *
 * JS puro: no importa React, ni DOM, ni Three.js.
 */

import { simularPeaje, correrReplicas, resumirLotePeaje } from './motor/index.js';
import { crearGrabador, armarTraza } from './motor/traza.js';
import { aConfiguracionPeaje, semillasDe, validarEscenario } from './config/escenario.js';

/**
 * Corre **una** réplica grabando la traza, para el modo tiempo real (DEC-033).
 *
 * El grabador solo observa, así que el resultado es idéntico al de correr sin
 * grabar: hay una prueba que lo comprueba.
 *
 * @param {object} escenario completo
 * @param {number} semilla
 * @returns {object} traza serializable a JSON, según `docs/traza.md`
 */
export function simularTraza(escenario, semilla) {
  validarEscenario(escenario);
  // El reloj del motor se comparte por referencia: el grabador lee de él el
  // instante de cada evento.
  const reloj = { ahora: 0 };
  const grabador = crearGrabador({ reloj });
  const resultado = simularPeaje({
    ...aConfiguracionPeaje(escenario),
    semilla,
    reloj,
    anotar: grabador.anotar,
  });
  return armarTraza({ eventos: grabador.eventos, escenario, semilla, resultado });
}

/**
 * ¿Cumple una réplica el criterio de desempeño?
 *
 * Se exige en **los dos sentidos** (DEC-009 leída por sentido, como en la fase
 * 3): un peaje en el que un sentido va bien y el otro colapsa no cumple, y el
 * promedio ponderado lo taparía.
 *
 * @param {object} replica salida de `simularPeaje`
 * @param {object} desempeno criterio del escenario
 */
export function cumpleReplica(replica, desempeno) {
  return replica.sentidos.every(
    (s) =>
      s.wqHoraSegundos !== null &&
      s.wqHoraSegundos <= desempeno.metaWqSegundos &&
      (s.fraccionIntervalosSobreUmbral ?? 0) <= desempeno.fraccionIntervalosSobreMaximoAceptada,
  );
}

/** ¿Cumple el criterio una serie resumida (la media entre réplicas)? */
export function cumpleMedia(escalares, desempeno) {
  const wq = escalares.wqHoraSegundos.media;
  const fraccion = escalares.fraccionIntervalosSobreUmbral.media ?? 0;
  const cumpleMeta = wq !== null && wq <= desempeno.metaWqSegundos;
  const cumpleTolerable = fraccion <= desempeno.fraccionIntervalosSobreMaximoAceptada;
  return { cumpleMeta, cumpleTolerable, cumpleTodo: cumpleMeta && cumpleTolerable };
}

/**
 * Corre un escenario y lo resume.
 *
 * @param {object} caso `{grupo, codigo, nombre, cambia, regimen, escenario}`
 * @param {object} [opciones]
 * @param {(config: object) => object} [opciones.simular=simularPeaje]
 * @param {boolean} [opciones.guardarReplicas=false] devolver las réplicas crudas
 */
export function correrEscenario(caso, { simular = simularPeaje, guardarReplicas = false } = {}) {
  const escenario = validarEscenario(caso.escenario);
  const replicas = correrReplicas(aConfiguracionPeaje(escenario), semillasDe(escenario), simular);
  const resumen = resumirLotePeaje(replicas);

  const { desempeno } = escenario;
  const cumplenPorReplica = replicas.map((r) => cumpleReplica(r, desempeno));
  const cuantasCumplen = cumplenPorReplica.filter(Boolean).length;

  return {
    caso,
    escenario,
    resumen,
    /** Veredicto por sentido, del peaje y de las réplicas una a una. */
    cumplimiento: {
      porSentido: resumen.sentidos.map((s) => cumpleMedia(s.escalares, desempeno)),
      delPeaje: cumpleMedia(resumen.total, desempeno),
      /** Fracción de réplicas que cumplen en los dos sentidos. */
      fraccionReplicasQueCumplen: cuantasCumplen / replicas.length,
      replicasQueCumplen: cuantasCumplen,
      replicas: replicas.length,
      /** `true` si la media cumple en los dos sentidos. */
      mediaCumple: resumen.sentidos.every((s) => cumpleMedia(s.escalares, desempeno).cumpleTodo),
    },
    ...(guardarReplicas ? { replicas } : {}),
  };
}

/**
 * Corre una lista de escenarios.
 *
 * @param {object[]} casos
 * @param {object} [opciones]
 * @param {(caso: object, indice: number, total: number) => void} [opciones.alProgresar]
 */
export function correrEscenarios(casos, { alProgresar, ...opciones } = {}) {
  return casos.map((caso, i) => {
    const resultado = correrEscenario(caso, opciones);
    if (alProgresar) alProgresar(caso, i + 1, casos.length);
    return resultado;
  });
}

/**
 * Primer factor del barrido en el que la media deja de cumplir, por
 * configuración.
 *
 * @param {object[]} resultados salidas de `correrEscenario` del grupo E5
 * @returns {object[]} una fila por configuración, con el factor de quiebre
 */
export function puntosDeQuiebre(resultados) {
  /** @type {Map<string, object>} */
  const porConfiguracion = new Map();

  for (const resultado of resultados) {
    const b = resultado.caso.barrido;
    if (!b) continue;
    const clave = `${b.pozoTotal}|${b.control}|${resultado.caso.regimen}`;
    if (!porConfiguracion.has(clave)) {
      porConfiguracion.set(clave, {
        pozoTotal: b.pozoTotal,
        pozoEtiqueta: b.pozoEtiqueta,
        control: b.control,
        regimen: resultado.caso.regimen,
        puntos: [],
      });
    }
    porConfiguracion.get(clave).puntos.push({
      factorDemanda: b.factorDemanda,
      mediaCumple: resultado.cumplimiento.mediaCumple,
      fraccionReplicasQueCumplen: resultado.cumplimiento.fraccionReplicasQueCumplen,
      wqPeajeSegundos: resultado.resumen.total.wqHoraSegundos.media,
    });
  }

  return [...porConfiguracion.values()].map((configuracion) => {
    const puntos = [...configuracion.puntos].sort((a, b) => a.factorDemanda - b.factorDemanda);
    const quiebre = puntos.find((punto) => !punto.mediaCumple) ?? null;
    return {
      ...configuracion,
      puntos,
      /** Primer factor cuya media incumple, o `null` si cumple en todo el barrido. */
      factorDeQuiebre: quiebre?.factorDemanda ?? null,
      /** Fracción de réplicas que **incumplen** en ese factor. */
      fraccionReplicasQueIncumplen: quiebre ? 1 - quiebre.fraccionReplicasQueCumplen : null,
      /** Último factor que todavía cumple. */
      ultimoFactorQueCumple: [...puntos].reverse().find((punto) => punto.mediaCumple)?.factorDemanda ?? null,
    };
  });
}
