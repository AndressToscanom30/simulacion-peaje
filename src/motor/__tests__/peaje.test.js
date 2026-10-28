import { describe, it, expect } from 'vitest';
import { simularPeaje } from '../peaje.js';
import { simularSentido } from '../simulador.js';
import { MODO_CASETAS } from '../sentido.js';
import { derivarSemilla } from '../prng.js';
import { conteos } from '../../config/datos.js';
import { parametros, configuracionRegla, semillasReplicas } from '../../config/parametros.js';
import {
  escenarioFestivo,
  escenarioDiaNormal,
  sentidoInerte,
  configurarSentido,
  REGIMENES_SERVICIO,
  COLA_INICIAL,
} from '../../config/escenarios.js';

const p = parametros;
const SEGUNDOS_POR_MINUTO = 60;
const SEMILLAS = semillasReplicas();

/**
 * Corre el peaje vigilando los invariantes tras cada evento. Si alguno se rompe
 * lo deja anotado con el instante, para que el fallo diga dónde.
 */
function correrVigilando(config) {
  const fallos = [];
  const resultado = simularPeaje({
    ...config,
    observador({ instante, pozo, sentidos }) {
      for (const s of sentidos) {
        const abiertas = s.casetasAbiertas();
        if (abiertas > s.maximoCasetas) {
          fallos.push(`t=${instante}: ${s.etiqueta} tiene ${abiertas} casetas, más que ${s.maximoCasetas}`);
        }
        if (s.porRegla && abiertas < s.minimoCasetas) {
          fallos.push(`t=${instante}: ${s.etiqueta} tiene ${abiertas} casetas, menos que ${s.minimoCasetas}`);
        }
      }

      const repartidas = sentidos.reduce((a, s) => a + s.casetasAbiertas(), 0);
      if (repartidas > pozo.total) {
        fallos.push(`t=${instante}: ${repartidas} casetas repartidas de un pozo de ${pozo.total}`);
      }

      // Ninguna caseta reservada por uno y en poder de otro a la vez.
      for (const caseta of pozo.casetas) {
        if (caseta.duenio !== null && caseta.reservadaPara !== null) {
          fallos.push(`t=${instante}: la caseta ${caseta.id} está reservada y asignada a la vez`);
        }
        if (caseta.duenio === null && caseta.vehiculo !== null) {
          fallos.push(`t=${instante}: la caseta ${caseta.id} atiende sin tener dueño`);
        }
      }

      // Una sola apertura pendiente por sentido: a lo sumo una caseta reservada.
      for (const s of sentidos) {
        const reservadas = pozo.reservadasDe(s.id).length;
        if (reservadas > 1) {
          fallos.push(`t=${instante}: ${s.etiqueta} tiene ${reservadas} casetas reservadas`);
        }
      }
    },
  });
  return { resultado, fallos };
}

