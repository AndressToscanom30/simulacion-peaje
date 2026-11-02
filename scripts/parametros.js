#!/usr/bin/env node
/**
 * Genera `docs/parametros.md`: el catálogo de parámetros del modelo con su
 * valor por defecto leído del escenario base (DEC-030).
 *
 * Los valores por defecto no están escritos en el catálogo: se leen del
 * escenario, así que el documento no puede quedar desfasado.
 *
 * Uso: npm run parametros
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { CATALOGO_PARAMETROS, GRUPOS } from '../src/config/catalogoParametros.js';
import { esDerivado, leerDerivado } from '../src/config/derivados.js';
import { ESCENARIO_BASE, construirEscenario, mediaGeneradaSegundos } from '../src/config/escenario.js';
import { conteos } from '../src/config/datos.js';
import { SEGUNDOS_POR_MINUTO } from '../src/config/parametros.js';

const AQUI = dirname(fileURLToPath(import.meta.url));
const SALIDA = resolve(AQUI, '..', 'docs', 'parametros.md');

const base = construirEscenario();

/**
 * Lee una ruta del escenario. `sentidos[i]` se resuelve a todos los sentidos.
 *
 * Los parámetros **derivados** no viven en el escenario: se calculan (DEC-051).
 */
function valorPorDefecto(ruta) {
  if (esDerivado(ruta)) return leerDerivado(base, ruta);
  if (ruta.startsWith('sentidos[i]')) {
    const clave = ruta.slice('sentidos[i].'.length);
    return base.sentidos.map((s) => s[clave]);
  }
  return ruta.split('.').reduce((objeto, clave) => objeto?.[clave], base);
}

const coma = (texto) => String(texto).replace('.', ',');

/** Formatea un valor por defecto para la tabla. */
function formatear(valor, ruta) {
  if (Array.isArray(valor) && ruta.startsWith('sentidos[i]')) {
    return valor.map((v) => `\`${formatearSimple(v)}\``).join(' / ');
  }
  return `\`${formatearSimple(valor)}\``;
}

function formatearSimple(valor) {
  if (valor === null) return 'null';
  if (valor === undefined) return '—';
  if (typeof valor === 'boolean') return valor ? 'true' : 'false';
  if (typeof valor === 'number') return coma(valor);
  if (Array.isArray(valor)) {
    const unicos = [...new Set(valor)];
    return unicos.length === 1 ? `[${coma(unicos[0])} × ${valor.length}]` : `[${valor.map(coma).join(', ')}]`;
  }
  if (typeof valor === 'object') {
    return `{${Object.entries(valor)
      .map(([k, v]) => `${k}: ${formatearSimple(v)}`)
      .join(', ')}}`;
  }
  return String(valor);
}

/** Si el valor está en segundos, añade el equivalente en minutos. */
function anotacion(ruta, valor) {
  if (typeof valor !== 'number') return '';
  if (/Segundos$/.test(ruta) && valor >= SEGUNDOS_POR_MINUTO) {
    return ` (${coma(valor / SEGUNDOS_POR_MINUTO)} min)`;
  }
  return '';
}

const lineas = [];
const w = (texto = '') => lineas.push(texto);

w('# Catálogo de parámetros');
w();
w('Generado por `npm run parametros` el ' + new Date().toISOString().slice(0, 10) + '.');
w('**No editar a mano:** este archivo se regenera.');
w();
w('Todo valor del modelo es configurable (DEC-030). Esta es la lista completa,');
w('con el **valor por defecto leído del escenario base**, así que no puede');
w('quedar desfasada. Es también la especificación del formulario de la fase 5.');
w();
w('Un **escenario** es un objeto declarativo serializable a JSON');
w('(`src/config/escenario.js`). Se trabaja con escenario base más');
w('sobreescrituras: un escenario guarda solo lo que cambia. `validarEscenario`');
w('comprueba el resultado y devuelve los problemas en castellano.');
w();
w('```js');
w("import { construirEscenario, validarEscenario } from './src/config/escenario.js';");
w();
w('// Solo lo que cambia respecto del base:');
w('const miEscenario = construirEscenario({');
w("  nombre: 'pozo de 8 casetas',");
w('  pozo: { total: 8, maximoPorSentido: 7 },');
w('  regla: { abrirSiColaMayorQue: null, cerrarSiColaMenorQue: null }, // se regeneran');
w('});');
w('validarEscenario(miEscenario);');
w('```');
w();

