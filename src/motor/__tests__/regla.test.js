import { describe, it, expect } from 'vitest';
import { simularSentido, MODO_CASETAS } from '../simulador.js';
import { correrReplicas } from '../lotes.js';
import { conteos } from '../../config/datos.js';
import { parametros, configuracionRegla, semillasReplicas } from '../../config/parametros.js';

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
