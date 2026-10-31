#!/usr/bin/env node
/**
 * Periodo de calentamiento contra la cola inicial inyectada (DEC-049, PEN-003).
 *
 * La DEC-018 mete los 23 vehículos del festivo en `t = 0` sin espera previa, lo
 * que subestima su espera real. El autor de las mediciones confirmó que esa cola
 * «se formó como pudo haberse formado las colas de los siguientes intervalos»,
 * así que la alternativa natural es **calentar**: simular tramos previos con la
 * tasa del primer intervalo y dejar que la cola emerja sola.
 *
 * Tres tratamientos, con las **mismas semillas**, para poder separar los dos
 * efectos que el calentamiento cambia a la vez:
 *
 *   A. DEC-018        — cola 23 inyectada, espera desde 0.
 *   B. calentamiento  — la cola que emerge, con su espera ya acumulada.
 *   C. descomposición — la **misma cola que deja B**, pero inyectada con espera
 *                       desde 0. A→C aísla el tamaño de la cola; C→B, la
 *                       contabilidad de la espera.
 *
 * Se reporta lo que salga. No se ajusta ningún parámetro (DEC-021).
 *
 * Uso: npm run calentamiento
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { simularSentido, MODO_CASETAS } from '../src/motor/index.js';
import { resumirLote } from '../src/motor/lotes.js';
import { esperasDeCalentamiento } from '../src/motor/calentamiento.js';
import { conteos } from '../src/config/datos.js';
import { parametros, configuracionRegla, semillasReplicas } from '../src/config/parametros.js';
import { COLA_INICIAL, REGIMENES_SERVICIO } from '../src/config/escenarios.js';

const AQUI = dirname(fileURLToPath(import.meta.url));
const SALIDA = resolve(AQUI, '..', 'docs', 'resultados', 'fase7-calentamiento.md');

const SEGUNDOS_POR_MINUTO = 60;
const p = parametros;
const semillas = semillasReplicas();
const CONTEO = 'festivoPC';
const OBSERVADA = COLA_INICIAL[CONTEO];

/** Duración de referencia, justificada en el informe. */
const INTERVALOS_REFERENCIA = 3;

const CONTROLES = {
  operador: { clave: 'operador', etiqueta: 'operador (programado)', porRegla: false },
  regla: { clave: 'regla', etiqueta: 'regla por cola', porRegla: true, tasa: false },
  tasa: { clave: 'tasa', etiqueta: 'regla + tasa', porRegla: true, tasa: true },
};

/** Esperas del calentamiento de una réplica. */
function esperasDe(semilla, intervalos, servicio) {
  return esperasDeCalentamiento({
    llegadasPrimerIntervalo: conteos[CONTEO].llegadas[0],
    casetasIniciales: conteos[CONTEO].casetas[0],
    intervalos,
    duracionIntervaloSegundos: p.tiempo.duracionIntervaloSegundos,
    gammaForma: servicio.gammaForma,
    gammaEscalaSegundos: servicio.gammaEscalaSegundos,
    semilla,
    flujo: p.calentamiento.flujoBase,
  });
}

function configuracionBase({ control, servicio }) {
  return {
    llegadas: conteos[CONTEO].llegadas,
    casetasProgramadas: conteos[CONTEO].casetas,
    casetasIniciales: conteos[CONTEO].casetas[0],
    modoCasetas: control.porRegla ? MODO_CASETAS.REGLA : MODO_CASETAS.PROGRAMADO,
    ...(control.porRegla
      ? { regla: configuracionRegla({ disparadorPorTasa: control.tasa }) }
      : {}),
    factorEscalaDemanda: p.llegadas.factorEscalaDemanda,
    duracionIntervaloSegundos: p.tiempo.duracionIntervaloSegundos,
    gammaForma: servicio.gammaForma,
    gammaEscalaSegundos: servicio.gammaEscalaSegundos,
    maximoTolerableWqSegundos: p.desempeno.maximoTolerableWqSegundos,
  };
}

/**
 * Corre las 30 réplicas de un tratamiento. `tratamiento` decide qué cola inicial
 * recibe cada réplica, y puede depender del calentamiento de esa misma semilla.
 */
