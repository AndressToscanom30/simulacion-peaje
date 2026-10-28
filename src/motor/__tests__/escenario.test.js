import { describe, it, expect } from 'vitest';
import {
  ESCENARIO_BASE,
  SERVICIO_LENTO,
  MODO,
  construirEscenario,
  validarEscenario,
  problemasDelEscenario,
  escenarioAJson,
  escenarioDesdeJson,
  tablasUmbrales,
  umbralAbrir,
  umbralCerrar,
  servicioConMedia,
  mediaGeneradaSegundos,
  semillasDe,
  aConfiguracionPeaje,
} from '../../config/escenario.js';
import { simularPeaje } from '../peaje.js';
import { correrEscenario } from '../../corridas.js';
import { parametros } from '../../config/parametros.js';

describe('tablas de umbrales (DEC-031)', () => {
  it('reproduce los ocho valores del contexto para c de 1 a 5', () => {
    const { abrirSiColaMayorQue, cerrarSiColaMenorQue } = tablasUmbrales({
      minimoPorSentido: 1,
      maximoPorSentido: 5,
    });
    expect(abrirSiColaMayorQue).toEqual({ 1: 4, 2: 9, 3: 14, 4: 19, 5: null });
    expect(cerrarSiColaMenorQue).toEqual({ 1: null, 2: 2, 3: 4, 4: 7, 5: 9 });
  });

  it('coincide con lo que tiene parametros.js escrito a mano', () => {
    const generadas = tablasUmbrales({ minimoPorSentido: 1, maximoPorSentido: 5 });
    expect(generadas.abrirSiColaMayorQue).toEqual(parametros.regla.abrirSiColaMayorQue);
    expect(generadas.cerrarSiColaMenorQue).toEqual(parametros.regla.cerrarSiColaMenorQue);
  });

  it('las fórmulas son 5c − 1 y ⌊abrir(c − 1)/2⌋', () => {
    for (const c of [1, 2, 3, 4, 5, 6, 7]) expect(umbralAbrir(c)).toBe(5 * c - 1);
    for (const c of [2, 3, 4, 5, 6, 7]) expect(umbralCerrar(c)).toBe(Math.floor((5 * (c - 1) - 1) / 2));
  });

  it('extiende el tope sin tocar los valores de 1 a 5', () => {
    const t = tablasUmbrales({ minimoPorSentido: 1, maximoPorSentido: 7 });
    expect(t.abrirSiColaMayorQue).toEqual({ 1: 4, 2: 9, 3: 14, 4: 19, 5: 24, 6: 29, 7: null });
    expect(t.cerrarSiColaMenorQue).toEqual({ 1: null, 2: 2, 3: 4, 4: 7, 5: 9, 6: 12, 7: 14 });
  });

  it('el factor escala los umbrales y redondea a vehículos enteros', () => {
    const t = tablasUmbrales({ minimoPorSentido: 1, maximoPorSentido: 5, factor: 1.4 });
    expect(t.abrirSiColaMayorQue[1]).toBe(Math.round(4 * 1.4));
    for (const valor of Object.values(t.abrirSiColaMayorQue)) {
      if (valor !== null) expect(Number.isInteger(valor)).toBe(true);
    }
  });

  it('no deja umbral de apertura en el tope ni de cierre en el mínimo', () => {
    const t = tablasUmbrales({ minimoPorSentido: 2, maximoPorSentido: 4 });
    expect(t.abrirSiColaMayorQue[4]).toBeNull();
    expect(t.cerrarSiColaMenorQue[2]).toBeNull();
    expect(t.abrirSiColaMayorQue[2]).toBe(9);
    expect(t.cerrarSiColaMenorQue[4]).toBe(7);
  });
});

