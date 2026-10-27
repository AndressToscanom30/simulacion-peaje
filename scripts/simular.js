#!/usr/bin/env node
/**
 * Corrida por lotes de la validación de la fase 1.
 *
 * Corre 30 réplicas (semillas 1…30) de cada uno de los cuatro conteos con sus
 * casetas observadas y escribe `docs/resultados/validacion-fase1.md`.
 *
 * El festivo se corre dos veces: con cola inicial 23 (lo observado) y con cola
 * inicial 0, para ver cuánto de la espera viene del arranque.
 *
 * Se reporta lo que salga. Está prohibido ajustar parámetros para que la
 * simulación cuadre con lo observado (contexto, sección 6).
 *
 * Uso: npm run simular
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { correrYResumir, mmcDeConteo, moda } from '../src/motor/index.js';
import {
  conteos,
  observado,
  mmcDeclaradoMinutos,
  ordenConteos,
  DURACION_INTERVALO_SEGUNDOS,
} from '../src/config/datos.js';
import { parametros, HORIZONTE_SEGUNDOS, semillasReplicas } from '../src/config/parametros.js';

const AQUI = dirname(fileURLToPath(import.meta.url));
const SALIDA = resolve(AQUI, '..', 'docs', 'resultados', 'validacion-fase1.md');

const SEGUNDOS_POR_MINUTO = 60;
const p = parametros;
const semillas = semillasReplicas();

// --------------------------------------------------------------- escenarios ---

/**
 * Los casos a correr. El festivo arranca con 23 vehículos en cola y 4 casetas
 * (DEC-010); los demás con cola 0 y las casetas del primer intervalo observado.
 */
const casos = [
  ...ordenConteos.map((clave) => ({
    clave,
    nombre: clave,
    colaInicial: clave === 'festivoPC' ? 23 : 0,
  })),
  // Variante pedida aparte: el festivo sin la cola heredada.
  { clave: 'festivoPC', nombre: 'festivoPC_cola0', colaInicial: 0, variante: true },
];

function configuracionDe(clave, colaInicial) {
  return {
    llegadas: conteos[clave].llegadas,
    casetasProgramadas: conteos[clave].casetas,
    colaInicial,
    factorEscalaDemanda: p.llegadas.factorEscalaDemanda,
    duracionIntervaloSegundos: p.tiempo.duracionIntervaloSegundos,
    gammaForma: p.servicio.gammaForma,
    gammaEscalaSegundos: p.servicio.gammaEscalaSegundos,
    maximoTolerableWqSegundos: p.desempeno.maximoTolerableWqSegundos,
  };
}

/**
 * Espera estimada a partir de las lecturas de cola observadas, con la fórmula
 * del contexto (sección 3): `Wq_est = Lq × 12,1 / c`, intervalo por intervalo y
 * con la `c` de cada intervalo. Ver PEN-002.
 */
function wqObservadoRecalculadoMinutos(clave) {
  const { cola, casetas } = conteos[clave];
  const porIntervalo = cola.map((lq, i) => (lq * p.servicio.mediaObservadaSegundos) / casetas[i]);
  const mediaSegundos = porIntervalo.reduce((a, b) => a + b, 0) / porIntervalo.length;
  return mediaSegundos / SEGUNDOS_POR_MINUTO;
}

// ------------------------------------------------------------------ corrida ---

console.log(`Corriendo ${semillas.length} réplicas por caso (semillas ${semillas[0]}…${semillas.at(-1)})`);

const resultados = casos.map((caso) => {
  const inicio = Date.now();
  const resumen = correrYResumir(configuracionDe(caso.clave, caso.colaInicial), semillas);
  const casetasModa = moda(conteos[caso.clave].casetas);
  const referenciaMmc = mmcDeConteo({
    totalLlegadas: observado[caso.clave].caudalVehHora,
    horizonteSegundos: HORIZONTE_SEGUNDOS,
    mediaServicioSegundos: p.servicio.mediaObservadaSegundos,
    casetas: casetasModa,
  });
  console.log(`  ${caso.nombre.padEnd(18)} ${Date.now() - inicio} ms`);
  return { caso, resumen, referenciaMmc, casetasModa };
});

