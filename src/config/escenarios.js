/**
 * Escenarios de la fase 3: cómo se arman los dos sentidos del peaje a partir de
 * los conteos de campo y los parámetros.
 *
 * Vive en `config/` y no en `motor/` porque es configuración: qué conteo va en
 * cada sentido, con qué cola inicial y con qué régimen de servicio. El motor no
 * sabe nada de conteos ni de festivos.
 *
 * JS puro: no importa React, ni DOM, ni Three.js.
 */

import { conteos } from './datos.js';
import { parametros, configuracionRegla } from './parametros.js';
import { MODO_CASETAS } from '../motor/sentido.js';

/** Regímenes de servicio. El lento es sensibilidad, nunca el base (DEC-025). */
export const REGIMENES_SERVICIO = {
  base: {
    clave: 'base',
    etiqueta: 'servicio base (12,10 s)',
    gammaForma: parametros.servicio.gammaForma,
    gammaEscalaSegundos: parametros.servicio.gammaEscalaSegundos,
    mediaSegundos: parametros.servicio.mediaObservadaSegundos,
  },
  lento: {
    clave: 'lento',
    etiqueta: 'servicio lento (15,5 s, sensibilidad)',
    gammaForma: parametros.servicioLento.gammaForma,
    gammaEscalaSegundos: parametros.servicioLento.gammaEscalaSegundos,
    mediaSegundos: parametros.servicioLento.mediaObservadaSegundos,
  },
};

/** Cola inicial observada por conteo (DEC-010). */
export const COLA_INICIAL = { viernes: 0, domingoCP: 0, domingoPC: 0, festivoPC: 23 };

/**
 * Arma la configuración de un sentido.
 *
 * @param {object} args
 * @param {string} args.conteo clave de `conteos`
 * @param {string} args.etiqueta nombre legible del sentido
 * @param {'programado'|'regla'} args.modo control de `c(t)`
 * @param {number} args.colaInicial
 * @param {number} args.casetasIniciales
 * @param {object} args.servicio uno de `REGIMENES_SERVICIO`
 * @param {number} [args.demoraAperturaSegundos] para la sensibilidad de la demora
 * @param {number[]} [args.casetasFijas] en modo programado, sustituye las
 *   casetas observadas por un valor fijo por intervalo
 */
export function configurarSentido({
  conteo,
  etiqueta,
  modo,
  colaInicial,
  casetasIniciales,
  servicio,
  demoraAperturaSegundos,
  casetasFijas,
}) {
  const porRegla = modo === MODO_CASETAS.REGLA;
  const p = parametros;

  return {
    etiqueta,
    conteo,
    llegadas: conteos[conteo].llegadas,
    casetasProgramadas: casetasFijas ?? conteos[conteo].casetas,
    modoCasetas: modo,
    ...(porRegla ? { regla: configuracionRegla({ demoraAperturaSegundos }) } : {}),
    colaInicial,
    casetasIniciales,
    factorEscalaDemanda: p.llegadas.factorEscalaDemanda,
    duracionIntervaloSegundos: p.tiempo.duracionIntervaloSegundos,
    gammaForma: servicio.gammaForma,
    gammaEscalaSegundos: servicio.gammaEscalaSegundos,
    maximoTolerableWqSegundos: p.desempeno.maximoTolerableWqSegundos,
  };
}

/**
 * Escenario del festivo: los dos sentidos a la vez.
 *
 * **Pamplona→Cúcuta** es el conteo del festivo, con 23 vehículos en cola y 4
 * casetas iniciales (DEC-010). Va **primero** en la lista, así que usa el flujo
 * original del PRNG y el escenario reproduce la fase 2 cuando el contraflujo no
 * compite (DEC-027, punto 1).
 *
 * **Cúcuta→Pamplona** no se midió: va el conteo sustituto, con cola 0 y 1
 * caseta inicial (contexto, sección 7; ver PEN-013).
 *
 * En modo `'operador'`, P→C copia las casetas observadas y C→P se fija en 1
 * caseta todo el rato: es lo más parecido a la operación real que se puede
 * reconstruir, porque del contraflujo solo se sabe que arrancó con 1 caseta.
 *
 * @param {object} args
 * @param {'operador'|'regla'} args.control
 * @param {object} [args.servicio=REGIMENES_SERVICIO.base]
 * @param {string} [args.sustituto] conteo que sustituye a C→P
 * @param {number} [args.demoraAperturaSegundos]
 */
