/**
 * Periodo de calentamiento: deja que la cola inicial **emerja** del propio
 * modelo en vez de inyectarla con llegada en `t = 0` (DEC-049, PEN-003).
 *
 * La DEC-018 mete los 23 vehículos del festivo en `t = 0` sin espera previa,
 * lo que subestima su espera real. El autor de las mediciones confirmó que esa
 * cola «se formó como pudo haberse formado las colas de los siguientes
 * intervalos»: el sistema venía en el mismo régimen antes de las 4:25, sin
 * atasco excepcional previo. Eso es justo lo que un calentamiento simula.
 *
 * Cómo funciona: se simulan `intervalos` tramos previos a la hora observada con
 * la **tasa de llegadas del primer intervalo** y las **casetas iniciales** fijas,
 * y se lee qué vehículos quedaban en cola al final y cuánto llevaban esperando.
 * Esas esperas se le pasan al sentido como `colaInicialEsperas`, así que entran
 * con instante de llegada negativo y su espera cuenta desde que llegaron.
 *
 * El calentamiento **no se mide**: solo produce el estado inicial. Y corre en su
 * propio flujo de PRNG para que el tráfico previo no sea una copia del primer
 * intervalo de la hora observada.
 */

import { simularSentido, MODO_CASETAS } from './simulador.js';
import { derivarSemilla } from './prng.js';

/**
 * Esperas acumuladas de la cola que deja un periodo de calentamiento.
 *
 * @param {object} args
 * @param {number} args.llegadasPrimerIntervalo vehículos del primer intervalo
 *   observado; es la tasa con la que se calienta.
 * @param {number} args.casetasIniciales casetas abiertas durante el
 *   calentamiento, fijas: es la capacidad que el operador tenía al empezar.
 * @param {number} args.intervalos tramos de calentamiento (0 = sin calentar).
 * @param {number} args.duracionIntervaloSegundos
 * @param {number} args.gammaForma
 * @param {number} args.gammaEscalaSegundos
 * @param {number} args.semilla semilla de la réplica.
 * @param {number} args.flujo índice del flujo de PRNG del calentamiento.
 * @returns {number[]} segundos que llevaba esperando cada vehículo en cola al
 *   terminar el calentamiento. Vacío si `intervalos` es 0.
 */
export function esperasDeCalentamiento({
  llegadasPrimerIntervalo,
  casetasIniciales,
  intervalos,
  duracionIntervaloSegundos,
  gammaForma,
  gammaEscalaSegundos,
  semilla,
  flujo,
}) {
  if (!Number.isInteger(intervalos) || intervalos < 0) {
    throw new RangeError(`Los intervalos de calentamiento deben ser un entero ≥ 0, llegó: ${intervalos}`);
  }
  if (intervalos === 0) return [];

  const horizonte = intervalos * duracionIntervaloSegundos;

  const resultado = simularSentido({
    semilla: derivarSemilla(semilla, flujo),
    llegadas: new Array(intervalos).fill(llegadasPrimerIntervalo),
    casetasProgramadas: new Array(intervalos).fill(casetasIniciales),
    // `c` fija durante el calentamiento: se sabe con cuántas casetas arrancó la
    // hora observada, así que el periodo previo se simula con esa capacidad y la
    // regla no empieza a decidir hasta t = 0 (DEC-049).
    modoCasetas: MODO_CASETAS.PROGRAMADO,
    colaInicial: 0,
    casetasIniciales,
    duracionIntervaloSegundos,
    gammaForma,
    gammaEscalaSegundos,
    // No se usa ninguna medida de desempeño del calentamiento; hace falta por
    // la firma del motor.
    maximoTolerableWqSegundos: Number.POSITIVE_INFINITY,
    guardarEsperas: true,
  });

  // Quién estaba en cola al cerrar el calentamiento: llegó antes del horizonte y
  // su servicio no había empezado todavía. El motor sigue corriendo después del
  // horizonte para drenar la cola (DEC-019), así que no basta con mirar el
  // estado final: hay que reconstruirlo con los instantes.
  return resultado.vehiculos
    .filter(
      (v) =>
        v.instanteLlegada <= horizonte &&
        (v.instanteInicioServicio === undefined || v.instanteInicioServicio > horizonte),
    )
    .map((v) => horizonte - v.instanteLlegada);
}

/**
 * Añade a una configuración de sentido la cola inicial que deja el
 * calentamiento, en vez de la cola inicial inyectada de la DEC-018.
 *
 * Con `intervalos` a 0 devuelve la configuración **tal cual**, así que el
 * tratamiento de la DEC-018 sigue siendo el que manda por defecto y no cambia
 * ningún resultado publicado.
 *
 * @param {object} config configuración de sentido (la que espera el motor).
 * @param {object} args
 * @param {number} args.intervalos tramos de calentamiento.
 * @param {number} args.semilla semilla de la réplica.
 * @param {number} args.flujo índice del flujo de PRNG del calentamiento.
 */
export function conCalentamiento(config, { intervalos, semilla, flujo }) {
  if (!intervalos) return config;

  const esperas = esperasDeCalentamiento({
    llegadasPrimerIntervalo: config.llegadas[0],
    casetasIniciales: config.casetasIniciales ?? config.casetasProgramadas[0],
    intervalos,
    duracionIntervaloSegundos: config.duracionIntervaloSegundos,
    gammaForma: config.gammaForma,
    gammaEscalaSegundos: config.gammaEscalaSegundos,
    semilla,
    flujo,
  });

  return { ...config, colaInicial: 0, colaInicialEsperas: esperas };
}