// ------------------------------------------------------------------ formato ---

/** Separador decimal en coma, como el resto de la documentación. */
const coma = (texto) => texto.replace('.', ',');

const n = (x, dec = 2) => (x === null || x === undefined ? '—' : coma(x.toFixed(dec)));
const min = (segundos, dec = 3) =>
  segundos === null || segundos === undefined
    ? '—'
    : coma((segundos / SEGUNDOS_POR_MINUTO).toFixed(dec));
const pct = (fraccion) => (fraccion === null ? '—' : `${coma((fraccion * 100).toFixed(1))} %`);
const rango = (r, dec = 0) => `${n(r.minimo, dec)}–${n(r.maximo, dec)}`;

const lineas = [];
const w = (texto = '') => lineas.push(texto);

w('# Validación de la fase 1');
w();
w('Generado por `npm run simular` el ' + new Date().toISOString().slice(0, 10) + '.');
w('**No editar a mano:** este archivo se regenera.');
w();
w('Motor de **un sentido** con `c(t)` programado, copiando las casetas que el');
w('operador tuvo abiertas en cada intervalo del conteo. Cada caso son');
w(`**${semillas.length} réplicas** con semillas ${semillas[0]} a ${semillas.at(-1)} (DEC-010).`);
w();
w('> Los parámetros son los del contexto y **no se tocaron** para que la');
w('> simulación cuadre con lo observado. Donde hay diferencia, está reportada');
w('> aquí y anotada en `docs/pendientes.md`.');
w();

w('## Configuración de la corrida');
w();
w('| Parámetro | Valor |');
w('|---|---|');
w(`| Servicio | gamma k = ${coma(String(p.servicio.gammaForma))}, θ = ${coma(String(p.servicio.gammaEscalaSegundos))} s |`);
w(`| Media de servicio | ${coma(String(p.servicio.mediaObservadaSegundos))} s (μ = ${n(3600 / p.servicio.mediaObservadaSegundos, 2)} veh/h por caseta) |`);
w(`| Llegadas | Poisson por tramos de ${DURACION_INTERVALO_SEGUNDOS} s, factor de demanda ${coma(String(p.llegadas.factorEscalaDemanda))} |`);
w(`| Horizonte | ${HORIZONTE_SEGUNDOS} s (${p.tiempo.intervalos} intervalos de 5 min) |`);
w(`| Réplicas | ${semillas.length} (semillas ${semillas[0]}…${semillas.at(-1)}) |`);
w(`| Máximo tolerable | ${coma(String(p.desempeno.maximoTolerableWqSegundos / SEGUNDOS_POR_MINUTO))} min |`);
w(`| Meta | ${coma(String(p.desempeno.metaWqSegundos / SEGUNDOS_POR_MINUTO))} min |`);
w(`| PRNG | mulberry32 con semilla (sin \`Math.random\`) |`);
w();

// ------------------------------------------------------------ tabla resumen ---

w('## Resumen por conteo');
w();
w('`±` es la semiamplitud del intervalo de confianza al 95 % de la media entre réplicas.');
w();
w('| Conteo | Llegadas obs. | Llegadas sim. | Caudal sim. (sal./h) | Cola máx. obs. | Cola máx. muestreada | Cola máx. continua | Wq obs. decl. | Wq M/M/c | Wq sim. |');
w('|---|---|---|---|---|---|---|---|---|---|');

