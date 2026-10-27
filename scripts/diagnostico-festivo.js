#!/usr/bin/env node
/**
 * Diagnóstico de la cola: compara, intervalo por intervalo, la lectura de campo
 * con la cola total que simula el motor.
 *
 * Las lecturas de campo son la **fila más larga de una sola caseta** (DEC-024),
 * así que la cola total real era mayor o igual que la lectura. El motor simula
 * cola única: su cola total debería quedar **por encima** de la lectura. Donde
 * queda por debajo, el modelo subestima, y no hay interpretación que lo salve.
 *
 * Uso: npm run diagnostico
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { correrYResumir } from '../src/motor/index.js';
import { conteos, ordenConteos } from '../src/config/datos.js';
import { parametros, semillasReplicas } from '../src/config/parametros.js';

const AQUI = dirname(fileURLToPath(import.meta.url));
const SALIDA = resolve(AQUI, '..', 'docs', 'resultados', 'diagnostico-festivo.md');

const p = parametros;
const semillas = semillasReplicas();

/** Cola inicial por conteo (DEC-010). */
const COLA_INICIAL = { viernes: 0, domingoCP: 0, domingoPC: 0, festivoPC: 23 };

function configuracionDe(clave) {
  return {
    llegadas: conteos[clave].llegadas,
    casetasProgramadas: conteos[clave].casetas,
    colaInicial: COLA_INICIAL[clave],
    factorEscalaDemanda: p.llegadas.factorEscalaDemanda,
    duracionIntervaloSegundos: p.tiempo.duracionIntervaloSegundos,
    gammaForma: p.servicio.gammaForma,
    gammaEscalaSegundos: p.servicio.gammaEscalaSegundos,
    maximoTolerableWqSegundos: p.desempeno.maximoTolerableWqSegundos,
  };
}

console.log(`Diagnóstico de cola: ${semillas.length} réplicas por conteo`);

const resultados = ordenConteos.map((clave) => {
  const resumen = correrYResumir(configuracionDe(clave), semillas);
  console.log(`  ${clave}`);
  return { clave, resumen };
});

// ------------------------------------------------------------------ formato ---

const coma = (texto) => texto.replace('.', ',');
const n = (x, dec = 1) => (x === null || x === undefined ? '—' : coma(x.toFixed(dec)));

const lineas = [];
const w = (texto = '') => lineas.push(texto);

w('# Diagnóstico de la cola: campo contra simulación');
w();
w('Generado por `npm run diagnostico` el ' + new Date().toISOString().slice(0, 10) + '.');
w('**No editar a mano:** este archivo se regenera.');
w();
w('## Qué se compara y qué se puede concluir');
w();
w('Las lecturas de campo son la **fila más larga de una sola caseta** en el');
w('intervalo (DEC-024). El motor simula una **cola única** por sentido, así que');
w('la variable que reporta es la **cola total** del sentido. Las dos no son la');
w('misma cosa, pero sí guardan una desigualdad que se puede usar:');
w();
w('> cola total real ≥ fila más larga de una caseta = lectura observada');
w();
w('De ahí sale el único criterio limpio que hay:');
w();
w('- Si la **cola total simulada queda por debajo de la lectura observada**, el');
w('  modelo **subestima con certeza**: está poniendo menos vehículos en todo el');
w('  sentido que los que en campo había en una sola fila.');
w('- Si queda por encima, **no se puede concluir nada**: la cola total real');
w('  también estaba por encima de la lectura y no se sabe cuánto.');
w();
w('Por eso la columna que importa es la marca `SUBESTIMA`. Lo demás es contexto.');
w();

const CORTE = '⚠️ SUBESTIMA';

let totalIntervalos = 0;
let totalSubestima = 0;
let totalSubestimaSiempre = 0;

