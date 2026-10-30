#!/usr/bin/env node
/**
 * Experimentos de la fase 3: el reparto de las 6 casetas entre los dos
 * sentidos.
 *
 * Genera `docs/resultados/fase3-reparto.md` con 30 réplicas por caso, semillas
 * 1…30 y **las mismas semillas en todos los casos** (DEC-010), así que las
 * comparaciones usan números aleatorios comunes.
 *
 * Casos del festivo, con servicio base y con servicio lento (DEC-025):
 *   a) operador;
 *   b) regla con pozo y sin reasignación;
 *   c) regla con reasignación.
 * Sensibilidades, solo sobre (c): demora 0 y 10 min, `ofrecerPozoPorRho`, y el
 * sustituto de C→P cambiado a domingoCP.
 * Más el escenario de sanidad de día normal.
 *
 * Se reporta lo que salga, sin ajustar umbrales ni parámetros (DEC-021).
 *
 * Uso: npm run fase3
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { simularPeaje, correrYResumirPeaje } from '../src/motor/index.js';
import { conteos } from '../src/config/datos.js';
import { parametros, semillasReplicas } from '../src/config/parametros.js';
import {
  escenarioFestivo,
  escenarioDiaNormal,
  REGIMENES_SERVICIO,
} from '../src/config/escenarios.js';

/**
 * El informe de la fase 3 se publicó con `domingoPC` como sustituto de C→P, que
 * era el valor por defecto de entonces. La DEC-029 cambió ese valor por defecto
 * a `viernes`, así que aquí se **fija explícitamente** para que este informe
 * siga siendo reproducible. La comparación con el sustituto nuevo está en la
 * fase 4.
 */
const SUSTITUTO_FASE3 = 'domingoPC';

const AQUI = dirname(fileURLToPath(import.meta.url));
const SALIDA = resolve(AQUI, '..', 'docs', 'resultados', 'fase3-reparto.md');

const SEGUNDOS_POR_MINUTO = 60;
const p = parametros;
const semillas = semillasReplicas();

/** Capacidad nominal de una caseta en un intervalo de 5 min (≈ 24,8 veh). */
const capacidadPorCaseta = p.tiempo.duracionIntervaloSegundos / p.servicio.mediaObservadaSegundos;

const META = p.desempeno.metaWqSegundos;
const TOLERABLE = p.desempeno.maximoTolerableWqSegundos;
const FRACCION_ACEPTADA = p.desempeno.fraccionIntervalosSobreMaximoAceptada;

// --------------------------------------------------------------------- casos ---

const casos = [];

for (const claveServicio of ['base', 'lento']) {
  const servicio = REGIMENES_SERVICIO[claveServicio];

  casos.push({
    grupo: 'comparacion',
    servicio,
    nombre: 'operador',
    descripcion: 'P→C copia las casetas observadas; C→P fijo en 1 caseta',
    sentidos: escenarioFestivo({ control: 'operador', servicio, sustituto: SUSTITUTO_FASE3 }),
    peaje: {},
  });
  casos.push({
    grupo: 'comparacion',
    servicio,
    nombre: 'regla sin reasignación',
    descripcion: 'la regla por cola en los dos sentidos; el pozo es solo almacén',
    sentidos: escenarioFestivo({ control: 'regla', servicio, sustituto: SUSTITUTO_FASE3 }),
    peaje: { reasignacionActiva: false },
  });
  casos.push({
    grupo: 'comparacion',
    servicio,
    nombre: 'regla con reasignación',
    descripcion: 'la regla más el traspaso por ρ > 0,60 al liberarse una caseta',
    sentidos: escenarioFestivo({ control: 'regla', servicio, sustituto: SUSTITUTO_FASE3 }),
    peaje: { reasignacionActiva: true },
  });
  casos.push({
    grupo: 'comparacion',
    servicio,
    nombre: 'regla + tasa, sin reasignación',
    descripcion:
      'la regla por cola más el disparador anticipativo por tasa (DEC-046); el pozo es solo almacén',
    sentidos: escenarioFestivo({
      control: 'regla',
      servicio,
      sustituto: SUSTITUTO_FASE3,
      disparadorPorTasa: true,
    }),
    peaje: { reasignacionActiva: false },
  });

  // Sensibilidades, todas sobre el caso (c).
  for (const demoraMinutos of [0, 10]) {
    casos.push({
      grupo: 'sensibilidad',
      servicio,
      nombre: `demora ${demoraMinutos} min`,
      descripcion: `como (c) pero con demora de apertura de ${demoraMinutos} min`,
      sentidos: escenarioFestivo({
        control: 'regla',
        servicio,
        sustituto: SUSTITUTO_FASE3,
        demoraAperturaSegundos: demoraMinutos * SEGUNDOS_POR_MINUTO,
      }),
      peaje: { reasignacionActiva: true },
    });
  }
  casos.push({
    grupo: 'sensibilidad',
    servicio,
    nombre: 'ofrecerPozoPorRho',
    descripcion: 'como (c) pero ofreciendo por ρ las casetas ya libres del pozo',
    sentidos: escenarioFestivo({ control: 'regla', servicio, sustituto: SUSTITUTO_FASE3 }),
    peaje: { reasignacionActiva: true, ofrecerPozoPorRho: true },
  });
  casos.push({
    grupo: 'sensibilidad',
    servicio,
    nombre: 'sustituto domingoCP',
    descripcion: 'como (c) pero con C→P = domingoCP (451 veh/h) en vez de domingoPC',
    sentidos: escenarioFestivo({ control: 'regla', servicio, sustituto: 'domingoCP' }),
    peaje: { reasignacionActiva: true },
  });
}

