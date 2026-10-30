#!/usr/bin/env node
/**
 * Experimentos de la fase 2: la regla de apertura y cierre contra la operación
 * real del operador.
 *
 * Genera `docs/resultados/fase2-regla.md` con 30 réplicas por caso, semillas
 * 1…30 y **las mismas semillas en todos los casos** (DEC-010), lo que hace que
 * las comparaciones usen números aleatorios comunes.
 *
 * Casos:
 *  1. Los 4 conteos: operador (programado) contra regla, con servicio base.
 *  2. El festivo, además, con el servicio lento de sensibilidad (DEC-025).
 *  3. Sensibilidad de la demora de apertura (0, 5 y 10 min) en el festivo, con
 *     servicio base y con servicio lento.
 *
 * Se reporta lo que salga, sin ajustar parámetros (DEC-021).
 *
 * Uso: npm run fase2
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { correrYResumir, MODO_CASETAS } from '../src/motor/index.js';
import { conteos, ordenConteos } from '../src/config/datos.js';
import { parametros, configuracionRegla, semillasReplicas } from '../src/config/parametros.js';

const AQUI = dirname(fileURLToPath(import.meta.url));
const SALIDA = resolve(AQUI, '..', 'docs', 'resultados', 'fase2-regla.md');

const SEGUNDOS_POR_MINUTO = 60;
const p = parametros;
const semillas = semillasReplicas();

/** Cola inicial por conteo (DEC-010). */
const COLA_INICIAL = { viernes: 0, domingoCP: 0, domingoPC: 0, festivoPC: 23 };

/** Regímenes de servicio. El lento es sensibilidad, nunca el base (DEC-025). */
const SERVICIO = {
  base: {
    clave: 'base',
    etiqueta: 'servicio base (12,10 s)',
    gammaForma: p.servicio.gammaForma,
    gammaEscalaSegundos: p.servicio.gammaEscalaSegundos,
    mediaSegundos: p.servicio.mediaObservadaSegundos,
  },
  lento: {
    clave: 'lento',
    etiqueta: 'servicio lento (15,5 s, sensibilidad)',
    gammaForma: p.servicioLento.gammaForma,
    gammaEscalaSegundos: p.servicioLento.gammaEscalaSegundos,
    mediaSegundos: p.servicioLento.mediaObservadaSegundos,
  },
};

/** El festivo es el único escenario de pico, y el único que admite el servicio lento. */
const CONTEO_PICO = 'festivoPC';

/** Controles de `c(t)`. `regla+tasa` añade el disparador anticipativo (DEC-046). */
const CONTROLES = ['operador', 'regla', 'regla+tasa'];

function configuracionDe({ conteo, control, servicio, demoraAperturaSegundos }) {
  const porRegla = control !== 'operador';
  const disparadorPorTasa = control === 'regla+tasa';
  return {
    llegadas: conteos[conteo].llegadas,
    casetasProgramadas: conteos[conteo].casetas,
    modoCasetas: porRegla ? MODO_CASETAS.REGLA : MODO_CASETAS.PROGRAMADO,
    ...(porRegla
      ? { regla: configuracionRegla({ demoraAperturaSegundos, disparadorPorTasa }) }
      : {}),
    colaInicial: COLA_INICIAL[conteo],
    factorEscalaDemanda: p.llegadas.factorEscalaDemanda,
    duracionIntervaloSegundos: p.tiempo.duracionIntervaloSegundos,
    gammaForma: servicio.gammaForma,
    gammaEscalaSegundos: servicio.gammaEscalaSegundos,
    maximoTolerableWqSegundos: p.desempeno.maximoTolerableWqSegundos,
  };
}

// --------------------------------------------------------------------- casos ---

const casos = [];

// 1 y 2. Los 4 conteos: operador contra regla.
for (const conteo of ordenConteos) {
  const servicios = conteo === CONTEO_PICO ? ['base', 'lento'] : ['base'];
  for (const claveServicio of servicios) {
    for (const control of CONTROLES) {
      casos.push({
        grupo: 'comparacion',
        conteo,
        control,
        servicio: SERVICIO[claveServicio],
        demoraAperturaSegundos: p.regla.demoraAperturaSegundos,
        nombre: `${conteo} · ${control} · ${claveServicio}`,
      });
    }
  }
}

