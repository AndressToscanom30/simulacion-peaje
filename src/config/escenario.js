/**
 * Un **escenario** es la descripción completa de una corrida, como objeto
 * declarativo y serializable a JSON (DEC-030).
 *
 * No contiene funciones ni referencias: solo números, cadenas y booleanos. Eso
 * permite guardarlo, compararlo, enviarlo por la red y — en la fase 5 —
 * rellenarlo desde un formulario sin que la interfaz sepa nada del motor.
 *
 * Se trabaja con **escenario base + sobreescrituras**: un escenario guarda solo
 * lo que cambia respecto del base, y `construirEscenario` lo completa. Así una
 * tabla de 60 escenarios se lee de un vistazo.
 *
 * JS puro: no importa React, ni DOM, ni Three.js.
 */

import { conteos, DURACION_INTERVALO_SEGUNDOS, INTERVALOS_POR_CONTEO } from './datos.js';
import { parametros, SEGUNDOS_POR_MINUTO } from './parametros.js';

/** Modos de control de `c(t)`. */
export const MODO = { PROGRAMADO: 'programado', REGLA: 'regla' };

// ---------------------------------------------------------------- umbrales ---

/**
 * Umbral de apertura con `c` casetas abiertas: `5c − 1` (DEC-031).
 * Reproduce los 4, 9, 14 y 19 del contexto para `c` = 1…4.
 */
export function umbralAbrir(c, p = parametros.regla.formulaUmbrales) {
  return p.abrirPendiente * c + p.abrirDesplazamiento;
}

/**
 * Umbral de cierre con `c` casetas abiertas: la mitad del umbral con el que se
 * habría abierto esa misma caseta, `⌊abrir(c − 1) / 2⌋` (DEC-031).
 * Reproduce los 2, 4, 7 y 9 del contexto para `c` = 2…5.
 */
export function umbralCerrar(c, p = parametros.regla.formulaUmbrales) {
  return Math.floor(umbralAbrir(c - 1, p) / p.divisorCierre);
}

/**
 * Umbral **de tasa** con `c` casetas abiertas (DEC-046):
 * `redondear(c × capacidad nominal por caseta − tasaDesplazamiento)`.
 * Reproduce los 21, 46, 70 y 95 del contexto para `c` = 1…4 con la capacidad
 * nominal de 24,7901 veh/caseta e intervalo.
 */
export function umbralAbrirPorTasa(
  c,
  capacidadNominalPorCaseta,
  p = parametros.regla.formulaUmbrales,
) {
  return Math.round(c * capacidadNominalPorCaseta - p.tasaDesplazamiento);
}

/**
 * Construye la tabla de umbrales por tasa, que sigue al tope por sentido igual
 * que las de cola (DEC-031). `null` donde no aplica: en el tope no se abre.
 */
export function tablaUmbralesPorTasa({
  minimoPorSentido,
  maximoPorSentido,
  capacidadNominalPorCaseta,
  factor = 1,
  formula = parametros.regla.formulaUmbrales,
}) {
  const abrirSiTasaMayorQue = {};
  for (let c = minimoPorSentido; c <= maximoPorSentido; c += 1) {
    abrirSiTasaMayorQue[c] =
      c >= maximoPorSentido
        ? null
        : Math.round(umbralAbrirPorTasa(c, capacidadNominalPorCaseta, formula) * factor);
  }
  return { abrirSiTasaMayorQue };
}

/**
 * Construye las dos tablas de umbrales para un tope y un mínimo dados.
 *
 * `null` marca donde el umbral no aplica: no se puede abrir estando en el tope
 * ni cerrar estando en el mínimo.
 *
 * @param {object} args
 * @param {number} args.minimoPorSentido
 * @param {number} args.maximoPorSentido
 * @param {number} [args.factor=1] multiplica los dos umbrales (sensibilidad).
 *   Se redondea al entero más cercano, porque la cola son vehículos.
 * @param {object} [args.formula] coeficientes de las fórmulas de DEC-031
 */