describe('construcción de escenarios', () => {
  it('el base es válido', () => {
    expect(problemasDelEscenario(construirEscenario())).toEqual([]);
  });

  it('una sobreescritura cambia solo lo que nombra', () => {
    const e = construirEscenario({ pozo: { total: 8 } });
    expect(e.pozo.total).toBe(8);
    expect(e.pozo.minimoPorSentido).toBe(ESCENARIO_BASE.pozo.minimoPorSentido);
    expect(e.pozo.maximoPorSentido).toBe(ESCENARIO_BASE.pozo.maximoPorSentido);
    expect(e.servicio).toEqual(ESCENARIO_BASE.servicio);
  });

  it('los sentidos se mezclan elemento a elemento', () => {
    const e = construirEscenario({ sentidos: [{}, { factorDemanda: 1.5 }] });
    expect(e.sentidos[0].factorDemanda).toBe(1);
    expect(e.sentidos[0].conteo).toBe(ESCENARIO_BASE.sentidos[0].conteo);
    expect(e.sentidos[1].factorDemanda).toBe(1.5);
    expect(e.sentidos[1].conteo).toBe(ESCENARIO_BASE.sentidos[1].conteo);
  });

  it('no muta el escenario base', () => {
    const antes = JSON.stringify(ESCENARIO_BASE);
    construirEscenario({ pozo: { total: 99 }, sentidos: [{ colaInicial: 7 }, {}] });
    expect(JSON.stringify(ESCENARIO_BASE)).toBe(antes);
  });

  it('las tablas de umbrales siguen al tope por sentido', () => {
    const e = construirEscenario({
      pozo: { total: 8, maximoPorSentido: 7 },
      regla: { abrirSiColaMayorQue: null, cerrarSiColaMenorQue: null },
    });
    expect(e.regla.abrirSiColaMayorQue[6]).toBe(29);
    expect(e.regla.abrirSiColaMayorQue[7]).toBeNull();
  });

  it('respeta las tablas escritas a mano', () => {
    const aMano = { 1: 3, 2: 6, 3: 9, 4: 12, 5: null };
    const e = construirEscenario({ regla: { abrirSiColaMayorQue: aMano } });
    expect(e.regla.abrirSiColaMayorQue).toEqual(aMano);
    // La de cierre sí se genera, porque venía en null.
    expect(e.regla.cerrarSiColaMenorQue).toEqual({ 1: null, 2: 2, 3: 4, 4: 7, 5: 9 });
  });

  it('las semillas salen de las corridas del escenario', () => {
    expect(semillasDe(construirEscenario())).toHaveLength(30);
    expect(semillasDe(construirEscenario())[0]).toBe(1);
    expect(semillasDe(construirEscenario({ corridas: { replicas: 3, primeraSemilla: 100 } }))).toEqual([
      100, 101, 102,
    ]);
  });
});

describe('regímenes de servicio', () => {
  it('la gamma del base genera 12,0744 s, no los 12,1016 s medidos', () => {
    expect(mediaGeneradaSegundos(ESCENARIO_BASE.servicio)).toBeCloseTo(12.0744, 4);
    expect(ESCENARIO_BASE.servicio.mediaNominalSegundos).toBe(12.1016);
  });

  it('el servicio lento tiene media 15,5 s y el mismo CV que el base', () => {
    expect(mediaGeneradaSegundos(SERVICIO_LENTO)).toBeCloseTo(15.5, 6);
    const cv = (s) => Math.sqrt(s.gammaForma) * s.gammaEscalaSegundos / mediaGeneradaSegundos(s);
    expect(cv(SERVICIO_LENTO)).toBeCloseTo(cv(ESCENARIO_BASE.servicio), 9);
  });

  it('el servicio nominal NO cambia con el régimen (DEC-027, punto 7)', () => {
    expect(SERVICIO_LENTO.mediaNominalSegundos).toBe(ESCENARIO_BASE.servicio.mediaNominalSegundos);
    expect(servicioConMedia(20).mediaNominalSegundos).toBe(
      ESCENARIO_BASE.servicio.mediaNominalSegundos,
    );
  });

  it('servicioConMedia conserva la forma y por tanto el CV', () => {
    const s = servicioConMedia(20);
    expect(mediaGeneradaSegundos(s)).toBeCloseTo(20, 9);
    expect(s.gammaForma).toBe(ESCENARIO_BASE.servicio.gammaForma);
  });
});

