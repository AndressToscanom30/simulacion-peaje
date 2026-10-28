import { describe, it, expect } from 'vitest';
import { simularPeaje } from '../peaje.js';
import {
  crearGrabador,
  armarTraza,
  reconstruirDesdeTraza,
  estadoEnInstante,
  VERSION_TRAZA,
  EVENTOS_TRAZA,
} from '../traza.js';
import { construirEscenario, aConfiguracionPeaje, semillasDe, SERVICIO_LENTO } from '../../config/escenario.js';
import { simularTraza } from '../../corridas.js';

const SEMILLAS = semillasDe(construirEscenario());

/** Corre una réplica sin grabar. */
const sinGrabar = (escenario, semilla) =>
  simularPeaje({ ...aConfiguracionPeaje(escenario), semilla });

describe('grabar no cambia el resultado', () => {
  const escenarios = [
    ['base', construirEscenario()],
    ['con reasignación', construirEscenario({ regla: { reasignacionActiva: true } })],
    ['servicio lento', construirEscenario({ servicio: SERVICIO_LENTO })],
    ['modo programado', construirEscenario({ sentidos: [{ modo: 'programado' }, { modo: 'programado' }] })],
    ['pozo 8, tope 7', construirEscenario({
      pozo: { total: 8, maximoPorSentido: 7 },
      regla: { abrirSiColaMayorQue: null, cerrarSiColaMenorQue: null },
    })],
  ];

  for (const [nombre, escenario] of escenarios) {
    it(`${nombre}: con y sin grabador sale lo mismo, en las ${SEMILLAS.length} semillas`, () => {
      for (const semilla of SEMILLAS) {
        const traza = simularTraza(escenario, semilla);
        expect(traza.medidas.sentidos, `semilla ${semilla}`).toEqual(
          sinGrabar(escenario, semilla).sentidos,
        );
      }
    });
  }

  it('el grabador no consume números aleatorios', () => {
    const escenario = construirEscenario();
    const conGrabador = simularTraza(escenario, 7);
    const sin = sinGrabar(escenario, 7);
    conGrabador.medidas.sentidos.forEach((s, i) => {
      expect(s.numerosAleatoriosUsados).toBe(sin.sentidos[i].numerosAleatoriosUsados);
    });
  });
});

describe('la traza es reproducible', () => {
  it('con la misma semilla, la misma traza', () => {
    const escenario = construirEscenario();
    expect(simularTraza(escenario, 3)).toEqual(simularTraza(escenario, 3));
  });

  it('con semillas distintas, trazas distintas', () => {
    const escenario = construirEscenario();
    const a = simularTraza(escenario, 1);
    const b = simularTraza(escenario, 2);
    expect(a.eventos.length).not.toBe(b.eventos.length);
  });

  it('sobrevive a JSON de ida y vuelta', () => {
    const traza = simularTraza(construirEscenario(), 5);
    expect(JSON.parse(JSON.stringify(traza))).toEqual(traza);
  });
});

describe('forma de la traza', () => {
  const traza = simularTraza(construirEscenario(), 1);

  it('trae la versión y los metadatos que la fase 6 necesita', () => {
    expect(traza.version).toBe(VERSION_TRAZA);
    const m = traza.metadatos;
    expect(m.semilla).toBe(1);
    expect(m.horizonteSegundos).toBe(3600);
    expect(m.intervalos).toBe(12);
    expect(m.pozoTotal).toBe(6);
    expect(m.sentidos).toHaveLength(2);
    expect(m.sentidos[0]).toMatchObject({ id: 0, conteo: 'festivoPC' });
    expect(m.escenario).toBeDefined();
  });

  it('los eventos van en orden de instante', () => {
    let anterior = -Infinity;
    for (const evento of traza.eventos) {
      expect(evento.t).toBeGreaterThanOrEqual(anterior);
      anterior = evento.t;
    }
  });

  it('solo usa tipos de evento declarados', () => {
    const declarados = Object.values(EVENTOS_TRAZA).flat();
    for (const evento of traza.eventos) expect(declarados).toContain(evento.tipo);
  });

  it('cada vehículo da llegada, ingreso y salida, en ese orden', () => {
    /** @type {Map<string, string[]>} */
    const porVehiculo = new Map();
    for (const evento of traza.eventos) {
      if (!['llegada', 'ingresoACaseta', 'salida'].includes(evento.tipo)) continue;
      const clave = `${evento.sentidoId}-${evento.vehiculoId}`;
      porVehiculo.set(clave, [...(porVehiculo.get(clave) ?? []), evento.tipo]);
    }
    expect(porVehiculo.size).toBeGreaterThan(1000);
    for (const [clave, tipos] of porVehiculo) {
      expect(tipos, clave).toEqual(['llegada', 'ingresoACaseta', 'salida']);
    }
  });

  it('una caseta reservada abre en el instante que anunció', () => {
    const reservas = traza.eventos.filter((e) => e.tipo === 'casetaReservada');
    expect(reservas.length).toBeGreaterThan(0);
    for (const reserva of reservas) {
      const apertura = traza.eventos.find(
        (e) => e.tipo === 'casetaAbre' && e.casetaId === reserva.casetaId && e.t >= reserva.t,
      );
      expect(apertura, `reserva en t=${reserva.t}`).toBeDefined();
      expect(apertura.t).toBeCloseTo(reserva.abreEn, 9);
    }
  });

  it('las llegadas por intervalo de las series salen de los eventos', () => {
    traza.seriesPorIntervalo.forEach((serie, i) => {
      const total = serie.llegadas.reduce((a, b) => a + b, 0);
      // Los iniciales no se cuentan como llegadas del intervalo.
      expect(total).toBe(traza.medidas.sentidos[i].llegadasSimuladas);
      expect(serie.wqSegundos).toHaveLength(12);
      expect(serie.colaMuestreada).toHaveLength(12);
    });
  });

  it('hay una lectura de cola por intervalo y sentido', () => {
    const lecturas = traza.eventos.filter((e) => e.tipo === 'lecturaCola');
    expect(lecturas).toHaveLength(12 * 2);
  });

  it('el grabador rechaza un tipo de evento inventado', () => {
    const grabador = crearGrabador({ reloj: { ahora: 0 } });
    expect(() => grabador.anotar('loQueSea', {})).toThrow(/desconocido/);
  });

  it('armarTraza no necesita nada del motor más que el resultado', () => {
    const escenario = construirEscenario();
    const traza2 = armarTraza({
      eventos: [],
      escenario,
      semilla: 99,
      resultado: { sentidos: [{ etiqueta: 'a' }, { etiqueta: 'b' }], total: {}, pozo: {} },
    });
    expect(traza2.metadatos.semilla).toBe(99);
    expect(traza2.metadatos.instanteFinalSegundos).toBe(0);
  });
});