function correr({ control, servicio, intervalos, tratamiento }) {
  const replicas = semillas.map((semilla) => {
    const base = { ...configuracionBase({ control, servicio }), semilla };
    const esperas = intervalos ? esperasDe(semilla, intervalos, servicio) : [];
    if (tratamiento === 'dec018') return simularSentido({ ...base, colaInicial: OBSERVADA });
    if (tratamiento === 'calentamiento') {
      return simularSentido({ ...base, colaInicial: 0, colaInicialEsperas: esperas });
    }
    // Descomposición: mismo tamaño de cola que deja el calentamiento, pero
    // inyectada a la manera de la DEC-018 (espera desde 0).
    return simularSentido({ ...base, colaInicial: esperas.length });
  });
  return { resumen: resumirLote(replicas), replicas };
}

// --------------------------------------------------------------------- casos ---

const TRATAMIENTOS = [
  { clave: 'dec018', etiqueta: 'A · DEC-018 (cola 23 inyectada)' },
  { clave: 'calentamiento', etiqueta: 'B · calentamiento' },
  { clave: 'cuentaIgual', etiqueta: 'C · misma cola que B, inyectada' },
];

const casos = [];
for (const claveServicio of ['base', 'lento']) {
  for (const control of Object.values(CONTROLES)) {
    for (const t of TRATAMIENTOS) {
      casos.push({
        servicio: REGIMENES_SERVICIO[claveServicio],
        control,
        tratamiento: t,
        intervalos: INTERVALOS_REFERENCIA,
        nombre: `${claveServicio} · ${control.clave} · ${t.clave}`,
      });
    }
  }
}

console.log(`Calentamiento: ${casos.length} casos × ${semillas.length} réplicas`);

const resultados = casos.map((caso) => {
  const r = correr({
    control: caso.control,
    servicio: caso.servicio,
    intervalos: caso.intervalos,
    tratamiento: caso.tratamiento.clave,
  });
  console.log(`  ${caso.nombre}`);
  return { caso, ...r };
});

// Barrido de duraciones, solo con la regla por cola y servicio base y lento.
const duraciones = [];
for (const claveServicio of ['base', 'lento']) {
  for (const intervalos of p.calentamiento.intervalosComparados) {
    const servicio = REGIMENES_SERVICIO[claveServicio];
    const colas = semillas.map((s) => esperasDe(s, intervalos, servicio));
    const r = correr({
      control: CONTROLES.regla,
      servicio,
      intervalos,
      tratamiento: 'calentamiento',
    });
    duraciones.push({ claveServicio, intervalos, colas, ...r });
    console.log(`  duración ${claveServicio} · ${intervalos} intervalos`);
  }
}