export function escenarioFestivo({
  control,
  servicio = REGIMENES_SERVICIO.base,
  sustituto = parametros.sustitutoFestivoCP.conteo,
  demoraAperturaSegundos,
} = {}) {
  const porOperador = control === 'operador';
  const modo = porOperador ? MODO_CASETAS.PROGRAMADO : MODO_CASETAS.REGLA;
  const intervalos = parametros.tiempo.intervalos;

  const pamplonaCucuta = configurarSentido({
    conteo: 'festivoPC',
    etiqueta: 'P→C (festivo)',
    modo,
    colaInicial: COLA_INICIAL.festivoPC,
    casetasIniciales: conteos.festivoPC.casetas[0],
    servicio,
    demoraAperturaSegundos,
  });

  const cucutaPamplona = configurarSentido({
    conteo: sustituto,
    etiqueta: `C→P (sustituto: ${sustituto})`,
    modo,
    colaInicial: parametros.sustitutoFestivoCP.colaInicial,
    casetasIniciales: parametros.sustitutoFestivoCP.casetasIniciales,
    servicio,
    demoraAperturaSegundos,
    // En modo operador el contraflujo se fija en 1 caseta: no se observó.
    ...(porOperador
      ? { casetasFijas: new Array(intervalos).fill(parametros.sustitutoFestivoCP.casetasIniciales) }
      : {}),
  });

  return [pamplonaCucuta, cucutaPamplona];
}

/**
 * Escenario de sanidad de día normal: dos conteos de días laborables o de
 * domingo a la vez, para comprobar que con holgura no hay disputa de casetas.
 *
 * **Aviso:** `viernes` (C→P, 02/10/2026) y `domingoPC` (P→C, 13/09/2026) son de
 * **días distintos**. No es una medición simultánea del peaje; es un escenario
 * construido para ver el comportamiento del pozo cuando sobran casetas.
 *
 * @param {object} args
 * @param {'operador'|'regla'} args.control
 * @param {object} [args.servicio=REGIMENES_SERVICIO.base]
 */
export function escenarioDiaNormal({ control, servicio = REGIMENES_SERVICIO.base } = {}) {
  const modo = control === 'operador' ? MODO_CASETAS.PROGRAMADO : MODO_CASETAS.REGLA;

  return [
    configurarSentido({
      conteo: 'viernes',
      etiqueta: 'C→P (viernes)',
      modo,
      colaInicial: COLA_INICIAL.viernes,
      casetasIniciales: conteos.viernes.casetas[0],
      servicio,
    }),
    configurarSentido({
      conteo: 'domingoPC',
      etiqueta: 'P→C (domingoPC)',
      modo,
      colaInicial: COLA_INICIAL.domingoPC,
      casetasIniciales: conteos.domingoPC.casetas[0],
      servicio,
    }),
  ];
}

/**
 * Sentido sin demanda, con el mínimo de casetas. Sirve para comprobar que el
 * motor de dos sentidos reproduce el de un sentido solo cuando no hay
 * competencia por el pozo.
 */
export function sentidoInerte({ servicio = REGIMENES_SERVICIO.base } = {}) {
  const p = parametros;
  const intervalos = p.tiempo.intervalos;
  return {
    etiqueta: 'sin demanda',
    llegadas: new Array(intervalos).fill(0),
    casetasProgramadas: new Array(intervalos).fill(p.casetas.minimoPorSentido),
    modoCasetas: MODO_CASETAS.PROGRAMADO,
    colaInicial: 0,
    casetasIniciales: p.casetas.minimoPorSentido,
    duracionIntervaloSegundos: p.tiempo.duracionIntervaloSegundos,
    gammaForma: servicio.gammaForma,
    gammaEscalaSegundos: servicio.gammaEscalaSegundos,
    maximoTolerableWqSegundos: p.desempeno.maximoTolerableWqSegundos,
  };
}
