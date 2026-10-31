import { describe, it, expect } from 'vitest';
import { simularSentido, MODO_CASETAS } from '../simulador.js';
import { correrReplicas } from '../lotes.js';
import { conteos } from '../../config/datos.js';
import { parametros, configuracionRegla, semillasReplicas } from '../../config/parametros.js';
import {
  construirEscenario,
  problemasDelEscenario,
  umbralAbrirPorTasa,
} from '../../config/escenario.js';
import { capacidadNominal } from '../simulador.js';
import { perfilRampa } from '../../config/escenarios.js';

const p = parametros;
const SEGUNDOS_POR_MINUTO = 60;

/** Configuración de un conteo en modo regla. */
function conRegla(clave, { regla = {}, ...extra } = {}) {
  return {
    semilla: 1,
    llegadas: conteos[clave].llegadas,
    casetasProgramadas: conteos[clave].casetas,
    modoCasetas: MODO_CASETAS.REGLA,
    regla: { ...configuracionRegla(), ...regla },
    duracionIntervaloSegundos: p.tiempo.duracionIntervaloSegundos,
    gammaForma: p.servicio.gammaForma,
    gammaEscalaSegundos: p.servicio.gammaEscalaSegundos,
    maximoTolerableWqSegundos: p.desempeno.maximoTolerableWqSegundos,
    ...extra,
  };
}

/**
 * Configuración sintética: un solo nivel de demanda sostenido durante
 * `intervalos` tramos, con las casetas iniciales que se pidan.
 */
function sintetica({
  llegadasPorIntervalo,
  intervalos = 12,
  casetasIniciales = 1,
  colaInicial = 0,
  regla = {},
  semilla = 1,
}) {
  return {
    semilla,
    llegadas: new Array(intervalos).fill(llegadasPorIntervalo),
    casetasProgramadas: new Array(intervalos).fill(casetasIniciales),
    modoCasetas: MODO_CASETAS.REGLA,
    regla: { ...configuracionRegla(), ...regla },
    colaInicial,
    casetasIniciales,
    duracionIntervaloSegundos: p.tiempo.duracionIntervaloSegundos,
    gammaForma: p.servicio.gammaForma,
    gammaEscalaSegundos: p.servicio.gammaEscalaSegundos,
    maximoTolerableWqSegundos: p.desempeno.maximoTolerableWqSegundos,
    guardarEsperas: true,
  };
}

/** Número de casetas abiertas reconstruido del tiempo por nivel. */
function nivelesVisitados(r) {
  return r.tiempoPorCasetasAbiertas.map((t, c) => (t > 0 ? c : null)).filter((c) => c !== null);
}

describe('límites de c', () => {
  it('c nunca baja del mínimo ni pasa del máximo, con cualquier demanda', () => {
    for (const llegadasPorIntervalo of [1, 20, 60, 124, 300]) {
      for (const casetasIniciales of [1, 3, 5]) {
        const r = simularSentido(sintetica({ llegadasPorIntervalo, casetasIniciales }));
        for (const c of nivelesVisitados(r)) {
          expect(c).toBeGreaterThanOrEqual(p.casetas.minimoPorSentido);
          expect(c).toBeLessThanOrEqual(p.casetas.maximoPorSentido);
        }
      }
    }
  });

  it('con demanda altísima y sostenida, c llega a 5 y se queda ahí', () => {
    const r = simularSentido(sintetica({ llegadasPorIntervalo: 200, casetasIniciales: 1 }));
    expect(r.tiempoPorCasetasAbiertas[5]).toBeGreaterThan(0);
    // La última parte de la hora debe estar entera en 5 casetas.
    const horizonte = p.tiempo.horizonteSegundos;
    expect(r.tiempoPorCasetasAbiertas[5]).toBeGreaterThan(horizonte / 2);
    expect(r.cierres).toBe(0); // con esa cola nunca procede cerrar
  });

  it('con demanda mínima, c baja a 1 y no sigue bajando', () => {
    // Bajar de 5 a 1 son 4 cierres y cada uno exige la ventana de 15 min
    // completa, que se reinicia tras cada cierre (DEC-026, punto 3): en una
    // hora justa el nivel 1 se alcanzaría exactamente al final. Se dan 2 horas
    // para que haya tramo con c = 1 que medir.
    const r = simularSentido(sintetica({ llegadasPorIntervalo: 2, casetasIniciales: 5, intervalos: 24 }));
    expect(r.cierres).toBe(4);
    expect(r.tiempoPorCasetasAbiertas[1]).toBeGreaterThan(0);
    expect(r.tiempoPorCasetasAbiertas[0]).toBe(0);
    expect(Math.min(...nivelesVisitados(r))).toBe(1);
  });

  it('con umbrales enormes c no cambia nunca', () => {
    const r = simularSentido(
      sintetica({
        llegadasPorIntervalo: 124,
        casetasIniciales: 3,
        regla: {
          abrirSiColaMayorQue: { 1: 1e9, 2: 1e9, 3: 1e9, 4: 1e9, 5: null },
          cerrarSiColaMenorQue: { 1: null, 2: -1, 3: -1, 4: -1, 5: -1 },
        },
      }),
    );
    expect(r.aperturas).toBe(0);
    expect(r.cierres).toBe(0);
    expect(r.cambiosDeC).toBe(0);
    expect(nivelesVisitados(r)).toEqual([3]);
  });
});

