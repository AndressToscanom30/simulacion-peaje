#!/usr/bin/env node
/**
 * Fase 4: la matriz de escenarios.
 *
 * Corre el catálogo completo (`catalogoFase4`) y genera
 * `docs/resultados/fase4-escenarios.md`.
 *
 * 30 réplicas por escenario, semillas 1…30, **las mismas en todos** (DEC-010),
 * así que las comparaciones usan números aleatorios comunes.
 *
 * Se reporta lo que salga, sin ajustar umbrales ni parámetros (DEC-021).
 *
 * Uso: npm run fase4
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { correrEscenarios, puntosDeQuiebre } from '../src/corridas.js';
import {
  catalogoFase4,
  etiquetaRegimen,
  BARRIDO_ESTRES,
  factoresDelBarrido,
} from '../src/config/escenarios.js';
import {
  ESCENARIO_BASE,
  construirEscenario,
  mediaGeneradaSegundos,
  semillasDe,
} from '../src/config/escenario.js';
import { conteos } from '../src/config/datos.js';
import { SEGUNDOS_POR_MINUTO } from '../src/config/parametros.js';

const AQUI = dirname(fileURLToPath(import.meta.url));
const SALIDA = resolve(AQUI, '..', 'docs', 'resultados', 'fase4-escenarios.md');

const base = construirEscenario();
const semillas = semillasDe(base);
const PC = 0;
const CP = 1;

// ------------------------------------------------------------------ corrida ---

const casos = catalogoFase4();
console.log(`Fase 4: ${casos.length} escenarios × ${semillas.length} réplicas`);

let ultimoGrupo = null;
const resultados = correrEscenarios(casos, {
  alProgresar(caso, hechos, total) {
    if (caso.grupo !== ultimoGrupo) {
      ultimoGrupo = caso.grupo;
      console.log(`  ${caso.grupo}…`);
    }
    if (hechos === total) console.log(`  ${total} escenarios corridos`);
  },
});

const delGrupo = (grupo, regimen) =>
  resultados.filter((r) => r.caso.grupo === grupo && (regimen === undefined || r.caso.regimen === regimen));
const busca = (codigo, regimen) =>
  resultados.find((r) => r.caso.codigo === codigo && r.caso.regimen === regimen);

// ------------------------------------------------------------------ formato ---

const coma = (texto) => String(texto).replace('.', ',');
const n = (x, dec = 2) => (x === null || x === undefined ? '—' : coma(x.toFixed(dec)));
const min = (segundos, dec = 2) =>
  segundos === null || segundos === undefined ? '—' : coma((segundos / SEGUNDOS_POR_MINUTO).toFixed(dec));
const pct = (fraccion, dec = 1) =>
  fraccion === null || fraccion === undefined ? '—' : `${coma((fraccion * 100).toFixed(dec))} %`;
const marca = (ok) => (ok ? 'sí' : '**no**');

const lineas = [];
const w = (texto = '') => lineas.push(texto);

w('# Fase 4: la matriz de escenarios');
w();
w('Generado por `npm run fase4` el ' + new Date().toISOString().slice(0, 10) + '.');
w('**No editar a mano:** este archivo se regenera.');
w();
w(`${casos.length} escenarios (${casos.length / 2} casos × 2 regímenes de servicio),`);
w(`**${semillas.length} réplicas** cada uno, semillas ${semillas[0]} a ${semillas.at(-1)}, **las mismas en`);
w('todos** (DEC-010).');
w();
w('> Se reporta lo que salga. **No se ajustó ningún umbral ni parámetro**');
w('> (DEC-021).');
w();

// ------------------------------------------------------- los tres supuestos ---

w('## Todo lo que sigue es condicional a tres supuestos no medidos');
w();
w('Antes de leer cualquier número conviene tener esto presente, porque los tres');
w('empujan en la misma dirección: **el modelo es optimista**.');
w();
w('1. **El servicio del pico no se midió en el pico** (PEN-010). Los 50 tiempos');
w('   de atención son de otro sentido y otro día. Por eso cada caso se corre dos');
w('   veces: con el servicio medido y con una hipótesis de servicio más lento de');
w('   15,5 s, que **no es una medición** (DEC-025).');
w('2. **La demanda de C→P en el festivo no se midió** (PEN-013). Por defecto se');
w(`   usa el conteo del viernes (${conteos.viernes.llegadas.reduce((a, b) => a + b, 0)} veh/h), que sí se tomó en ese sentido`);
w('   (DEC-029), por un factor configurable. El escenario E4 prueba otros tres');
w('   factores y dos conteos alternativos, y la respuesta cambia mucho.');
w('3. **El modelo subestima la congestión del pico** (PEN-008). La cola de campo');
w('   es el total de vehículos esperando por sentido (DEC-042), la misma variable');
w('   que simula el modelo, y la simulada queda por debajo en los 12 intervalos');
w('   del festivo. Así que las casetas que salgan de aquí son una **cota');
w('   inferior**.');
w();

// ------------------------------------------------------------ configuración ---

w('## El escenario base');
w();
w('Todos los escenarios se describen como **cambios respecto de este**');
w('(DEC-030). El catálogo completo de parámetros está en `docs/parametros.md`.');
w();
w('| | Valor |');
w('|---|---|');
w(`| P→C | conteo \`${base.sentidos[PC].conteo}\`, factor ${n(base.sentidos[PC].factorDemanda, 2)}, cola inicial ${base.sentidos[PC].colaInicial}, ${base.sentidos[PC].casetasIniciales} casetas iniciales |`);
w(`| C→P | conteo \`${base.sentidos[CP].conteo}\`, factor ${n(base.sentidos[CP].factorDemanda, 2)}, cola inicial ${base.sentidos[CP].colaInicial}, ${base.sentidos[CP].casetasIniciales} caseta inicial |`);
w(`| Pozo | ${base.pozo.total} casetas, entre ${base.pozo.minimoPorSentido} y ${base.pozo.maximoPorSentido} por sentido |`);
w(`| Control | regla por cola en los dos sentidos, sin reasignación |`);
w(`| Umbrales | abrir ${Object.values(base.regla.abrirSiColaMayorQue).filter((x) => x !== null).join(' / ')}; cerrar ${Object.values(base.regla.cerrarSiColaMenorQue).filter((x) => x !== null).join(' / ')} |`);
w(`| Demora de apertura | ${min(base.regla.demoraAperturaSegundos, 0)} min |`);
w(`| Ventana de cierre | ${min(base.regla.ventanaCierreSegundos, 0)} min |`);
w(`| Criterio | meta ${min(base.desempeno.metaWqSegundos, 0)} min en cada sentido, y a lo sumo ${pct(base.desempeno.fraccionIntervalosSobreMaximoAceptada, 0)} de intervalos sobre ${min(base.desempeno.maximoTolerableWqSegundos, 1)} min |`);
w(`| Servicio base | gamma k = ${coma(base.servicio.gammaForma)}, θ = ${coma(base.servicio.gammaEscalaSegundos)} s → genera ${n(mediaGeneradaSegundos(base.servicio), 4)} s (los 50 tiempos medidos dan ${coma(base.servicio.mediaNominalSegundos)} s) |`);
w(`| Servicio lento | media ${n(mediaGeneradaSegundos(busca('E2a', 'lento').escenario.servicio), 1)} s, mismo CV, **hipótesis** |`);
w();
w('**El criterio se evalúa en cada sentido**, no solo en el promedio del peaje:');
w('un peaje donde un sentido va bien y el otro colapsa no cumple, y el promedio');
w('ponderado lo taparía.');
w();

// ----------------------------------------------------------------- tablas ---

function tablaEncabezado() {
  w('| Escenario | Qué cambia | Sentido | Wq (min) | % int. > 2,5 min | Cola máx. muestr. | Cola máx. cont. | Carriles-int. | Cambios de c | Cumple |');
  w('|---|---|---|---|---|---|---|---|---|---|');
}

function tablaFilas(resultado, { conQueCambia = true } = {}) {
  const { caso, resumen, cumplimiento } = resultado;
  resumen.sentidos.forEach((s, i) => {
    const e = s.escalares;
    w(
      `| ${i === 0 ? `**${caso.nombre}**` : ''} | ${i === 0 && conQueCambia ? caso.cambia : ''} | ${s.etiqueta} ` +
        `| ${min(e.wqHoraSegundos.media)} ± ${min(e.wqHoraSegundos.semiamplitudIc95)} ` +
        `| ${pct(e.fraccionIntervalosSobreUmbral.media)} ` +
        `| ${n(e.colaMaximaMuestreada.media, 1)} ± ${n(e.colaMaximaMuestreada.semiamplitudIc95, 1)} ` +
        `| ${n(e.colaMaximaContinua.media, 1)} ± ${n(e.colaMaximaContinua.semiamplitudIc95, 1)} ` +
        `| ${n(e.carrilesIntervalo.media, 1)} | ${n(e.cambiosDeC.media, 1)} ` +
        `| ${marca(cumplimiento.porSentido[i].cumpleTodo)} |`,
    );
  });
  const t = resumen.total;
  w(
    `| | | **peaje** | **${min(t.wqHoraSegundos.media)}** ± ${min(t.wqHoraSegundos.semiamplitudIc95)} ` +
      `| ${pct(t.fraccionIntervalosSobreUmbral.media)} ` +
      `| ${n(t.sumaColaMaximaMuestreada.media, 1)} (suma) | ${n(t.sumaColaMaximaContinua.media, 1)} (suma) ` +
      `| ${n(t.carrilesIntervalo.media, 1)} | ${n(t.cambiosDeC.media, 1)} ` +
      `| ${marca(cumplimiento.mediaCumple)} |`,
  );
}

const TITULOS = {
  E1: 'E1 — Operador',
  E2: 'E2 — La regla por cola',
  E3: 'E3 — Demanda alta',
  E4: 'E4 — Sensibilidades',
};

for (const grupo of ['E1', 'E2', 'E3', 'E4']) {
  w(`## ${TITULOS[grupo]}`);
  w();
  if (grupo === 'E4') {
    w('Todas sobre E2a (regla sin reasignación, factor 1,0), cambiando una cosa');
    w('cada vez. Las cuatro variantes de **meta** comparten las mismas réplicas:');
    w('la meta no entra en el motor, solo en el veredicto, así que lo único que');
    w('cambia entre ellas es la columna "Cumple".');
    w();
  }
  for (const regimen of ['base', 'lento']) {
    w(`### ${etiquetaRegimen(regimen)}`);
    w();
    tablaEncabezado();
    for (const resultado of delGrupo(grupo, regimen)) tablaFilas(resultado);
    w();
  }
}

// ------------------------------------------------------------------ E5 ---

w('## E5 — Estrés y punto de quiebre');
w();
w(`Barrido del factor de demanda de ${n(BARRIDO_ESTRES.desde, 2)} a ${n(BARRIDO_ESTRES.hasta, 2)} en pasos de`);
w(`${n(BARRIDO_ESTRES.paso, 2)} (${factoresDelBarrido().length} factores), aplicado a los dos sentidos, con dos controles`);
w('(la regla, y casetas fijas en el tope para P→C y 1 para C→P), dos tamaños de');
w('pozo y los dos regímenes de servicio.');
w();
w(`Con **pozo de ${BARRIDO_ESTRES.pozos[1].total}** el tope por sentido sube a ${BARRIDO_ESTRES.pozos[1].maximoPorSentido}, así que los umbrales de`);
w('`c` = 5 y 6 son **extrapolados** por las fórmulas de DEC-031, no del contexto.');
w();

const quiebres = puntosDeQuiebre(delGrupo('E5'));

/** Etiqueta legible de cada control del barrido. */
const ETIQUETA_CONTROL = {
  regla: 'regla',
  'regla+tasa': 'regla + tasa',
  fijas: 'casetas fijas',
};
const etiquetaControl = (c) => ETIQUETA_CONTROL[c] ?? c;