describe('validación de escenarios', () => {
  /** Construye un escenario con la sobreescritura dada y devuelve sus problemas. */
  const problemasCon = (sobreescrituras) =>
    problemasDelEscenario(construirEscenario(sobreescrituras));

  it('acepta el escenario base sin quejas', () => {
    expect(() => validarEscenario(construirEscenario())).not.toThrow();
  });

  it('rechaza un conteo que no existe y dice cuáles hay', () => {
    const [mensaje] = problemasCon({ sentidos: [{ conteo: 'martes' }, {}] });
    expect(mensaje).toContain('"martes" no existe');
    expect(mensaje).toContain('festivoPC');
  });

  it('rechaza un factor de demanda no positivo', () => {
    expect(problemasCon({ sentidos: [{ factorDemanda: 0 }, {}] })[0]).toContain('`factorDemanda`');
    expect(problemasCon({ sentidos: [{ factorDemanda: -1 }, {}] })[0]).toContain('mayor que 0');
  });

  it('rechaza una cola inicial negativa o fraccionaria', () => {
    expect(problemasCon({ sentidos: [{ colaInicial: -5 }, {}] })[0]).toContain('`colaInicial`');
    expect(problemasCon({ sentidos: [{ colaInicial: 2.5 }, {}] })[0]).toContain('entero');
  });

  it('rechaza un modo desconocido', () => {
    expect(problemasCon({ sentidos: [{ modo: 'automatico' }, {}] })[0]).toContain('`modo`');
  });

  it('rechaza un pozo que no alcanza para el mínimo de los dos sentidos', () => {
    const mensaje = problemasCon({ pozo: { total: 1, minimoPorSentido: 1 } }).join(' ');
    expect(mensaje).toContain('no alcanza para el mínimo');
  });

  it('rechaza un tope mayor que el pozo', () => {
    const mensaje = problemasCon({ pozo: { total: 4, maximoPorSentido: 5 } }).join(' ');
    expect(mensaje).toContain('no puede pasar del tamaño del pozo');
  });

  it('rechaza un mínimo mayor que el tope', () => {
    const mensaje = problemasCon({
      pozo: { total: 10, minimoPorSentido: 5, maximoPorSentido: 3 },
    }).join(' ');
    expect(mensaje).toContain('no puede ser mayor que');
  });

  it('rechaza un servicio con k o θ no positivos', () => {
    expect(problemasCon({ servicio: { gammaForma: 0 } })[0]).toContain('gammaForma');
    expect(problemasCon({ servicio: { gammaEscalaSegundos: -1 } })[0]).toContain('gammaEscalaSegundos');
  });

  it('rechaza una meta mayor que el máximo tolerable', () => {
    const mensaje = problemasCon({
      desempeno: { metaWqSegundos: 300, maximoTolerableWqSegundos: 150 },
    }).join(' ');
    expect(mensaje).toContain('no puede ser mayor que el máximo tolerable');
  });

  it('rechaza una fracción de intervalos fuera de [0, 1]', () => {
    expect(problemasCon({ desempeno: { fraccionIntervalosSobreMaximoAceptada: 1.5 } })[0]).toContain(
      'entre 0 y 1',
    );
  });

  it('rechaza demoras y ventanas negativas', () => {
    expect(problemasCon({ regla: { demoraAperturaSegundos: -1 } })[0]).toContain('negativa');
    expect(problemasCon({ regla: { ventanaCierreSegundos: -1 } })[0]).toContain('negativa');
  });

  it('rechaza banderas que no son booleanas', () => {
    expect(problemasCon({ regla: { reasignacionActiva: 'si' } })[0]).toContain('true o false');
  });

  it('rechaza réplicas o semillas absurdas', () => {
    expect(problemasCon({ corridas: { replicas: 0 } })[0]).toContain('`corridas.replicas`');
    expect(problemasCon({ corridas: { primeraSemilla: 1.5 } })[0]).toContain('entero');
  });

  it('detecta un tope sin umbral para algún c', () => {
    // Tope 7 pero tablas de tope 5 escritas a mano: faltan los de c = 5 y 6.
    const mensaje = problemasDelEscenario(
      construirEscenario({
        pozo: { total: 8, maximoPorSentido: 7 },
        regla: {
          abrirSiColaMayorQue: { 1: 4, 2: 9, 3: 14, 4: 19, 5: null },
          cerrarSiColaMenorQue: { 1: null, 2: 2, 3: 4, 4: 7, 5: 9 },
        },
      }),
    ).join(' ');
    // Ojo con el null a media tabla: `null >= 0` es true en JavaScript, así que
    // el c = 5 de la tabla de tope 5 tiene que detectarse igual.
    expect(mensaje).toContain('Falta el umbral de apertura para c = 5');
    expect(mensaje).toContain('Falta el umbral de apertura para c = 6');
    expect(mensaje).toContain('Falta el umbral de cierre para c = 6');
    expect(mensaje).toContain('Falta el umbral de cierre para c = 7');
  });

  it('detecta un desajuste entre los intervalos y el largo del conteo', () => {
    const mensaje = problemasCon({ tiempo: { intervalos: 10 } }).join(' ');
    expect(mensaje).toContain('intervalos y el escenario pide 10');
  });

  it('junta todos los problemas en un solo error legible', () => {
    let error;
    try {
      validarEscenario(
        construirEscenario({
          nombre: 'roto',
          sentidos: [{ conteo: 'martes', factorDemanda: -1 }, {}],
          corridas: { replicas: 0 },
        }),
      );
    } catch (e) {
      error = e;
    }
    expect(error).toBeDefined();
    expect(error.message).toContain('"roto"');
    expect(error.message).toContain('problema(s)');
    expect(error.message.split('\n').length).toBeGreaterThan(3);
  });
});