for (const { caso, resumen, referenciaMmc } of resultados) {
  const e = resumen.escalares;
  const obs = observado[caso.clave];
  const etiqueta = caso.variante ? `${caso.clave} (cola inicial 0)` : caso.clave;
  w(
    `| ${etiqueta} | ${obs.caudalVehHora} | ${n(e.llegadasSimuladas.media, 1)} ± ${n(e.llegadasSimuladas.semiamplitudIc95, 1)} ` +
      `| ${n(e.caudalEnHorizonte.media, 1)} ± ${n(e.caudalEnHorizonte.semiamplitudIc95, 1)} ` +
      `| ${caso.variante ? '—' : obs.colaMaxima} ` +
      `| ${n(e.colaMaximaMuestreada.media, 1)} (${rango(e.colaMaximaMuestreada)}) ` +
      `| ${n(e.colaMaximaContinua.media, 1)} (${rango(e.colaMaximaContinua)}) ` +
      `| ${caso.variante ? '—' : n(obs.wqMinutosDeclarado, 2)} ` +
      `| ${min(referenciaMmc.wqSegundos, 2)} ` +
      `| **${min(e.wqHoraSegundos.media, 2)}** ± ${min(e.wqHoraSegundos.semiamplitudIc95, 3)} |`,
  );
}
w();
w('Esperas en minutos. `Wq obs. decl.` es el valor declarado en la sección 6 del');
w('contexto; `Wq M/M/c` es el Erlang C de referencia reconstruido según DEC-020.');
w();

// ----------------------------------------------------------- detalle por caso ---

w('## Detalle por conteo');
w();

for (const { caso, resumen, referenciaMmc, casetasModa } of resultados) {
  const e = resumen.escalares;
  const obs = observado[caso.clave];
  const c = conteos[caso.clave];
  const etiqueta = caso.variante
    ? `${c.etiqueta} — variante con cola inicial 0`
    : c.etiqueta;

  w(`### ${caso.nombre}`);
  w();
  w(`${etiqueta}`);
  w();
  w(`- Casetas observadas por intervalo: \`[${c.casetas.join(', ')}]\` (moda ${casetasModa})`);
  w(`- Cola inicial: ${caso.colaInicial} vehículos`);
  w(`- Carriles-intervalo observados: ${c.casetas.reduce((a, b) => a + b, 0)}`);
  w();
  w('| Medida | Observado | M/M/c | Simulación (media ± IC 95 %) | Rango entre réplicas |');
  w('|---|---|---|---|---|');
  w(
    `| Llegadas en la hora (veh) | ${obs.caudalVehHora} | — | ${n(e.llegadasSimuladas.media, 1)} ± ${n(e.llegadasSimuladas.semiamplitudIc95, 1)} | ${rango(e.llegadasSimuladas)} |`,
  );
  w(
    `| Caudal: salidas en la hora (veh) | — | — | ${n(e.caudalEnHorizonte.media, 1)} ± ${n(e.caudalEnHorizonte.semiamplitudIc95, 1)} | ${rango(e.caudalEnHorizonte)} |`,
  );
  w(
    `| Wq de la hora (min) | ${caso.variante ? '—' : n(obs.wqMinutosDeclarado, 2)} | ${min(referenciaMmc.wqSegundos, 2)} | ${min(e.wqHoraSegundos.media, 3)} ± ${min(e.wqHoraSegundos.semiamplitudIc95, 3)} | ${min(e.wqHoraSegundos.minimo, 3)}–${min(e.wqHoraSegundos.maximo, 3)} |`,
  );
  w(
    `| Wq sin la cola inicial (min) | — | — | ${min(e.wqHoraSinColaInicialSegundos.media, 3)} ± ${min(e.wqHoraSinColaInicialSegundos.semiamplitudIc95, 3)} | ${min(e.wqHoraSinColaInicialSegundos.minimo, 3)}–${min(e.wqHoraSinColaInicialSegundos.maximo, 3)} |`,
  );
  w(
    `| Cola máxima muestreada (veh) | ${caso.variante ? '—' : obs.colaMaxima} | — | ${n(e.colaMaximaMuestreada.media, 1)} ± ${n(e.colaMaximaMuestreada.semiamplitudIc95, 1)} | ${rango(e.colaMaximaMuestreada)} |`,
  );
  w(
    `| Cola máxima continua (veh) | — | — | ${n(e.colaMaximaContinua.media, 1)} ± ${n(e.colaMaximaContinua.semiamplitudIc95, 1)} | ${rango(e.colaMaximaContinua)} |`,
  );
  w(
    `| Cola al final de la hora (veh) | ${c.cola.at(-1)} | — | ${n(e.colaFinal.media, 1)} ± ${n(e.colaFinal.semiamplitudIc95, 1)} | ${rango(e.colaFinal)} |`,
  );
  w(
    `| Intervalos sobre ${coma(String(p.desempeno.maximoTolerableWqSegundos / SEGUNDOS_POR_MINUTO))} min | — | — | ${pct(e.fraccionIntervalosSobreUmbral.media)} | ${pct(e.fraccionIntervalosSobreUmbral.minimo)}–${pct(e.fraccionIntervalosSobreUmbral.maximo)} |`,
  );
  w(
    `| Carriles-intervalo | ${c.casetas.reduce((a, b) => a + b, 0)} | — | ${n(e.carrilesIntervalo.media, 2)} | ${rango(e.carrilesIntervalo, 2)} |`,
  );
  w(`| ρ del M/M/c | — | ${n(referenciaMmc.rho, 3)} | — | — |`);
  w();

  w('Intervalo por intervalo:');
  w();
  w('| Intervalo | Llegadas obs. | Casetas obs. | Cola obs. | Cola sim. (media) | Wq sim. (min) |');
  w('|---|---|---|---|---|---|');
  resumen.porIntervalo.forEach((it, i) => {
    w(
      `| ${i + 1} | ${c.llegadas[i]} | ${c.casetas[i]} | ${c.cola[i]} | ${n(it.colaMuestreada.media, 1)} | ${min(it.wqSegundos.media, 3)} |`,
    );
  });
  w();
}