// Sanidad de día normal, solo con servicio base.
for (const control of ['operador', 'regla']) {
  casos.push({
    grupo: 'diaNormal',
    servicio: REGIMENES_SERVICIO.base,
    nombre: control,
    descripcion: 'viernes (C→P) y domingoPC (P→C) a la vez; días distintos',
    sentidos: escenarioDiaNormal({ control }),
    peaje: {},
  });
}

console.log(`Fase 3: ${casos.length} casos × ${semillas.length} réplicas (semillas ${semillas[0]}…${semillas.at(-1)})`);

const resultados = casos.map((caso) => {
  const resumen = correrYResumirPeaje(
    { sentidos: caso.sentidos, ...caso.peaje },
    semillas,
    simularPeaje,
  );
  console.log(`  ${caso.servicio.clave.padEnd(5)} ${caso.grupo.padEnd(13)} ${caso.nombre}`);
  return { caso, resumen };
});

const deGrupo = (grupo, claveServicio) =>
  resultados.filter(
    ({ caso }) => caso.grupo === grupo && caso.servicio.clave === claveServicio,
  );
const busca = (grupo, claveServicio, nombre) =>
  resultados.find(
    ({ caso }) =>
      caso.grupo === grupo && caso.servicio.clave === claveServicio && caso.nombre === nombre,
  );

// ------------------------------------------------------------------ formato ---

const coma = (texto) => texto.replace('.', ',');
const n = (x, dec = 2) => (x === null || x === undefined ? '—' : coma(x.toFixed(dec)));
const min = (segundos, dec = 2) =>
  segundos === null || segundos === undefined
    ? '—'
    : coma((segundos / SEGUNDOS_POR_MINUTO).toFixed(dec));
const pct = (fraccion, dec = 1) =>
  fraccion === null || fraccion === undefined ? '—' : `${coma((fraccion * 100).toFixed(dec))} %`;
const marca = (ok) => (ok ? 'sí' : '**no**');

/** ¿Cumple el criterio de desempeño (DEC-009) una serie de medidas? */
function cumple(escalares) {
  const wq = escalares.wqHoraSegundos.media;
  const fraccion = escalares.fraccionIntervalosSobreUmbral.media;
  return {
    cumpleMeta: wq <= META,
    cumpleTolerable: fraccion <= FRACCION_ACEPTADA,
    cumpleTodo: wq <= META && fraccion <= FRACCION_ACEPTADA,
  };
}

/** Minutos con el tope de casetas abiertas. */
const minutosEnCinco = (sentido) => {
  const nivel = sentido.tiempoPorCasetasAbiertas[p.casetas.maximoPorSentido];
  return nivel ? nivel.media / SEGUNDOS_POR_MINUTO : 0;
};

const lineas = [];
const w = (texto = '') => lineas.push(texto);

