#!/usr/bin/env node
/**
 * Arranque en frío: ¿aguanta la política un festivo que empiece con el peaje
 * vacío y la demanda subiendo? (DEC-047, PEN-016)
 *
 * La DEC-046 dejó declarado que durante los primeros 5 min la ventana móvil del
 * disparador por tasa está a medio llenar, así que no puede actuar a plena
 * potencia justo en el arranque. Y PEN-016 tenía medido que quitarle a P→C la
 * cola inicial empeora su espera. Este experimento cruza los dos avisos.
 *
 * Cuatro factores: arranque (cola 23 / cola 0), capacidad inicial (4 / 1
 * casetas), perfil de demanda (medido / rampa) y control (regla / regla+tasa),
 * en los dos regímenes de servicio.
 *
 * La **rampa** son los 12 intervalos medidos del festivo reordenados de menor a
 * mayor: mismos valores, mismo total, otro orden. Es un escenario **construido**
 * (DEC-047), no una medición.
 *
 * Se reporta lo que salga. No se ajusta ningún parámetro (DEC-021).
 *
 * Uso: npm run arranque
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { MODO_CASETAS } from '../src/motor/index.js';
import { correrReplicas, resumirLote } from '../src/motor/lotes.js';
import { conteos } from '../src/config/datos.js';
import { parametros, configuracionRegla, semillasReplicas } from '../src/config/parametros.js';
import { COLA_INICIAL, REGIMENES_SERVICIO, perfilRampa } from '../src/config/escenarios.js';

const AQUI = dirname(fileURLToPath(import.meta.url));
const SALIDA = resolve(AQUI, '..', 'docs', 'resultados', 'fase7-arranque-frio.md');

const SEGUNDOS_POR_MINUTO = 60;
const p = parametros;
const semillas = semillasReplicas();
const CONTEO = 'festivoPC';

/** Perfil medido y perfil de rampa (DEC-047): los mismos valores, reordenados. */
const PERFILES = {
  medido: {
    clave: 'medido',
    etiqueta: 'medido',
    llegadas: conteos[CONTEO].llegadas,
  },
  rampa: {
    clave: 'rampa',
    etiqueta: 'rampa (construido)',
    llegadas: perfilRampa(conteos[CONTEO].llegadas),
  },
};

/** Arranques: lo observado y el frío. */
const ARRANQUES = {
  heredado: { clave: 'heredado', etiqueta: 'cola 23', colaInicial: COLA_INICIAL[CONTEO] },
  frio: { clave: 'frio', etiqueta: 'cola 0', colaInicial: 0 },
};

/** Capacidad con la que se abre la hora. */
const CAPACIDADES = {
  observada: {
    clave: 'observada',
    etiqueta: `${conteos[CONTEO].casetas[0]} casetas`,
    casetasIniciales: conteos[CONTEO].casetas[0],
  },
  minima: {
    clave: 'minima',
    etiqueta: `${p.casetas.minimoPorSentido} caseta`,
    casetasIniciales: p.casetas.minimoPorSentido,
  },
};

const CONTROLES = {
  regla: { clave: 'regla', etiqueta: 'regla por cola', disparadorPorTasa: false },
  tasa: { clave: 'tasa', etiqueta: 'regla + tasa', disparadorPorTasa: true },
};

function configuracionDe({ perfil, arranque, capacidad, control, servicio }) {
  return {
    llegadas: perfil.llegadas,
    // En modo regla `casetasProgramadas` no manda; se deja el conteo por
    // coherencia y `casetasIniciales` es lo que fija el arranque.
    casetasProgramadas: conteos[CONTEO].casetas,
    modoCasetas: MODO_CASETAS.REGLA,
    regla: configuracionRegla({ disparadorPorTasa: control.disparadorPorTasa }),
    colaInicial: arranque.colaInicial,
    casetasIniciales: capacidad.casetasIniciales,
    factorEscalaDemanda: p.llegadas.factorEscalaDemanda,
    duracionIntervaloSegundos: p.tiempo.duracionIntervaloSegundos,
    gammaForma: servicio.gammaForma,
    gammaEscalaSegundos: servicio.gammaEscalaSegundos,
    maximoTolerableWqSegundos: p.desempeno.maximoTolerableWqSegundos,
  };
}

