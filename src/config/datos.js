/**
 * Datos de campo. Transcritos de `docs/contexto/contexto-inicial.md`, sección 10.
 *
 * Este archivo es solo datos observados. No se edita para que un resultado
 * cuadre: si la simulación no reproduce lo observado, se reporta la diferencia
 * (contexto, sección 6).
 */

/** Duración de cada intervalo de conteo, en segundos. */
export const DURACION_INTERVALO_SEGUNDOS = 300;

/** Intervalos por conteo: 12 tramos de 5 min = 1 hora. */
export const INTERVALOS_POR_CONTEO = 12;

/**
 * Los cuatro conteos de campo. Cada arreglo tiene 12 posiciones, una por
 * intervalo de 5 min, en orden.
 *
 * - `llegadas`: vehículos de efectivo que llegaron en el intervalo (veh/5 min).
 * - `casetas`:  casetas de efectivo abiertas durante el intervalo.
 * - `cola`:     lectura puntual del total de vehículos esperando en el sentido
 *               (sin contar los que están siendo atendidos).
 * - `horaInicio`: hora a la que empieza el conteo, `hh:mm`. Es la misma que ya
 *               dice `etiqueta`, puesta aparte para poder rotular el día y la
 *               hora sin leer texto (DEC-052).
 */
export const conteos = {
  viernes: {
    etiqueta: 'Viernes 02/10/2026, Cúcuta→Pamplona, 12:00–13:00',
    horaInicio: '12:00',
    sentido: 'Cúcuta→Pamplona',
    llegadas: [18, 21, 24, 19, 17, 23, 22, 20, 18, 21, 16, 19], // 238
    casetas: [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
    cola: [0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0],
  },
  domingoCP: {
    etiqueta: 'Domingo 13/09/2026, Cúcuta→Pamplona, 11:50–12:50',
    horaInicio: '11:50',
    sentido: 'Cúcuta→Pamplona',
    llegadas: [30, 49, 38, 37, 35, 38, 46, 32, 33, 37, 38, 38], // 451
    casetas: [3, 3, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3],
    cola: [0, 0, 7, 0, 0, 4, 0, 5, 0, 0, 0, 6],
  },
  domingoPC: {
    etiqueta: 'Domingo 13/09/2026, Pamplona→Cúcuta, 13:00–14:00',
    horaInicio: '13:00',
    sentido: 'Pamplona→Cúcuta',
    llegadas: [10, 22, 22, 13, 11, 25, 18, 16, 14, 17, 12, 15], // 195
    casetas: [2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    cola: [0, 0, 6, 0, 0, 8, 2, 0, 0, 0, 0, 0],
  },
  festivoPC: {
    etiqueta: 'Festivo 12/10/2026, Pamplona→Cúcuta, 16:25–17:25',
    horaInicio: '16:25',
    sentido: 'Pamplona→Cúcuta',
    llegadas: [92, 78, 60, 108, 92, 124, 78, 102, 86, 101, 99, 44], // 1.064
    casetas: [4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 5],
    cola: [23, 30, 20, 26, 21, 32, 20, 15, 17, 28, 26, 14],
  },
};

/** Tiempos de atención medidos, en segundos. 50 mediciones, suma 605,08 s. */
export const tiemposAtencion = [
  8.89, 10.82, 11.49, 9.15, 15.90, 6.08, 9.79, 19.65, 10.38, 11.75,
  15.30, 20.10, 9.08, 17.80, 9.23, 4.45, 9.30, 10.72, 23.82, 13.33,
  5.61, 6.14, 21.41, 8.03, 23.22, 12.24, 14.04, 8.24, 14.88, 15.94,
  16.24, 7.93, 6.01, 13.04, 8.55, 7.62, 10.35, 14.81, 12.62, 29.18,
  6.25, 10.26, 9.05, 4.13, 5.64, 16.98, 7.97, 22.30, 8.58, 10.79,
];

/**
 * Valores observados que la fase 1 tiene que reproducir (contexto, sección 6).
 *
 * - `caudalVehHora`: total de llegadas contadas en la hora.
 * - `colaMaxima`: mayor de las 12 lecturas puntuales de cola.
 * - `wqMinutosDeclarado`: espera declarada en el contexto. Para los tres
 *   conteos normales el contexto dice que el M/M/c coincide con lo observado
 *   (0,06 / 0,24 / 0,41 min); en el festivo la observada es 1,28 min contra
 *   0,06 del M/M/c, unas 20 veces. Ver PEN-002: ese 1,28 no se reproduce con la
 *   fórmula de la sección 3, y el valor se deja tal como está declarado.
 * - `casetasModa`: casetas abiertas con más frecuencia en el conteo. Es la `c`
 *   con la que se evalúa el M/M/c de referencia (DEC-020).
 */
export const observado = {
  viernes: { caudalVehHora: 238, colaMaxima: 1, wqMinutosDeclarado: 0.06, casetasModa: 2 },
  domingoCP: { caudalVehHora: 451, colaMaxima: 7, wqMinutosDeclarado: 0.24, casetasModa: 2 },
  domingoPC: { caudalVehHora: 195, colaMaxima: 8, wqMinutosDeclarado: 0.41, casetasModa: 1 },
  festivoPC: { caudalVehHora: 1064, colaMaxima: 32, wqMinutosDeclarado: 1.28, casetasModa: 5 },
};

/**
 * M/M/c de referencia declarado en el contexto (sección 6), en minutos.
 * Coincide con lo observado en los tres conteos normales y se queda unas 20
 * veces corto en el festivo. Se guarda aparte de `observado` para poder
 * comparar las tres cosas: observado, M/M/c y simulación.
 */
export const mmcDeclaradoMinutos = {
  viernes: 0.06,
  domingoCP: 0.24,
  domingoPC: 0.41,
  festivoPC: 0.06,
};

/**
 * Tráfico mensual de la ANI 2026, en vehículos. Sirve **solo** como factor de
 * escala de demanda; no se sabe si incluye el carril TAG (ver PEN-001).
 * Enero queda ≈ 13 % sobre el promedio de febrero a julio.
 */
export const traficoMensualAni = {
  enero: 274302,
  febrero: 212615,
  marzo: 242800,
  abril: 226534,
  mayo: 244703,
  junio: 249383,
  julio: 252730,
};

/** Orden en el que se reportan los conteos. */
export const ordenConteos = ['viernes', 'domingoCP', 'domingoPC', 'festivoPC'];
