#!/usr/bin/env node
/**
 * Compara las opciones de traspaso atendido y préstamo por colapso.
 *
 * En ambos perfiles se conserva la reasignación de la DEC-008 para medir los
 * traspasos: el festivo base y la demanda ×1,13 de E3, ambos con servicio base.
 * Las ocho corridas usan las semillas de `ESCENARIO_BASE` (DEC-010).
 *
 * Uso: npm run traspasos
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { correrEscenarios } from '../src/corridas.js';
import { ESCENARIO_BASE, semillasDe } from '../src/config/escenario.js';
import { catalogoTraspasos } from '../src/config/escenarios.js';

const AQUI = dirname(fileURLToPath(import.meta.url));
const SALIDA = resolve(AQUI, '..', 'docs', 'resultados', 'traspasos-prestamos.md');
const semillas = semillasDe(ESCENARIO_BASE);
const perfiles = [
  { clave: 'festivo', nombre: 'Festivo' },
  { clave: 'demanda-alta', nombre: 'Demanda ×1,13 (E3)' },
];

const casos = catalogoTraspasos();

console.log(`Traspasos y préstamos: ${casos.length} escenarios × ${semillas.length} réplicas`);
const resultados = correrEscenarios(casos, {
  alProgresar(caso, hechos) {
    console.log(`  ${hechos}/${casos.length}: ${caso.nombre}`);
  },
});

const coma = (texto) => String(texto).replace('.', ',');
const numero = (valor, decimales = 2) =>
  valor === null || valor === undefined ? '—' : coma(valor.toFixed(decimales));
const minutos = (resumen) =>
  `${numero(resumen.media / 60)} ± ${numero(resumen.semiamplitudIc95 / 60)}`;
const porcentaje = (fraccion) => `${numero(fraccion * 100, 1)} %`;
const lineas = [];
const escribir = (linea = '') => lineas.push(linea);
escribir('# Traspasos atendidos y préstamos por colapso');
escribir();
escribir(`Generado por \`npm run traspasos\` el ${new Date().toISOString().slice(0, 10)}.`);
escribir('**No editar a mano:** este archivo se regenera.');
escribir();
escribir(
  `Dos perfiles, cuatro variantes cada uno, ${semillas.length} réplicas por caso, semillas ${semillas[0]} a ${semillas.at(-1)}.`,
);
escribir('Cada grupo usa las mismas semillas para comparar con números aleatorios comunes (DEC-010).');
escribir('La reasignación de la DEC-008 permanece activa en todos los casos; la demanda alta es E3 ×1,13.');
escribir('Se reporta lo que salga: no se ajustaron umbrales ni parámetros.');
escribir();
escribir('| Perfil | Variante | Wq P→C (min) | Wq C→P (min) | Wq peaje (min) | Cola máx. muestr. (suma) | Carriles-int. | Préstamos/caso | Cumple |');
escribir('|---|---|---:|---:|---:|---:|---:|---:|---|');

for (const perfil of perfiles) {
  const filas = resultados.filter((r) => r.caso.grupo === perfil.clave);
  for (const r of filas) {
    const [pc, cp] = r.resumen.sentidos;
    const t = r.resumen.total;
    escribir(
      `| ${perfil.nombre} | ${r.caso.nombre.split(' · ')[1]} | ${minutos(pc.escalares.wqHoraSegundos)} | ${minutos(cp.escalares.wqHoraSegundos)} | ${minutos(t.wqHoraSegundos)} | ${numero(t.sumaColaMaximaMuestreada.media, 1)} | ${numero(t.carrilesIntervalo.media, 1)} | ${numero(r.resumen.pozo.prestamos.media, 2)} | ${r.cumplimiento.mediaCumple ? 'sí' : '**no**'} |`,
    );
  }
}

escribir();
escribir('`Wq` incluye el intervalo de confianza del 95 %; las colas máximas por sentido se suman, no son simultáneas.');
escribir('El modelo subestima el pico (PEN-008): estas cifras sirven para comparar variantes, no como predicción del peaje.');
escribir();

mkdirSync(dirname(SALIDA), { recursive: true });
writeFileSync(SALIDA, `${lineas.join('\n')}\n`, 'utf8');
console.log(`Informe escrito: ${SALIDA}`);