// ------------------------------------------------------------------ lectura ---

w('## Lectura de los resultados');
w();
w('Todo lo de esta sección sale de los números de arriba; no hay ningún');
w('parámetro ajustado.');
w();

w('### Las llegadas quedan validadas');
w();
w('La media de llegadas simuladas cae sobre el conteo en los cuatro casos, así');
w('que el proceso de Poisson por tramos está reproduciendo la demanda:');
w();
w('| Conteo | Contado | Simulado (media ± IC 95 %) | Diferencia |');
w('|---|---|---|---|');
for (const { caso, resumen } of resultados) {
  if (caso.variante) continue;
  const e = resumen.escalares.llegadasSimuladas;
  const contado = observado[caso.clave].caudalVehHora;
  w(
    `| ${caso.clave} | ${contado} | ${n(e.media, 1)} ± ${n(e.semiamplitudIc95, 1)} ` +
      `| ${n(e.media - contado, 1)} (${n((100 * (e.media - contado)) / contado, 1)} %) |`,
  );
}
w();

w('### La simulación queda corta en espera y en cola, y en el festivo mucho');
w();
w('En los tres conteos normales la simulación da entre 0,42 y 0,69 veces la');
w('espera declarada. Eso **tiene sentido**: el servicio real es gamma con');
w('CV = 0,46, bastante menos variable que la exponencial que supone el M/M/c, y');
w('menos variabilidad en el servicio significa menos cola. Que la simulación');
w('quede por debajo del M/M/c en esos tres casos es lo esperado.');
w();
w('En el festivo pasa lo contrario de lo que pedía el contexto. El contexto');
w('esperaba que la simulación cerrara la brecha entre el M/M/c (0,06 min) y lo');
w('observado (1,28 min). La cierra en parte pero no del todo:');
w();
const festivo = resultados.find((r) => r.caso.nombre === 'festivoPC');
const wqFestivoMin = festivo.resumen.escalares.wqHoraSegundos.media / SEGUNDOS_POR_MINUTO;
const wqObsFestivo = observado.festivoPC.wqMinutosDeclarado;
const mmcFestivoMin = festivo.referenciaMmc.wqSegundos / SEGUNDOS_POR_MINUTO;
w(`- M/M/c: ${n(mmcFestivoMin, 3)} min, es decir ${n(wqObsFestivo / mmcFestivoMin, 0)} veces por debajo de lo observado.`);
w(`- Simulación: ${n(wqFestivoMin, 3)} min, ${n(wqObsFestivo / wqFestivoMin, 1)} veces por debajo de lo observado.`);
w(`- La simulación multiplica por ${n(wqFestivoMin / mmcFestivoMin, 1)} la espera del M/M/c, pero sigue a ${n(wqObsFestivo / wqFestivoMin, 1)}× de lo observado.`);
w();