w('# Fase 3: el reparto de las casetas entre los dos sentidos');
w();
w('Generado por `npm run fase3` el ' + new Date().toISOString().slice(0, 10) + '.');
w('**No editar a mano:** este archivo se regenera.');
w();
w(`${casos.length} casos, **${semillas.length} réplicas** cada uno, semillas ${semillas[0]} a ${semillas.at(-1)},`);
w('**las mismas en todos los casos** (DEC-010).');
w();
w('> Se reporta lo que salga. **No se ajustó ningún umbral ni parámetro**');
w('> (DEC-021).');
w();
w('## Qué cambia respecto de la fase 2');
w();
w('En la fase 2 cada sentido tenía su propio tope de 5 casetas y no competía con');
w('nadie. Aquí los dos sentidos comparten el **pozo de 6 casetas** del peaje');
w('(DEC-002): cada uno abre entre 1 y 5 y la suma no puede pasar de 6. Eso es lo');
w('que el informe de la fase 2 decía que no podía responder.');
w();
w('- **operador**: P→C copia las casetas que el operador tuvo abiertas; C→P se');
w('  fija en 1 caseta toda la hora, que es lo único que se sabe del contraflujo.');
w('- **regla sin reasignación**: la regla por cola en los dos sentidos. Una');
w('  caseta liberada vuelve al pozo y se queda ahí hasta que alguien la pida.');
w('- **regla con reasignación**: igual, más el traspaso directo al otro sentido');
w('  si tiene ρ > 0,60 y le caben casetas (DEC-008).');
w();
w('La demanda de C→P en el festivo **no se midió** (contexto, sección 7): va el');
w(`conteo del domingo 1:00–2:00 p. m. (domingoPC, ${conteos[SUSTITUTO_FASE3].llegadas.reduce((a, b) => a + b, 0)} veh/h), que además se`);
w('tomó en el sentido contrario al que sustituye. **Todo el reparto cuelga de ese');
w('supuesto** (PEN-013), y por eso hay una sensibilidad que lo cambia.');
w();
w(`- **Criterio de desempeño** (DEC-009): meta \`Wq ≤ ${min(META, 0)} min\` **en cada sentido** y`);
w(`  a lo sumo ${pct(FRACCION_ACEPTADA, 0)} de los intervalos por encima de ${min(TOLERABLE, 1)} min.`);
w('- `Wq` del peaje está **ponderado por vehículos**: es la espera media de un');
w('  vehículo cualquiera (DEC-027, punto 12). Las colas máximas se **suman** por');
w('  sentido y son una cota superior, no una cola simultánea.');
w();

// --------------------------------------------------------------- tablas ---

function tablaSentidosEncabezado() {
  w('| Caso | Sentido | Wq (min) | % int. > 2,5 min | Cola máx. muestr. | Cola máx. cont. | Carriles-int. | Cambios de c | Min. c = 5 | Cumple |');
  w('|---|---|---|---|---|---|---|---|---|---|');
}

function tablaSentidosFilas(etiqueta, resumen) {
  resumen.sentidos.forEach((s, i) => {
    const e = s.escalares;
    w(
      `| ${i === 0 ? etiqueta : ''} | ${s.etiqueta} ` +
        `| ${min(e.wqHoraSegundos.media)} ± ${min(e.wqHoraSegundos.semiamplitudIc95)} ` +
        `| ${pct(e.fraccionIntervalosSobreUmbral.media)} ` +
        `| ${n(e.colaMaximaMuestreada.media, 1)} ± ${n(e.colaMaximaMuestreada.semiamplitudIc95, 1)} ` +
        `| ${n(e.colaMaximaContinua.media, 1)} ± ${n(e.colaMaximaContinua.semiamplitudIc95, 1)} ` +
        `| ${n(e.carrilesIntervalo.media, 1)} ± ${n(e.carrilesIntervalo.semiamplitudIc95, 1)} ` +
        `| ${n(e.cambiosDeC.media, 1)} | ${n(minutosEnCinco(s), 1)} ` +
        `| ${marca(cumple(e).cumpleTodo)} |`,
    );
  });
  const t = resumen.total;
  w(
    `| | **peaje** | **${min(t.wqHoraSegundos.media)}** ± ${min(t.wqHoraSegundos.semiamplitudIc95)} ` +
      `| ${pct(t.fraccionIntervalosSobreUmbral.media)} ` +
      `| ${n(t.sumaColaMaximaMuestreada.media, 1)} (suma) ` +
      `| ${n(t.sumaColaMaximaContinua.media, 1)} (suma) ` +
      `| ${n(t.carrilesIntervalo.media, 1)} | ${n(t.cambiosDeC.media, 1)} | — ` +
      `| ${marca(cumple(t).cumpleTodo)} |`,
  );
}