w('### Punto de quiebre por configuración');
w();
w('El **factor de quiebre** es el primer factor de demanda en el que la media de');
w('las 30 réplicas deja de cumplir el criterio en los dos sentidos.');
w();
w('| Pozo | Control | Servicio | Último factor que cumple | Factor de quiebre | Réplicas que incumplen en ese factor |');
w('|---|---|---|---|---|---|');
for (const q of [...quiebres].sort(
  (a, b) =>
    a.pozoTotal - b.pozoTotal ||
    a.control.localeCompare(b.control) ||
    a.regimen.localeCompare(b.regimen),
)) {
  w(
    `| ${q.pozoTotal} | ${etiquetaControl(q.control)} | ${q.regimen} ` +
      `| ${q.ultimoFactorQueCumple === null ? '**ninguno**' : `×${n(q.ultimoFactorQueCumple, 2)}`} ` +
      `| ${q.factorDeQuiebre === null ? `cumple hasta ×${n(BARRIDO_ESTRES.hasta, 2)}` : `**×${n(q.factorDeQuiebre, 2)}**`} ` +
      `| ${q.fraccionReplicasQueIncumplen === null ? '—' : pct(q.fraccionReplicasQueIncumplen)} |`,
  );
}
w();

w('### El barrido completo');
w();
w('`Wq` del peaje en minutos; **negrita** cuando la media deja de cumplir.');
w();
for (const pozo of BARRIDO_ESTRES.pozos) {
  w(`#### ${pozo.etiqueta}`);
  w();
  w(`| Factor | ${quiebres
    .filter((q) => q.pozoTotal === pozo.total)
    .sort((a, b) => a.control.localeCompare(b.control) || a.regimen.localeCompare(b.regimen))
    .map((q) => `${q.control === 'regla' ? 'regla' : 'fijas'} · ${q.regimen}`)
    .join(' | ')} |`);
  w(`|---|${'---|'.repeat(quiebres.filter((q) => q.pozoTotal === pozo.total).length)}`);

  const columnas = quiebres
    .filter((q) => q.pozoTotal === pozo.total)
    .sort((a, b) => a.control.localeCompare(b.control) || a.regimen.localeCompare(b.regimen));

  for (const f of factoresDelBarrido()) {
    const celdas = columnas.map((q) => {
      const punto = q.puntos.find((x) => x.factorDemanda === f);
      if (!punto) return '—';
      const valor = min(punto.wqPeajeSegundos);
      return punto.mediaCumple ? valor : `**${valor}**`;
    });
    w(`| ×${n(f, 2)} | ${celdas.join(' | ')} |`);
  }
  w();
}