describe('apertura', () => {
  it('la caseta abre exactamente en t + demora', () => {
    // Cola inicial muy por encima del umbral de apertura con 1 caseta (> 4):
    // la orden se da en la primera evaluación, en t = 0.
    for (const demoraMinutos of [0, 5, 10]) {
      const demora = demoraMinutos * SEGUNDOS_POR_MINUTO;
      const r = simularSentido(
        sintetica({
          llegadasPorIntervalo: 120,
          casetasIniciales: 1,
          colaInicial: 30,
          regla: { demoraAperturaSegundos: demora },
        }),
      );
      // Antes de la apertura hay exactamente 1 caseta; el tiempo con 1 caseta
      // es la demora (más 0 si la demora es 0).
      expect(r.tiempoPorCasetasAbiertas[1]).toBeCloseTo(demora, 6);
    }
  });

  it('no hay dos aperturas pendientes a la vez', () => {
    // Con demora de 10 min y cola enorme, la regla querría abrir en cada
    // llegada. Si admitiera varias pendientes, en la hora abriría muchas más.
    const demora = 10 * SEGUNDOS_POR_MINUTO;
    const r = simularSentido(
      sintetica({
        llegadasPorIntervalo: 200,
        casetasIniciales: 1,
        colaInicial: 50,
        regla: { demoraAperturaSegundos: demora },
      }),
    );
    // De 1 a 5 casetas hay 4 aperturas, y cada una necesita 10 min: en 60 min
    // caben las 4 justas, nunca más. Con varias pendientes a la vez abriría
    // antes y saldrían más niveles en menos tiempo.
    expect(r.aperturas).toBe(4);
    // Ningún nivel de c duró menos que la demora: cada apertura esperó lo suyo.
    // Duran un poco más porque la siguiente se ordena en la primera llegada o
    // fin de servicio posterior a la apertura, no en el instante exacto
    // (DEC-026, punto 6). Ese desfase es de segundos.
    const DESFASE_MAXIMO_SEGUNDOS = 30;
    for (const c of [1, 2, 3, 4]) {
      expect(r.tiempoPorCasetasAbiertas[c]).toBeGreaterThanOrEqual(demora);
      expect(r.tiempoPorCasetasAbiertas[c]).toBeLessThan(demora + DESFASE_MAXIMO_SEGUNDOS);
    }
    // La primera sí es exacta: se ordena en t = 0, en la evaluación inicial.
    expect(r.tiempoPorCasetasAbiertas[1]).toBeCloseTo(demora, 6);
  });

  it('la apertura ordenada se consuma aunque la cola ya haya bajado', () => {
    // Una sola ráfaga: cola inicial 30 con 1 caseta dispara la apertura, pero
    // sin llegadas nuevas la cola se vacía antes de los 10 min de demora.
    const demora = 10 * SEGUNDOS_POR_MINUTO;
    const r = simularSentido({
      semilla: 3,
      llegadas: new Array(12).fill(0),
      casetasProgramadas: new Array(12).fill(1),
      modoCasetas: MODO_CASETAS.REGLA,
      regla: { ...configuracionRegla(), demoraAperturaSegundos: demora },
      colaInicial: 30,
      casetasIniciales: 1,
      duracionIntervaloSegundos: p.tiempo.duracionIntervaloSegundos,
      gammaForma: p.servicio.gammaForma,
      gammaEscalaSegundos: p.servicio.gammaEscalaSegundos,
      maximoTolerableWqSegundos: p.desempeno.maximoTolerableWqSegundos,
    });
    // 30 vehículos a ~12 s cada uno son ~6 min: la cola se vació antes de los 10.
    expect(r.colaFinal).toBe(0);
    // Y la caseta abrió igual (DEC-026, punto 10).
    expect(r.aperturas).toBe(1);
    expect(r.tiempoPorCasetasAbiertas[2]).toBeGreaterThan(0);
  });

  it('no abre si la cola no supera el umbral', () => {
    // Umbral de apertura con 1 caseta: cola > 4. Con cola inicial 4 justa y
    // sin llegadas, no se cumple.
    const r = simularSentido({
      semilla: 1,
      llegadas: new Array(12).fill(0),
      casetasProgramadas: new Array(12).fill(1),
      modoCasetas: MODO_CASETAS.REGLA,
      regla: { ...configuracionRegla(), demoraAperturaSegundos: 0 },
      colaInicial: p.regla.abrirSiColaMayorQue[1] + 1, // 1 entra a servicio, quedan 4
      casetasIniciales: 1,
      duracionIntervaloSegundos: p.tiempo.duracionIntervaloSegundos,
      gammaForma: p.servicio.gammaForma,
      gammaEscalaSegundos: p.servicio.gammaEscalaSegundos,
      maximoTolerableWqSegundos: p.desempeno.maximoTolerableWqSegundos,
    });
    expect(r.aperturas).toBe(0);
  });
});