export function tablasUmbrales({
  minimoPorSentido,
  maximoPorSentido,
  factor = 1,
  formula = parametros.regla.formulaUmbrales,
}) {
  const abrirSiColaMayorQue = {};
  const cerrarSiColaMenorQue = {};

  for (let c = minimoPorSentido; c <= maximoPorSentido; c += 1) {
    abrirSiColaMayorQue[c] = c >= maximoPorSentido ? null : Math.round(umbralAbrir(c, formula) * factor);
    cerrarSiColaMenorQue[c] = c <= minimoPorSentido ? null : Math.round(umbralCerrar(c, formula) * factor);
  }

  return { abrirSiColaMayorQue, cerrarSiColaMenorQue };
}

// ------------------------------------------------------------- escenario ---

/**
 * El escenario base: el festivo de dos sentidos con los valores del contexto.
 *
 * P→C es el conteo del festivo y va **primero**, así que usa el flujo original
 * del PRNG (DEC-027, punto 1). C→P es el conteo del viernes, que se midió en
 * ese sentido, por un factor configurable (DEC-029).
 *
 * `reasignacionActiva` arranca en `false`: es la comparación principal, porque
 * la reasignación resultó casi inerte en el pico (PEN-015). Los escenarios que
 * la activan lo dicen explícitamente.
 */
export const ESCENARIO_BASE = Object.freeze({
  nombre: 'base',
  descripcion: 'Festivo de dos sentidos con los valores del contexto',

  /** Un elemento por sentido. El primero usa el flujo original del PRNG. */
  sentidos: [
    {
      etiqueta: 'P→C',
      conteo: 'festivoPC',
      factorDemanda: 1,
      colaInicial: 23,
      casetasIniciales: 4,
      modo: MODO.REGLA,
      /** Llegadas por intervalo escritas a mano; `null` = las del conteo (DEC-035). */
      llegadas: null,
      /** En modo programado, casetas fijas por intervalo; `null` = las observadas. */
      casetasFijas: null,
    },
    {
      etiqueta: 'C→P',
      conteo: 'viernes',
      factorDemanda: 1,
      colaInicial: 0,
      casetasIniciales: 1,
      modo: MODO.REGLA,
      llegadas: null,
      casetasFijas: null,
    },
  ],

  /**
   * Servicio gamma. `gammaEscalaSegundos` es el parámetro que genera, y
   * `mediaNominalSegundos` el que usa la regla para ρ y la espera estimada:
   * son distintos a propósito, porque el operador decide con lo que conoce y no
   * con el servicio real (DEC-027, punto 7).
   */
  servicio: {
    regimen: 'base',
    gammaForma: 4.68,
    gammaEscalaSegundos: 2.58,
    mediaNominalSegundos: 12.1016,
  },

  pozo: {
    total: 6,
    minimoPorSentido: 1,
    maximoPorSentido: 5,
  },

  regla: {
    /** `null` = se generan con las fórmulas de DEC-031 según el tope. */
    abrirSiColaMayorQue: null,
    cerrarSiColaMenorQue: null,
    /** Multiplica los umbrales generados (sensibilidad). */
    factorUmbrales: 1,
    /**
     * Disparador anticipativo por tasa de llegadas (DEC-046). Apagado por
     * defecto: la regla base sigue siendo la de la DEC-006, por cola.
     */
    disparadorPorTasa: false,
    /** `null` = se genera con la fórmula de DEC-046 según el tope. */
    abrirSiTasaMayorQue: null,
    demoraAperturaSegundos: 5 * SEGUNDOS_POR_MINUTO,
    ventanaCierreSegundos: 15 * SEGUNDOS_POR_MINUTO,
    rhoReasignacion: 0.6,
    ventanaRhoSegundos: DURACION_INTERVALO_SEGUNDOS,
    reasignacionActiva: false,
    ofrecerPozoPorRho: false,
    esperaDesempateSegundos: 2.5 * SEGUNDOS_POR_MINUTO,
  },

  tiempo: {
    duracionIntervaloSegundos: DURACION_INTERVALO_SEGUNDOS,
    intervalos: INTERVALOS_POR_CONTEO,
  },

  /** Criterio con el que se evalúa el cumplimiento, no los umbrales de la regla. */
  desempeno: {
    metaWqSegundos: 1 * SEGUNDOS_POR_MINUTO,
    maximoTolerableWqSegundos: 2.5 * SEGUNDOS_POR_MINUTO,
    fraccionIntervalosSobreMaximoAceptada: 0.05,
  },

  corridas: {
    replicas: 30,
    primeraSemilla: 1,
  },
});