// -------------------------------------------------------------- lectura ---

w('## Lectura');
w();
w('Todo lo que sigue sale de las tablas de arriba.');
w();

/** Reúne el cumplimiento de un grupo, por régimen. */
function resumenCumplimiento(grupo, regimen) {
  const filas = delGrupo(grupo, regimen);
  return {
    total: filas.length,
    cumplen: filas.filter((r) => r.cumplimiento.mediaCumple).length,
    filas,
  };
}

w('### Dónde se cumple y dónde no');
w();
w('| Grupo | Con servicio base | Con servicio lento |');
w('|---|---|---|');
for (const grupo of ['E1', 'E2', 'E3', 'E4', 'E5']) {
  const b = resumenCumplimiento(grupo, 'base');
  const l = resumenCumplimiento(grupo, 'lento');
  w(
    `| ${grupo} | ${b.cumplen} de ${b.total} escenarios cumplen | ${l.cumplen} de ${l.total} cumplen |`,
  );
}
w();

{
  const baseTodos = resultados.filter((r) => r.caso.regimen === 'base');
  const lentoTodos = resultados.filter((r) => r.caso.regimen === 'lento');
  const cumpleBase = baseTodos.filter((r) => r.cumplimiento.mediaCumple).length;
  const cumpleLento = lentoTodos.filter((r) => r.cumplimiento.mediaCumple).length;
  w(
    `En total, con el servicio medido cumplen **${cumpleBase} de ${baseTodos.length}** escenarios` +
      ` (${pct(cumpleBase / baseTodos.length)}); con el servicio lento, **${cumpleLento} de ${lentoTodos.length}**` +
      ` (${pct(cumpleLento / lentoTodos.length)}).`,
  );
  w();
  const e1b = busca('E1', 'base');
  const e2ab = busca('E2a', 'base');
  const e1l = busca('E1', 'lento');
  const e2al = busca('E2a', 'lento');
  w(
    `El operador y la regla, al factor 1,0: con servicio base el operador` +
      ` ${marca(e1b.cumplimiento.mediaCumple)} cumple y la regla ${marca(e2ab.cumplimiento.mediaCumple)},` +
      ` con \`Wq\` del peaje de ${min(e1b.resumen.total.wqHoraSegundos.media)} contra` +
      ` ${min(e2ab.resumen.total.wqHoraSegundos.media)} min. Con servicio lento el operador` +
      ` ${marca(e1l.cumplimiento.mediaCumple)} y la regla ${marca(e2al.cumplimiento.mediaCumple)},` +
      ` con ${min(e1l.resumen.total.wqHoraSegundos.media)} contra ${min(e2al.resumen.total.wqHoraSegundos.media)} min.`,
  );
  w();
}