describe('cierre', () => {
  it('exige la ventana completa bajo el umbral antes de cerrar', () => {
    const ventana = p.regla.ventanaCierreSegundos;
    // Demanda baja con 2 casetas: la cola está casi siempre bajo 2 (umbral de
    // cierre con c = 2), así que cierra en cuanto se completa la ventana.
    const r = simularSentido(
      sintetica({ llegadasPorIntervalo: 3, casetasIniciales: 2, semilla: 4 }),
    );
    expect(r.cierres).toBe(1);
    // No pudo cerrar antes de completar la ventana.
    expect(r.tiempoPorCasetasAbiertas[2]).toBeGreaterThanOrEqual(ventana);
  });

  it('con ventana más larga que el horizonte no cierra nunca', () => {
    const r = simularSentido(
      sintetica({
        llegadasPorIntervalo: 3,
        casetasIniciales: 3,
        regla: { ventanaCierreSegundos: p.tiempo.horizonteSegundos * 2 },
      }),
    );
    expect(r.cierres).toBe(0);
    expect(nivelesVisitados(r)).toEqual([3]);
  });

  it('el conteo se reinicia si la cola sube por encima del umbral', () => {
    // Misma demanda baja, pero con una ventana que apenas cabe una vez en la
    // hora: cualquier reinicio impide el cierre. Con demanda más alta (la cola
    // toca el umbral a menudo) no debe cerrar; con demanda casi nula, sí.
    const comun = { casetasIniciales: 2, regla: { ventanaCierreSegundos: 45 * SEGUNDOS_POR_MINUTO } };
    const casiVacio = simularSentido(sintetica({ ...comun, llegadasPorIntervalo: 1, semilla: 7 }));
    const conRepuntes = simularSentido(sintetica({ ...comun, llegadasPorIntervalo: 24, semilla: 7 }));
    expect(casiVacio.cierres).toBe(1);
    expect(conRepuntes.cierres).toBe(0);
  });

  it('tras cerrar una, la ventana empieza de nuevo', () => {
    // Con 3 casetas y demanda casi nula haría falta bajar a 1, o sea 2 cierres.
    // Si la ventana no se reiniciara tras el primer cierre, el segundo saldría
    // en el mismo instante. Con ventana de 20 min solo cabe un cierre más.
    const ventana = 20 * SEGUNDOS_POR_MINUTO;
    const r = simularSentido(
      sintetica({
        llegadasPorIntervalo: 1,
        casetasIniciales: 3,
        regla: { ventanaCierreSegundos: ventana },
        semilla: 5,
      }),
    );
    expect(r.cierres).toBe(2);
    expect(r.tiempoPorCasetasAbiertas[3]).toBeGreaterThanOrEqual(ventana);
    expect(r.tiempoPorCasetasAbiertas[2]).toBeGreaterThanOrEqual(ventana);
  });

  it('ninguna atención en curso se interrumpe', () => {
    // Todos los vehículos que entraron al sistema salen atendidos: si un cierre
    // cortara un servicio, el vehículo se perdería y la cuenta no cerraría.
    for (const llegadasPorIntervalo of [1, 3, 20, 60, 124]) {
      for (const casetasIniciales of [1, 3, 5]) {
        const r = simularSentido(
          sintetica({ llegadasPorIntervalo, casetasIniciales, colaInicial: 7 }),
        );
        expect(r.atendidosTotal).toBe(r.llegadasSimuladas + 7);
        expect(r.colaFinal).toBe(0);
        for (const espera of r.esperas) expect(espera).toBeGreaterThanOrEqual(0);
      }
    }
  });
});