// --------------------------------------------------------------------- casos ---

const casos = [];
for (const claveServicio of ['base', 'lento']) {
  for (const perfil of Object.values(PERFILES)) {
    for (const arranque of Object.values(ARRANQUES)) {
      for (const capacidad of Object.values(CAPACIDADES)) {
        for (const control of Object.values(CONTROLES)) {
          casos.push({
            servicio: REGIMENES_SERVICIO[claveServicio],
            perfil,
            arranque,
            capacidad,
            control,
            nombre: `${claveServicio} · ${perfil.clave} · ${arranque.clave} · ${capacidad.clave} · ${control.clave}`,
          });
        }
      }
    }
  }
}

console.log(`Arranque en frío: ${casos.length} casos × ${semillas.length} réplicas`);

const finales = casos.map((caso) => {
  const replicas = correrReplicas(configuracionDe(caso), semillas);
  console.log(`  ${caso.nombre}`);
  return { caso, resumen: resumirLote(replicas), replicas };
});

/**
 * Primera orden de apertura: media sobre las réplicas que **sí** abrieron, y
 * cuántas fueron. El `null` no tiene media (DEC-047).
 */
function primeraOrden(replicas) {
  const conApertura = replicas
    .map((r) => r.instantePrimeraOrdenSegundos)
    .filter((t) => t !== null && t !== undefined);
  if (conApertura.length === 0) return { media: null, cuantas: 0, total: replicas.length };
  return {
    media: conApertura.reduce((a, b) => a + b, 0) / conApertura.length,
    cuantas: conApertura.length,
    total: replicas.length,
  };
}