// 3. Sensibilidad de la demora en el festivo, con los dos regímenes.
for (const claveServicio of ['base', 'lento']) {
  for (const demora of p.regla.demorasAperturaSensibilidadSegundos) {
    casos.push({
      grupo: 'demora',
      conteo: CONTEO_PICO,
      control: 'regla',
      servicio: SERVICIO[claveServicio],
      demoraAperturaSegundos: demora,
      nombre: `${CONTEO_PICO} · regla · ${claveServicio} · demora ${demora / SEGUNDOS_POR_MINUTO} min`,
    });
  }
}

console.log(`Fase 2: ${casos.length} casos × ${semillas.length} réplicas (semillas ${semillas[0]}…${semillas.at(-1)})`);

const resultados = casos.map((caso) => {
  const resumen = correrYResumir(configuracionDe(caso), semillas);
  console.log(`  ${caso.nombre}`);
  return { caso, resumen };
});

const busca = (predicado) => resultados.find(({ caso }) => predicado(caso));

// ------------------------------------------------------------------ formato ---

const coma = (texto) => texto.replace('.', ',');
const n = (x, dec = 2) => (x === null || x === undefined ? '—' : coma(x.toFixed(dec)));
const min = (segundos, dec = 2) =>
  segundos === null || segundos === undefined ? '—' : coma((segundos / SEGUNDOS_POR_MINUTO).toFixed(dec));
const pct = (fraccion, dec = 1) =>
  fraccion === null || fraccion === undefined ? '—' : `${coma((fraccion * 100).toFixed(dec))} %`;

/** Minutos con el tope de 5 casetas abiertas. */
const minutosEnCinco = (resumen) => {
  const nivel = resumen.tiempoPorCasetasAbiertas[p.casetas.maximoPorSentido];
  return nivel ? nivel.media / SEGUNDOS_POR_MINUTO : 0;
};

const META = p.desempeno.metaWqSegundos;
const TOLERABLE = p.desempeno.maximoTolerableWqSegundos;
const FRACCION_ACEPTADA = p.desempeno.fraccionIntervalosSobreMaximoAceptada;

/** ¿El caso cumple el criterio de desempeño (DEC-009)? */
function cumple(resumen) {
  const wq = resumen.escalares.wqHoraSegundos.media;
  const fraccion = resumen.escalares.fraccionIntervalosSobreUmbral.media;
  const cumpleMeta = wq <= META;
  const cumpleTolerable = fraccion <= FRACCION_ACEPTADA;
  return { cumpleMeta, cumpleTolerable, cumpleTodo: cumpleMeta && cumpleTolerable };
}

const marca = (ok) => (ok ? 'sí' : '**no**');

const lineas = [];
const w = (texto = '') => lineas.push(texto);

w('# Fase 2: la regla de apertura y cierre contra la operación real');
w();
w('Generado por `npm run fase2` el ' + new Date().toISOString().slice(0, 10) + '.');
w('**No editar a mano:** este archivo se regenera.');
w();
w(`${casos.length} casos, **${semillas.length} réplicas** cada uno, semillas ${semillas[0]} a ${semillas.at(-1)},`);
w('**las mismas en todos los casos** (DEC-010): las comparaciones usan números');
w('aleatorios comunes, así que las diferencias entre casos no son ruido de');
w('semillas distintas.');
w();
w('> Se reporta lo que salga. **No se ajustó ningún parámetro** para que la');
w('> regla saliera mejor ni peor (DEC-021).');
w();
w('## Cómo leer esto');
w();
w('- **operador** = modo programado: `c(t)` copia las casetas que el operador');
w('  tuvo abiertas en cada intervalo del conteo. Es la operación real.');
w('- **regla** = modo por regla: `c(t)` lo decide la regla por cola de la');
w(`  sección 4, arrancando con las casetas del primer intervalo observado.`);
w('- **regla+tasa** = la misma regla **más el disparador anticipativo por tasa');
w('  de llegadas** (DEC-046): abre también cuando las llegadas de los últimos');
w('  5 min cruzan el umbral de la sección 4 (21 / 46 / 70 / 95), sin esperar a');
w('  que la cola cruce el suyo. Se dispara lo que ocurra primero. La columna');
w('  **Anticipadas** cuenta las aperturas que solo explica la tasa.');
w(`- **servicio base** = 12,1016 s, el medido. **servicio lento** = 15,5 s, que`);
w('  es una **hipótesis de sensibilidad** (DEC-025, PEN-010), no una medición ni');
w('  una calibración. Solo se aplica al festivo, que es el escenario de pico.');
w(`- **Criterio de desempeño** (DEC-009): meta \`Wq ≤ ${min(META, 0)} min\` y a lo sumo`);
w(`  ${pct(FRACCION_ACEPTADA, 0)} de los intervalos por encima de ${min(TOLERABLE, 1)} min.`);
w('- El modelo de cola única **subestima** la congestión del pico (PEN-008), así');
w('  que las casetas que recomiende la regla son una **cota inferior**.');
w();