describe('reproducibilidad del modo regla', () => {
  it('con la misma semilla el resultado es idéntico', () => {
    const a = simularSentido(conRegla('festivoPC', { semilla: 9, colaInicial: 23 }));
    const b = simularSentido(conRegla('festivoPC', { semilla: 9, colaInicial: 23 }));
    expect(a).toEqual(b);
  });

  it('con semillas distintas el resultado cambia', () => {
    const a = simularSentido(conRegla('festivoPC', { semilla: 1, colaInicial: 23 }));
    const b = simularSentido(conRegla('festivoPC', { semilla: 2, colaInicial: 23 }));
    expect(a.wqHoraSegundos).not.toBe(b.wqHoraSegundos);
  });

  it('las 30 réplicas se repiten exactamente', () => {
    const base = conRegla('domingoCP');
    const semillas = semillasReplicas();
    expect(correrReplicas(base, semillas)).toEqual(correrReplicas(base, semillas));
  });
});

describe('validación de la configuración de la regla', () => {
  it('rechaza un modo desconocido', () => {
    expect(() => simularSentido(conRegla('viernes', { modoCasetas: 'inventado' }))).toThrow(TypeError);
  });

  it('exige la configuración de la regla en modo regla', () => {
    const config = conRegla('viernes');
    delete config.regla;
    expect(() => simularSentido(config)).toThrow(TypeError);
  });

  it('exige cada campo de la regla', () => {
    for (const campo of [
      'abrirSiColaMayorQue',
      'cerrarSiColaMenorQue',
      'demoraAperturaSegundos',
      'ventanaCierreSegundos',
      'maximoCasetas',
      'minimoCasetas',
    ]) {
      const config = conRegla('viernes');
      delete config.regla[campo];
      expect(() => simularSentido(config), campo).toThrow(TypeError);
    }
  });

  it('rechaza límites de casetas imposibles', () => {
    expect(() => simularSentido(conRegla('viernes', { regla: { minimoCasetas: 0 } }))).toThrow(RangeError);
    expect(() =>
      simularSentido(conRegla('viernes', { regla: { minimoCasetas: 3, maximoCasetas: 2 } })),
    ).toThrow(RangeError);
    expect(() =>
      simularSentido(conRegla('viernes', { regla: { demoraAperturaSegundos: -1 } })),
    ).toThrow(RangeError);
    expect(() =>
      simularSentido(conRegla('viernes', { regla: { ventanaCierreSegundos: -1 } })),
    ).toThrow(RangeError);
  });
});