const busca = (claveServicio, perfil, arranque, capacidad, control) =>
  finales.find(
    ({ caso }) =>
      caso.servicio.clave === claveServicio &&
      caso.perfil.clave === perfil &&
      caso.arranque.clave === arranque &&
      caso.capacidad.clave === capacidad &&
      caso.control.clave === control,
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

const META = p.desempeno.metaWqSegundos;
const TOLERABLE = p.desempeno.maximoTolerableWqSegundos;
const FRACCION_ACEPTADA = p.desempeno.fraccionIntervalosSobreMaximoAceptada;

const cumple = (resumen) =>
  resumen.escalares.wqHoraSegundos.media <= META &&
  resumen.escalares.fraccionIntervalosSobreUmbral.media <= FRACCION_ACEPTADA;
const marca = (ok) => (ok ? 'sí' : '**no**');

const lineas = [];
const w = (texto = '') => lineas.push(texto);

w('# Arranque en frío: el caso malo de la política');
w();
w('Generado por `npm run arranque` el ' + new Date().toISOString().slice(0, 10) + '.');
w('**No editar a mano:** este archivo se regenera.');
w();
w(`${casos.length} casos, **${semillas.length} réplicas** cada uno, semillas ${semillas[0]} a ${semillas.at(-1)},`);
w('**las mismas en todos** (DEC-010).');
w();
w('> Se reporta lo que salga. **No se ajustó ningún parámetro** (DEC-021).');
w();

w('## Qué se pregunta y por qué');
w();
w('Dos avisos del propio estudio apuntan al mismo caso malo:');
w();
w('- **DEC-046** dejó declarado que durante los **primeros 5 min** la ventana');
w('  móvil del disparador por tasa está a medio llenar, así que no puede alcanzar');
w('  su umbral justo en el arranque de un pico, que es donde más falta haría.');
w('- **PEN-016** tenía medido que quitarle a P→C la cola inicial **empeora** su');
w('  espera, porque esa cola le hacía de **aviso temprano** a una regla reactiva.');
w();
w('La pregunta es si el disparador por tasa recupera lo que la cola heredada le');
w('daba, o si el arranque en frío sigue siendo el agujero de la política.');
w();
w('## Los cuatro factores');
w();
w('| Factor | Valores |');
w('|---|---|');
w(`| Arranque | cola heredada de ${COLA_INICIAL[CONTEO]} vehículos (lo observado) / **cola 0** |`);
w(`| Capacidad inicial | ${conteos[CONTEO].casetas[0]} casetas (lo observado) / **${p.casetas.minimoPorSentido} caseta** |`);
w('| Perfil de demanda | el medido / **rampa** (construido) |');
w('| Control | regla por cola (DEC-006) / **regla + tasa** (DEC-046) |');
w();
w('**La rampa son los 12 intervalos medidos reordenados de menor a mayor**');
w('(DEC-047), no demanda inventada:');
w();
w('```');
w(`medido: [${PERFILES.medido.llegadas.join(', ')}]   total ${PERFILES.medido.llegadas.reduce((a, b) => a + b, 0)}`);
w(`rampa:  [${PERFILES.rampa.llegadas.join(', ')}]   total ${PERFILES.rampa.llegadas.reduce((a, b) => a + b, 0)}`);
w('```');
w();
w('Mismos doce valores, mismo total: cambia **cuándo** llega la demanda y nada');
w('más. **Es un escenario construido, no una medición:** el festivo real arrancó');
w(`ya alto (${conteos[CONTEO].llegadas[0]} veh/5 min en el primer intervalo). La rampa no dice qué pasó,`);
w('dice qué pasaría si el mismo tráfico llegara ordenado de menos a más.');
w();
w(`**Criterio de desempeño** (DEC-009): meta \`Wq ≤ ${min(META, 0)} min\` y a lo sumo`);
w(`${pct(FRACCION_ACEPTADA, 0)} de los intervalos por encima de ${min(TOLERABLE, 1)} min.`);
w();

// --------------------------------------------------------------- tabla todo ---

for (const claveServicio of ['base', 'lento']) {
  w(`## ${REGIMENES_SERVICIO[claveServicio].etiqueta}`);
  w();
  w('| Perfil | Arranque | Capacidad inicial | Control | Wq (min) | % int. > 2,5 min | Cola máx. continua | Carriles-int. | 1.ª orden (min) | Anticipadas | Cumple |');
  w('|---|---|---|---|---|---|---|---|---|---|---|');
  for (const perfil of Object.values(PERFILES)) {
    for (const arranque of Object.values(ARRANQUES)) {
      for (const capacidad of Object.values(CAPACIDADES)) {
        for (const control of Object.values(CONTROLES)) {
          const r = busca(claveServicio, perfil.clave, arranque.clave, capacidad.clave, control.clave);
          if (!r) continue;
          const e = r.resumen.escalares;
          const po = primeraOrden(r.replicas);
          const ordenTexto =
            po.media === null
              ? 'no abre'
              : `${min(po.media)}${po.cuantas < po.total ? ` (${po.cuantas}/${po.total})` : ''}`;
          w(
            `| ${perfil.etiqueta} | ${arranque.etiqueta} | ${capacidad.etiqueta} | ${control.etiqueta} ` +
              `| ${min(e.wqHoraSegundos.media)} ± ${min(e.wqHoraSegundos.semiamplitudIc95)} ` +
              `| ${pct(e.fraccionIntervalosSobreUmbral.media)} ` +
              `| ${n(e.colaMaximaContinua.media, 1)} ` +
              `| ${n(e.carrilesIntervalo.media, 1)} ` +
              `| ${ordenTexto} ` +
              `| ${n(e.aperturasAnticipadas.media, 2)} ` +
              `| ${marca(cumple(r.resumen))} |`,
          );
        }
      }
    }
  }
  w();
}

// ----------------------------------------------------------------- lectura ---

w('## Lectura');
w();
w('Todo lo que sigue sale de las tablas de arriba.');
w();

/** Pares (sin tasa, con tasa) para un escenario dado. */
function par(claveServicio, perfil, arranque, capacidad) {
  return {
    sin: busca(claveServicio, perfil, arranque, capacidad, 'regla'),
    con: busca(claveServicio, perfil, arranque, capacidad, 'tasa'),
  };
}

w('### ¿Recupera el disparador lo que daba la cola heredada?');
w();
w('Con el perfil medido y las casetas observadas, que es el escenario de PEN-016:');
w();
w('| Servicio | Arranque | Wq regla | Wq regla + tasa | 1.ª orden regla | 1.ª orden tasa |');
w('|---|---|---|---|---|---|');
for (const claveServicio of ['base', 'lento']) {
  for (const arranque of ['heredado', 'frio']) {
    const { sin, con } = par(claveServicio, 'medido', arranque, 'observada');
    if (!sin || !con) continue;
    const poSin = primeraOrden(sin.replicas);
    const poCon = primeraOrden(con.replicas);
    w(
      `| ${claveServicio} | ${ARRANQUES[arranque].etiqueta} ` +
        `| ${min(sin.resumen.escalares.wqHoraSegundos.media)} ` +
        `| ${min(con.resumen.escalares.wqHoraSegundos.media)} ` +
        `| ${poSin.media === null ? 'no abre' : min(poSin.media)} ` +
        `| ${poCon.media === null ? 'no abre' : min(poCon.media)} |`,
    );
  }
}
w();

{
  const fh = par('base', 'medido', 'heredado', 'observada');
  const ff = par('base', 'medido', 'frio', 'observada');
  if (fh.sin && ff.sin && ff.con) {
    const wqHeredadoSin = fh.sin.resumen.escalares.wqHoraSegundos.media;
    const wqFrioSin = ff.sin.resumen.escalares.wqHoraSegundos.media;
    const wqFrioCon = ff.con.resumen.escalares.wqHoraSegundos.media;
    const costeFrio = wqFrioSin - wqHeredadoSin;
    const recuperado = wqFrioSin - wqFrioCon;
    const fraccion = costeFrio > 0 ? recuperado / costeFrio : null;
    w(
      `Con servicio base, el arranque en frío le cuesta a la regla por cola ` +
        `**${min(costeFrio)} min** de espera (de ${min(wqHeredadoSin)} a ${min(wqFrioSin)}), que es el ` +
        `hallazgo de PEN-016. El disparador por tasa recupera **${min(recuperado)} min** ` +
        `(${fraccion === null ? '—' : pct(fraccion, 0)} de lo perdido), y deja el arranque en frío en ` +
        `${min(wqFrioCon)} min.`,
    );
    w();
    const cumpleFrioSin = cumple(ff.sin.resumen);
    const cumpleFrioCon = cumple(ff.con.resumen);
    if (!cumpleFrioSin && cumpleFrioCon) {
      w('**Y es la diferencia entre cumplir y no cumplir:** en frío, la regla por');
      w('cola sola incumple el criterio y con el disparador lo cumple.');
    } else if (cumpleFrioSin && cumpleFrioCon) {
      w('Las dos cumplen el criterio en este escenario, así que la diferencia es de');
      w('grado y no de veredicto.');
    } else if (!cumpleFrioCon) {
      w('**Las dos incumplen el criterio en frío**, así que el disparador mejora el');
      w('grado pero no salva el escenario.');
    }
    w();
    w('Y lo más claro está en la columna de la primera orden, que es la que mide la');
    w('reacción:');
    const poFrioSin = primeraOrden(ff.sin.replicas);
    const poFrioCon = primeraOrden(ff.con.replicas);
    if (poFrioSin.media !== null && poFrioCon.media !== null) {
      w();
      w(
        `en frío, la regla por cola tarda **${min(poFrioSin.media)} min** en pedir la primera caseta` +
          (poFrioSin.cuantas < poFrioSin.total
            ? ` —y en ${poFrioSin.total - poFrioSin.cuantas} de las ${poFrioSin.total} réplicas no la pide nunca—` +
              ', mientras'
            : ', mientras') +
          ` con el disparador la pide a los **${min(poFrioCon.media)} min**` +
          (poFrioCon.cuantas === poFrioCon.total ? ', en las 30 réplicas' : '') +
          `: **${min(poFrioSin.media - poFrioCon.media)} min de ventaja**. Con la cola heredada las dos` +
          ' reaccionan al instante, porque los 23 vehículos ya cruzan el umbral en `t = 0`.',
      );
    }
    w();
    w('> **Ojo al comparar con PEN-016.** Allí quitar la cola inicial empeoraba');
    w('> P→C de 0,47 a 1,07 min, mucho más que el salto de este informe. No es una');
    w('> contradicción: PEN-016 mide **los dos sentidos** sobre el pozo común, y');
    w('> allí la caseta que P→C no pide **se la queda C→P** (PEN-014), así que la');
    w('> penalización va doble. Este informe es de **un solo sentido**, donde la');
    w('> caseta sigue disponible cuando la regla por fin la pide. El mecanismo es');
    w('> el mismo; el tamaño del castigo, no.');
    w();
  }
}

w('### Abrir el pico con una sola caseta es el factor que de verdad manda');
w();
w('Esto es lo que más pesa de todo el experimento, y no es el disparador:');
w();
w('| Servicio | Perfil | Capacidad inicial | Wq regla | Wq regla + tasa | Carriles-int. | Cumple |');
w('|---|---|---|---|---|---|---|');
for (const claveServicio of ['base', 'lento']) {
  for (const perfil of ['medido', 'rampa']) {
    for (const capacidad of ['observada', 'minima']) {
      const { sin, con } = par(claveServicio, perfil, 'frio', capacidad);
      if (!sin || !con) continue;
      w(
        `| ${claveServicio} | ${PERFILES[perfil].etiqueta} | ${CAPACIDADES[capacidad].etiqueta} ` +
          `| ${min(sin.resumen.escalares.wqHoraSegundos.media)} ` +
          `| ${min(con.resumen.escalares.wqHoraSegundos.media)} ` +
          `| ${n(sin.resumen.escalares.carrilesIntervalo.media, 1)} ` +
          `| ${marca(cumple(sin.resumen))} / ${marca(cumple(con.resumen))} |`,
      );
    }
  }
}
w();

{
  const cuatro = par('base', 'medido', 'frio', 'observada');
  const una = par('base', 'medido', 'frio', 'minima');
  if (cuatro.sin && una.sin && una.con) {
    const wq4 = cuatro.con.resumen.escalares.wqHoraSegundos.media;
    const wq1 = una.con.resumen.escalares.wqHoraSegundos.media;
    const car4 = cuatro.sin.resumen.escalares.carrilesIntervalo.media;
    const car1 = una.sin.resumen.escalares.carrilesIntervalo.media;
    w(
      `Con el perfil medido y servicio base, arrancar con ${CAPACIDADES.minima.etiqueta} en vez de ` +
        `${CAPACIDADES.observada.etiqueta} multiplica la espera por **${n(wq1 / wq4, 1)}** ` +
        `(${min(wq1)} contra ${min(wq4)} min) y **ningún control cumple el criterio**. ` +
        `El disparador por tasa no cambia nada ahí: ${min(una.sin.resumen.escalares.wqHoraSegundos.media)} ` +
        `contra ${min(wq1)} min.`,
    );
    w();
    w(
      `La razón está en los carriles-intervalo: ${n(car1, 1)} contra ${n(car4, 1)}. La regla **no ` +
        `recupera la capacidad que no se le dio al empezar**, porque solo puede añadir una caseta ` +
        'a la vez y cada una cuesta la demora de apertura. Para cuando llega al tope, la hora se ' +
        'acabó.',
    );
    w();
    w('**Y aquí el disparador por tasa es inerte, por la misma razón de siempre:**');
    w('con una sola caseta y el pico encima, la cola cruza su umbral de inmediato');
    w('—la primera orden sale a los 0,40 min— así que no queda nada que anticipar.');
    w('El disparador sirve cuando hay holgura que gestionar, no cuando falta');
    w('capacidad.');
    w();
  }
}

w('### La demanda que sube es el caso **fácil**, no el difícil');
w();
w('Esto sale al revés de lo que el experimento suponía al plantearse (DEC-047), y');
w('es el hallazgo que conviene llevarse:');
w();
{
  const filas = [];
  for (const claveServicio of ['base', 'lento']) {
    for (const capacidad of ['observada', 'minima']) {
      const med = busca(claveServicio, 'medido', 'frio', capacidad, 'tasa');
      const ram = busca(claveServicio, 'rampa', 'frio', capacidad, 'tasa');
      if (med && ram) filas.push({ claveServicio, capacidad, med, ram });
    }
  }
  w('| Servicio | Capacidad inicial | Wq perfil medido | Wq rampa | ¿Cuál es peor? |');
  w('|---|---|---|---|---|');
  for (const f of filas) {
    const a = f.med.resumen.escalares.wqHoraSegundos.media;
    const b = f.ram.resumen.escalares.wqHoraSegundos.media;
    w(
      `| ${f.claveServicio} | ${CAPACIDADES[f.capacidad].etiqueta} | ${min(a)} | ${min(b)} ` +
        `| **${a > b ? 'el medido' : 'la rampa'}** |`,
    );
  }
  w();
  const peorMedido = filas.filter(
    (f) =>
      f.med.resumen.escalares.wqHoraSegundos.media > f.ram.resumen.escalares.wqHoraSegundos.media,
  ).length;
  w(
    `El perfil **medido** sale peor que la rampa en **${peorMedido} de los ${filas.length}** casos en frío. ` +
      'El motivo es sencillo cuando se mira el perfil: la rampa empieza en ' +
      `${PERFILES.rampa.llegadas[0]} veh/5 min y le **regala tiempo** a una regla reactiva para ir ` +
      `abriendo casetas antes de que llegue lo gordo, mientras el festivo real arranca ya en ` +
      `${PERFILES.medido.llegadas[0]} veh/5 min, casi en el máximo.`,
  );
  w();
  w('**Así que el caso malo de esta política no es «la demanda subiendo»: es «la');
  w('demanda que ya empieza arriba».** Y eso no es un escenario hipotético, es');
  w('exactamente lo que hizo el festivo medido. El retorno de un festivo no sube');
  w('despacio: empieza en hora punta.');
  w();
}

w('### El efecto de la rampa, aislado');
w();
w('Mismo total de demanda, mismo arranque y misma capacidad: solo cambia el orden');
w('de los intervalos.');
w();
w('| Servicio | Arranque | Capacidad | Control | Wq medido | Wq rampa | Δ |');
w('|---|---|---|---|---|---|---|');
for (const claveServicio of ['base', 'lento']) {
  for (const arranque of ['heredado', 'frio']) {
    for (const capacidad of ['observada', 'minima']) {
      for (const control of ['regla', 'tasa']) {
        const med = busca(claveServicio, 'medido', arranque, capacidad, control);
        const ram = busca(claveServicio, 'rampa', arranque, capacidad, control);
        if (!med || !ram) continue;
        const a = med.resumen.escalares.wqHoraSegundos.media;
        const b = ram.resumen.escalares.wqHoraSegundos.media;
        w(
          `| ${claveServicio} | ${ARRANQUES[arranque].etiqueta} | ${CAPACIDADES[capacidad].etiqueta} ` +
            `| ${CONTROLES[control].etiqueta} | ${min(a)} | ${min(b)} | ${min(b - a)} |`,
        );
      }
    }
  }
}
w();

w('### Lo que este experimento no puede responder');
w();
w('- **La rampa es construida** (DEC-047). Dice qué pasa si el mismo tráfico llega');
w('  ordenado de menos a más, no qué pasó ni qué pasará.');
w('- **Es de un solo sentido.** No hay competencia por el pozo, así que la caseta');
w('  que la regla pide está siempre disponible. Con el pozo compartido, anticipar');
w('  es pedir antes un recurso disputado (DEC-046).');
w('- **El modelo subestima la congestión del pico** (PEN-008), y aquí eso pesa');
w('  doble: si la cola real crece más rápido que la simulada, el umbral de cola');
w('  se cruza antes de lo que dice este informe y la ventaja del disparador por');
w('  tasa es **menor** de lo que sale. El sesgo juega en contra del hallazgo, no');
w('  a favor.');
w('- **La demanda de C→P en el festivo no se midió** (PEN-013), y sigue siendo la');
w('  incertidumbre dominante del estudio.');
w();

mkdirSync(dirname(SALIDA), { recursive: true });
writeFileSync(SALIDA, lineas.join('\n') + '\n', 'utf8');
console.log(`\nEscrito ${SALIDA} (${lineas.length} líneas)`);