// ------------------------------------------------------------------ tablas ---

for (const [clave, titulo] of Object.entries(GRUPOS)) {
  const delGrupo = CATALOGO_PARAMETROS.filter((x) => x.grupo === clave);
  if (delGrupo.length === 0) continue;

  w(`## ${titulo}`);
  w();
  if (clave === 'sentidos') {
    w('Hay un juego de estos por sentido. El **primero** de la lista usa el flujo');
    w('original del PRNG, así que un escenario con el segundo sentido sin demanda');
    w('reproduce exactamente el de un sentido solo (DEC-027, punto 1). Los valores');
    w('por defecto van como `P→C / C→P`.');
    w();
  }
  w('| Parámetro | Ruta | Significado | Unidad | Por defecto | Origen | Rango |');
  w('|---|---|---|---|---|---|---|');
  for (const p of delGrupo) {
    const valor = valorPorDefecto(p.ruta);
    const nota = Array.isArray(valor) ? '' : anotacion(p.ruta, valor);
    // Un derivado no se guarda en el escenario: se dice qué escribe al editarlo.
    const atadas = (p.rutasAtadas ?? []).map((r) => '`' + r + '`').join(' y ');
    const significado = p.derivado
      ? p.significado + ' **Derivado:** no se guarda; al editarlo escribe ' + atadas + '.'
      : p.significado;
    w(
      `| **${p.nombre}** | \`${p.ruta}\` | ${significado} | ${p.unidad} ` +
        `| ${formatear(valor, p.ruta)}${nota} | ${p.origen} | ${p.rango} |`,
    );
  }
  w();
}

// ------------------------------------------------------------- aclaraciones ---

w('## Dos aclaraciones que se prestan a confusión');
w();
const mediaGenerada = mediaGeneradaSegundos(base.servicio);
w('**La media que genera la gamma no es la media medida.** El contexto ajustó');
w(`\`k = ${coma(base.servicio.gammaForma)}\` y \`θ = ${coma(base.servicio.gammaEscalaSegundos)} s\` (DEC-004), que dan una media de`);
w(`**${coma(mediaGenerada.toFixed(4))} s**, mientras que las 50 mediciones dan **${coma(base.servicio.mediaNominalSegundos)} s**.`);
w(`La diferencia es de ${coma((base.servicio.mediaNominalSegundos - mediaGenerada).toFixed(4))} s y viene del ajuste, no de un error.`);
w('Los dos valores están en el escenario por separado: `gammaEscalaSegundos`');
w('genera el servicio y `mediaNominalSegundos` es el que usa la regla.');
w();
w('**El servicio nominal no cambia en el escenario de servicio lento.** La regla');
w('calcula ρ y la espera estimada con el tiempo que el **operador conoce**, que');
w('son los 12,10 s medidos, no con el servicio real del escenario (DEC-027,');
w('punto 7). Si usara los 15,5 s estaría decidiendo con información que en la');
w('realidad no tendría.');
w();

w('## Conteos disponibles');
w();
w('| Clave | Descripción | Llegadas (veh/h) | Casetas observadas | Cola máxima observada |');
w('|---|---|---|---|---|');
for (const [clave, conteo] of Object.entries(conteos)) {
  const total = conteo.llegadas.reduce((a, b) => a + b, 0);
  const casetas = [...new Set(conteo.casetas)];
  w(
    `| \`${clave}\` | ${conteo.etiqueta} | ${coma(total)} ` +
      `| ${casetas.length === 1 ? casetas[0] : `${Math.min(...conteo.casetas)}–${Math.max(...conteo.casetas)}`} ` +
      `| ${Math.max(...conteo.cola)} |`,
  );
}
w();
w('La cola observada es el **total de vehículos esperando por sentido**, sumando');
w('todas las casetas abiertas (DEC-042), que es la misma variable que simula el');
w('modelo. La cifra de la tabla es el máximo de las 12 lecturas puntuales del');
w('conteo. Ver `diagnostico-festivo.md`.');
w();

w('## Escenario base completo');
w();
w('Esto es lo que `construirEscenario()` devuelve sin sobreescrituras:');
w();
w('```json');
w(JSON.stringify(ESCENARIO_BASE, null, 2));
w('```');
w();

mkdirSync(dirname(SALIDA), { recursive: true });
writeFileSync(SALIDA, lineas.join('\n') + '\n', 'utf8');
console.log(`Escrito ${SALIDA} (${CATALOGO_PARAMETROS.length} parámetros)`);