describe('el modo programado no cambió', () => {
  it('es el modo por defecto', () => {
    const config = conRegla('viernes');
    delete config.modoCasetas;
    delete config.regla;
    expect(simularSentido(config).modoCasetas).toBe(MODO_CASETAS.PROGRAMADO);
  });

  it('en modo programado c sigue el conteo y la regla no interviene', () => {
    const r = simularSentido({
      semilla: 1,
      llegadas: conteos.festivoPC.llegadas,
      casetasProgramadas: conteos.festivoPC.casetas,
      colaInicial: 23,
      duracionIntervaloSegundos: p.tiempo.duracionIntervaloSegundos,
      gammaForma: p.servicio.gammaForma,
      gammaEscalaSegundos: p.servicio.gammaEscalaSegundos,
      maximoTolerableWqSegundos: p.desempeno.maximoTolerableWqSegundos,
    });
    // El conteo va de 4 a 5 casetas: una apertura, ningún cierre.
    expect(r.aperturas).toBe(1);
    expect(r.cierres).toBe(0);
    expect(r.carrilesIntervalo).toBeCloseTo(
      conteos.festivoPC.casetas.reduce((a, b) => a + b, 0),
      6,
    );
  });
});

// ===========================================================================
// Disparador anticipativo por tasa de llegadas (DEC-046)
// ===========================================================================

describe('disparador por tasa: la tabla de umbrales', () => {
  it('la fórmula reproduce los cuatro valores del contexto (21 / 46 / 70 / 95)', () => {
    const cap = capacidadNominal();
    const obtenidos = [1, 2, 3, 4].map((c) => umbralAbrirPorTasa(c, cap));
    expect(obtenidos).toEqual([21, 46, 70, 95]);
  });

  it('ningún otro desplazamiento entero los reproduce', () => {
    const cap = capacidadNominal();
    for (const tasaDesplazamiento of [0, 1, 2, 3, 5, 6, 7]) {
      const otros = [1, 2, 3, 4].map((c) =>
        umbralAbrirPorTasa(c, cap, { tasaDesplazamiento }),
      );
      expect(otros).not.toEqual([21, 46, 70, 95]);
    }
  });

  it('la tabla del escenario base es la del contexto', () => {
    const e = construirEscenario();
    expect(e.regla.abrirSiTasaMayorQue).toEqual({ 1: 21, 2: 46, 3: 70, 4: 95, 5: null });
  });

  it('sigue al tope por sentido, como las tablas de cola (DEC-031)', () => {
    const e = construirEscenario({ pozo: { total: 16, minimoPorSentido: 1, maximoPorSentido: 8 } });
    const tabla = e.regla.abrirSiTasaMayorQue;
    // Umbral para cada c de 1 a 7, y nada en el tope.
    for (let c = 1; c <= 7; c += 1) expect(typeof tabla[c]).toBe('number');
    expect(tabla[8]).toBeNull();
    // Monótona creciente: más casetas, más demanda hace falta para abrir otra.
    for (let c = 2; c <= 7; c += 1) expect(tabla[c]).toBeGreaterThan(tabla[c - 1]);
  });

  it('el escenario base trae el disparador apagado', () => {
    expect(construirEscenario().regla.disparadorPorTasa).toBe(false);
    expect(parametros.regla.disparadorPorTasa).toBe(false);
  });
});