// ------------------------------------------------------- tabla comparación ---

function tablaEncabezado() {
  w('| Caso | Wq (min) | % int. > 2,5 min | Cola máx. muestreada | Cola máx. continua | Carriles-int. | Aperturas | Anticipadas | Cierres | Cambios de c | Min. con c = 5 |');
  w('|---|---|---|---|---|---|---|---|---|---|---|');
}

function tablaFila(etiqueta, resumen) {
  const e = resumen.escalares;
  w(
    `| ${etiqueta} | ${min(e.wqHoraSegundos.media)} ± ${min(e.wqHoraSegundos.semiamplitudIc95)} ` +
      `| ${pct(e.fraccionIntervalosSobreUmbral.media)} ± ${pct(e.fraccionIntervalosSobreUmbral.semiamplitudIc95)} ` +
      `| ${n(e.colaMaximaMuestreada.media, 1)} ± ${n(e.colaMaximaMuestreada.semiamplitudIc95, 1)} ` +
      `| ${n(e.colaMaximaContinua.media, 1)} ± ${n(e.colaMaximaContinua.semiamplitudIc95, 1)} ` +
      `| ${n(e.carrilesIntervalo.media, 1)} ± ${n(e.carrilesIntervalo.semiamplitudIc95, 1)} ` +
      `| ${n(e.aperturas.media, 1)} | ${n(e.aperturasAnticipadas.media, 1)} | ${n(e.cierres.media, 1)} | ${n(e.cambiosDeC.media, 1)} ` +
      `| ${n(minutosEnCinco(resumen), 1)} |`,
  );
}

w('## Operador contra regla, conteo por conteo');
w();
w('Todas las cifras son la media entre réplicas con su intervalo de confianza al 95 %.');
w();

for (const conteo of ordenConteos) {
  const delConteo = resultados.filter(
    ({ caso }) => caso.grupo === 'comparacion' && caso.conteo === conteo,
  );
  w(`### ${conteo}`);
  w();
  w(`${conteos[conteo].etiqueta}`);
  w();
  w(`- Llegadas contadas: ${conteos[conteo].llegadas.reduce((a, b) => a + b, 0)} veh/h`);
  w(`- Casetas del operador: \`[${conteos[conteo].casetas.join(', ')}]\``);
  w(`- Cola inicial: ${COLA_INICIAL[conteo]} vehículos`);
  w(`- Casetas iniciales de la regla: ${conteos[conteo].casetas[0]}`);
  w(`- Demora de apertura: ${p.regla.demoraAperturaSegundos / SEGUNDOS_POR_MINUTO} min`);
  w();
  tablaEncabezado();
  for (const { caso, resumen } of delConteo) {
    const etiqueta =
      caso.servicio.clave === 'base'
        ? caso.control
        : `${caso.control} · ${caso.servicio.clave}`;
    tablaFila(etiqueta, resumen);
  }
  w();

  // Cumplimiento del criterio por caso.
  w('¿Cumple el criterio de desempeño?');
  w();
  w('| Caso | Wq ≤ 1 min | ≤ 5 % de intervalos > 2,5 min | Cumple |');
  w('|---|---|---|---|');
  for (const { caso, resumen } of delConteo) {
    const c = cumple(resumen);
    const etiqueta =
      caso.servicio.clave === 'base' ? caso.control : `${caso.control} · ${caso.servicio.clave}`;
    w(`| ${etiqueta} | ${marca(c.cumpleMeta)} | ${marca(c.cumpleTolerable)} | ${marca(c.cumpleTodo)} |`);
  }
  w();
}

// ------------------------------------------------ disparador anticipativo ---