describe('JSON de ida y vuelta', () => {
  it('el escenario base sobrevive el viaje sin pérdida', () => {
    const base = construirEscenario();
    expect(escenarioDesdeJson(escenarioAJson(base))).toEqual(base);
  });

  it('un escenario con sobreescrituras sobrevive el viaje', () => {
    const e = construirEscenario({
      nombre: 'raro',
      pozo: { total: 8, maximoPorSentido: 7 },
      regla: { abrirSiColaMayorQue: null, cerrarSiColaMenorQue: null, reasignacionActiva: true },
      sentidos: [{ factorDemanda: 1.2 }, { conteo: 'domingoCP', modo: MODO.PROGRAMADO }],
    });
    expect(escenarioDesdeJson(escenarioAJson(e))).toEqual(e);
  });

  it('un JSON parcial se completa con el base', () => {
    const e = escenarioDesdeJson('{"nombre":"minimo","pozo":{"total":7}}');
    expect(e.pozo.total).toBe(7);
    expect(e.servicio).toEqual(ESCENARIO_BASE.servicio);
  });

  it('el escenario no lleva funciones: el JSON lo representa entero', () => {
    const e = construirEscenario();
    const contarClaves = (x) =>
      x === null || typeof x !== 'object'
        ? 1
        : Object.values(x).reduce((a, v) => a + contarClaves(v), 0);
    expect(contarClaves(JSON.parse(escenarioAJson(e)))).toBe(contarClaves(e));
  });

  it('un JSON mal formado da un error claro', () => {
    expect(() => escenarioDesdeJson('{esto no es json')).toThrow(/no se pudo leer/);
  });

  it('un JSON válido pero con valores absurdos falla en la validación', () => {
    expect(() => escenarioDesdeJson('{"pozo":{"total":0}}')).toThrow(/problema/);
  });
});

describe('invariantes con pozos y topes distintos', () => {
  /** Vigila los invariantes de la fase 3 tras cada evento. */
  /** Tope de fallos anotados: con un invariante roto se repetirían en cada evento. */
  const FALLOS_MAXIMOS = 20;

  function correrVigilando(escenario) {
    const fallos = [];
    const anotar = (mensaje) => {
      if (fallos.length < FALLOS_MAXIMOS) fallos.push(mensaje);
    };
    const config = aConfiguracionPeaje(escenario);
    for (const semilla of semillasDe(escenario)) {
      simularPeaje({
        ...config,
        semilla,
        observador({ instante, pozo, sentidos }) {
          const repartidas = sentidos.reduce((a, s) => a + s.casetasAbiertas(), 0);
          if (repartidas > pozo.total) {
            anotar(`t=${instante}: ${repartidas} casetas de un pozo de ${pozo.total}`);
          }
          for (const s of sentidos) {
            const abiertas = s.casetasAbiertas();
            if (abiertas > escenario.pozo.maximoPorSentido) {
              anotar(`t=${instante}: ${s.etiqueta} con ${abiertas} casetas sobre el tope`);
            }
            if (abiertas < escenario.pozo.minimoPorSentido) {
              anotar(`t=${instante}: ${s.etiqueta} con ${abiertas} casetas bajo el mínimo`);
            }
            if (pozo.reservadasDe(s.id).length > 1) {
              anotar(`t=${instante}: ${s.etiqueta} con más de una apertura pendiente`);
            }
          }
          for (const caseta of pozo.casetas) {
            if (caseta.duenio !== null && caseta.reservadaPara !== null) {
              anotar(`t=${instante}: caseta ${caseta.id} reservada y asignada a la vez`);
            }
          }
        },
      });
    }
    return fallos;
  }

  // Pozos de 4 a 10, con topes distintos dentro de cada uno.
  const configuraciones = [];
  for (let total = 4; total <= 10; total += 1) {
    for (const maximoPorSentido of [2, Math.ceil(total / 2), total - 1]) {
      if (maximoPorSentido < 1 || maximoPorSentido > total) continue;
      configuraciones.push({ total, maximoPorSentido });
    }
  }

  for (const { total, maximoPorSentido } of configuraciones) {
    it(`pozo ${total}, tope ${maximoPorSentido}: invariantes en las 30 réplicas`, () => {
      const escenario = construirEscenario({
        nombre: `pozo ${total} tope ${maximoPorSentido}`,
        pozo: { total, maximoPorSentido },
        regla: { abrirSiColaMayorQue: null, cerrarSiColaMenorQue: null },
        // Las casetas iniciales del base (4 y 1) no caben en cualquier tope.
        sentidos: [
          { casetasIniciales: Math.min(ESCENARIO_BASE.sentidos[0].casetasIniciales, maximoPorSentido) },
          { casetasIniciales: Math.min(ESCENARIO_BASE.sentidos[1].casetasIniciales, maximoPorSentido) },
        ],
      });
      validarEscenario(escenario);
      expect(correrVigilando(escenario)).toEqual([]);
    });
  }

  it('ninguna atención se interrumpe con pozos y topes grandes', () => {
    for (const { total, maximoPorSentido } of [
      { total: 4, maximoPorSentido: 2 },
      { total: 8, maximoPorSentido: 7 },
      { total: 10, maximoPorSentido: 9 },
    ]) {
      const escenario = construirEscenario({
        pozo: { total, maximoPorSentido },
        regla: { abrirSiColaMayorQue: null, cerrarSiColaMenorQue: null },
        sentidos: [
          { casetasIniciales: Math.min(ESCENARIO_BASE.sentidos[0].casetasIniciales, maximoPorSentido) },
          {},
        ],
      });
      const config = aConfiguracionPeaje(escenario);
      for (const semilla of [1, 15, 30]) {
        const r = simularPeaje({ ...config, semilla });
        r.sentidos.forEach((s, i) => {
          expect(s.atendidosTotal).toBe(s.llegadasSimuladas + escenario.sentidos[i].colaInicial);
          expect(s.colaFinal).toBe(0);
        });
      }
    }
  });
});