describe('disparador por tasa: comportamiento del motor', () => {
  /** Umbrales de cola inalcanzables: lo único que puede abrir es la tasa. */
  const SIN_COLA = { abrirSiColaMayorQue: { 1: 1e9, 2: 1e9, 3: 1e9, 4: 1e9, 5: null } };

  it('apagado, no anticipa ninguna apertura', () => {
    const r = simularSentido(conRegla('festivoPC', { colaInicial: 23 }));
    expect(r.aperturasAnticipadas).toBe(0);
  });

  it('abre por tasa aunque la cola no cruce nunca su umbral', () => {
    // Demanda sostenida muy por encima de los 21 veh/5 min de c = 1.
    const config = sintetica({
      llegadasPorIntervalo: 60,
      casetasIniciales: 1,
      regla: { ...SIN_COLA, disparadorPorTasa: true },
    });
    const r = simularSentido(config);
    expect(r.aperturasAnticipadas).toBeGreaterThan(0);
    expect(Math.max(...nivelesVisitados(r))).toBeGreaterThan(1);
  });

  it('con el disparador apagado y los mismos umbrales, no abre nada', () => {
    const r = simularSentido(
      sintetica({ llegadasPorIntervalo: 60, casetasIniciales: 1, regla: SIN_COLA }),
    );
    expect(r.aperturas).toBe(0);
    expect(nivelesVisitados(r)).toEqual([1]);
  });

  it('no dispara por la cola inicial: mide demanda, no rezago (DEC-027)', () => {
    // Sin llegadas, la ventana móvil está vacía por mucha cola heredada que haya.
    const r = simularSentido(
      sintetica({
        llegadasPorIntervalo: 0,
        colaInicial: 80,
        casetasIniciales: 1,
        regla: { ...SIN_COLA, disparadorPorTasa: true },
      }),
    );
    expect(r.aperturasAnticipadas).toBe(0);
    expect(r.aperturas).toBe(0);
  });

  it('no abre por tasa estando en el tope de casetas', () => {
    const r = simularSentido(
      sintetica({
        llegadasPorIntervalo: 300,
        casetasIniciales: p.casetas.maximoPorSentido,
        regla: { ...SIN_COLA, disparadorPorTasa: true },
      }),
    );
    expect(nivelesVisitados(r)).toEqual([p.casetas.maximoPorSentido]);
    expect(r.aperturas).toBe(0);
  });

  it('en el festivo anticipa aperturas y pasa más tiempo en el tope', () => {
    const sin = simularSentido(conRegla('festivoPC', { colaInicial: 23 }));
    const con = simularSentido(
      conRegla('festivoPC', { colaInicial: 23, regla: { disparadorPorTasa: true } }),
    );
    expect(con.aperturasAnticipadas).toBeGreaterThan(0);
    expect(con.tiempoEnMaximoCasetas).toBeGreaterThanOrEqual(sin.tiempoEnMaximoCasetas);
  });

  it('apagado, el resultado es idéntico a no tener la tabla siquiera', () => {
    // Es la garantía de que leer la ventana móvil no tiene efectos laterales:
    // si los tuviera, cambiaría el ρ del árbitro y con él la fase 3.
    const conTabla = simularSentido(conRegla('festivoPC', { colaInicial: 23 }));
    const reglaSinTabla = { ...configuracionRegla() };
    delete reglaSinTabla.abrirSiTasaMayorQue;
    delete reglaSinTabla.disparadorPorTasa;
    const sinTabla = simularSentido(
      conRegla('festivoPC', { colaInicial: 23, regla: reglaSinTabla }),
    );
    expect(conTabla.wqHoraSegundos).toBe(sinTabla.wqHoraSegundos);
    expect(conTabla.carrilesIntervalo).toBe(sinTabla.carrilesIntervalo);
    expect(conTabla.numerosAleatoriosUsados).toBe(sinTabla.numerosAleatoriosUsados);
  });

  it('es reproducible: misma semilla, mismo resultado', () => {
    const uno = simularSentido(
      conRegla('festivoPC', { colaInicial: 23, regla: { disparadorPorTasa: true } }),
    );
    const dos = simularSentido(
      conRegla('festivoPC', { colaInicial: 23, regla: { disparadorPorTasa: true } }),
    );
    expect(uno).toEqual(dos);
  });

  it('exige la tabla si está encendido', () => {
    expect(() =>
      simularSentido(
        conRegla('festivoPC', {
          regla: { disparadorPorTasa: true, abrirSiTasaMayorQue: undefined },
        }),
      ),
    ).toThrow(/abrirSiTasaMayorQue/);
  });

  it('el escenario rechaza encenderlo con la tabla a medias', () => {
    // Solo el umbral de c = 1: faltan los de c = 2, 3 y 4.
    const problemas = problemasDelEscenario(
      construirEscenario({ regla: { disparadorPorTasa: true, abrirSiTasaMayorQue: { 1: 21 } } }),
    );
    expect(problemas.filter((m) => /umbral de tasa/.test(m))).toHaveLength(3);
  });

  it('el escenario con el disparador apagado no exige la tabla', () => {
    const problemas = problemasDelEscenario(
      construirEscenario({ regla: { disparadorPorTasa: false, abrirSiTasaMayorQue: { 1: 21 } } }),
    );
    expect(problemas.filter((m) => /umbral de tasa/.test(m))).toHaveLength(0);
  });
});