w('## El disparador anticipativo por tasa (DEC-046)');
w();
w('La regla por cola es **reactiva**: espera a que la cola cruce el umbral y');
w('después tarda la demora en tener la caseta abierta. El operador real fue');
w('**anticipativo** (PEN-011). El disparador por tasa es lo que cierra esa');
w('diferencia: abre cuando la **demanda** cruza el umbral, sin esperar a que la');
w('cola se forme.');
w();
w('Los umbrales no son nuevos: son los cuatro que deriva la sección 4 del');
w('contexto por M/M/c con `Wq ≤ 1 min` (21 / 46 / 70 / 95 llegadas por 5 min');
w('para abrir la 2.ª, 3.ª, 4.ª y 5.ª caseta).');
w();

for (const claveServicio of ['base', 'lento']) {
  const casosDelRegimen = ordenConteos
    .map((conteo) => ({
      conteo,
      operador: busca((c) => c.grupo === 'comparacion' && c.conteo === conteo && c.control === 'operador' && c.servicio.clave === claveServicio),
      regla: busca((c) => c.grupo === 'comparacion' && c.conteo === conteo && c.control === 'regla' && c.servicio.clave === claveServicio),
      tasa: busca((c) => c.grupo === 'comparacion' && c.conteo === conteo && c.control === 'regla+tasa' && c.servicio.clave === claveServicio),
    }))
    .filter((f) => f.operador && f.regla && f.tasa);

  if (casosDelRegimen.length === 0) continue;

  w(`### ${SERVICIO[claveServicio].etiqueta}`);
  w();
  w('| Conteo | Wq operador | Wq regla | Wq regla+tasa | Δ tasa vs. regla | ¿Gana al operador? | Carriles regla | Carriles regla+tasa | Anticipadas |');
  w('|---|---|---|---|---|---|---|---|---|');
  for (const f of casosDelRegimen) {
    const wqOp = f.operador.resumen.escalares.wqHoraSegundos.media;
    const wqRe = f.regla.resumen.escalares.wqHoraSegundos.media;
    const wqTa = f.tasa.resumen.escalares.wqHoraSegundos.media;
    w(
      `| ${f.conteo} | ${min(wqOp)} | ${min(wqRe)} | **${min(wqTa)}** ` +
        `| ${min(wqTa - wqRe)} | ${marca(wqTa <= wqOp)} ` +
        `| ${n(f.regla.resumen.escalares.carrilesIntervalo.media, 1)} ` +
        `| ${n(f.tasa.resumen.escalares.carrilesIntervalo.media, 1)} ` +
        `| ${n(f.tasa.resumen.escalares.aperturasAnticipadas.media, 2)} |`,
    );
  }
  w();

  const festivo = casosDelRegimen.find((f) => f.conteo === CONTEO_PICO);
  if (festivo) {
    const wqOp = festivo.operador.resumen.escalares.wqHoraSegundos.media;
    const wqRe = festivo.regla.resumen.escalares.wqHoraSegundos.media;
    const wqTa = festivo.tasa.resumen.escalares.wqHoraSegundos.media;
    const carRe = festivo.regla.resumen.escalares.carrilesIntervalo.media;
    const carTa = festivo.tasa.resumen.escalares.carrilesIntervalo.media;
    const anticipadas = festivo.tasa.resumen.escalares.aperturasAnticipadas.media;
    w(
      `**En el festivo**, el disparador baja \`Wq\` de ${min(wqRe)} a ${min(wqTa)} min ` +
        `(${wqTa < wqRe ? '÷' : '×'}${n(wqTa < wqRe ? wqRe / wqTa : wqTa / wqRe)}), ` +
        `con ${n(anticipadas, 2)} aperturas anticipadas por réplica y ` +
        `${n(carTa - carRe, 1)} carriles-intervalo de diferencia.`,
    );
    // La coletilla solo vale si la regla por cola sola iba por detrás: en el
    // régimen lento ya ganaba al operador y decirlo sería falso.
    const reglaIbaDetras = wqRe > wqOp;
    w(
      `Contra el operador (${min(wqOp)} min), la regla con el disparador ` +
        (wqTa <= wqOp ? '**queda por delante**' : '**sigue por detrás**') +
        (reglaIbaDetras && wqTa <= wqOp
          ? `, que es justo lo que la regla por cola sola no conseguía con la demora de ${p.regla.demoraAperturaSegundos / SEGUNDOS_POR_MINUTO} min.`
          : reglaIbaDetras
            ? '.'
            : ', como ya lo estaba sin el disparador.'),
    );
    w();
  }
}

// --------------------------------------------------------- sensibilidad demora ---