w('### Por qué: en el festivo sobra capacidad para la cola que se observó');
w();
const carrilesFestivo = conteos.festivoPC.casetas.reduce((a, b) => a + b, 0);
const segundosServidor = carrilesFestivo * DURACION_INTERVALO_SEGUNDOS;
const capacidadFestivo = segundosServidor / p.servicio.mediaObservadaSegundos;
const demandaFestivo = observado.festivoPC.caudalVehHora + 23;
const servicioImplicito = segundosServidor / observado.festivoPC.caudalVehHora;
const utilizacionImplicita = (observado.festivoPC.caudalVehHora * p.servicio.mediaObservadaSegundos) / segundosServidor;
const colaMediaObservada = conteos.festivoPC.cola.reduce((a, b) => a + b, 0) / conteos.festivoPC.cola.length;

w('Esta es la raíz del desajuste, y es aritmética, no un problema del motor:');
w();
w(`- El operador tuvo ${carrilesFestivo} carriles-intervalo abiertos, o sea ${segundosServidor} segundos-caseta.`);
w(`- A ${coma(String(p.servicio.mediaObservadaSegundos))} s por vehículo, eso da capacidad para **${n(capacidadFestivo, 0)} vehículos** en la hora.`);
w(`- Llegaron ${observado.festivoPC.caudalVehHora} más ${23} de cola inicial = **${demandaFestivo} vehículos**.`);
w(`- Sobra un ${n(100 * (capacidadFestivo / demandaFestivo - 1), 0)} % de capacidad: la utilización implícita es **${n(100 * utilizacionImplicita, 0)} %**.`);
w();
w('Con una cola única FIFO eso es contradictorio con lo observado. La cola media');
w(`de las 12 lecturas del festivo es ${n(colaMediaObservada, 1)} vehículos y la última lectura es`);
w(`${conteos.festivoPC.cola.at(-1)}: la cola nunca se vació. Pero una cola única no puede tener`);
w('vehículos esperando y casetas desocupadas a la vez: en cuanto una caseta se');
w('libera, el primero de la cola entra. Si de verdad hubo cola toda la hora, las');
w(`casetas estuvieron ocupadas casi el 100 % del tiempo, y entonces atender ${observado.festivoPC.caudalVehHora}`);
w(`vehículos con ${segundosServidor} segundos-caseta exige un tiempo medio de atención de`);
w(`**${n(servicioImplicito, 1)} s**, no de ${coma(String(p.servicio.mediaObservadaSegundos))} s.`);
w();
w('Y es justo lo que se ve en la simulación: la cola se vacía. La cola al final');
w(`de la hora sale ${n(festivo.resumen.escalares.colaFinal.media, 1)} en las ${semillas.length} réplicas, contra ${conteos.festivoPC.cola.at(-1)} observados.`);
w();
w('Tres explicaciones posibles, ninguna descartable con los datos que hay:');
w();
w(`1. **El servicio del festivo fue más lento que los 12,10 s medidos.** Los 50`);
w('   tiempos se tomaron en otro sentido (Cúcuta→Pamplona) y en otro día, y el');
w(`   contexto ya lo declara como limitación (sección 8). Harían falta ≈ ${n(servicioImplicito, 1)} s`);
w('   para sostener la cola observada con esas casetas abiertas.');
w('2. **La cola estaba desbalanceada entre casetas.** El contexto también lo');
w('   declara (sección 8): en campo se vio desbalance, y el modelo de cola única');
w('   no lo reproduce. Con colas por caseta sí puede haber casetas libres y');
w('   vehículos esperando en otra fila al mismo tiempo.');
w('3. **Las lecturas de cola cuentan vehículos que el modelo no cuenta** (por');
w('   ejemplo motocicletas o vehículos de TAG en la misma fila).');
w();
w('Las tres se anotaron en `docs/pendientes.md`. **No se tocó ningún parámetro:**');
w('cambiar los 12,10 s a 15,5 s haría cuadrar la cola del festivo, y es');
w('exactamente lo que el contexto prohíbe en la sección 6.');
w();