// ===========================================================================
// Arranque en frío: perfil de rampa y reacción de la regla (DEC-047)
// ===========================================================================

describe('perfil de rampa (DEC-047)', () => {
  const medido = conteos.festivoPC.llegadas;

  it('es una permutación del perfil medido: ni inventa ni pierde demanda', () => {
    const rampa = perfilRampa(medido);
    expect(rampa).toHaveLength(medido.length);
    expect(rampa.reduce((a, b) => a + b, 0)).toBe(medido.reduce((a, b) => a + b, 0));
    expect([...rampa].sort((a, b) => a - b)).toEqual([...medido].sort((a, b) => a - b));
  });

  it('va de menor a mayor', () => {
    const rampa = perfilRampa(medido);
    for (let i = 1; i < rampa.length; i += 1) {
      expect(rampa[i]).toBeGreaterThanOrEqual(rampa[i - 1]);
    }
  });

  it('no toca el arreglo que recibe', () => {
    const copia = [...medido];
    perfilRampa(medido);
    expect(medido).toEqual(copia);
  });
});

describe('instante de la primera orden de apertura (DEC-047)', () => {
  it('es null si la regla nunca abre', () => {
    const r = simularSentido(
      sintetica({
        llegadasPorIntervalo: 1,
        casetasIniciales: 1,
        regla: { abrirSiColaMayorQue: { 1: 1e9, 2: 1e9, 3: 1e9, 4: 1e9, 5: null } },
      }),
    );
    expect(r.aperturas).toBe(0);
    expect(r.instantePrimeraOrdenSegundos).toBeNull();
  });

  it('con cola inicial por encima del umbral, la orden sale en t = 0', () => {
    const r = simularSentido(
      sintetica({ llegadasPorIntervalo: 60, casetasIniciales: 1, colaInicial: 40 }),
    );
    expect(r.instantePrimeraOrdenSegundos).toBe(0);
  });

  it('en frío, el disparador por tasa pide la caseta antes que la regla por cola', () => {
    // El escenario del informe de arranque en frío: festivo sin cola heredada.
    const config = (disparadorPorTasa) =>
      conRegla('festivoPC', {
        colaInicial: 0,
        casetasIniciales: conteos.festivoPC.casetas[0],
        regla: { disparadorPorTasa },
      });
    const sin = correrReplicas(config(false), semillasReplicas());
    const con = correrReplicas(config(true), semillasReplicas());

    const media = (replicas) => {
      const ts = replicas
        .map((r) => r.instantePrimeraOrdenSegundos)
        .filter((t) => t !== null && t !== undefined);
      return { media: ts.reduce((a, b) => a + b, 0) / ts.length, cuantas: ts.length };
    };
    const a = media(sin);
    const b = media(con);

    // Con el disparador pide antes, y lo pide en todas las réplicas.
    expect(b.media).toBeLessThan(a.media);
    expect(b.cuantas).toBe(semillasReplicas().length);
    expect(a.cuantas).toBeLessThanOrEqual(b.cuantas);
  });
});