/** Régimen de servicio lento (DEC-025): media 15,5 s con el mismo CV. */
export const SERVICIO_LENTO = Object.freeze({
  regimen: 'lento',
  gammaForma: parametros.servicioLento.gammaForma,
  gammaEscalaSegundos: parametros.servicioLento.gammaEscalaSegundos,
  mediaNominalSegundos: ESCENARIO_BASE.servicio.mediaNominalSegundos,
});

/**
 * Régimen de servicio con la media que se pida, conservando la forma `k` y por
 * tanto el coeficiente de variación: θ = media / k (DEC-025).
 *
 * El servicio **base** no se construye así: su θ = 2,58 viene del ajuste del
 * contexto (DEC-004) y da una media de 12,0744 s, no los 12,1016 s medidos.
 *
 * @param {number} mediaSegundos
 * @param {number} [gammaForma]
 */
export function servicioConMedia(mediaSegundos, gammaForma = ESCENARIO_BASE.servicio.gammaForma) {
  return {
    regimen: `media ${mediaSegundos} s`,
    gammaForma,
    gammaEscalaSegundos: mediaSegundos / gammaForma,
    mediaNominalSegundos: ESCENARIO_BASE.servicio.mediaNominalSegundos,
  };
}

/** Media del servicio que realmente se genera: k × θ. */
export const mediaGeneradaSegundos = (servicio) =>
  servicio.gammaForma * servicio.gammaEscalaSegundos;

// ------------------------------------------------------------ construcción ---

const esObjetoLlano = (x) => x !== null && typeof x === 'object' && !Array.isArray(x);

/** Mezcla profunda; los arreglos se mezclan elemento a elemento por índice. */
function mezclar(base, cambios) {
  if (cambios === undefined) return estructuraClonada(base);
  if (Array.isArray(base) && Array.isArray(cambios)) {
    return base.map((elemento, i) =>
      i < cambios.length ? mezclar(elemento, cambios[i]) : estructuraClonada(elemento),
    );
  }
  if (esObjetoLlano(base) && esObjetoLlano(cambios)) {
    const resultado = {};
    for (const clave of new Set([...Object.keys(base), ...Object.keys(cambios)])) {
      resultado[clave] = mezclar(base[clave], cambios[clave]);
    }
    return resultado;
  }
  return estructuraClonada(cambios);
}

const estructuraClonada = (x) =>
  x === null || typeof x !== 'object' ? x : JSON.parse(JSON.stringify(x));

/**
 * Completa un escenario a partir del base.
 *
 * @param {object} [sobreescrituras] solo lo que cambia respecto del base
 * @param {object} [base=ESCENARIO_BASE]
 * @returns {object} escenario completo, serializable a JSON
 */
export function construirEscenario(sobreescrituras = {}, base = ESCENARIO_BASE) {
  const escenario = mezclar(base, sobreescrituras);

  // Las tablas de umbrales siguen al tope por sentido (DEC-031). Si el
  // escenario las trae escritas a mano, se respetan tal cual.
  if (escenario.regla.abrirSiColaMayorQue === null || escenario.regla.cerrarSiColaMenorQue === null) {
    const tablas = tablasUmbrales({
      minimoPorSentido: escenario.pozo.minimoPorSentido,
      maximoPorSentido: escenario.pozo.maximoPorSentido,
      factor: escenario.regla.factorUmbrales,
    });
    escenario.regla.abrirSiColaMayorQue ??= tablas.abrirSiColaMayorQue;
    escenario.regla.cerrarSiColaMenorQue ??= tablas.cerrarSiColaMenorQue;
  }

  // La tabla por tasa también sigue al tope (DEC-046, con el criterio de
  // DEC-031). Se genera siempre, aunque el disparador esté apagado, para que
  // encenderlo sea un solo campo.
  if (escenario.regla.abrirSiTasaMayorQue === null) {
    const { abrirSiTasaMayorQue } = tablaUmbralesPorTasa({
      minimoPorSentido: escenario.pozo.minimoPorSentido,
      maximoPorSentido: escenario.pozo.maximoPorSentido,
      capacidadNominalPorCaseta:
        escenario.tiempo.duracionIntervaloSegundos / escenario.servicio.mediaNominalSegundos,
      factor: escenario.regla.factorUmbrales,
    });
    escenario.regla.abrirSiTasaMayorQue = abrirSiTasaMayorQue;
  }

  return escenario;
}