describe('invariantes del pozo', () => {
  const escenarios = [
    ['festivo · operador', escenarioFestivo({ control: 'operador' })],
    ['festivo · regla', escenarioFestivo({ control: 'regla' })],
    ['festivo · regla · lento', escenarioFestivo({ control: 'regla', servicio: REGIMENES_SERVICIO.lento })],
    ['festivo · regla · sustituto domingoCP', escenarioFestivo({ control: 'regla', sustituto: 'domingoCP' })],
    ['día normal · regla', escenarioDiaNormal({ control: 'regla' })],
  ];

  for (const [nombre, sentidos] of escenarios) {
    it(`${nombre}: se cumplen en todo instante, en las ${SEMILLAS.length} réplicas`, () => {
      for (const semilla of SEMILLAS) {
        const { fallos } = correrVigilando({ semilla, sentidos });
        expect(fallos, `semilla ${semilla}`).toEqual([]);
      }
    });
  }

  it('ninguna atención se interrumpe: todos los vehículos que entran, salen', () => {
    for (const sentidos of [
      escenarioFestivo({ control: 'regla' }),
      escenarioFestivo({ control: 'regla', servicio: REGIMENES_SERVICIO.lento }),
      escenarioFestivo({ control: 'regla', sustituto: 'domingoCP' }),
    ]) {
      for (const semilla of [1, 2, 3, 15, 30]) {
        const r = simularPeaje({ semilla, sentidos });
        r.sentidos.forEach((s, i) => {
          expect(s.atendidosTotal).toBe(s.llegadasSimuladas + sentidos[i].colaInicial);
          expect(s.colaFinal).toBe(0);
        });
      }
    }
  });

  it('c nunca sale de [1, 5] según el tiempo por nivel', () => {
    for (const semilla of [1, 7, 30]) {
      const r = simularPeaje({ semilla, sentidos: escenarioFestivo({ control: 'regla' }) });
      for (const s of r.sentidos) {
        expect(s.tiempoPorCasetasAbiertas[0]).toBe(0);
        const niveles = s.tiempoPorCasetasAbiertas
          .map((t, c) => (t > 0 ? c : null))
          .filter((c) => c !== null);
        expect(Math.min(...niveles)).toBeGreaterThanOrEqual(p.casetas.minimoPorSentido);
        expect(Math.max(...niveles)).toBeLessThanOrEqual(p.casetas.maximoPorSentido);
      }
    }
  });

  it('rechaza configuraciones imposibles', () => {
    const sentidos = escenarioFestivo({ control: 'regla' });
    expect(() => simularPeaje({ semilla: 1, sentidos: [sentidos[0]] })).toThrow(TypeError);
    // Dos sentidos con mínimo 4 no caben en un pozo de 6.
    const exigente = sentidos.map((s) => ({
      ...s,
      regla: { ...configuracionRegla(), minimoCasetas: 4 },
    }));
    expect(() => simularPeaje({ semilla: 1, sentidos: exigente })).toThrow(RangeError);
  });
});

describe('equivalencia con un solo sentido', () => {
  /** Configuración de un conteo, para `simularSentido` y para el peaje. */
  function soloConteo(clave, modo, extra = {}) {
    return configurarSentido({
      conteo: clave,
      etiqueta: clave,
      modo,
      colaInicial: COLA_INICIAL[clave],
      casetasIniciales: conteos[clave].casetas[0],
      servicio: REGIMENES_SERVICIO.base,
      ...extra,
    });
  }

  /**
   * Margen para `carrilesIntervalo`. Es la integral ∫c(t)dt acumulada evento a
   * evento, y en el peaje el otro sentido añade instantes de integración, así
   * que la suma da el mismo número por otro camino y el redondeo difiere en el
   * orden de 1e-14. Todo lo demás se compara exacto.
   */
  const EPSILON_INTEGRAL = 1e-9;

  const COMPARABLES = [
    'llegadasSimuladas',
    'caudalEnHorizonte',
    'atendidosTotal',
    'wqHoraSegundos',
    'wqHoraSinColaInicialSegundos',
    'wqPorIntervaloSegundos',
    'colaMaximaContinua',
    'colaMaximaMuestreada',
    'colaMuestreada',
    'colaFinal',
    'fraccionIntervalosSobreUmbral',
    'aperturas',
    'cierres',
    'cambiosDeC',
    'numerosAleatoriosUsados',
  ];

  for (const modo of [MODO_CASETAS.PROGRAMADO, MODO_CASETAS.REGLA]) {
    for (const clave of Object.keys(conteos)) {
      it(`${clave} en modo ${modo}: el peaje con el otro sentido inerte da lo mismo, semillas 1…30`, () => {
        const config = soloConteo(clave, modo);
        for (const semilla of SEMILLAS) {
          const solo = simularSentido({ semilla, ...config });
          const dos = simularPeaje({ semilla, sentidos: [config, sentidoInerte()] });
          for (const campo of COMPARABLES) {
            expect(dos.sentidos[0][campo], `${campo} con semilla ${semilla}`).toEqual(solo[campo]);
          }
          expect(
            Math.abs(dos.sentidos[0].carrilesIntervalo - solo.carrilesIntervalo),
            `carrilesIntervalo con semilla ${semilla}`,
          ).toBeLessThan(EPSILON_INTEGRAL);
        }
      });
    }
  }

  it('el sentido inerte no pide, no bloquea y no recibe nada', () => {
    const config = soloConteo('festivoPC', MODO_CASETAS.REGLA);
    const r = simularPeaje({ semilla: 1, sentidos: [config, sentidoInerte()] });
    expect(r.pozo.peticionesBloqueadas).toBe(0);
    expect(r.pozo.reasignaciones).toBe(0);
    expect(r.sentidos[1].carrilesIntervalo).toBeCloseTo(p.tiempo.intervalos, 6);
  });

  it('el primer sentido de la lista usa la semilla tal cual y el segundo una derivada', () => {
    expect(derivarSemilla(5, 0)).toBe(5);
    expect(derivarSemilla(5, 1)).not.toBe(5);
    // Intercambiar el orden cambia el resultado del conteo con demanda, porque
    // pasa a usar el otro flujo.
    const conDemanda = soloConteo('festivoPC', MODO_CASETAS.REGLA);
    const primero = simularPeaje({ semilla: 1, sentidos: [conDemanda, sentidoInerte()] });
    const segundo = simularPeaje({ semilla: 1, sentidos: [sentidoInerte(), conDemanda] });
    expect(segundo.sentidos[1].wqHoraSegundos).not.toBe(primero.sentidos[0].wqHoraSegundos);
  });
});