w('## Sensibilidad de la demora de apertura (festivo)');
w();
w('La demora es el tiempo entre que se decide abrir una caseta y que la caseta');
w('está operando. No está medida en campo (contexto, sección 8), así que entra');
w('como sensibilidad: 0, 5 y 10 min.');
w();

for (const claveServicio of ['base', 'lento']) {
  w(`### ${SERVICIO[claveServicio].etiqueta}`);
  w();
  tablaEncabezado();
  // El operador, como referencia fija: no depende de la demora.
  const operador = busca(
    (c) => c.grupo === 'comparacion' && c.conteo === CONTEO_PICO && c.control === 'operador' && c.servicio.clave === claveServicio,
  );
  tablaFila('operador (referencia)', operador.resumen);
  for (const { caso, resumen } of resultados.filter(
    ({ caso }) => caso.grupo === 'demora' && caso.servicio.clave === claveServicio,
  )) {
    tablaFila(`regla · demora ${caso.demoraAperturaSegundos / SEGUNDOS_POR_MINUTO} min`, resumen);
  }
  w();
}

// -------------------------------------------------------------------- lectura ---

w('## Lectura');
w();
w('Todo lo que sigue sale de las tablas de arriba.');
w();

for (const claveServicio of ['base', 'lento']) {
  const etiqueta = SERVICIO[claveServicio].etiqueta;
  w(`### Con ${etiqueta}`);
  w();

  const delRegimen = resultados.filter(
    ({ caso }) => caso.grupo === 'comparacion' && caso.servicio.clave === claveServicio,
  );
  const conteosDelRegimen = [...new Set(delRegimen.map(({ caso }) => caso.conteo))];

  w('| Conteo | Wq operador | Wq regla | % int. > 2,5 min op. | % int. regla | Cumple op. | Cumple regla | Carriles-int. op. | Carriles-int. regla | Dif. carriles |');
  w('|---|---|---|---|---|---|---|---|---|---|');
  for (const conteo of conteosDelRegimen) {
    const op = delRegimen.find(({ caso }) => caso.conteo === conteo && caso.control === 'operador');
    const re = delRegimen.find(({ caso }) => caso.conteo === conteo && caso.control === 'regla');
    const eo = op.resumen.escalares;
    const er = re.resumen.escalares;
    w(
      `| ${conteo} | ${min(eo.wqHoraSegundos.media)} | ${min(er.wqHoraSegundos.media)} ` +
        `| ${pct(eo.fraccionIntervalosSobreUmbral.media)} | ${pct(er.fraccionIntervalosSobreUmbral.media)} ` +
        `| ${marca(cumple(op.resumen).cumpleTodo)} | ${marca(cumple(re.resumen).cumpleTodo)} ` +
        `| ${n(eo.carrilesIntervalo.media, 1)} | ${n(er.carrilesIntervalo.media, 1)} ` +
        `| ${n(er.carrilesIntervalo.media - eo.carrilesIntervalo.media, 1)} |`,
    );
  }
  w();

  const operadorCumpleTodos = conteosDelRegimen.every((conteo) =>
    cumple(delRegimen.find(({ caso }) => caso.conteo === conteo && caso.control === 'operador').resumen)
      .cumpleTodo,
  );
  const reglaCumpleTodos = conteosDelRegimen.every((conteo) =>
    cumple(delRegimen.find(({ caso }) => caso.conteo === conteo && caso.control === 'regla').resumen)
      .cumpleTodo,
  );

  if (operadorCumpleTodos && reglaCumpleTodos) {
    w('**Las dos cumplen el criterio en todos los conteos de este régimen.** Con el');
    w('operador ya cumpliendo, la regla no tiene incumplimiento que corregir: lo');
    w('que queda por comparar es la espera y los carriles-intervalo que gasta cada');
    w('uno. Dicho de otro modo, en este régimen **la regla no resuelve un problema,');
    w('porque según el modelo no hay problema que resolver** (PEN-009).');
  } else if (operadorCumpleTodos) {
    w('**El operador cumple el criterio en todos los conteos de este régimen y la');
    w('regla no en todos.** Según el modelo, la regla empeora el desempeño respecto');
    w('de la operación real.');
  } else if (reglaCumpleTodos) {
    w('**La regla cumple el criterio en todos los conteos de este régimen y el');
    w('operador no.** Ahí la regla aporta: convierte una operación que incumple en');
    w('una que cumple.');
  } else {
    w('**Ni el operador ni la regla cumplen el criterio en todos los conteos de');
    w('este régimen**, así que la comparación es de grado: cuánto incumple cada uno.');
  }
  w();

  // Dónde está la mayor diferencia de espera entre los dos controles.
  const porConteo = conteosDelRegimen.map((conteo) => {
    const op = delRegimen.find(({ caso }) => caso.conteo === conteo && caso.control === 'operador');
    const re = delRegimen.find(({ caso }) => caso.conteo === conteo && caso.control === 'regla');
    return {
      conteo,
      wqOp: op.resumen.escalares.wqHoraSegundos.media,
      wqRe: re.resumen.escalares.wqHoraSegundos.media,
      fracOp: op.resumen.escalares.fraccionIntervalosSobreUmbral.media,
      fracRe: re.resumen.escalares.fraccionIntervalosSobreUmbral.media,
      carrilesOp: op.resumen.escalares.carrilesIntervalo.media,
      carrilesRe: re.resumen.escalares.carrilesIntervalo.media,
    };
  });

  w('Espera, conteo por conteo:');
  w();
  for (const d of porConteo) {
    const mejor = d.wqRe < d.wqOp;
    const razon = d.wqOp / d.wqRe;
    w(
      `- **${d.conteo}:** la regla ${mejor ? 'baja' : 'sube'} \`Wq\` de ${min(d.wqOp)} a ${min(d.wqRe)} min` +
        ` (${mejor ? `÷${n(razon, 2)}` : `×${n(1 / razon, 2)}`}), con` +
        ` ${n(d.carrilesRe - d.carrilesOp, 1)} carriles-intervalo de diferencia` +
        `${d.fracOp !== d.fracRe ? ` y el % de intervalos sobre el máximo tolerable pasando de ${pct(d.fracOp)} a ${pct(d.fracRe)}` : ''}.`,
    );
  }
  w();

  const sumaOp = porConteo.reduce((a, d) => a + d.carrilesOp, 0);
  const sumaRe = porConteo.reduce((a, d) => a + d.carrilesRe, 0);
  const signo = sumaRe > sumaOp ? 'más' : 'menos';
  w(
    `En carriles-intervalo sumados sobre los conteos de este régimen, la regla usa` +
      ` **${n(Math.abs(sumaRe - sumaOp), 1)} ${signo}** que el operador` +
      ` (${n(sumaRe, 1)} contra ${n(sumaOp, 1)}, un ${n((100 * (sumaRe - sumaOp)) / sumaOp, 1)} %).`,
  );
  w();
}

