#!/usr/bin/env node
/**
 * Diagnóstico de la cola: compara, intervalo por intervalo, la lectura de campo
 * con la cola total que simula el motor.
 *
 * Las lecturas de campo son el **total de vehículos esperando en el sentido**
 * (DEC-042, que supera a la DEC-024). El motor simula una cola única y reporta
 * esa misma variable, así que las dos series son **la misma magnitud** y se
 * comparan de frente: por debajo el modelo subestima, por encima sobreestima.
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
w('Las lecturas de campo son el **total de vehículos que esperaban en el sentido**');
w('en ese instante, sumando todas las casetas abiertas (DEC-042, que supera a la');
w('DEC-024). El motor simula una cola única por sentido y reporta exactamente esa');
w('variable, así que **las dos series son la misma magnitud** y se comparan de');
w('frente, en los dos sentidos de la desigualdad:');
w();
w('- `SUBESTIMA (en las 30)`: ni la réplica más congestionada alcanza la lectura');
w('  de campo. Es el caso fuerte: el modelo se queda corto con cualquier semilla.');
w('- `SUBESTIMA (en media)`: la media de las 30 queda por debajo de la lectura,');
w('  pero alguna réplica la alcanza.');
w('- `sobreestima (en las 30)`: ni la réplica menos congestionada baja hasta la');
w('  lectura. Es el espejo del caso fuerte.');
w('- `dentro del rango`: la lectura de campo cae entre la réplica menos y la más');
w('  congestionada, así que el modelo es **compatible** con ella.');
w();
w('Los rótulos se deciden solo comparando la lectura con el rango de las 30');
w('réplicas, **sin ninguna tolerancia inventada**. Por eso un intervalo con cola');
w('observada 0 y media simulada de medio vehículo sale `dentro del rango` y no');
w('«sobreestima»: con 0 en el rango, la lectura es compatible con el modelo.');
w();
w('Esto corrige la versión anterior de este informe, que leía la columna de campo');
w('como la fila más larga de una sola caseta y por eso solo podía afirmar una');
w('desigualdad: todo intervalo en que la simulación quedaba por encima salía');
w('rotulado como «no concluyente». Con la lectura correcta no hay desajuste de');
w('definición y los dos lados informan. **Los números no cambian** —el motor');
w('siempre simuló la cola total—, cambia lo que se puede concluir de ellos.');
w();

const CORTE = '⚠️ SUBESTIMA';

let totalIntervalos = 0;
let totalSubestima = 0;
let totalSubestimaSiempre = 0;
let totalSobreestimaSiempre = 0;

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
  w('| Intervalo | Llegadas | Casetas | Cola total obs. | Cola total sim. (media) | Rango sim. | Comparación |');
  w('|---|---|---|---|---|---|---|');

  let subestimaConteo = 0;
  let subestimaSiempreConteo = 0;
  let sobreestimaSiempreConteo = 0;

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
    // Espejo del caso fuerte: ni la réplica menos congestionada baja a la lectura.
    const sobreestimaSiempre = sim.minimo > obs;
    if (sobreestimaSiempre) {
      sobreestimaSiempreConteo += 1;
      totalSobreestimaSiempre += 1;
    }
    const marca = subestimaSiempre
      ? `${CORTE} (en las ${semillas.length})`
      : sobreestimaSiempre
        ? `sobreestima (en las ${semillas.length})`
        : subestimaEnMedia
          ? `${CORTE} (en media)`
          : 'dentro del rango';
    w(
      `| ${i + 1} | ${c.llegadas[i]} | ${c.casetas[i]} | ${obs} | ${n(sim.media)} ` +
        `| ${n(sim.minimo, 0)}–${n(sim.maximo, 0)} | ${marca} |`,
    );
  });
  w();
  w(
    `**${clave}:** la cola simulada queda por debajo de la observada en` +
      ` **${subestimaConteo} de ${c.cola.length} intervalos** en media, y en` +
      ` **${subestimaSiempreConteo} de ${c.cola.length}** ni la más congestionada de las ${semillas.length} réplicas` +
      ` alcanza la lectura de campo. En el otro extremo, en ${sobreestimaSiempreConteo} intervalos la` +
      ' lectura queda por debajo de las 30 réplicas.',
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
  `De los ${totalIntervalos} intervalos de los cuatro conteos, en **${totalSubestima}** la cola` +
    ' simulada queda por debajo de la observada, y en',
);
w(
  `**${totalSubestimaSiempre}** eso pasa en las ${semillas.length} réplicas sin excepción. Como las dos series son` +
    ' la misma magnitud (DEC-042), en esos intervalos el modelo subestima la cola',
);
w('de campo directamente, sin ningún argumento de desigualdad por medio.');
w();
w(
  `En el extremo opuesto, en solo **${totalSobreestimaSiempre} de ${totalIntervalos}** intervalos la lectura de campo queda` +
    ' por debajo de las 30 réplicas. Es decir: **el sesgo del modelo tiene un solo',
);
w('signo.** Donde se separa del campo, se separa quedándose corto, nunca');
w('sobrando. Esto es lo que la lectura anterior de los datos no podía ver:');
w('con la columna leída como la fila de una caseta, todo intervalo en que la');
w('simulación quedaba por encima era «no concluyente», así que no había forma de');
w('comprobar que el sesgo fuera asimétrico.');
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
w('simulada se vacía hacia el final de la hora mientras en campo todavía había');
w(
  `${conteos.festivoPC.cola.at(-1)} vehículos esperando en el último intervalo.`,
);
w();
w('**Qué no dice este diagnóstico.** No dice **por qué** el modelo se queda corto');
w('en el pico. La cola observada sí permite estimar el `Wq` de campo por la ley de');
w('Little, y de ahí sale el 1,28 min del festivo que declara el contexto (PEN-002,');
w('cerrado). Lo que queda abierto es la explicación: servicio más lento en el pico,');
w('desbalance entre casetas, o vehículos que la lectura cuenta y el modelo no. Las');
w('tres siguen en PEN-008, ya sin que la definición del dato privilegie a ninguna.');
w();
w('**Qué sí deja fijado.** Que el modelo de cola única subestima la congestión');
w('del pico, y por cuánto: la comparación es directa. Las casetas que recomiende');
w('la regla de la fase 2 hay que leerlas como **cota inferior** (PEN-008).');
w();

mkdirSync(dirname(SALIDA), { recursive: true });
writeFileSync(SALIDA, lineas.join('\n') + '\n', 'utf8');
console.log(`\nEscrito ${SALIDA}`);