w('### Lo demás que conviene saber');
w();
w('- **Carriles-intervalo:** coinciden exactamente con lo que hizo el operador en');
w('  los cuatro conteos, sin dispersión entre réplicas. El modo programado está');
w('  copiando bien `c(t)`.');
w('- **La cola inicial casi no pesa.** En el festivo, Wq pasa de');
w(`  ${min(resultados.find((r) => r.caso.nombre === 'festivoPC_cola0').resumen.escalares.wqHoraSegundos.media, 3)} min con cola 0 a ${n(wqFestivoMin, 3)} min con cola 23: los 23 vehículos`);
w('  heredados se drenan pronto y no explican la congestión observada.');
const umbralMin = coma(String(p.desempeno.maximoTolerableWqSegundos / SEGUNDOS_POR_MINUTO));
w(`- **Intervalos por encima del máximo tolerable de ${umbralMin} min:**`);
for (const { caso, resumen } of resultados) {
  const e = resumen.escalares.fraccionIntervalosSobreUmbral;
  w(`  ${caso.nombre}: ${pct(e.media)} de media (peor réplica ${pct(e.maximo)}).`);
}
w(`  El criterio de desempeño acepta hasta ${pct(p.desempeno.fraccionIntervalosSobreMaximoAceptada)}, así que según la`);
w('  simulación la operación observada lo cumple **incluso en el festivo**, que es');
w('  justo lo contrario de lo que sugiere la cola observada de 14 a 32 vehículos.');
w('  Es la misma brecha de arriba, vista desde el criterio.');
w(`- **Cola máxima:** se reportan dos. La continua (${n(festivo.resumen.escalares.colaMaximaContinua.media, 1)} en el festivo) es el`);
w(`  máximo real de la hora; la muestreada (${n(festivo.resumen.escalares.colaMaximaMuestreada.media, 1)}) es el máximo de 12 lecturas`);
w('  puntuales y es la comparable con las observadas, que se tomaron así (PEN-004).');
w();
// --------------------------------------------------------------- diferencias ---

w('## Diferencias contra lo observado');
w();
w('Lo que sigue describe las diferencias tal como salieron. **No se ajustó');
w('ningún parámetro** para reducirlas.');
w();
w('| Conteo | Cola máx. obs. | Cola máx. muestreada sim. | Wq obs. decl. (min) | Wq obs. recalculado (min) | Wq sim. (min) | Wq sim. ÷ Wq obs. decl. |');
w('|---|---|---|---|---|---|---|');
for (const { caso, resumen } of resultados) {
  if (caso.variante) continue;
  const e = resumen.escalares;
  const obs = observado[caso.clave];
  const simMin = e.wqHoraSegundos.media / SEGUNDOS_POR_MINUTO;
  w(
    `| ${caso.clave} | ${obs.colaMaxima} | ${n(e.colaMaximaMuestreada.media, 1)} | ${n(obs.wqMinutosDeclarado, 2)} ` +
      `| ${n(wqObservadoRecalculadoMinutos(caso.clave), 2)} | ${n(simMin, 3)} | ${n(simMin / obs.wqMinutosDeclarado, 2)}× |`,
  );
}
w();
w('`Wq obs. recalculado` aplica la fórmula del contexto (sección 3)');
w('`Wq_est = Lq × 12,1 / c` a las lecturas de cola, intervalo por intervalo.');
w('Que no coincida con el valor declarado es PEN-002.');
w();

mkdirSync(dirname(SALIDA), { recursive: true });
writeFileSync(SALIDA, lineas.join('\n') + '\n', 'utf8');
console.log(`\nEscrito ${SALIDA}`);