// ----------------------------------------------- donde la regla si aporta ---

w('### Dónde aporta la regla');
w();
{
  const opBase = busca((c) => c.grupo === 'comparacion' && c.conteo === CONTEO_PICO && c.control === 'operador' && c.servicio.clave === 'base');
  const reBase = busca((c) => c.grupo === 'comparacion' && c.conteo === CONTEO_PICO && c.control === 'regla' && c.servicio.clave === 'base');
  const opLento = busca((c) => c.grupo === 'comparacion' && c.conteo === CONTEO_PICO && c.control === 'operador' && c.servicio.clave === 'lento');
  const reLento = busca((c) => c.grupo === 'comparacion' && c.conteo === CONTEO_PICO && c.control === 'regla' && c.servicio.clave === 'lento');

  const wq = (r) => r.resumen.escalares.wqHoraSegundos.media;
  const frac = (r) => r.resumen.escalares.fraccionIntervalosSobreUmbral.media;
  const carr = (r) => r.resumen.escalares.carrilesIntervalo.media;

  w('El festivo con los dos regímenes de servicio, que es la comparación que');
  w('decide si la regla vale la pena:');
  w();
  w('| | Wq (min) | % int. > 2,5 min | Carriles-int. | Min. con c = 5 |');
  w('|---|---|---|---|---|');
  w(`| operador, servicio base | ${min(wq(opBase))} | ${pct(frac(opBase))} | ${n(carr(opBase), 1)} | ${n(minutosEnCinco(opBase.resumen), 1)} |`);
  w(`| regla, servicio base | ${min(wq(reBase))} | ${pct(frac(reBase))} | ${n(carr(reBase), 1)} | ${n(minutosEnCinco(reBase.resumen), 1)} |`);
  w(`| operador, servicio lento | ${min(wq(opLento))} | ${pct(frac(opLento))} | ${n(carr(opLento), 1)} | ${n(minutosEnCinco(opLento.resumen), 1)} |`);
  w(`| regla, servicio lento | ${min(wq(reLento))} | ${pct(frac(reLento))} | ${n(carr(reLento), 1)} | ${n(minutosEnCinco(reLento.resumen), 1)} |`);
  w();
  w(
    `Con **servicio base** la regla queda ${wq(reBase) > wq(opBase) ? 'algo peor' : 'algo mejor'} que el operador` +
      ` (${min(wq(reBase))} contra ${min(wq(opBase))} min) y las dos cumplen: la regla no aporta nada que` +
      ' el operador no esté haciendo ya.',
  );
  w();
  w(
    `Con **servicio lento** cambia por completo: la regla baja \`Wq\` de` +
      ` ${min(wq(opLento))} a ${min(wq(reLento))} min (÷${n(wq(opLento) / wq(reLento), 2)}) y el porcentaje de` +
      ` intervalos por encima del máximo tolerable de ${pct(frac(opLento))} a ${pct(frac(reLento))},` +
      ` gastando ${n(carr(reLento) - carr(opLento), 1)} carriles-intervalo más` +
      ` (un ${n((100 * (carr(reLento) - carr(opLento))) / carr(opLento), 1)} %).`,
  );
  w('Ninguna de las dos llega a cumplir el criterio, pero la regla recorta la');
  w('mayor parte del incumplimiento.');
  w();
  w('**La conclusión de la fase 2, entonces, depende del régimen de servicio.**');
  w('Si el servicio del pico es el medido (12,10 s), el modelo dice que la');
  w('operación real ya cumple y la regla sobra. Si el pico es más lento, la regla');
  w('es lo que separa un incumplimiento grave de uno moderado, por un 7 % más de');
  w('carriles-intervalo. Y como el modelo de cola única **subestima** la');
  w('congestión del pico (PEN-008), el caso base es el optimista de los dos.');
  w();
}