describe('reasignación por ρ', () => {
  /**
   * Un sentido saturado y otro vacío que puede cederle casetas. El vacío
   * arranca con varias para tener qué liberar.
   */
  function dosSentidos({ llegadasA, llegadasB, casetasA = 1, casetasB = 4, regla = {} }) {
    const comun = {
      duracionIntervaloSegundos: p.tiempo.duracionIntervaloSegundos,
      gammaForma: p.servicio.gammaForma,
      gammaEscalaSegundos: p.servicio.gammaEscalaSegundos,
      maximoTolerableWqSegundos: p.desempeno.maximoTolerableWqSegundos,
      modoCasetas: MODO_CASETAS.REGLA,
      regla: { ...configuracionRegla(), ...regla },
      colaInicial: 0,
    };
    const intervalos = p.tiempo.intervalos;
    return [
      {
        ...comun,
        etiqueta: 'A',
        llegadas: new Array(intervalos).fill(llegadasA),
        casetasProgramadas: new Array(intervalos).fill(casetasA),
        casetasIniciales: casetasA,
      },
      {
        ...comun,
        etiqueta: 'B',
        llegadas: new Array(intervalos).fill(llegadasB),
        casetasProgramadas: new Array(intervalos).fill(casetasB),
        casetasIniciales: casetasB,
      },
    ];
  }

  it('no reasigna a un sentido con ρ bajo', () => {
    // A casi no tiene demanda: su ρ se queda muy por debajo de 0,60, así que
    // las casetas que B libere vuelven al pozo y no pasan a A.
    const r = simularPeaje({
      semilla: 1,
      sentidos: dosSentidos({ llegadasA: 1, llegadasB: 1, casetasA: 1, casetasB: 5 }),
    });
    expect(r.pozo.reasignaciones).toBe(0);
    expect(r.sentidos[0].reasignacionesRecibidas).toBe(0);
  });

  /**
   * Para aislar la vía de ρ hay que evitar que A tenga petición bloqueada: si
   * la tiene, gana la caseta por esa vía, que va antes (DEC-027, punto 6).
   * Con 16 llegadas/5 min y 1 caseta, ρ nominal = 16/24,8 = 0,65 > 0,60, pero
   * la cola casi nunca pasa de las 4 del umbral de apertura.
   */
  const RHO_ALTO_SIN_BLOQUEO = { llegadasA: 16, llegadasB: 1, casetasA: 1, casetasB: 4 };

  it('reasigna a un sentido con ρ alto cuando el otro libera', () => {
    const r = simularPeaje({ semilla: 1, sentidos: dosSentidos(RHO_ALTO_SIN_BLOQUEO) });
    expect(r.pozo.reasignaciones).toBeGreaterThan(0);
    expect(r.sentidos[0].reasignacionesRecibidas).toBeGreaterThan(0);
    expect(r.sentidos[1].reasignacionesCedidas).toBeGreaterThan(0);
  });

  it('la petición bloqueada va antes que la reasignación por ρ (DEC-027, punto 6)', () => {
    // Aquí A sí se bloquea: con 60 llegadas/5 min y 1 caseta la cola pasa el
    // umbral enseguida. La caseta que libera B se la lleva por la vía del
    // bloqueo, no por ρ, así que el contador de reasignaciones no sube.
    const r = simularPeaje({
      semilla: 1,
      sentidos: dosSentidos({ llegadasA: 60, llegadasB: 1, casetasA: 1, casetasB: 5 }),
    });
    expect(r.sentidos[0].peticionesBloqueadas).toBeGreaterThan(0);
    expect(r.pozo.entregasPorBloqueo).toBeGreaterThan(0);
    expect(r.pozo.reasignaciones).toBe(0);
  });

  it('con reasignacionActiva = false la caseta liberada vuelve al pozo', () => {
    const sentidos = dosSentidos(RHO_ALTO_SIN_BLOQUEO);
    const con = simularPeaje({ semilla: 1, sentidos });
    const sin = simularPeaje({ semilla: 1, sentidos, reasignacionActiva: false });
    expect(con.pozo.reasignaciones).toBeGreaterThan(0);
    expect(sin.pozo.reasignaciones).toBe(0);
    // Y sin reasignación A se queda con menos carriles: nadie le pasa la caseta.
    expect(sin.sentidos[0].carrilesIntervalo).toBeLessThan(con.sentidos[0].carrilesIntervalo);
  });

  it('con demora 0 la caseta entra en el mismo instante, sin tránsito', () => {
    // Con demora 0 la reserva y la entrega caen en el mismo instante simulado
    // (la apertura se atiende antes de la llegada, DEC-026 punto 7). Lo que no
    // puede pasar es que una caseta siga reservada cuando el reloj ya avanzó.
    const instantesPorCaseta = new Map();
    simularPeaje({
      semilla: 1,
      sentidos: dosSentidos({ ...RHO_ALTO_SIN_BLOQUEO, regla: { demoraAperturaSegundos: 0 } }),
      observador({ instante, pozo }) {
        for (const caseta of pozo.casetas) {
          if (caseta.reservadaPara === null) continue;
          const vistos = instantesPorCaseta.get(caseta.id) ?? new Set();
          vistos.add(instante);
          instantesPorCaseta.set(caseta.id, vistos);
        }
      },
    });
    for (const [casetaId, instantes] of instantesPorCaseta) {
      expect(instantes.size, `la caseta ${casetaId} quedó reservada en varios instantes`).toBe(1);
    }
  });

  it('con demora > 0 la caseta pasa por un tránsito reservado', () => {
    let vioReserva = false;
    simularPeaje({
      semilla: 1,
      sentidos: dosSentidos({
        ...RHO_ALTO_SIN_BLOQUEO,
        regla: { demoraAperturaSegundos: 5 * SEGUNDOS_POR_MINUTO },
      }),
      observador({ pozo }) {
        if (pozo.casetas.some((c) => c.reservadaPara !== null)) vioReserva = true;
      },
    });
    expect(vioReserva).toBe(true);
  });

  it('ρ y la espera estimada usan los valores nominales también con servicio lento', () => {
    // El mismo escenario con servicio base y lento: la regla decide con los
    // mismos 24,8 veh/caseta, así que la capacidad nominal no cambia (DEC-027).
    const base = escenarioFestivo({ control: 'regla' });
    const lento = escenarioFestivo({ control: 'regla', servicio: REGIMENES_SERVICIO.lento });
    // El régimen cambia el servicio generado, no los umbrales de la regla.
    expect(lento[0].gammaEscalaSegundos).not.toBe(base[0].gammaEscalaSegundos);
    expect(lento[0].regla).toEqual(base[0].regla);
  });
});