describe('un parámetro cambia el resultado y volver atrás lo restituye', () => {
  const corrida = (sobreescrituras) => {
    const escenario = construirEscenario(sobreescrituras);
    return correrEscenario({ escenario, grupo: 'prueba', codigo: 'p', nombre: 'p', regimen: 'base' });
  };

  const huella = (r) =>
    JSON.stringify([
      r.resumen.total.wqHoraSegundos.media,
      r.resumen.total.carrilesIntervalo.media,
      r.resumen.sentidos.map((s) => s.escalares.colaMaximaContinua.media),
    ]);

  const referencia = huella(corrida({}));

  const cambios = [
    ['pozo más grande', { pozo: { total: 8 } }],
    ['tope por sentido mayor', { pozo: { total: 8, maximoPorSentido: 7 }, regla: { abrirSiColaMayorQue: null, cerrarSiColaMenorQue: null } }],
    ['más demanda', { sentidos: [{ factorDemanda: 1.3 }, { factorDemanda: 1.3 }] }],
    ['servicio más lento', { servicio: SERVICIO_LENTO }],
    ['demora distinta', { regla: { demoraAperturaSegundos: 0 } }],
    ['ventana de cierre distinta', { regla: { ventanaCierreSegundos: 60 } }],
    ['umbrales escalados', { regla: { factorUmbrales: 0.6, abrirSiColaMayorQue: null, cerrarSiColaMenorQue: null } }],
    ['reasignación activada', { regla: { reasignacionActiva: true } }],
    ['cola inicial distinta', { sentidos: [{ colaInicial: 0 }, {}] }],
    ['otro conteo en C→P', { sentidos: [{}, { conteo: 'domingoCP' }] }],
    ['modo programado', { sentidos: [{ modo: MODO.PROGRAMADO }, { modo: MODO.PROGRAMADO }] }],
  ];

  for (const [nombre, sobreescrituras] of cambios) {
    it(`${nombre} cambia el resultado`, () => {
      expect(huella(corrida(sobreescrituras))).not.toBe(referencia);
    });
  }

  it('volver a los valores por defecto restituye el resultado exacto', () => {
    // Se corre un escenario cambiado por medio, para descartar estado colgado.
    corrida({ pozo: { total: 9, maximoPorSentido: 8 }, regla: { abrirSiColaMayorQue: null, cerrarSiColaMenorQue: null } });
    expect(huella(corrida({}))).toBe(referencia);
  });

  it('cambiar solo la meta no cambia la simulación, solo el veredicto', () => {
    // La espera del base ronda los 28 s por sentido: 120 s la deja pasar y
    // 20 s la suspende, con las mismas réplicas.
    const laxa = corrida({ desempeno: { metaWqSegundos: 120 } });
    const estricta = corrida({ desempeno: { metaWqSegundos: 20 } });
    // Las réplicas son las mismas: la meta no entra en el motor.
    expect(huella(laxa)).toBe(huella(estricta));
    expect(laxa.cumplimiento.mediaCumple).not.toBe(estricta.cumplimiento.mediaCumple);
  });
});