// Cuánto desplaza el quiebre un pozo de 8.
w('### Cuánto desplaza el quiebre un pozo de 8 casetas');
w();
w('| Control | Servicio | Quiebre con pozo 6 | Quiebre con pozo 8 | Desplazamiento |');
w('|---|---|---|---|---|');
{
  const desplazamientos = [];
  for (const control of ['regla', 'regla+tasa', 'fijas']) {
    for (const regimen of ['base', 'lento']) {
      const seis = quiebres.find((q) => q.pozoTotal === 6 && q.control === control && q.regimen === regimen);
      const ocho = quiebres.find((q) => q.pozoTotal === 8 && q.control === control && q.regimen === regimen);
      const texto = (q) =>
        q.factorDeQuiebre === null ? `cumple hasta ×${n(BARRIDO_ESTRES.hasta, 2)}` : `×${n(q.factorDeQuiebre, 2)}`;
      let delta = '—';
      if (seis.factorDeQuiebre !== null && ocho.factorDeQuiebre !== null) {
        const d = ocho.factorDeQuiebre - seis.factorDeQuiebre;
        delta = `${d > 0 ? '+' : ''}${n(d, 2)}`;
        desplazamientos.push(d);
      } else if (seis.factorDeQuiebre !== null && ocho.factorDeQuiebre === null) {
        delta = `más de +${n(BARRIDO_ESTRES.hasta - seis.factorDeQuiebre, 2)}`;
      } else if (seis.factorDeQuiebre === null && ocho.factorDeQuiebre === null) {
        delta = 'ninguno de los dos quiebra';
      }
      w(
        `| ${etiquetaControl(control)} | ${regimen} | ${texto(seis)} | ${texto(ocho)} | ${delta} |`,
      );
    }
  }
  w();
  if (desplazamientos.length > 0) {
    const medio = desplazamientos.reduce((a, b) => a + b, 0) / desplazamientos.length;
    w(
      `Donde las dos configuraciones quiebran dentro del barrido, las dos casetas` +
        ` extra desplazan el quiebre **${medio >= 0 ? '+' : ''}${n(medio, 2)}** de factor de demanda de media` +
        ` (${desplazamientos.map((d) => `${d >= 0 ? '+' : ''}${n(d, 2)}`).join(', ')}).`,
    );
  } else {
    w('No hay ninguna pareja en la que las dos configuraciones quiebren dentro del');
    w('barrido, así que el desplazamiento no se puede medir con estos factores.');
  }
  w();
  w('**Ojo:** con pozo de 8 los umbrales de `c` = 5 y 6 son extrapolados');
  w('(DEC-031). El resultado del pozo ampliado depende de esa extrapolación, no');
  w('solo de las casetas de más.');
  w();
}

