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
 * Perfil de **rampa** para el estudio de arranque en frío (DEC-047): los mismos
 * intervalos medidos, reordenados de menor a mayor.
 *
 * No inventa demanda: es una permutación, así que conserva el total, la media y
 * todos los valores. Lo único que cambia es **cuándo** llega cada cosa, que es
 * justo lo que el experimento quiere aislar. Es un perfil **construido**, no una
 * medición, y los informes lo rotulan así.
 */
export function perfilRampa(llegadas) {
  return [...llegadas].sort((a, b) => a - b);
}

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
  disparadorPorTasa,
}) {
  const porRegla = modo === MODO_CASETAS.REGLA;
  const p = parametros;

  return {
    etiqueta,
    conteo,
    llegadas: conteos[conteo].llegadas,
    casetasProgramadas: casetasFijas ?? conteos[conteo].casetas,
    modoCasetas: modo,
    ...(porRegla
      ? { regla: configuracionRegla({ demoraAperturaSegundos, disparadorPorTasa }) }
      : {}),
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
  disparadorPorTasa,
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
    disparadorPorTasa,
  });

  const cucutaPamplona = configurarSentido({
    conteo: sustituto,
    etiqueta: `C→P (sustituto: ${sustituto})`,
    modo,
    colaInicial: parametros.sustitutoFestivoCP.colaInicial,
    casetasIniciales: parametros.sustitutoFestivoCP.casetasIniciales,
    servicio,
    demoraAperturaSegundos,
    disparadorPorTasa,
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

// =============================================================== fase 4 ===
//
// Catálogo de escenarios de la fase 4. Cada entrada guarda **solo lo que cambia
// respecto del escenario base** (DEC-030), y `construirEscenario` lo completa.
// Así la matriz entera se lee de un vistazo y se puede exportar a JSON.

import {
  construirEscenario,
  validarEscenario,
  ESCENARIO_BASE,
  SERVICIO_LENTO,
  MODO,
} from './escenario.js';

/** Los dos regímenes de servicio con los que se corre cada caso (DEC-025). */
export const REGIMENES = {
  base: { clave: 'base', servicio: ESCENARIO_BASE.servicio },
  lento: { clave: 'lento', servicio: SERVICIO_LENTO },
};

/**
 * Etiqueta de un régimen, derivada de sus propios números.
 *
 * El base se rotula con la media **medida** (12,10 s), que es la que se compara
 * con el campo; la gamma ajustada del contexto genera 12,07 s, y la diferencia
 * se declara en el informe. El lento se rotula con su media, que sí coincide
 * con la que genera.
 */
export function etiquetaRegimen(clave) {
  const servicio = REGIMENES[clave].servicio;
  const coma = (x, dec) => x.toFixed(dec).replace('.', ',');
  return clave === 'base'
    ? `servicio base (${coma(servicio.mediaNominalSegundos, 2)} s, el medido)`
    : `servicio lento (${coma(servicio.gammaForma * servicio.gammaEscalaSegundos, 1)} s, sensibilidad)`;
}

const casetasFijas = (cuantas, intervalos = ESCENARIO_BASE.tiempo.intervalos) =>
  new Array(intervalos).fill(cuantas);

/** Factor redondeado a dos decimales, para que el barrido no arrastre binario. */
const factor = (x) => Math.round(x * 100) / 100;

const SEGUNDOS_POR_MINUTO = 60;
const PC = 0;
const CP = 1;

/** Sobreescritura que pone el mismo factor de demanda en los dos sentidos. */
const demandaEnAmbos = (f) => ({ sentidos: [{ factorDemanda: f }, { factorDemanda: f }] });

/**
 * E1 — Operador: P→C copia las casetas observadas y C→P se fija en 1 caseta,
 * que es lo único que se sabe del contraflujo.
 */
const E1_OPERADOR = {
  grupo: 'E1',
  codigo: 'E1',
  nombre: 'Operador',
  cambia: 'los dos sentidos en modo programado: P→C copia el conteo y C→P se queda en 1 caseta',
  sobreescrituras: {
    nombre: 'E1 operador',
    sentidos: [
      { modo: MODO.PROGRAMADO, casetasFijas: null },
      { modo: MODO.PROGRAMADO, casetasFijas: casetasFijas(1) },
    ],
  },
};

/** E2 — La regla por cola, sin y con reasignación. */
const E2 = [
  {
    grupo: 'E2',
    codigo: 'E2a',
    nombre: 'Regla sin reasignación',
    cambia: 'nada respecto del base: es la comparación principal',
    sobreescrituras: { nombre: 'E2a regla sin reasignación' },
  },
  {
    grupo: 'E2',
    codigo: 'E2b',
    nombre: 'Regla con reasignación',
    cambia: 'se activa el traspaso por ρ > 0,60 al liberarse una caseta (DEC-008)',
    sobreescrituras: {
      nombre: 'E2b regla con reasignación',
      regla: { reasignacionActiva: true },
    },
  },
  {
    grupo: 'E2',
    codigo: 'E2c',
    nombre: 'Regla + disparador por tasa',
    cambia: 'se añade el disparador anticipativo por tasa de llegadas (DEC-046)',
    sobreescrituras: {
      nombre: 'E2c regla + disparador por tasa',
      regla: { disparadorPorTasa: true },
    },
  },
];

/**
 * E3 — Demanda alta: los factores de la sección 7 del contexto, en los dos
 * sentidos por defecto. Cada factor con la regla y con casetas fijas (P→C en el
 * tope, C→P en 1), más un caso con reasignación a 1,13 para comprobar si sigue
 * inerte (PEN-015).
 */
function e3DemandaAlta(factores = [1.1, 1.13, 1.2]) {
  const casos = [];
  for (const f of factores) {
    const texto = String(f).replace('.', ',');
    casos.push({
      grupo: 'E3',
      codigo: `E3-${texto}-regla`,
      nombre: `Demanda ×${texto}, regla`,
      cambia: `factor de demanda ${texto} en los dos sentidos`,
      sobreescrituras: { nombre: `E3 demanda ×${texto} regla`, ...demandaEnAmbos(f) },
    });
    casos.push({
      grupo: 'E3',
      codigo: `E3-${texto}-fijas`,
      nombre: `Demanda ×${texto}, casetas fijas`,
      cambia: `factor ${texto} y casetas fijas: P→C en ${ESCENARIO_BASE.pozo.maximoPorSentido}, C→P en 1`,
      sobreescrituras: {
        nombre: `E3 demanda ×${texto} casetas fijas`,
        sentidos: [
          {
            factorDemanda: f,
            modo: MODO.PROGRAMADO,
            casetasFijas: casetasFijas(ESCENARIO_BASE.pozo.maximoPorSentido),
            casetasIniciales: ESCENARIO_BASE.pozo.maximoPorSentido,
          },
          { factorDemanda: f, modo: MODO.PROGRAMADO, casetasFijas: casetasFijas(1) },
        ],
      },
    });
  }
  casos.push({
    grupo: 'E3',
    codigo: 'E3-1,13-reasig',
    nombre: 'Demanda ×1,13, regla con reasignación',
    cambia: 'factor 1,13 y reasignación activada, para ver si sigue inerte (PEN-015)',
    sobreescrituras: {
      nombre: 'E3 demanda ×1,13 con reasignación',
      ...demandaEnAmbos(1.13),
      regla: { reasignacionActiva: true },
    },
  });
  return casos;
}

/** E4 — Sensibilidades sobre E2a (regla sin reasignación, factor 1,0). */
function e4Sensibilidades() {
  const casos = [];
  const anadir = (codigo, nombre, cambia, sobreescrituras) =>
    casos.push({ grupo: 'E4', codigo, nombre, cambia, sobreescrituras: { nombre: codigo, ...sobreescrituras } });

  // Demora de apertura (contexto, sección 7).
  for (const minutos of [0, 5, 10]) {
    anadir(
      `E4-demora-${minutos}`,
      `Demora ${minutos} min`,
      `la demora de apertura pasa a ${minutos} min`,
      { regla: { demoraAperturaSegundos: minutos * SEGUNDOS_POR_MINUTO } },
    );
  }

  // Meta de evaluación. Cambia el criterio de cumplimiento, NO los umbrales de
  // la regla: las réplicas de los cuatro casos son idénticas y solo cambia el
  // veredicto.
  for (const minutos of [0.5, 1, 1.5, 2]) {
    const texto = String(minutos).replace('.', ',');
    anadir(
      `E4-meta-${texto}`,
      `Meta ${texto} min`,
      `la meta con la que se evalúa pasa a ${texto} min; la regla no cambia`,
      { desempeno: { metaWqSegundos: minutos * SEGUNDOS_POR_MINUTO } },
    );
  }

  // Umbrales de abrir y cerrar escalados.
  for (const f of [0.6, 1.4]) {
    const texto = String(f).replace('.', ',');
    anadir(
      `E4-umbrales-${texto}`,
      `Umbrales ×${texto}`,
      `los umbrales de abrir y cerrar se multiplican por ${texto}`,
      { regla: { factorUmbrales: f, abrirSiColaMayorQue: null, cerrarSiColaMenorQue: null } },
    );
  }

  // Ventana de cierre (PEN-012).
  for (const minutos of [5, 15, 30]) {
    anadir(
      `E4-ventana-${minutos}`,
      `Ventana de cierre ${minutos} min`,
      `la cola tiene que estar bajo el umbral ${minutos} min seguidos para cerrar`,
      { regla: { ventanaCierreSegundos: minutos * SEGUNDOS_POR_MINUTO } },
    );
  }

  // Cola inicial 0 en el festivo (contexto, sección 7).
  anadir('E4-cola0', 'Cola inicial 0', 'P→C arranca sin cola en vez de con 23 vehículos', {
    sentidos: [{ colaInicial: 0 }, {}],
  });

  // Factor de demanda solo en C→P (DEC-029: no tiene por qué ser 1,0).
  for (const f of [0.8, 1.2, 1.5]) {
    const texto = String(f).replace('.', ',');
    anadir(
      `E4-factorCP-${texto}`,
      `Factor C→P ×${texto}`,
      `solo C→P cambia de demanda, ×${texto}`,
      { sentidos: [{}, { factorDemanda: f }] },
    );
  }

  // Sustitutos alternativos de C→P (PEN-013).
  for (const conteoAlterno of ['domingoPC', 'domingoCP']) {
    const total = conteos[conteoAlterno].llegadas.reduce((a, b) => a + b, 0);
    anadir(
      `E4-sustituto-${conteoAlterno}`,
      `Sustituto ${conteoAlterno}`,
      `C→P pasa a ser ${conteoAlterno} (${total} veh/h) en vez de viernes`,
      { sentidos: [{}, { conteo: conteoAlterno, etiqueta: `C→P (${conteoAlterno})` }] },
    );
  }

  return casos;
}

/**
 * E5 — Estrés y punto de quiebre: barrido del factor de demanda, con dos
 * controles, dos tamaños de pozo y los dos regímenes de servicio.
 *
 * Con pozo de 8 el tope por sentido sube a 7, así que los umbrales de `c` = 5 y
 * 6 son **extrapolados** por las fórmulas de DEC-031, no del contexto.
 */
export const BARRIDO_ESTRES = {
  desde: 1,
  hasta: 1.6,
  paso: 0.05,
  pozos: [
    { total: 6, maximoPorSentido: 5, etiqueta: 'pozo 6, tope 5 (el real)' },
    { total: 8, maximoPorSentido: 7, etiqueta: 'pozo 8, tope 7 (umbrales extrapolados)' },
  ],
};

export function factoresDelBarrido({ desde, hasta, paso } = BARRIDO_ESTRES) {
  const cuantos = Math.round((hasta - desde) / paso) + 1;
  return Array.from({ length: cuantos }, (_, i) => factor(desde + i * paso));
}

function e5Estres() {
  const casos = [];
  for (const pozo of BARRIDO_ESTRES.pozos) {
    for (const control of ['regla', 'regla+tasa', 'fijas']) {
      for (const f of factoresDelBarrido()) {
        const texto = f.toFixed(2).replace('.', ',');
        const porRegla = control !== 'fijas';
        const porTasa = control === 'regla+tasa';
        casos.push({
          grupo: 'E5',
          codigo: `E5-${pozo.total}-${control}-${texto}`,
          nombre: `Pozo ${pozo.total}, ${porRegla ? (porTasa ? 'regla + tasa' : 'regla') : 'casetas fijas'}, ×${texto}`,
          cambia: `${pozo.etiqueta}, factor ${texto}`,
          /** Datos que el informe usa para agrupar el barrido. */
          barrido: { pozoTotal: pozo.total, pozoEtiqueta: pozo.etiqueta, control, factorDemanda: f },
          sobreescrituras: {
            nombre: `E5 pozo ${pozo.total} ${control} ×${texto}`,
            pozo: { total: pozo.total, maximoPorSentido: pozo.maximoPorSentido },
            // Las tablas se regeneran para el tope nuevo (DEC-031 y DEC-046).
            regla: {
              abrirSiColaMayorQue: null,
              cerrarSiColaMenorQue: null,
              abrirSiTasaMayorQue: null,
              disparadorPorTasa: porTasa,
            },
            sentidos: porRegla
              ? [{ factorDemanda: f }, { factorDemanda: f }]
              : [
                  {
                    factorDemanda: f,
                    modo: MODO.PROGRAMADO,
                    casetasFijas: casetasFijas(pozo.maximoPorSentido),
                    casetasIniciales: pozo.maximoPorSentido,
                  },
                  { factorDemanda: f, modo: MODO.PROGRAMADO, casetasFijas: casetasFijas(1) },
                ],
          },
        });
      }
    }
  }
  return casos;
}

/**
 * El catálogo completo de la fase 4: cada caso cruzado con los dos regímenes de
 * servicio, construido a partir del base y validado.
 *
 * @returns {object[]} `{grupo, codigo, nombre, cambia, regimen, escenario}`
 */
export function catalogoFase4() {
  const plantillas = [E1_OPERADOR, ...E2, ...e3DemandaAlta(), ...e4Sensibilidades(), ...e5Estres()];

  const casos = [];
  for (const plantilla of plantillas) {
    for (const clave of ['base', 'lento']) {
      const escenario = construirEscenario({
        ...plantilla.sobreescrituras,
        nombre: `${plantilla.sobreescrituras.nombre} · ${clave}`,
        servicio: REGIMENES[clave].servicio,
      });
      validarEscenario(escenario);
      casos.push({
        grupo: plantilla.grupo,
        codigo: plantilla.codigo,
        nombre: plantilla.nombre,
        cambia: plantilla.cambia,
        barrido: plantilla.barrido ?? null,
        regimen: clave,
        escenario,
      });
    }
  }
  return casos;
}