for (const { clave, resumen } of resultados) {
  const c = conteos[clave];
  w(`## ${clave}`);
  w();
  w(`${c.etiqueta}`);
  w();
  w(`- Casetas observadas: \`[${c.casetas.join(', ')}]\``);
  w(`- Cola inicial: ${COLA_INICIAL[clave]} vehículos`);
  w(`- ${semillas.length} réplicas, semillas ${semillas[0]}…${semillas.at(-1)}`);
  w();
  w('| Intervalo | Llegadas | Casetas | Fila más larga obs. | Cola total sim. (media) | Rango sim. | ¿Subestima? |');
  w('|---|---|---|---|---|---|---|');

  let subestimaConteo = 0;
  let subestimaSiempreConteo = 0;

  resumen.porIntervalo.forEach((it, i) => {
    const obs = c.cola[i];
    const sim = it.colaMuestreada;
    const subestimaEnMedia = sim.media < obs;
    // Caso más fuerte: ni la peor réplica llega a la lectura observada.
    const subestimaSiempre = sim.maximo < obs;
    totalIntervalos += 1;
    if (subestimaEnMedia) {
      subestimaConteo += 1;
      totalSubestima += 1;
    }
    if (subestimaSiempre) {
      subestimaSiempreConteo += 1;
      totalSubestimaSiempre += 1;
    }
    const marca = subestimaSiempre
      ? `${CORTE} (en las ${semillas.length})`
      : subestimaEnMedia
        ? `${CORTE} (en media)`
        : 'no concluyente';
    w(
      `| ${i + 1} | ${c.llegadas[i]} | ${c.casetas[i]} | ${obs} | ${n(sim.media)} ` +
        `| ${n(sim.minimo, 0)}–${n(sim.maximo, 0)} | ${marca} |`,
    );
  });
  w();
  w(
    `**${clave}:** la cola total simulada queda por debajo de la fila más larga` +
      ` observada en **${subestimaConteo} de ${c.cola.length} intervalos** en media,` +
      ` y en **${subestimaSiempreConteo} de ${c.cola.length}** ni la peor de las ${semillas.length} réplicas` +
      ' llega a la lectura.',
  );
  w();
}

w('## Resumen');
w();
w('| Conteo | Intervalos | Subestima en media | Subestima en las 30 réplicas |');
w('|---|---|---|---|');
for (const { clave, resumen } of resultados) {
  const c = conteos[clave];
  let enMedia = 0;
  let siempre = 0;
  resumen.porIntervalo.forEach((it, i) => {
    if (it.colaMuestreada.media < c.cola[i]) enMedia += 1;
    if (it.colaMuestreada.maximo < c.cola[i]) siempre += 1;
  });
  w(`| ${clave} | ${c.cola.length} | ${enMedia} | ${siempre} |`);
}
w(`| **total** | **${totalIntervalos}** | **${totalSubestima}** | **${totalSubestimaSiempre}** |`);
w();
w('## Lectura');
w();
w(
  `De los ${totalIntervalos} intervalos de los cuatro conteos, en **${totalSubestima}** la cola total` +
    ' simulada queda por debajo de la fila más larga que se observó en una sola',
);
w(
  `caseta, y en **${totalSubestimaSiempre}** eso pasa en las ${semillas.length} réplicas sin excepción. En esos` +
    ' intervalos el modelo subestima la cola con certeza, porque la cola total',
);
w('real era por construcción mayor o igual que la lectura.');
w();

const festivo = resultados.find((r) => r.clave === 'festivoPC');
let festivoSiempre = 0;
festivo.resumen.porIntervalo.forEach((it, i) => {
  if (it.colaMuestreada.maximo < conteos.festivoPC.cola[i]) festivoSiempre += 1;
});

w(
  `El festivo es el caso extremo: en **${festivoSiempre} de ${conteos.festivoPC.cola.length} intervalos** ni la réplica` +
    ' más congestionada de las 30 alcanza la lectura de campo. La cola total',
);
w('simulada se vacía hacia el final de la hora mientras en campo la fila más');
w(
  `larga todavía marcaba ${conteos.festivoPC.cola.at(-1)} vehículos en el último intervalo.`,
);
w();
w('**Qué no dice este diagnóstico.** No dice cuánto vale la cola total real, que');
w('nunca se midió, ni permite estimar `Wq` observado: para eso haría falta el');
w('total por sentido. Tampoco permite derivar un tiempo de servicio implícito');
w('(ver DEC-024, consecuencia 5): con filas por caseta puede haber una caseta');
w('libre y otra con cola al mismo tiempo, así que la holgura de capacidad se');
w('explica por el desbalance sin necesidad de suponer un servicio más lento.');
w();
w('**Qué sí deja fijado.** Que el modelo de cola única subestima la congestión');
w('del pico, y por cuánto como mínimo. Las casetas que recomiende la regla de la');
w('fase 2 hay que leerlas como **cota inferior** (PEN-008).');
w();

mkdirSync(dirname(SALIDA), { recursive: true });
writeFileSync(SALIDA, lineas.join('\n') + '\n', 'utf8');
console.log(`\nEscrito ${SALIDA}`);