// Qué sensibilidades mueven más el resultado.
w('### Qué sensibilidades mueven más el resultado');
w();
w('### El disparador anticipativo por tasa (DEC-046)');
w();
{
  const filas = [];
  for (const regimen of ['base', 'lento']) {
    const sin = busca('E2a', regimen);
    const con = busca('E2c', regimen);
    if (sin && con) filas.push({ regimen, sin, con });
  }
  w('| Servicio | Wq peaje, regla | Wq peaje, regla + tasa | Δ | Cumple sin | Cumple con | Anticipadas |');
  w('|---|---|---|---|---|---|---|');
  for (const { regimen, sin, con } of filas) {
    const wqSin = sin.resumen.total.wqHoraSegundos.media;
    const wqCon = con.resumen.total.wqHoraSegundos.media;
    w(
      `| ${regimen} | ${min(wqSin)} | **${min(wqCon)}** | ${min(wqCon - wqSin)} ` +
        `| ${marca(sin.cumplimiento.mediaCumple)} | ${marca(con.cumplimiento.mediaCumple)} ` +
        `| ${n(con.resumen.total.aperturasAnticipadas.media, 2)} |`,
    );
  }
  w();

  const q = (control, regimen) =>
    quiebres.find((x) => x.pozoTotal === 6 && x.control === control && x.regimen === regimen);
  w('Y lo que de verdad importa, el **punto de quiebre con el pozo real de 6**:');
  w();
  w('| Servicio | Quiebre, regla por cola | Quiebre, regla + tasa | Desplazamiento |');
  w('|---|---|---|---|');
  for (const regimen of ['base', 'lento']) {
    const sinQ = q('regla', regimen);
    const conQ = q('regla+tasa', regimen);
    if (!sinQ || !conQ) continue;
    const texto = (x) =>
      x.factorDeQuiebre === null ? `cumple hasta ×${n(BARRIDO_ESTRES.hasta, 2)}` : `×${n(x.factorDeQuiebre, 2)}`;
    const delta =
      sinQ.factorDeQuiebre !== null && conQ.factorDeQuiebre !== null
        ? `${conQ.factorDeQuiebre - sinQ.factorDeQuiebre >= 0 ? '+' : ''}${n(conQ.factorDeQuiebre - sinQ.factorDeQuiebre, 2)}`
        : '—';
    w(`| ${regimen} | ${texto(sinQ)} | ${texto(conQ)} | ${delta} |`);
  }
  w();
  w('**Ojo con lo que esta tabla puede y no puede decir.** El disparador por tasa');
  w('no añade ni una caseta: reparte en el tiempo las seis que ya hay. Así que');
  w('mueve el quiebre solo en la medida en que llegar antes al tope sirva de algo;');
  w('cuando el pozo ya está agotado toda la hora, no hay nada que adelantar.');
  w();
}