describe('reconstruir desde la traza coincide con el motor', () => {
  const escenarios = [
    ['base', construirEscenario()],
    ['con reasignación', construirEscenario({ regla: { reasignacionActiva: true } })],
    ['servicio lento', construirEscenario({ servicio: SERVICIO_LENTO })],
    ['modo programado', construirEscenario({ sentidos: [{ modo: 'programado' }, { modo: 'programado' }] })],
  ];

  for (const [nombre, escenario] of escenarios) {
    it(`${nombre}: atendidos, cola máxima y carriles-intervalo, en las 30 semillas`, () => {
      for (const semilla of SEMILLAS) {
        const traza = simularTraza(escenario, semilla);
        const estado = reconstruirDesdeTraza(traza);
        traza.medidas.sentidos.forEach((medidas, i) => {
          const reconstruido = estado.porSentido[i];
          const donde = `${nombre}, semilla ${semilla}, ${medidas.etiqueta}`;
          expect(reconstruido.atendidos, `${donde}: atendidos`).toBe(medidas.atendidosTotal);
          expect(reconstruido.colaMaxima, `${donde}: cola máxima`).toBe(medidas.colaMaximaContinua);
          expect(
            Math.abs(reconstruido.carrilesIntervalo - medidas.carrilesIntervalo),
            `${donde}: carriles-intervalo`,
          ).toBeLessThan(1e-9);
        });
      }
    });
  }

  it('la cola y el servicio quedan a cero al final', () => {
    const estado = reconstruirDesdeTraza(simularTraza(construirEscenario(), 1));
    for (const s of estado.porSentido) {
      expect(s.cola).toBe(0);
      expect(s.enServicio).toBe(0);
    }
  });

  it('al final el pozo tiene las casetas que quedaron abiertas', () => {
    const traza = simularTraza(construirEscenario(), 1);
    const estado = reconstruirDesdeTraza(traza);
    const repartidas = estado.pozo.duenoDeCaseta.filter((d) => d !== null).length;
    const abiertas = estado.porSentido.reduce((a, s) => a + s.casetasAbiertas, 0);
    expect(repartidas).toBe(abiertas);
    expect(abiertas).toBeLessThanOrEqual(traza.metadatos.pozoTotal);
  });

  it('el estado en un instante intermedio es coherente', () => {
    const traza = simularTraza(construirEscenario(), 1);
    const mitad = estadoEnInstante(traza, 1800);
    for (const s of mitad.porSentido) {
      expect(s.cola).toBeGreaterThanOrEqual(0);
      expect(s.enServicio).toBeGreaterThanOrEqual(0);
      expect(s.casetasAbiertas).toBeGreaterThanOrEqual(1);
      expect(s.casetasAbiertas).toBeLessThanOrEqual(traza.metadatos.maximoPorSentido);
    }
    const total = mitad.porSentido.reduce((a, s) => a + s.casetasAbiertas, 0);
    expect(total).toBeLessThanOrEqual(traza.metadatos.pozoTotal);
  });

  it('el estado en t = 0 ya tiene la cola inicial y las casetas iniciales', () => {
    const traza = simularTraza(construirEscenario(), 1);
    const inicio = estadoEnInstante(traza, 0);
    // 23 llegadas iniciales, de las que 4 entran en seguida a las 4 casetas.
    expect(inicio.porSentido[0].llegados).toBeGreaterThanOrEqual(23);
    expect(inicio.porSentido[0].casetasAbiertas).toBe(4);
    expect(inicio.porSentido[1].casetasAbiertas).toBe(1);
  });

  it('al avanzar el instante la cola nunca queda negativa', () => {
    const traza = simularTraza(construirEscenario({ servicio: SERVICIO_LENTO }), 4);
    for (let t = 0; t <= traza.metadatos.instanteFinalSegundos; t += 150) {
      for (const s of estadoEnInstante(traza, t).porSentido) {
        expect(s.cola).toBeGreaterThanOrEqual(0);
      }
    }
  });
});