/** Semillas de las réplicas de un escenario. */
export function semillasDe(escenario) {
  const { replicas, primeraSemilla } = escenario.corridas;
  return Array.from({ length: replicas }, (_, i) => primeraSemilla + i);
}

// ------------------------------------------------------------- validación ---

const entero = (x) => Number.isInteger(x);
const positivo = (x) => Number.isFinite(x) && x > 0;
const noNegativo = (x) => Number.isFinite(x) && x >= 0;

/**
 * Comprueba un escenario completo y devuelve la lista de problemas, en
 * castellano. Lista vacía = escenario válido.
 *
 * @param {object} escenario ya pasado por `construirEscenario`
 * @returns {string[]}
 */
export function problemasDelEscenario(escenario) {
  const errores = [];
  const e = escenario;

  if (!e || typeof e !== 'object') return ['El escenario tiene que ser un objeto.'];

  // --- sentidos ---
  if (!Array.isArray(e.sentidos) || e.sentidos.length !== 2) {
    errores.push('`sentidos` tiene que traer exactamente dos sentidos.');
  } else {
    e.sentidos.forEach((s, i) => {
      const donde = `sentidos[${i}] (${s.etiqueta ?? 'sin etiqueta'})`;
      if (!conteos[s.conteo]) {
        errores.push(
          `${donde}: el conteo "${s.conteo}" no existe. Los disponibles son: ${Object.keys(conteos).join(', ')}.`,
        );
      }
      if (!positivo(s.factorDemanda)) {
        errores.push(`${donde}: \`factorDemanda\` tiene que ser mayor que 0, llegó ${s.factorDemanda}.`);
      }
      if (!entero(s.colaInicial) || s.colaInicial < 0) {
        errores.push(`${donde}: \`colaInicial\` tiene que ser un entero de 0 o más, llegó ${s.colaInicial}.`);
      }
      const minimo = e.pozo?.minimoPorSentido;
      const tope = e.pozo?.maximoPorSentido;
      if (!entero(s.casetasIniciales) || s.casetasIniciales < 1) {
        errores.push(
          `${donde}: \`casetasIniciales\` tiene que ser un entero de 1 o más, llegó ${s.casetasIniciales}.`,
        );
      } else if (entero(minimo) && entero(tope) && (s.casetasIniciales < minimo || s.casetasIniciales > tope)) {
        errores.push(
          `${donde}: \`casetasIniciales\` (${s.casetasIniciales}) tiene que estar entre el mínimo (${minimo}) y el tope por sentido (${tope}).`,
        );
      }
      if (Array.isArray(s.casetasFijas) && entero(minimo) && entero(tope)) {
        const fuera = s.casetasFijas.filter((c) => c < minimo || c > tope);
        if (fuera.length > 0) {
          errores.push(
            `${donde}: \`casetasFijas\` tiene ${fuera.length} valor(es) fuera del rango ${minimo}–${tope}: ${[...new Set(fuera)].join(', ')}.`,
          );
        }
      }
      if (s.modo !== MODO.PROGRAMADO && s.modo !== MODO.REGLA) {
        errores.push(`${donde}: \`modo\` tiene que ser "${MODO.PROGRAMADO}" o "${MODO.REGLA}", llegó "${s.modo}".`);
      }
      if (s.llegadas !== null && s.llegadas !== undefined) {
        if (!Array.isArray(s.llegadas) || s.llegadas.length !== e.tiempo?.intervalos) {
          errores.push(
            `${donde}: \`llegadas\` tiene que ser null o un arreglo de ${e.tiempo?.intervalos} posiciones, una por intervalo.`,
          );
        } else if (s.llegadas.some((x) => !Number.isFinite(x) || x < 0)) {
          errores.push(`${donde}: \`llegadas\` no admite valores negativos ni no numéricos.`);
        }
      }
      if (s.casetasFijas !== null && s.casetasFijas !== undefined) {
        if (!Array.isArray(s.casetasFijas) || s.casetasFijas.length !== e.tiempo?.intervalos) {
          errores.push(
            `${donde}: \`casetasFijas\` tiene que ser un arreglo de ${e.tiempo?.intervalos} posiciones, una por intervalo.`,
          );
        }
      }
    });
  }

  // --- pozo ---
  const z = e.pozo ?? {};
  if (!entero(z.total) || z.total < 1) {
    errores.push(`\`pozo.total\` tiene que ser un entero de 1 o más, llegó ${z.total}.`);
  }
  if (!entero(z.minimoPorSentido) || z.minimoPorSentido < 1) {
    errores.push(`\`pozo.minimoPorSentido\` tiene que ser un entero de 1 o más, llegó ${z.minimoPorSentido}.`);
  }
  if (!entero(z.maximoPorSentido) || z.maximoPorSentido < 1) {
    errores.push(`\`pozo.maximoPorSentido\` tiene que ser un entero de 1 o más, llegó ${z.maximoPorSentido}.`);
  }
  if (entero(z.minimoPorSentido) && entero(z.maximoPorSentido) && z.minimoPorSentido > z.maximoPorSentido) {
    errores.push(
      `\`pozo.minimoPorSentido\` (${z.minimoPorSentido}) no puede ser mayor que \`pozo.maximoPorSentido\` (${z.maximoPorSentido}).`,
    );
  }
  if (entero(z.total) && entero(z.minimoPorSentido) && 2 * z.minimoPorSentido > z.total) {
    errores.push(
      `El pozo de ${z.total} casetas no alcanza para el mínimo de ${z.minimoPorSentido} en cada uno de los dos sentidos: harían falta ${2 * z.minimoPorSentido}.`,
    );
  }
  if (entero(z.total) && entero(z.maximoPorSentido) && z.maximoPorSentido > z.total) {
    errores.push(
      `\`pozo.maximoPorSentido\` (${z.maximoPorSentido}) no puede pasar del tamaño del pozo (${z.total}).`,
    );
  }

  // --- servicio ---
  const sv = e.servicio ?? {};
  if (!positivo(sv.gammaForma)) {
    errores.push(`\`servicio.gammaForma\` (k) tiene que ser mayor que 0, llegó ${sv.gammaForma}.`);
  }
  if (!positivo(sv.gammaEscalaSegundos)) {
    errores.push(`\`servicio.gammaEscalaSegundos\` (θ) tiene que ser mayor que 0, llegó ${sv.gammaEscalaSegundos}.`);
  }
  if (!positivo(sv.mediaNominalSegundos)) {
    errores.push(
      `\`servicio.mediaNominalSegundos\` tiene que ser mayor que 0, llegó ${sv.mediaNominalSegundos}.`,
    );
  }

  // --- regla ---
  const r = e.regla ?? {};
  if (!noNegativo(r.demoraAperturaSegundos)) {
    errores.push(`\`regla.demoraAperturaSegundos\` no puede ser negativa, llegó ${r.demoraAperturaSegundos}.`);
  }
  if (!noNegativo(r.ventanaCierreSegundos)) {
    errores.push(`\`regla.ventanaCierreSegundos\` no puede ser negativa, llegó ${r.ventanaCierreSegundos}.`);
  }
  if (!noNegativo(r.rhoReasignacion)) {
    errores.push(`\`regla.rhoReasignacion\` no puede ser negativa, llegó ${r.rhoReasignacion}.`);
  }
  if (!positivo(r.ventanaRhoSegundos)) {
    errores.push(`\`regla.ventanaRhoSegundos\` tiene que ser mayor que 0, llegó ${r.ventanaRhoSegundos}.`);
  }
  if (!positivo(r.factorUmbrales)) {
    errores.push(`\`regla.factorUmbrales\` tiene que ser mayor que 0, llegó ${r.factorUmbrales}.`);
  }
  for (const campo of ['reasignacionActiva', 'ofrecerPozoPorRho']) {
    if (typeof r[campo] !== 'boolean') {
      errores.push(`\`regla.${campo}\` tiene que ser true o false, llegó ${JSON.stringify(r[campo])}.`);
    }
  }

  // Las tablas tienen que cubrir todos los valores de c que el tope permite.
  if (entero(z.minimoPorSentido) && entero(z.maximoPorSentido) && z.minimoPorSentido <= z.maximoPorSentido) {
    /**
     * Un umbral válido es un número de 0 o más. Ojo: `null >= 0` es `true` en
     * JavaScript, así que hay que comprobar el tipo o un `null` a media tabla
     * se colaría como válido.
     */
    const umbralPuesto = (tabla, c) => typeof tabla?.[c] === 'number' && tabla[c] >= 0;

    for (let c = z.minimoPorSentido; c <= z.maximoPorSentido; c += 1) {
      if (c < z.maximoPorSentido && !umbralPuesto(r.abrirSiColaMayorQue, c)) {
        errores.push(
          `Falta el umbral de apertura para c = ${c}: con un tope de ${z.maximoPorSentido} hace falta uno para cada c de ${z.minimoPorSentido} a ${z.maximoPorSentido - 1}.`,
        );
      }
      if (c > z.minimoPorSentido && !umbralPuesto(r.cerrarSiColaMenorQue, c)) {
        errores.push(
          `Falta el umbral de cierre para c = ${c}: con un mínimo de ${z.minimoPorSentido} hace falta uno para cada c de ${z.minimoPorSentido + 1} a ${z.maximoPorSentido}.`,
        );
      }
      if (r.disparadorPorTasa && c < z.maximoPorSentido && !umbralPuesto(r.abrirSiTasaMayorQue, c)) {
        errores.push(
          `Falta el umbral de tasa para c = ${c}: con el disparador por tasa encendido hace falta uno para cada c de ${z.minimoPorSentido} a ${z.maximoPorSentido - 1}.`,
        );
      }
    }
  }

  // --- tiempo ---
  const t = e.tiempo ?? {};
  if (!positivo(t.duracionIntervaloSegundos)) {
    errores.push(
      `\`tiempo.duracionIntervaloSegundos\` tiene que ser mayor que 0, llegó ${t.duracionIntervaloSegundos}.`,
    );
  }
  if (!entero(t.intervalos) || t.intervalos < 1) {
    errores.push(`\`tiempo.intervalos\` tiene que ser un entero de 1 o más, llegó ${t.intervalos}.`);
  }
  if (entero(t.intervalos) && Array.isArray(e.sentidos)) {
    for (const s of e.sentidos) {
      if (Array.isArray(s.llegadas)) continue; // ya se comprobó su largo
      const largo = conteos[s.conteo]?.llegadas.length;
      if (largo !== undefined && largo !== t.intervalos) {
        errores.push(
          `El conteo "${s.conteo}" tiene ${largo} intervalos y el escenario pide ${t.intervalos}.`,
        );
      }
    }
  }

  // --- desempeño ---
  const d = e.desempeno ?? {};
  if (!positivo(d.metaWqSegundos)) {
    errores.push(`\`desempeno.metaWqSegundos\` tiene que ser mayor que 0, llegó ${d.metaWqSegundos}.`);
  }
  if (!positivo(d.maximoTolerableWqSegundos)) {
    errores.push(
      `\`desempeno.maximoTolerableWqSegundos\` tiene que ser mayor que 0, llegó ${d.maximoTolerableWqSegundos}.`,
    );
  }
  if (positivo(d.metaWqSegundos) && positivo(d.maximoTolerableWqSegundos) && d.metaWqSegundos > d.maximoTolerableWqSegundos) {
    errores.push(
      `La meta (${d.metaWqSegundos} s) no puede ser mayor que el máximo tolerable (${d.maximoTolerableWqSegundos} s).`,
    );
  }
  if (!(d.fraccionIntervalosSobreMaximoAceptada >= 0 && d.fraccionIntervalosSobreMaximoAceptada <= 1)) {
    errores.push(
      `\`desempeno.fraccionIntervalosSobreMaximoAceptada\` tiene que estar entre 0 y 1, llegó ${d.fraccionIntervalosSobreMaximoAceptada}.`,
    );
  }

  // --- corridas ---
  const co = e.corridas ?? {};
  if (!entero(co.replicas) || co.replicas < 1) {
    errores.push(`\`corridas.replicas\` tiene que ser un entero de 1 o más, llegó ${co.replicas}.`);
  }
  if (!entero(co.primeraSemilla)) {
    errores.push(`\`corridas.primeraSemilla\` tiene que ser un entero, llegó ${co.primeraSemilla}.`);
  }

  return errores;
}