describe('ofrecerPozoPorRho', () => {
  /** A saturado con 1 caseta, B con 1, y 4 casetas libres en el pozo. */
  function conPozoLibre() {
    const comun = {
      duracionIntervaloSegundos: p.tiempo.duracionIntervaloSegundos,
      gammaForma: p.servicio.gammaForma,
      gammaEscalaSegundos: p.servicio.gammaEscalaSegundos,
      maximoTolerableWqSegundos: p.desempeno.maximoTolerableWqSegundos,
      modoCasetas: MODO_CASETAS.REGLA,
      regla: { ...configuracionRegla(), demoraAperturaSegundos: 0 },
      colaInicial: 0,
      casetasIniciales: 1,
    };
    const intervalos = p.tiempo.intervalos;
    return [
      { ...comun, etiqueta: 'A', llegadas: new Array(intervalos).fill(40), casetasProgramadas: new Array(intervalos).fill(1) },
      { ...comun, etiqueta: 'B', llegadas: new Array(intervalos).fill(0), casetasProgramadas: new Array(intervalos).fill(1) },
    ];
  }

  it('con false (por defecto) el pozo libre no se ofrece solo', () => {
    const sentidos = conPozoLibre();
    const r = simularPeaje({ semilla: 1, sentidos });
    // A abre por su propia regla (cola sobre el umbral), nunca por ofrecimiento.
    expect(r.pozo.ofrecimientosPorPozo).toBe(0);
    expect(r.pozo.reasignaciones).toBe(0);
  });

  it('con true, un sentido con ρ alto recibe casetas libres sin esperar liberación', () => {
    const sentidos = conPozoLibre();
    const r = simularPeaje({ semilla: 1, sentidos, ofrecerPozoPorRho: true });
    expect(r.pozo.ofrecimientosPorPozo).toBeGreaterThan(0);
  });
});