w('Para cada sensibilidad de E4, cuánto mueve el `Wq` del peaje respecto de E2a');
w('en el mismo régimen. Ordenadas por el mayor efecto de los dos regímenes.');
w();
w('| Sensibilidad | Qué cambia | Δ Wq base | Δ Wq lento | Mayor efecto |');
w('|---|---|---|---|---|');
{
  const referencias = {
    base: busca('E2a', 'base').resumen.total.wqHoraSegundos.media,
    lento: busca('E2a', 'lento').resumen.total.wqHoraSegundos.media,
  };
  const codigos = [...new Set(delGrupo('E4').map((r) => r.caso.codigo))];
  const filas = codigos.map((codigo) => {
    const porRegimen = {};
    for (const regimen of ['base', 'lento']) {
      const r = busca(codigo, regimen);
      porRegimen[regimen] = r.resumen.total.wqHoraSegundos.media - referencias[regimen];
    }
    return {
      codigo,
      nombre: busca(codigo, 'base').caso.nombre,
      cambia: busca(codigo, 'base').caso.cambia,
      ...porRegimen,
      mayor: Math.max(Math.abs(porRegimen.base), Math.abs(porRegimen.lento)),
    };
  });
  filas.sort((a, b) => b.mayor - a.mayor);
  for (const fila of filas) {
    const signo = (x) => `${x >= 0 ? '+' : ''}${min(x)}`;
    w(
      `| ${fila.nombre} | ${fila.cambia} | ${signo(fila.base)} | ${signo(fila.lento)} | ${min(fila.mayor)} min |`,
    );
  }
  w();
  const tres = filas.slice(0, 3);
  w(
    `Las tres que más mueven el resultado son **${tres.map((f) => f.nombre).join('**, **')}**,` +
      ` con hasta ${min(tres[0].mayor)} min de diferencia en el \`Wq\` del peaje.`,
  );
  w();
  // La cola inicial sale con signo positivo, que es contraintuitivo: conviene
  // explicar por qué, con los números del propio caso.
  const cola0 = busca('E4-cola0', 'base');
  const referencia = busca('E2a', 'base');
  if (cola0 && referencia) {
    const aperturas = (r) => r.resumen.sentidos[PC].escalares.aperturas.media;
    const carriles = (r, i) => r.resumen.sentidos[i].escalares.carrilesIntervalo.media;
    const wqDe = (r, i) => r.resumen.sentidos[i].escalares.wqHoraSegundos.media;
    w('**Por qué quitar la cola inicial empeora la espera.** Parece al revés, pero');
    w('es lo que sale, y el mecanismo está en las otras columnas: con los 23');
    w(`vehículos heredados, P→C abre ${n(aperturas(referencia), 2)} casetas de media y acumula`);
    w(`${n(carriles(referencia, PC), 1)} carriles-intervalo; empezando vacío abre solo ${n(aperturas(cola0), 2)} y`);
    w(`se queda en ${n(carriles(cola0, PC), 1)}. La cola inicial le está haciendo de **aviso`);
    w('temprano** a una regla que es reactiva (PEN-011): sin ella, el umbral se');
    w('cruza más tarde, y para cuando la caseta abre, cinco minutos después, la');
    w(`cola ya creció. La espera de P→C pasa de ${min(wqDe(referencia, PC))} a ${min(wqDe(cola0, PC))} min,`);
    w(`mientras la de C→P baja de ${min(wqDe(referencia, CP))} a ${min(wqDe(cola0, CP))} min, porque la caseta`);
    w(`que P→C no pide se la queda el contraflujo (${n(carriles(cola0, CP), 1)} carriles-intervalo contra`);
    w(`${n(carriles(referencia, CP), 1)}). Está anotado en PEN-016.`);
    w();
  }

  const metas = filas.filter((f) => f.codigo.startsWith('E4-meta-'));
  if (metas.length > 0 && metas.every((f) => Math.abs(f.base) < 1e-9 && Math.abs(f.lento) < 1e-9)) {
    w('Las variantes de **meta** mueven el `Wq` exactamente 0, como tiene que ser:');
    w('la meta no entra en el motor, solo en el veredicto. Lo que cambian es');
    w('cuántos escenarios se consideran cumplidos.');
    w();
  }
}