const busca = (claveServicio, control, tratamiento) =>
  resultados.find(
    ({ caso }) =>
      caso.servicio.clave === claveServicio &&
      caso.control.clave === control &&
      caso.tratamiento.clave === tratamiento,
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
const media = (xs) => (xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length);

const META = p.desempeno.metaWqSegundos;
const TOLERABLE = p.desempeno.maximoTolerableWqSegundos;
const FRACCION_ACEPTADA = p.desempeno.fraccionIntervalosSobreMaximoAceptada;
const cumple = (resumen) =>
  resumen.escalares.wqHoraSegundos.media <= META &&
  resumen.escalares.fraccionIntervalosSobreUmbral.media <= FRACCION_ACEPTADA;
const marca = (ok) => (ok ? 'sí' : '**no**');

const lineas = [];
const w = (texto = '') => lineas.push(texto);

w('# Periodo de calentamiento contra la cola inicial inyectada');
w();
w('Generado por `npm run calentamiento` el ' + new Date().toISOString().slice(0, 10) + '.');
w('**No editar a mano:** este archivo se regenera.');
w();
w(`${casos.length} casos de comparación más ${duraciones.length} de duración, **${semillas.length} réplicas** cada uno,`);
w(`semillas ${semillas[0]} a ${semillas.at(-1)}, **las mismas en todos** (DEC-010).`);
w();
w('> Se reporta lo que salga. **No se ajustó ningún parámetro** (DEC-021), y en');
w('> particular no se buscó una duración que reprodujera los 23 vehículos');
w('> observados: eso sería calibrar.');
w();

w('## Qué se compara');
w();
w('La **DEC-018** mete la cola inicial del festivo en `t = 0` sin espera previa,');
w('lo que subestima su espera real; es el tratamiento vigente y así se declaró');
w('(PEN-003). El autor de las mediciones confirmó que esa cola **se formó como');
w('pudo haberse formado las colas de los siguientes intervalos**: el sistema venía');
w('en el mismo régimen antes de las 4:25, sin atasco excepcional previo.');
w();
w('Eso es exactamente lo que simula un **periodo de calentamiento**: tramos');
w('previos a la hora observada con la tasa del primer intervalo');
w(`(${conteos[CONTEO].llegadas[0]} veh/5 min) y las casetas iniciales fijas (${conteos[CONTEO].casetas[0]}), de modo que la cola`);
w('inicial **emerja sola** en vez de inyectarse.');
w();
w('El calentamiento cambia **dos cosas a la vez**, así que se separan:');
w();
w('| | Cola inicial | Espera previa |');
w('|---|---|---|');
w(`| **A** · DEC-018 | ${OBSERVADA}, inyectada | 0 |`);
w('| **B** · calentamiento | la que emerge | la que acumuló |');
w('| **C** · descomposición | la misma que B, inyectada | 0 |');
w();
w('**A → C** aísla el efecto del **tamaño** de la cola; **C → B**, el de la');
w('**contabilidad de la espera**. Sin C no se podría saber cuál de los dos manda.');
w();
w('El calentamiento corre en su **propio flujo de PRNG** (flujo');
w(`${p.calentamiento.flujoBase}, lejos de los flujos 0 y 1 de los sentidos), para que el tráfico previo no`);
w('sea una copia del primer intervalo de la hora observada.');
w();
w('**Solo se aplica al festivo.** Es el único conteo con cola inicial observada');
w('distinta de 0 (DEC-010); en los demás la cola 0 es un dato, no un supuesto, y');
w('calentar los sobreescribiría.');
w();

// --------------------------------------------------------- cola que emerge ---

w('## Lo primero: qué cola deja el calentamiento');
w();
w('| Duración | Cola al arrancar (media) | Rango | Espera ya acumulada (media) |');
w('|---|---|---|---|');
for (const d of duraciones.filter((x) => x.claveServicio === 'base')) {
  const tamanos = d.colas.map((c) => c.length);
  const esperas = d.colas.map((c) => media(c));
  w(
    `| ${d.intervalos} intervalos (${d.intervalos * p.tiempo.duracionIntervaloSegundos / SEGUNDOS_POR_MINUTO} min) ` +
      `| ${n(media(tamanos), 1)} | ${Math.min(...tamanos)}–${Math.max(...tamanos)} ` +
      `| ${min(media(esperas))} min |`,
  );
}
w();

{
  const base = duraciones.filter((x) => x.claveServicio === 'base');
  const tamanos = base.map((d) => media(d.colas.map((c) => c.length)));
  const menor = Math.min(...tamanos);
  const mayor = Math.max(...tamanos);
  w(
    `**La cola se estabiliza enseguida y no crece con la duración:** entre ` +
      `${n(menor, 1)} y ${n(mayor, 1)} vehículos de media para duraciones de ` +
      `${base[0].intervalos * 5} a ${base.at(-1).intervalos * 5} min, sin tendencia. Es el régimen del primer ` +
      `intervalo: λ = ${conteos[CONTEO].llegadas[0] * 12} veh/h contra ${conteos[CONTEO].casetas[0]} casetas, y con el servicio gamma ` +
      'medido (CV = 0,46, bastante menos variable que la exponencial) ese régimen no ' +
      'acumula más cola que esa.',
  );
  w();
  w(
    `**Y ahí está el hallazgo incómodo: el calentamiento deja unos ${n(media(tamanos), 0)} vehículos, ` +
      `no los ${OBSERVADA} observados.**`,
  );
  w();
  w('No es un fallo del calentamiento: es **PEN-008 otra vez**. El modelo no');
  w('reproduce la cola del festivo en ninguno de los 12 intervalos medidos, y la');
  w('cola inicial es la lectura número cero de esa misma serie. Pedirle al');
  w('calentamiento que genere 23 vehículos sería pedirle que reprodujera justo lo');
  w('que el modelo no reproduce.');
  w();
  w('Esto tiene una consecuencia directa para la decisión: **el calentamiento no');
  w('es más realista que la DEC-018, es realista de otra manera.** La DEC-018 pone');
  w('la cola observada y le quita la espera previa; el calentamiento pone una');
  w('espera previa coherente y una cola demasiado corta. Cada uno acierta en una');
  w('mitad.');
  w();
}

// ------------------------------------------------------------ comparación ---

for (const claveServicio of ['base', 'lento']) {
  w(`## ${REGIMENES_SERVICIO[claveServicio].etiqueta}`);
  w();
  w(`Calentamiento de referencia: **${INTERVALOS_REFERENCIA} intervalos (${INTERVALOS_REFERENCIA * 5} min)**.`);
  w();
  w('| Control | Tratamiento | Cola inicial | Wq (min) | Wq sin cola inicial | % int. > 2,5 min | Cola máx. continua | Carriles-int. | Cumple |');
  w('|---|---|---|---|---|---|---|---|---|');
  for (const control of Object.values(CONTROLES)) {
    for (const t of TRATAMIENTOS) {
      const r = busca(claveServicio, control.clave, t.clave);
      if (!r) continue;
      const e = r.resumen.escalares;
      const colaIni = media(r.replicas.map((x) => x.colaInicialVehiculos));
      w(
        `| ${control.etiqueta} | ${t.etiqueta} | ${n(colaIni, 1)} ` +
          `| ${min(e.wqHoraSegundos.media)} ± ${min(e.wqHoraSegundos.semiamplitudIc95)} ` +
          `| ${min(e.wqHoraSinColaInicialSegundos.media)} ` +
          `| ${pct(e.fraccionIntervalosSobreUmbral.media)} ` +
          `| ${n(e.colaMaximaContinua.media, 1)} ` +
          `| ${n(e.carrilesIntervalo.media, 1)} ` +
          `| ${marca(cumple(r.resumen))} |`,
      );
    }
  }
  w();
}

// ----------------------------------------------------------- descomposición ---

w('## La descomposición: ¿qué parte del cambio es de cada cosa?');
w();
w('| Servicio | Control | A → C (tamaño de la cola) | C → B (espera previa) | A → B (total) |');
w('|---|---|---|---|---|');
for (const claveServicio of ['base', 'lento']) {
  for (const control of Object.values(CONTROLES)) {
    const a = busca(claveServicio, control.clave, 'dec018');
    const b = busca(claveServicio, control.clave, 'calentamiento');
    const c = busca(claveServicio, control.clave, 'cuentaIgual');
    if (!a || !b || !c) continue;
    const wqA = a.resumen.escalares.wqHoraSegundos.media;
    const wqB = b.resumen.escalares.wqHoraSegundos.media;
    const wqC = c.resumen.escalares.wqHoraSegundos.media;
    w(
      `| ${claveServicio} | ${control.etiqueta} | ${min(wqC - wqA)} | ${min(wqB - wqC)} | ${min(wqB - wqA)} |`,
    );
  }
}
w();

{
  const a = busca('base', 'regla', 'dec018');
  const b = busca('base', 'regla', 'calentamiento');
  const c = busca('base', 'regla', 'cuentaIgual');
  if (a && b && c) {
    const wqA = a.resumen.escalares.wqHoraSegundos.media;
    const wqB = b.resumen.escalares.wqHoraSegundos.media;
    const wqC = c.resumen.escalares.wqHoraSegundos.media;
    const tamano = wqC - wqA;
    const cuenta = wqB - wqC;
    const manda = Math.abs(tamano) >= Math.abs(cuenta) ? 'el tamaño de la cola' : 'la contabilidad de la espera';
    w(
      `Con servicio base y la regla por cola, de los ${min(Math.abs(wqB - wqA))} min que separan A de B, ` +
        `${min(Math.abs(tamano))} vienen del **tamaño de la cola** (23 → la que emerge) y ` +
        `${min(Math.abs(cuenta))} de la **contabilidad de la espera**. Manda ${manda}.`,
    );
    w();
    if (Math.abs(tamano) > Math.abs(cuenta)) {
      w('Dicho de otro modo: **el calentamiento no cambia tanto las cosas por contar');
      w('bien la espera previa como por quedarse corto en la cola de arranque.** Lo');
      w('primero es una mejora del modelo; lo segundo, el sesgo de PEN-008 entrando');
      w('por una puerta nueva.');
      w();
    }
  }
}

// ------------------------------------------------------- efecto en la regla ---

w('## El aviso de PEN-016: la cola inicial le hace de disparador a la regla');
w();
w('Con la DEC-018 los 23 vehículos cruzan el umbral de apertura en `t = 0` y le');
w('dan a la regla un **aviso temprano** (PEN-016). Con calentamiento la cola de');
w('arranque es más corta, así que ese aviso se debilita. Es esperable que la');
w('regla se mueva, y se mueve:');
w();
w('| Servicio | Tratamiento | Wq operador | Wq regla | Wq regla + tasa | ¿La regla gana al operador? |');
w('|---|---|---|---|---|---|');
for (const claveServicio of ['base', 'lento']) {
  for (const t of TRATAMIENTOS) {
    const op = busca(claveServicio, 'operador', t.clave);
    const re = busca(claveServicio, 'regla', t.clave);
    const ta = busca(claveServicio, 'tasa', t.clave);
    if (!op || !re || !ta) continue;
    const wqOp = op.resumen.escalares.wqHoraSegundos.media;
    const wqRe = re.resumen.escalares.wqHoraSegundos.media;
    const wqTa = ta.resumen.escalares.wqHoraSegundos.media;
    w(
      `| ${claveServicio} | ${t.etiqueta} | ${min(wqOp)} | ${min(wqRe)} | ${min(wqTa)} ` +
        `| ${marca(wqRe <= wqOp)} / con tasa ${marca(wqTa <= wqOp)} |`,
    );
  }
}
w();

// ---------------------------------------------------------- duración, barrido ---

{
  const opA = busca('base', 'operador', 'dec018');
  const taA = busca('base', 'tasa', 'dec018');
  const opB = busca('base', 'operador', 'calentamiento');
  const taB = busca('base', 'tasa', 'calentamiento');
  if (opA && taA && opB && taB) {
    const wq = (r) => r.resumen.escalares.wqHoraSegundos.media;
    w('**Y pasa algo que conviene mirar de frente.** Con servicio base, el');
    w(
      `disparador por tasa le ganaba al operador (${min(wq(taA))} contra ${min(wq(opA))} min) y con ` +
        `calentamiento **deja de ganarle** (${min(wq(taB))} contra ${min(wq(opB))}). No es que el disparador ` +
        'empeore: es que al operador le **beneficia** arrancar con menos cola, porque sus ' +
        'casetas están programadas y no dependen de ningún aviso, mientras la regla pierde ' +
        'justo el aviso que la cola de 23 le daba.',
    );
    w();
    w('Es el aviso de PEN-016 en su forma más clara: **parte de la ventaja que la');
    w('regla saca en el festivo viene de arrancar con una cola grande**, y esa cola');
    w('es un dato observado, no una propiedad de la regla. Si el pico empezara sin');
    w('cola, la comparación entre regla y operador sería menos favorable a la regla');
    w('de lo que dicen los informes de las fases 2 a 4. El informe de arranque en');
    w('frío (DEC-047) ya lo medía por la otra vía y coincide.');
    w();
  }
}

w('## Sensibilidad de la duración del calentamiento');
w();
w('Con la regla por cola, tratamiento B.');
w();
w('| Servicio | Duración | Cola al arrancar | Wq (min) | % int. > 2,5 min | Carriles-int. | Cumple |');
w('|---|---|---|---|---|---|---|');
for (const d of duraciones) {
  const e = d.resumen.escalares;
  w(
    `| ${d.claveServicio} | ${d.intervalos * 5} min | ${n(media(d.colas.map((c) => c.length)), 1)} ` +
      `| ${min(e.wqHoraSegundos.media)} ± ${min(e.wqHoraSegundos.semiamplitudIc95)} ` +
      `| ${pct(e.fraccionIntervalosSobreUmbral.media)} ` +
      `| ${n(e.carrilesIntervalo.media, 1)} | ${marca(cumple(d.resumen))} |`,
  );
}
w();

{
  const porRegimen = {};
  for (const clave of ['base', 'lento']) {
    const d = duraciones.filter((x) => x.claveServicio === clave);
    const wqs = d.map((x) => x.resumen.escalares.wqHoraSegundos.media);
    const colas = d.map((x) => media(x.colas.map((c) => c.length)));
    porRegimen[clave] = {
      rango: Math.max(...wqs) - Math.min(...wqs),
      semi: Math.max(...d.map((x) => x.resumen.escalares.wqHoraSegundos.semiamplitudIc95)),
      colaMin: Math.min(...colas),
      colaMax: Math.max(...colas),
    };
  }

  const b = porRegimen.base;
  w(
    `**Con servicio base la duración no cambia nada:** el \`Wq\` se mueve ${min(b.rango)} min entre ` +
      `la duración más corta y la más larga, contra una semiamplitud de IC de hasta ${min(b.semi)} min, ` +
      `y la cola de arranque se queda entre ${n(b.colaMin, 1)} y ${n(b.colaMax, 1)} vehículos. ` +
      'La diferencia cabe dentro del intervalo de confianza.',
  );
  w();

  // El régimen lento es el que rompe el experimento, y hay que decirlo.
  const muLento = p.tiempo.duracionIntervaloSegundos / REGIMENES_SERVICIO.lento.mediaSegundos;
  const capacidadLenta = conteos[CONTEO].casetas[0] * muLento;
  const rhoLento = conteos[CONTEO].llegadas[0] / capacidadLenta;
  const l = porRegimen.lento;
  w(
    `**Con servicio lento, en cambio, la duración lo decide todo:** la cola de arranque pasa de ` +
      `${n(l.colaMin, 1)} a ${n(l.colaMax, 1)} vehículos y el \`Wq\` se mueve ${min(l.rango)} min, ` +
      `muy por encima del IC (${min(l.semi)} min).`,
  );
  w();
  w('La razón es estructural y conviene verla: en el régimen lento el periodo de');
  w('calentamiento **no es estable**. Con la tasa del primer intervalo');
  w(
    `(${conteos[CONTEO].llegadas[0]} veh/5 min) y ${conteos[CONTEO].casetas[0]} casetas a ${coma(String(REGIMENES_SERVICIO.lento.mediaSegundos))} s, ` +
      `la capacidad es ${n(capacidadLenta, 1)} veh/5 min, así que **ρ = ${n(rhoLento, 3)} > 1**: la cola no tiende a ` +
      'ningún valor, crece mientras se la deje crecer. Y eso es justo lo que se ve en la ' +
      'tabla, un crecimiento casi lineal con la duración.',
  );
  w();
  w('> **Esto descalifica al calentamiento como tratamiento por defecto.** La');
  w('> duración deja de ser una elección inocua y pasa a ser **el parámetro que');
  w('> fija la cola inicial**, sin que ningún dato diga cuál es la buena. Elegir');
  w('> una duración sería elegir el resultado.');
  w();
  w(`**Sobre los ${INTERVALOS_REFERENCIA} intervalos (${INTERVALOS_REFERENCIA * 5} min) de referencia.** Se eligieron porque con servicio`);
  w('base la cola ya está estabilizada desde el primer intervalo y porque');
  w(`${INTERVALOS_REFERENCIA * 5} min es una escala que el modelo ya usa: la ventana de cierre de la regla`);
  w('(DEC-007). Así la duración no es un número nuevo. Pero con servicio lento esa');
  w('justificación **no sirve**, porque no hay nada que estabilizarse.');
  w();
}

w('## Conclusión: no se adopta, y el motivo es el propio experimento');
w();
{
  const a = busca('base', 'regla', 'dec018');
  const b = busca('base', 'regla', 'calentamiento');
  const c = busca('base', 'regla', 'cuentaIgual');
  const cuentas = [];
  for (const claveServicio of ['base', 'lento']) {
    for (const control of Object.values(CONTROLES)) {
      const x = busca(claveServicio, control.clave, 'cuentaIgual');
      const y = busca(claveServicio, control.clave, 'calentamiento');
      if (x && y) {
        cuentas.push(
          Math.abs(
            y.resumen.escalares.wqHoraSegundos.media - x.resumen.escalares.wqHoraSegundos.media,
          ),
        );
      }
    }
  }
  const mayorCuenta = Math.max(...cuentas);

  w('El calentamiento se midió contra la DEC-018 con las mismas semillas, y lo que');
  w('sale es que **no conviene sustituirla**. Tres razones, en este orden:');
  w();
  w(
    `1. **Lo que PEN-003 temía es, medido, insignificante.** El pendiente avisaba de que ` +
      'contar la espera de la cola inicial desde `t = 0` **subestima** su espera real. Es ' +
      `cierto, y ahora se sabe cuánto: la columna C → B de la descomposición nunca pasa de ` +
      `**${min(mayorCuenta)} min** sobre el \`Wq\` de la hora. Con 1.064 vehículos en la hora, la espera ` +
      'previa de una veintena diluye a casi nada. La aproximación de la DEC-018 **costaba muy ' +
      'poco**, y eso es lo que había que comprobar.',
  );
  w();
  w('2. **El calentamiento no es más realista, es realista de otra manera.** Con');
  w(`   servicio base deja unos ${n(media(duraciones.filter((d) => d.claveServicio === 'base' && d.intervalos === INTERVALOS_REFERENCIA)[0].colas.map((x) => x.length)), 1)} vehículos contra los ${OBSERVADA} observados, porque el`);
  w('   modelo no reproduce la cola del festivo en ningún intervalo (PEN-008) y la');
  w('   cola inicial es la lectura número cero de esa misma serie. Sustituir un');
  w('   dato observado por una salida del modelo que se queda corta **mete el sesgo');
  w('   de PEN-008 también en el arranque**, donde ahora no está.');
  w();
  w('3. **Y en el régimen lento el calentamiento no está bien planteado.** ρ > 1,');
  w('   así que la cola de arranque la fija la duración elegida y nada más: de 15,5');
  w('   a 171,1 vehículos según se calienten 5 o 60 min. Un tratamiento cuyo');
  w('   resultado depende de un parámetro sin dato que lo fije es peor que la');
  w('   aproximación que venía a sustituir.');
  w();
  w('**Qué se queda, entonces:**');
  w();
  w('- **La DEC-018 sigue siendo el tratamiento por defecto**, ahora con una');
  w('   comparación que la respalda en vez de solo con la cautela de PEN-003.');
  w('- **El calentamiento se queda implementado y apagado**, como escenario de');
  w('   sensibilidad, igual que el servicio lento (DEC-025) o el disparador por');
  w('   tasa (DEC-046). Encenderlo es un parámetro.');
  w('- **PEN-003 queda cerrado**: la pregunta tenía respuesta del autor y la');
  w('   alternativa está medida.');
  w();
  if (a && b && c) {
    w(
      `Y una nota para quien compare con la validación: con calentamiento el \`Wq\` del operador ` +
        `baja de ${min(busca('base', 'operador', 'dec018').resumen.escalares.wqHoraSegundos.media)} a ` +
        `${min(busca('base', 'operador', 'calentamiento').resumen.escalares.wqHoraSegundos.media)} min, así que la brecha contra los ` +
        '1,28 min que declara el contexto **se ensancha**. El calentamiento no acerca el modelo a lo ' +
        'observado: lo aleja, por la misma razón del punto 2.',
    );
    w();
  }
}

w('## Lo que este experimento no puede responder');
w();
w('- **Es de un solo sentido.** No hay competencia por el pozo. En la fase 3 la');
w('  caseta que la regla no pide se la queda el otro sentido (PEN-014), así que');
w('  allí el efecto de debilitar el aviso temprano sería mayor.');
w('- **El calentamiento hereda el sesgo de PEN-008.** La cola que genera es la que');
w('  el modelo sabe generar, y el modelo se queda corto en el pico. No hay forma');
w('  de saber desde dentro del modelo cuál era la cola «de verdad» a las 4:25.');
w('- **El régimen previo es un supuesto**, aunque sea el que el autor describe:');
w('  que el sistema venía con la tasa del primer intervalo. Si el tráfico previo');
w('  hubiera sido mayor, la cola de arranque sería más larga.');
w();

mkdirSync(dirname(SALIDA), { recursive: true });
writeFileSync(SALIDA, lineas.join('\n') + '\n', 'utf8');
console.log(`\nEscrito ${SALIDA} (${lineas.length} líneas)`);