function tablaPozoEncabezado() {
  w('| Caso | Min. con el pozo agotado | Peticiones bloqueadas | Min. bloqueados | Reasignaciones | Entregas por bloqueo | Bloqueos descartados |');
  w('|---|---|---|---|---|---|---|');
}

function tablaPozoFila(etiqueta, resumen) {
  const z = resumen.pozo;
  w(
    `| ${etiqueta} | ${n(z.segundosAgotado.media / SEGUNDOS_POR_MINUTO, 1)} ± ${n(z.segundosAgotado.semiamplitudIc95 / SEGUNDOS_POR_MINUTO, 1)} ` +
      `| ${n(z.peticionesBloqueadas.media, 1)} ± ${n(z.peticionesBloqueadas.semiamplitudIc95, 1)} ` +
      `| ${n(z.segundosBloqueados.media / SEGUNDOS_POR_MINUTO, 1)} ± ${n(z.segundosBloqueados.semiamplitudIc95 / SEGUNDOS_POR_MINUTO, 1)} ` +
      `| ${n(z.reasignaciones.media, 1)} | ${n(z.entregasPorBloqueo.media, 1)} | ${n(z.bloqueosDescartados.media, 1)} |`,
  );
}

for (const claveServicio of ['base', 'lento']) {
  const servicio = REGIMENES_SERVICIO[claveServicio];
  w(`## Festivo con ${servicio.etiqueta}`);
  w();
  if (claveServicio === 'lento') {
    w('Recordatorio: los 15,5 s son una **hipótesis de sensibilidad** (DEC-025,');
    w('PEN-010), no una medición. Se aplica a los dos sentidos. La regla sigue');
    w('decidiendo con los valores nominales de 12,10 s y 24,8 veh por caseta,');
    w('porque el operador no conoce el servicio real (DEC-027, punto 7).');
    w();
  }
  w('### Operador contra regla');
  w();
  tablaSentidosEncabezado();
  for (const { caso, resumen } of deGrupo('comparacion', claveServicio)) {
    tablaSentidosFilas(`**${caso.nombre}**`, resumen);
  }
  w();
  w('Reparto del pozo:');
  w();
  tablaPozoEncabezado();
  for (const { caso, resumen } of deGrupo('comparacion', claveServicio)) {
    tablaPozoFila(caso.nombre, resumen);
  }
  w();

  w('### Sensibilidades sobre la regla con reasignación');
  w();
  tablaSentidosEncabezado();
  tablaSentidosFilas('**(c) de referencia**', busca('comparacion', claveServicio, 'regla con reasignación').resumen);
  for (const { caso, resumen } of deGrupo('sensibilidad', claveServicio)) {
    tablaSentidosFilas(`${caso.nombre}`, resumen);
  }
  w();
  tablaPozoEncabezado();
  tablaPozoFila('(c) de referencia', busca('comparacion', claveServicio, 'regla con reasignación').resumen);
  for (const { caso, resumen } of deGrupo('sensibilidad', claveServicio)) {
    tablaPozoFila(caso.nombre, resumen);
  }
  w();
}

// --------------------------------------------------------------- día normal ---

w('## Sanidad: día normal');
w();
w('`viernes` (C→P, 02/10/2026) y `domingoPC` (P→C, 13/09/2026) a la vez.');
w('**Son de días distintos:** no es una medición simultánea del peaje, es un');
w('escenario construido para ver qué hace el pozo cuando sobran casetas.');
w();
tablaSentidosEncabezado();
for (const { caso, resumen } of resultados.filter(({ caso }) => caso.grupo === 'diaNormal')) {
  tablaSentidosFilas(`**${caso.nombre}**`, resumen);
}
w();
tablaPozoEncabezado();
for (const { caso, resumen } of resultados.filter(({ caso }) => caso.grupo === 'diaNormal')) {
  tablaPozoFila(caso.nombre, resumen);
}
w();