/**
 * Comprueba un escenario y lanza si hay problemas, con todos los mensajes
 * juntos para no obligar a arreglarlos de uno en uno.
 *
 * @param {object} escenario
 * @returns {object} el mismo escenario, si es válido
 */
export function validarEscenario(escenario) {
  const errores = problemasDelEscenario(escenario);
  if (errores.length > 0) {
    throw new Error(
      `El escenario "${escenario?.nombre ?? 'sin nombre'}" tiene ${errores.length} problema(s):\n` +
        errores.map((m) => `  - ${m}`).join('\n'),
    );
  }
  return escenario;
}

// ------------------------------------------------------------------- JSON ---

/** Exporta un escenario a JSON legible. */
export function escenarioAJson(escenario, espacios = 2) {
  return JSON.stringify(escenario, null, espacios);
}

/**
 * Importa un escenario desde JSON. Lo completa con el base y lo valida, así que
 * un JSON parcial también sirve.
 */
export function escenarioDesdeJson(texto) {
  let crudo;
  try {
    crudo = JSON.parse(texto);
  } catch (error) {
    throw new Error(`El JSON del escenario no se pudo leer: ${error.message}`);
  }
  return validarEscenario(construirEscenario(crudo));
}

// ----------------------------------------------- traducción para el motor ---