describe('desempate cuando los dos sentidos están bloqueados', () => {
  /**
   * Pozo de 2 casetas y los dos sentidos con una cada uno y mucha demanda:
   * los dos quieren abrir y no hay nada libre, así que los dos se bloquean.
   */
  function dosSaturados({ llegadasA, llegadasB }) {
    const comun = {
      duracionIntervaloSegundos: p.tiempo.duracionIntervaloSegundos,
      gammaForma: p.servicio.gammaForma,
      gammaEscalaSegundos: p.servicio.gammaEscalaSegundos,
      maximoTolerableWqSegundos: p.desempeno.maximoTolerableWqSegundos,
      modoCasetas: MODO_CASETAS.REGLA,
      regla: { ...configuracionRegla(), demoraAperturaSegundos: 0 },
      colaInicial: 0,
      casetasIniciales: 1,
    };
    const intervalos = p.tiempo.intervalos;
    return [
      { ...comun, etiqueta: 'A', llegadas: new Array(intervalos).fill(llegadasA), casetasProgramadas: new Array(intervalos).fill(1) },
      { ...comun, etiqueta: 'B', llegadas: new Array(intervalos).fill(llegadasB), casetasProgramadas: new Array(intervalos).fill(1) },
    ];
  }

  it('los dos se bloquean cuando el pozo está agotado', () => {
    const r = simularPeaje({
      semilla: 1,
      sentidos: dosSaturados({ llegadasA: 60, llegadasB: 60 }),
      pozoTotal: 2,
    });
    expect(r.sentidos[0].peticionesBloqueadas).toBeGreaterThan(0);
    expect(r.sentidos[1].peticionesBloqueadas).toBeGreaterThan(0);
    expect(r.pozo.segundosAgotado).toBeGreaterThan(0);
  });

  it('la caseta que se libera va al sentido con más carga', () => {
    // A tiene mucha más demanda que B: cuando el pozo libere una caseta, el
    // desempate tiene que dársela a A, que es el peor.
    const r = simularPeaje({
      semilla: 1,
      sentidos: dosSaturados({ llegadasA: 90, llegadasB: 12 }),
      pozoTotal: 3,
    });
    expect(r.sentidos[0].carrilesIntervalo).toBeGreaterThan(r.sentidos[1].carrilesIntervalo);
  });

  it('una petición bloqueada que ya no hace falta se descarta', () => {
    // B arranca con 20 vehículos en cola y 1 caseta: pide otra y se bloquea,
    // porque el pozo de 3 ya está repartido (A tiene 2). B drena sus 20 en
    // unos 4 min. A, con demanda baja, cierra una caseta al cumplirse la
    // ventana de 15 min; para entonces la cola de B es 0, así que la petición
    // ya no tiene razón de ser y se descarta en vez de consumir la caseta.
    const intervalos = p.tiempo.intervalos;
    const comun = {
      duracionIntervaloSegundos: p.tiempo.duracionIntervaloSegundos,
      gammaForma: p.servicio.gammaForma,
      gammaEscalaSegundos: p.servicio.gammaEscalaSegundos,
      maximoTolerableWqSegundos: p.desempeno.maximoTolerableWqSegundos,
      modoCasetas: MODO_CASETAS.REGLA,
      regla: { ...configuracionRegla(), demoraAperturaSegundos: 0 },
    };
    const r = simularPeaje({
      semilla: 4,
      pozoTotal: 3,
      reasignacionActiva: false, // para que la caseta liberada no se desvíe por ρ
      sentidos: [
        {
          ...comun,
          etiqueta: 'A',
          llegadas: new Array(intervalos).fill(3),
          casetasProgramadas: new Array(intervalos).fill(2),
          casetasIniciales: 2,
          colaInicial: 0,
        },
        {
          ...comun,
          etiqueta: 'B',
          llegadas: new Array(intervalos).fill(0),
          casetasProgramadas: new Array(intervalos).fill(1),
          casetasIniciales: 1,
          colaInicial: 20,
        },
      ],
    });
    expect(r.sentidos[1].peticionesBloqueadas).toBeGreaterThan(0);
    expect(r.pozo.bloqueosDescartados).toBeGreaterThan(0);
  });
});