const diaNormal = resultados.filter(({ caso }) => caso.grupo === 'diaNormal');
const sinDisputa = diaNormal.every(
  ({ resumen }) => resumen.pozo.segundosAgotado.maximo === 0 && resumen.pozo.peticionesBloqueadas.maximo === 0,
);
if (sinDisputa) {
  w('**Comprobado: en día normal no hay disputa de casetas.** El pozo no se agota');
  w(`en ninguna de las ${semillas.length} réplicas de ninguno de los dos controles, y ningún`);
  w('sentido llega a pedir una caseta sin encontrarla. La competencia del festivo');
  w('no es un artefacto del modelo de pozo: aparece solo cuando la demanda la');
  w('provoca.');
} else {
  w('**Ojo:** incluso en día normal hay momentos con el pozo agotado o peticiones');
  w('bloqueadas, lo que no se esperaba con esta holgura de demanda.');
}
w();

// ---------------------------------------------------------------- lectura ---

w('## Lectura');
w();
w('Todo lo que sigue sale de las tablas de arriba.');
w();

const wq = (resumen, i) => resumen.sentidos[i].escalares.wqHoraSegundos.media;
const carriles = (resumen, i) => resumen.sentidos[i].escalares.carrilesIntervalo.media;
const fracc = (resumen, i) => resumen.sentidos[i].escalares.fraccionIntervalosSobreUmbral.media;
const PC = 0;
const CP = 1;