// La reasignación, para cerrar PEN-015.
{
  const parejas = [
    ['E2a', 'E2b', 'al factor 1,0'],
    ['E3-1,13-regla', 'E3-1,13-reasig', 'al factor 1,13'],
  ];
  w('### La reasignación por ρ sigue siendo casi inerte');
  w();
  w('| Comparación | Régimen | Reasignaciones por réplica | Δ Wq del peaje |');
  w('|---|---|---|---|');
  for (const [sin, con, cuando] of parejas) {
    for (const regimen of ['base', 'lento']) {
      const a = busca(sin, regimen);
      const b = busca(con, regimen);
      if (!a || !b) continue;
      w(
        `| Con reasignación ${cuando} | ${regimen} | ${n(b.resumen.pozo.reasignaciones.media, 2)} ` +
          `| ${min(b.resumen.total.wqHoraSegundos.media - a.resumen.total.wqHoraSegundos.media)} min |`,
      );
    }
  }
  w();
  w('Confirma PEN-015 con la demanda alta: en el pico nadie libera casetas, así');
  w('que la regla de la DEC-008 no tiene ocasión de aplicarse. Queda como');
  w('hallazgo y no se rediseña (DEC-028).');
  w();
}

w('### Lo que esta matriz no puede responder');
w();
w('Los tres supuestos del principio siguen en pie, y los tres empujan en la');
w('misma dirección:');
w();
w('- Si el servicio del pico fuera más lento que el medido, el quiebre llega');
w('  antes de lo que dice la columna "base".');
w('- Si la demanda de C→P fuera mayor que la del viernes, el reparto empeora: la');
w('  sensibilidad del factor de C→P y la de los sustitutos lo cuantifican.');
w('- Como el modelo de cola única subestima la congestión del pico (PEN-008),');
w('  **todo factor de quiebre de esta matriz es una cota superior**: el peaje');
w('  real quiebra con menos demanda que la que aquí aparece.');
w();
w('Por eso la fase 4 no entrega una política, sino el mapa de lo que haría falta');
w('medir para poder recomendarla: tiempos de atención en un festivo, la demanda');
w('de C→P en un festivo y la cola **por caseta** en un pico. La cola total por');
w('sentido ya está medida —es la columna `cola` de los conteos (DEC-042)—, y es');
w('justo la que deja ver que el modelo se queda corto.');
w();

mkdirSync(dirname(SALIDA), { recursive: true });
writeFileSync(SALIDA, lineas.join('\n') + '\n', 'utf8');
console.log(`\nEscrito ${SALIDA} (${lineas.length} líneas)`);