/**
 * Traduce un escenario a la configuración que espera `simularPeaje`.
 *
 * Es el único punto donde el vocabulario declarativo del escenario se convierte
 * en la configuración del motor; el motor no sabe qué es un conteo ni un
 * régimen de servicio.
 *
 * @param {object} escenario completo y validado
 */
export function aConfiguracionPeaje(escenario) {
  const e = escenario;

  const sentidos = e.sentidos.map((s) => {
    const conteo = conteos[s.conteo];
    const porRegla = s.modo === MODO.REGLA;

    return {
      etiqueta: s.etiqueta,
      conteo: s.conteo,
      llegadas: s.llegadas ?? conteo.llegadas,
      casetasProgramadas: s.casetasFijas ?? conteo.casetas,
      modoCasetas: s.modo,
      ...(porRegla
        ? {
            regla: {
              abrirSiColaMayorQue: e.regla.abrirSiColaMayorQue,
              cerrarSiColaMenorQue: e.regla.cerrarSiColaMenorQue,
              abrirSiTasaMayorQue: e.regla.abrirSiTasaMayorQue,
              disparadorPorTasa: e.regla.disparadorPorTasa,
              demoraAperturaSegundos: e.regla.demoraAperturaSegundos,
              ventanaCierreSegundos: e.regla.ventanaCierreSegundos,
              maximoCasetas: e.pozo.maximoPorSentido,
              minimoCasetas: e.pozo.minimoPorSentido,
            },
          }
        : {}),
      colaInicial: s.colaInicial,
      casetasIniciales: s.casetasIniciales,
      maximoCasetas: e.pozo.maximoPorSentido,
      factorEscalaDemanda: s.factorDemanda,
      duracionIntervaloSegundos: e.tiempo.duracionIntervaloSegundos,
      gammaForma: e.servicio.gammaForma,
      gammaEscalaSegundos: e.servicio.gammaEscalaSegundos,
      maximoTolerableWqSegundos: e.desempeno.maximoTolerableWqSegundos,
    };
  });

  return {
    sentidos,
    pozoTotal: e.pozo.total,
    reasignacionActiva: e.regla.reasignacionActiva,
    ofrecerPozoPorRho: e.regla.ofrecerPozoPorRho,
    rhoReasignacion: e.regla.rhoReasignacion,
    ventanaRhoSegundos: e.regla.ventanaRhoSegundos,
    esperaDesempateSegundos: e.regla.esperaDesempateSegundos,
    servicioNominalSegundos: e.servicio.mediaNominalSegundos,
    capacidadNominalPorCaseta: e.tiempo.duracionIntervaloSegundos / e.servicio.mediaNominalSegundos,
  };
}