for (const claveServicio of ['base', 'lento']) {
  const servicio = REGIMENES_SERVICIO[claveServicio];
  const operador = busca('comparacion', claveServicio, 'operador').resumen;
  const sinReasignar = busca('comparacion', claveServicio, 'regla sin reasignación').resumen;
  const conReasignar = busca('comparacion', claveServicio, 'regla con reasignación').resumen;

  w(`### Con ${servicio.etiqueta}`);
  w();

  // 1. ¿Se cumple la meta en cada sentido?
  w('**¿Se cumple la meta en cada sentido?**');
  w();
  w('| Caso | P→C | C→P | Peaje |');
  w('|---|---|---|---|');
  for (const [nombre, resumen] of [
    ['operador', operador],
    ['regla sin reasignación', sinReasignar],
    ['regla con reasignación', conReasignar],
  ]) {
    w(
      `| ${nombre} | ${marca(cumple(resumen.sentidos[PC].escalares).cumpleTodo)} ` +
        `| ${marca(cumple(resumen.sentidos[CP].escalares).cumpleTodo)} ` +
        `| ${marca(cumple(resumen.total).cumpleTodo)} |`,
    );
  }
  w();

  const todosCumplen = [operador, sinReasignar, conReasignar].every(
    (r) => cumple(r.sentidos[PC].escalares).cumpleTodo && cumple(r.sentidos[CP].escalares).cumpleTodo,
  );
  if (todosCumplen) {
    w('Los tres controles cumplen la meta **en los dos sentidos**. Con el pozo');
    w('compartido sigue habiendo margen: la competencia por casetas encarece la');
    w('espera pero no llega a romper el criterio.');
  } else {
    w('Hay casos que **no** cumplen la meta en algún sentido, así que con el pozo');
    w('compartido la competencia por casetas sí llega a romper el criterio.');
  }
  w();

  // 2. ¿Cuánto le cuesta a C→P que P→C gane casetas?
  w('**¿Cuánto le cuesta a C→P que P→C gane casetas?**');
  w();
  w('| | P→C: Wq / carriles | C→P: Wq / carriles |');
  w('|---|---|---|');
  for (const [nombre, resumen] of [
    ['operador (C→P fijo en 1 caseta)', operador],
    ['regla sin reasignación', sinReasignar],
    ['regla con reasignación', conReasignar],
  ]) {
    w(
      `| ${nombre} | ${min(wq(resumen, PC))} min / ${n(carriles(resumen, PC), 1)} ` +
        `| ${min(wq(resumen, CP))} min / ${n(carriles(resumen, CP), 1)} |`,
    );
  }
  w();
  const deltaCarrilesCP = carriles(conReasignar, CP) - carriles(operador, CP);
  const deltaCarrilesPC = carriles(conReasignar, PC) - carriles(operador, PC);
  /** "gana 2,8" o "pierde 0,9", según el signo. */
  const movimiento = (delta) => `${delta >= 0 ? 'gana' : 'pierde'} **${n(Math.abs(delta), 1)}**`;
  const direccion = (antes, despues) => (despues < antes ? 'baja' : 'sube');
  w(
    `Pasando del operador a la regla con reasignación, C→P ${movimiento(deltaCarrilesCP)}` +
      ` carriles-intervalo y P→C ${movimiento(deltaCarrilesPC)}.` +
      ` Con eso la espera de C→P ${direccion(wq(operador, CP), wq(conReasignar, CP))} de` +
      ` ${min(wq(operador, CP))} a ${min(wq(conReasignar, CP))} min y la de P→C` +
      ` ${direccion(wq(operador, PC), wq(conReasignar, PC))} de ${min(wq(operador, PC))} a` +
      ` ${min(wq(conReasignar, PC))} min.`,
  );
  w();
  w(
    `El pozo está agotado **${n(conReasignar.pozo.segundosAgotado.media / SEGUNDOS_POR_MINUTO, 1)} de los` +
      ` ${n(p.tiempo.horizonteSegundos / SEGUNDOS_POR_MINUTO, 0)} minutos** de la hora, y hay` +
      ` ${n(conReasignar.pozo.peticionesBloqueadas.media, 1)} peticiones bloqueadas por réplica que suman` +
      ` ${n(conReasignar.pozo.segundosBloqueados.media / SEGUNDOS_POR_MINUTO, 1)} minutos de espera por carril.` +
      ' Esa es la competencia que las fases 1 y 2 no podían ver.',
  );
  w();

  // 3. ¿La reasignación por ρ reduce la brecha reactiva de PEN-011?
  w('**¿La reasignación por ρ reduce la brecha reactiva de PEN-011?**');
  w();
  w('PEN-011 dice que la regla es reactiva y el operador fue anticipativo, y que');
  w('por eso la regla queda peor en el festivo. La pregunta es si repartir mejor');
  w('las casetas lo compensa.');
  w();
  const brechaSin = wq(sinReasignar, PC) - wq(operador, PC);
  const brechaCon = wq(conReasignar, PC) - wq(operador, PC);
  w('| | Wq de P→C (min) | Brecha contra el operador |');
  w('|---|---|---|');
  w(`| operador | ${min(wq(operador, PC))} | — |`);
  w(`| regla sin reasignación | ${min(wq(sinReasignar, PC))} | ${min(brechaSin)} |`);
  w(`| regla con reasignación | ${min(wq(conReasignar, PC))} | ${min(brechaCon)} |`);
  w();
  const reasignaciones = conReasignar.pozo.reasignaciones.media;
  if (reasignaciones < 0.05) {
    w(
      `**No, porque la reasignación casi no se activa:** ${n(reasignaciones, 2)} reasignaciones por` +
        ' réplica. Con los dos sentidos saturados nadie libera una caseta, así que la',
    );
    w('regla de la DEC-008 no tiene ocasión de aplicarse. Los resultados con y sin');
    w('reasignación son los mismos.');
  } else if (Math.abs(brechaCon) < Math.abs(brechaSin)) {
    w(
      `**Sí, en parte:** la brecha baja de ${min(brechaSin)} a ${min(brechaCon)} min con` +
        ` ${n(reasignaciones, 1)} reasignaciones por réplica.`,
    );
  } else {
    w(
      `**No: la empeora.** La brecha pasa de ${min(brechaSin)} a ${min(brechaCon)} min con` +
        ` ${n(reasignaciones, 1)} reasignaciones por réplica, porque las casetas se mueven` +
        ' **hacia C→P**, no hacia P→C.',
    );
    w();
    w('La razón está en la definición de ρ, que divide por `c`: con **1 caseta**,');
    w(
      `C→P tiene ρ = ${n(conteos[SUSTITUTO_FASE3].llegadas.reduce((a, b) => a + b, 0) / p.tiempo.intervalos / capacidadPorCaseta, 2)}, por encima del 0,60, aunque su demanda sea una fracción`,
    );
    w('de la de P→C. Así que cada vez que P→C libera una caseta, C→P cumple la');
    w('condición y se la lleva; y como C→P casi nunca libera (tiene 1 o 2), el');
    w('traspaso va casi siempre en el mismo sentido. **La regla de ρ favorece');
    w('sistemáticamente al sentido con menos casetas**, que no es necesariamente el');
    w('que más lo necesita. Queda anotado en PEN-014.');
  }
  w();

  // 4. Sensibilidades.
  const sensibilidades = deGrupo('sensibilidad', claveServicio);
  w('**Sensibilidades:**');
  w();
  for (const { caso, resumen } of sensibilidades) {
    const dPC = wq(resumen, PC) - wq(conReasignar, PC);
    const dCP = wq(resumen, CP) - wq(conReasignar, CP);
    w(
      `- **${caso.nombre}:** P→C ${min(wq(resumen, PC))} min (${dPC >= 0 ? '+' : ''}${min(dPC)}),` +
        ` C→P ${min(wq(resumen, CP))} min (${dCP >= 0 ? '+' : ''}${min(dCP)}),` +
        ` peaje ${min(resumen.total.wqHoraSegundos.media)} min.` +
        ` ${cumple(resumen.sentidos[CP].escalares).cumpleTodo ? '' : '**C→P deja de cumplir.** '}` +
        `Pozo agotado ${n(resumen.pozo.segundosAgotado.media / SEGUNDOS_POR_MINUTO, 1)} min.`,
    );
  }
  w();
}