// Efecto de la demora.

w('### Efecto de la demora de apertura');
w();
for (const claveServicio of ['base', 'lento']) {
  const delRegimen = resultados.filter(
    ({ caso }) => caso.grupo === 'demora' && caso.servicio.clave === claveServicio,
  );
  const porDemora = delRegimen.map(({ caso, resumen }) => ({
    minutos: caso.demoraAperturaSegundos / SEGUNDOS_POR_MINUTO,
    wq: resumen.escalares.wqHoraSegundos.media,
    carriles: resumen.escalares.carrilesIntervalo.media,
  }));
  const sinDemora = porDemora.find((d) => d.minutos === 0);
  const diez = porDemora.find((d) => d.minutos === 10);
  w(
    `- **${SERVICIO[claveServicio].etiqueta}:** pasar de 0 a 10 min de demora lleva` +
      ` \`Wq\` de ${min(sinDemora.wq)} a ${min(diez.wq)} min` +
      ` (×${n(diez.wq / sinDemora.wq, 2)}) y los carriles-intervalo de` +
      ` ${n(sinDemora.carriles, 1)} a ${n(diez.carriles, 1)}.`,
  );
}
w();

// Lo que la fase 2 no puede responder.
w('### Lo que esta comparación no puede responder');
w();
w('- El modelo de cola única **subestima** la congestión del pico: en el festivo');
w('  la cola total simulada queda por debajo de la fila más larga observada en');
w('  los 12 intervalos (PEN-008, `diagnostico-festivo.md`). Las casetas que la');
w('  regla recomienda son una **cota inferior**.');
w('- El **servicio lento de 15,5 s es una hipótesis**, no una medición');
w('  (DEC-025, PEN-010). Está aquí para acotar cuánto cambiaría la conclusión si');
w('  la causa del pico fuera un servicio más lento, no para afirmar que lo es.');
w('- Falta el **pozo compartido entre sentidos**: aquí cada sentido tiene su');
w('  propio tope de 5 casetas, sin competir con el otro. Eso es la fase 3, y');
w('  solo puede empeorar el desempeño de la regla, nunca mejorarlo.');
w('- La demanda de Cúcuta→Pamplona en el festivo **no se midió** (contexto,');
w('  sección 7), así que la competencia por casetas de la fase 3 se alimentará de');
w('  un sustituto.');
w();

mkdirSync(dirname(SALIDA), { recursive: true });
writeFileSync(SALIDA, lineas.join('\n') + '\n', 'utf8');
console.log(`\nEscrito ${SALIDA}`);