describe('reproducibilidad del peaje', () => {
  it('con la misma semilla el resultado es idéntico', () => {
    const sentidos = escenarioFestivo({ control: 'regla' });
    expect(simularPeaje({ semilla: 11, sentidos })).toEqual(
      simularPeaje({ semilla: 11, sentidos }),
    );
  });

  it('con semillas distintas el resultado cambia', () => {
    const sentidos = escenarioFestivo({ control: 'regla' });
    const a = simularPeaje({ semilla: 1, sentidos });
    const b = simularPeaje({ semilla: 2, sentidos });
    expect(a.total.wqHoraSegundos).not.toBe(b.total.wqHoraSegundos);
  });

  it('las 30 réplicas se repiten exactamente', () => {
    const sentidos = escenarioFestivo({ control: 'regla', servicio: REGIMENES_SERVICIO.lento });
    const corrida = () => SEMILLAS.map((semilla) => simularPeaje({ semilla, sentidos }));
    expect(corrida()).toEqual(corrida());
  });
});

describe('escenario de sanidad de día normal', () => {
  it('con holgura no hay disputa de casetas', () => {
    for (const control of ['operador', 'regla']) {
      const sentidos = escenarioDiaNormal({ control });
      for (const semilla of SEMILLAS) {
        const r = simularPeaje({ semilla, sentidos });
        expect(r.pozo.segundosAgotado, `${control} semilla ${semilla}`).toBe(0);
        expect(r.pozo.peticionesBloqueadas).toBe(0);
      }
    }
  });
});

describe('agregación de los totales', () => {
  it('Wq del peaje está ponderado por vehículos', () => {
    const r = simularPeaje({ semilla: 1, sentidos: escenarioFestivo({ control: 'regla' }) });
    const [a, b] = r.sentidos;
    const esperado =
      (a.wqHoraSegundos * a.atendidosTotal + b.wqHoraSegundos * b.atendidosTotal) /
      (a.atendidosTotal + b.atendidosTotal);
    expect(r.total.wqHoraSegundos).toBeCloseTo(esperado, 9);
    // Y queda entre los dos Wq por sentido.
    expect(r.total.wqHoraSegundos).toBeGreaterThanOrEqual(Math.min(a.wqHoraSegundos, b.wqHoraSegundos));
    expect(r.total.wqHoraSegundos).toBeLessThanOrEqual(Math.max(a.wqHoraSegundos, b.wqHoraSegundos));
  });

  it('carriles-intervalo y cambios de c se suman', () => {
    const r = simularPeaje({ semilla: 1, sentidos: escenarioFestivo({ control: 'regla' }) });
    expect(r.total.carrilesIntervalo).toBeCloseTo(
      r.sentidos[0].carrilesIntervalo + r.sentidos[1].carrilesIntervalo,
      9,
    );
    expect(r.total.cambiosDeC).toBe(r.sentidos[0].cambiosDeC + r.sentidos[1].cambiosDeC);
  });

  it('el % de intervalos sale de los intervalos de los dos sentidos juntos', () => {
    const r = simularPeaje({ semilla: 1, sentidos: escenarioFestivo({ control: 'regla' }) });
    expect(r.total.intervalosConDato).toBe(
      r.sentidos[0].intervalosConDato + r.sentidos[1].intervalosConDato,
    );
    expect(r.total.fraccionIntervalosSobreUmbral).toBeCloseTo(
      r.total.intervalosSobreUmbral / r.total.intervalosConDato,
      9,
    );
  });
});