// El sustituto, que es la incertidumbre dominante.
w('### El disparador anticipativo por tasa, con el pozo compartido (DEC-046)');
w();
w('En la fase 2, con un solo sentido, el disparador por tasa mejoraba la regla.');
w('Con el pozo compartido la pregunta es otra: **anticipar significa pedir');
w('casetas antes, y las casetas son un recurso disputado.** Lo que en un sentido');
w('solo era ganancia aquí puede ser que un sentido se adelante al otro.');
w();

for (const claveServicio of ['base', 'lento']) {
  const sinReasig = busca('comparacion', claveServicio, 'regla sin reasignación');
  const conTasa = busca('comparacion', claveServicio, 'regla + tasa, sin reasignación');
  if (!sinReasig || !conTasa) continue;

  w(`**${REGIMENES_SERVICIO[claveServicio].etiqueta}.** Las dos sin reasignación, que es la comparación limpia:`);
  w();
  w('| | P→C: Wq | C→P: Wq | Peaje: Wq | P→C: carriles | C→P: carriles | Anticipadas P→C | Pozo agotado |');
  w('|---|---|---|---|---|---|---|---|');
  for (const [etq, caso] of [['regla por cola', sinReasig], ['regla + tasa', conTasa]]) {
    const s0 = caso.resumen.sentidos[0].escalares;
    const s1 = caso.resumen.sentidos[1].escalares;
    w(
      `| ${etq} | ${min(s0.wqHoraSegundos.media)} | ${min(s1.wqHoraSegundos.media)} ` +
        `| ${min(caso.resumen.total.wqHoraSegundos.media)} ` +
        `| ${n(s0.carrilesIntervalo.media, 1)} | ${n(s1.carrilesIntervalo.media, 1)} ` +
        `| ${n(s0.aperturasAnticipadas.media, 2)} ` +
        `| ${n(caso.resumen.pozo.segundosAgotado.media / SEGUNDOS_POR_MINUTO, 1)} min |`,
    );
  }
  w();

  const s0sin = sinReasig.resumen.sentidos[0].escalares;
  const s0con = conTasa.resumen.sentidos[0].escalares;
  const s1sin = sinReasig.resumen.sentidos[1].escalares;
  const s1con = conTasa.resumen.sentidos[1].escalares;
  const deltaCarrilesCP = s1con.carrilesIntervalo.media - s1sin.carrilesIntervalo.media;
  const deltaAgotado =
    (conTasa.resumen.pozo.segundosAgotado.media - sinReasig.resumen.pozo.segundosAgotado.media) /
    SEGUNDOS_POR_MINUTO;

  w(
    `P→C baja su \`Wq\` de ${min(s0sin.wqHoraSegundos.media)} a ${min(s0con.wqHoraSegundos.media)} min y ` +
      `C→P pasa de ${min(s1sin.wqHoraSegundos.media)} a ${min(s1con.wqHoraSegundos.media)} min. ` +
      // El reproche solo vale si el contraflujo pierde algo apreciable: en el
      // régimen lento el disparador apenas actúa y no quita nada.
      (deltaCarrilesCP < -0.05
        ? `Pero el contraflujo pierde ${n(Math.abs(deltaCarrilesCP), 1)} carriles-intervalo ` +
          `y el pozo queda agotado ${n(Math.abs(deltaAgotado), 1)} min ${deltaAgotado >= 0 ? 'más' : 'menos'}: ` +
          `**parte de la mejora de P→C sale de pedir antes las casetas que el otro sentido podría usar.**`
        : `El contraflujo no pierde carriles-intervalo (${n(deltaCarrilesCP, 1)}), así que aquí ` +
          `la mejora **no sale del otro sentido**. El disparador apenas actúa en este régimen ` +
          `(${n(s0con.aperturasAnticipadas.media, 2)} aperturas anticipadas): con la cola ya ` +
          `desbordada, el umbral de cola se cruza solo y no queda nada que anticipar.`),
  );
  w();
}

w('### El sustituto de C→P decide el resultado');
w();
{
  const refBase = busca('comparacion', 'base', 'regla con reasignación').resumen;
  const altBase = busca('sensibilidad', 'base', 'sustituto domingoCP').resumen;
  const totalDomingoPC = conteos[SUSTITUTO_FASE3].llegadas.reduce((a, b) => a + b, 0);
  const totalDomingoCP = conteos.domingoCP.llegadas.reduce((a, b) => a + b, 0);

  w('La demanda de C→P en el festivo no se midió (PEN-013). Cambiar el conteo');
  w(`sustituto de domingoPC (${totalDomingoPC} veh/h) a domingoCP (${totalDomingoCP} veh/h) da esto, con`);
  w('servicio base y todo lo demás igual:');
  w();
  w('| Sustituto de C→P | P→C: Wq | C→P: Wq | C→P: % int. > 2,5 min | C→P cumple | Pozo agotado |');
  w('|---|---|---|---|---|---|');
  for (const [nombre, resumen] of [
    [`domingoPC (${totalDomingoPC} veh/h, el del contexto)`, refBase],
    [`domingoCP (${totalDomingoCP} veh/h, sensibilidad)`, altBase],
  ]) {
    w(
      `| ${nombre} | ${min(wq(resumen, PC))} min | ${min(wq(resumen, CP))} min ` +
        `| ${pct(fracc(resumen, CP))} | ${marca(cumple(resumen.sentidos[CP].escalares).cumpleTodo)} ` +
        `| ${n(resumen.pozo.segundosAgotado.media / SEGUNDOS_POR_MINUTO, 1)} min |`,
    );
  }
  w();
  w(
    `Con domingoCP, C→P pasa de ${min(wq(refBase, CP))} a **${min(wq(altBase, CP))} min** de espera y de` +
      ` ${pct(fracc(refBase, CP))} a **${pct(fracc(altBase, CP))}** de intervalos por encima del máximo` +
      ' tolerable: deja de cumplir por mucho. Y P→C también se resiente, de',
  );
  w(`${min(wq(refBase, PC))} a ${min(wq(altBase, PC))} min, porque pierde casetas.`);
  w();
  w('**Ese es el resultado más importante de la fase 3:** la conclusión del');
  w('reparto depende más de un dato que **no se midió** que de la regla que se');
  w('elija. Con el sustituto del contexto todo cumple; con un contraflujo de');
  w('domingo en el sentido correcto, el peaje no da. Antes de recomendar una');
  w('política hay que contar C→P en un festivo (PEN-013).');
  w();
}

w('### Lo que esta comparación no puede responder');
w();
w('- El modelo de cola única **subestima** la congestión del pico (PEN-008,');
w('  `diagnostico-festivo.md`). Todas las casetas que salgan de aquí son **cota');
w('  inferior**, y eso ahora pesa más: con el pozo agotado casi toda la hora, lo');
w('  que falte de congestión es capacidad que el modelo no está pidiendo.');
w('- El **servicio lento de 15,5 s es una hipótesis**, no una medición (DEC-025,');
w('  PEN-010).');
w('- La **demanda de C→P no se midió** y el sustituto decide el resultado');
w('  (PEN-013). Es la incertidumbre dominante de la fase.');
w('- El modo **operador** de C→P es una reconstrucción: solo se sabe que arrancó');
w('  con 1 caseta, así que se mantiene en 1 toda la hora. Si el operador real');
w('  hubiera abierto una segunda, la comparación cambiaría a su favor.');
w();

mkdirSync(dirname(SALIDA), { recursive: true });
writeFileSync(SALIDA, lineas.join('\n') + '\n', 'utf8');
console.log(`\nEscrito ${SALIDA} (${lineas.length} líneas)`);
