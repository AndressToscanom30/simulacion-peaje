import { describe, it, expect } from 'vitest';
import { crearModeloEscena, escenaEnInstante } from '../vista3d/modeloEscena.js';
import { estadoEnInstante } from '../../motor/traza.js';
import { crearPrng } from '../../motor/prng.js';
import { simularTraza } from '../../corridas.js';
import { construirEscenario, SERVICIO_LENTO, semillasDe } from '../../config/escenario.js';
import { ESTADOS_CASETA, FASES_VEHICULO } from '../../config/escena3d.js';

const SEMILLAS = semillasDe(construirEscenario());

/** Los cuatro escenarios con los que se prueba todo, incluidos pozos grandes. */
const ESCENARIOS = [
  ['base', construirEscenario()],
  ['servicio lento', construirEscenario({ servicio: SERVICIO_LENTO })],
  [
    'pozo 8, tope 7',
    construirEscenario({
      pozo: { total: 8, maximoPorSentido: 7 },
      regla: { abrirSiColaMayorQue: null, cerrarSiColaMenorQue: null },
    }),
  ],
  [
    'pozo 10, tope 9, demanda ×1,6',
    construirEscenario({
      pozo: { total: 10, maximoPorSentido: 9 },
      regla: { abrirSiColaMayorQue: null, cerrarSiColaMenorQue: null },
      sentidos: [{ factorDemanda: 1.6 }, { factorDemanda: 1.6 }],
    }),
  ],
];

/** Instantes aleatorios pero deterministas dentro de la traza. */
function instantesAleatorios(traza, semilla, cuantos = 6) {
  const prng = crearPrng(semilla * 977 + 13);
  const final = traza.metadatos.instanteFinalSegundos;
  return Array.from({ length: cuantos }, () => prng.siguiente() * final).sort((a, b) => a - b);
}

describe('la escena coincide con el estado del motor', () => {
  for (const [nombre, escenario] of ESCENARIOS) {
    it(`${nombre}: cola y en servicio cuadran en instantes aleatorios de las ${SEMILLAS.length} semillas`, () => {
      for (const semilla of SEMILLAS) {
        const traza = simularTraza(escenario, semilla);
        for (const t of instantesAleatorios(traza, semilla)) {
          const escena = escenaEnInstante(traza, t);
          const motor = estadoEnInstante(traza, t);
          escena.contadores.forEach((contador, i) => {
            const donde = `${nombre}, semilla ${semilla}, t=${t.toFixed(1)}, sentido ${i}`;
            // `cola` del motor = llegando + enCola; `enServicio` = enTransito + enServicio.
            expect(contador.cola, `${donde}: cola`).toBe(motor.porSentido[i].cola);
            expect(contador.enServicio, `${donde}: en servicio`).toBe(motor.porSentido[i].enServicio);
            expect(contador.atendidos, `${donde}: atendidos`).toBe(motor.porSentido[i].atendidos);
            expect(contador.casetasAbiertas, `${donde}: casetas`).toBe(motor.porSentido[i].casetasAbiertas);
          });
          expect(escena.pozo.libres, `${nombre}, semilla ${semilla}: libres`).toBe(motor.pozo.libres);
        }
      }
    });
  }
});

describe('coherencia de los vehículos', () => {
  for (const [nombre, escenario] of ESCENARIOS) {
    it(`${nombre}: la cola respeta el FIFO y nadie está en dos sitios`, () => {
      for (const semilla of SEMILLAS) {
        const traza = simularTraza(escenario, semilla);
        for (const t of instantesAleatorios(traza, semilla, 4)) {
          const escena = escenaEnInstante(traza, t);
          const donde = `${nombre}, semilla ${semilla}, t=${t.toFixed(1)}`;

          // Ningún vehículo aparece dos veces.
          const claves = escena.vehiculos.map((v) => `${v.sentidoId}-${v.id}`);
          expect(new Set(claves).size, `${donde}: repetidos`).toBe(claves.length);

          // Cada vehículo tiene exactamente una fase conocida.
          for (const vehiculo of escena.vehiculos) {
            expect(Object.keys(FASES_VEHICULO), `${donde}: fase`).toContain(vehiculo.fase);
            expect(vehiculo.progreso).toBeGreaterThanOrEqual(0);
            expect(vehiculo.progreso).toBeLessThanOrEqual(1);
          }

          // Las posiciones de cola de cada sentido son 0, 1, 2… sin huecos.
          escena.contadores.forEach((_, sentidoId) => {
            const enCola = escena.vehiculos
              .filter((v) => v.sentidoId === sentidoId && v.posicionCola !== null)
              .sort((a, b) => a.posicionCola - b.posicionCola);
            expect(enCola.map((v) => v.posicionCola), `${donde}: huecos en la cola`).toEqual(
              enCola.map((_, i) => i),
            );
            // Y están en orden de llegada: el id crece con la posición (FIFO).
            const ids = enCola.map((v) => v.id);
            expect([...ids].sort((a, b) => a - b), `${donde}: FIFO`).toEqual(ids);
          });
        }
      }
    });

    it(`${nombre}: cada vehículo en servicio está en su caseta, y una caseta atiende a uno`, () => {
      for (const semilla of SEMILLAS) {
        const traza = simularTraza(escenario, semilla);
        for (const t of instantesAleatorios(traza, semilla, 4)) {
          const escena = escenaEnInstante(traza, t);
          const donde = `${nombre}, semilla ${semilla}, t=${t.toFixed(1)}`;

          const enCaseta = escena.vehiculos.filter((v) =>
            ['enTransito', 'enServicio'].includes(v.fase),
          );
          for (const vehiculo of enCaseta) {
            expect(vehiculo.casetaId, `${donde}: sin caseta`).not.toBeNull();
            const caseta = escena.casetas[vehiculo.casetaId];
            expect(caseta.vehiculoId, `${donde}: caseta ${vehiculo.casetaId}`).toBe(vehiculo.id);
            expect(caseta.sentidoId, `${donde}: sentido de la caseta`).toBe(vehiculo.sentidoId);
          }

          // Ninguna caseta con dos vehículos dentro.
          const porCaseta = new Map();
          for (const vehiculo of enCaseta) {
            porCaseta.set(vehiculo.casetaId, (porCaseta.get(vehiculo.casetaId) ?? 0) + 1);
          }
          for (const [casetaId, cuantos] of porCaseta) {
            expect(cuantos, `${donde}: caseta ${casetaId} con ${cuantos} vehículos`).toBe(1);
          }

          // Y las ocupadas son exactamente esas.
          const ocupadas = escena.casetas.filter((c) => c.ocupada).map((c) => c.id).sort();
          expect([...porCaseta.keys()].sort(), `${donde}: ocupadas`).toEqual(ocupadas);
        }
      }
    });
  }

  it('al final no queda ningún vehículo en la escena', () => {
    for (const [nombre, escenario] of ESCENARIOS) {
      for (const semilla of [1, 15, 30]) {
        const traza = simularTraza(escenario, semilla);
        // Pasado el último evento más la salida visual, la escena está vacía.
        const despues = traza.metadatos.instanteFinalSegundos + 120;
        const escena = escenaEnInstante(traza, despues);
        expect(escena.vehiculos, `${nombre}, semilla ${semilla}`).toEqual([]);
        for (const contador of escena.contadores) {
          expect(contador.cola).toBe(0);
          expect(contador.enServicio).toBe(0);
        }
      }
    }
  });

  it('en t = 0 la cola inicial ya está puesta y no entra desde el borde', () => {
    const traza = simularTraza(construirEscenario(), 1);
    const escena = escenaEnInstante(traza, 0);
    const iniciales = escena.vehiculos.filter((v) => v.inicial);
    expect(iniciales.length).toBe(23);
    // Los iniciales no están en fase `llegando`: ya estaban ahí (DEC-018).
    expect(iniciales.every((v) => v.fase !== 'llegando')).toBe(true);
  });
});

describe('coherencia de las casetas', () => {
  for (const [nombre, escenario] of ESCENARIOS) {
    it(`${nombre}: ninguna caseta cambia de sentido con un vehículo dentro`, () => {
      for (const semilla of SEMILLAS) {
        const traza = simularTraza(escenario, semilla);
        const modelo = crearModeloEscena(traza);
        const final = traza.metadatos.instanteFinalSegundos;
        const paso = final / 400;

        let previo = null;
        for (let t = 0; t <= final; t += paso) {
          const escena = modelo.enInstante(t);
          if (previo) {
            escena.casetas.forEach((caseta, id) => {
              const antes = previo[id];
              if (antes.ocupada && caseta.ocupada && antes.vehiculoId === caseta.vehiculoId) {
                expect(
                  caseta.sentidoId,
                  `${nombre}, semilla ${semilla}, t=${t.toFixed(1)}: la caseta ${id} cambió de sentido con el vehículo ${caseta.vehiculoId} dentro`,
                ).toBe(antes.sentidoId);
              }
            });
          }
          previo = escena.casetas;
        }
      }
    });
  }

  it('los estados de caseta son los declarados y cuadran con el pozo', () => {
    const traza = simularTraza(ESCENARIOS[2][1], 3);
    for (const t of [0, 400, 1200, 2400, 3500]) {
      const escena = escenaEnInstante(traza, t);
      expect(escena.casetas).toHaveLength(traza.metadatos.pozoTotal);
      for (const caseta of escena.casetas) {
        expect(Object.keys(ESTADOS_CASETA)).toContain(caseta.estado);
        // Una caseta cerrada no tiene dueño ni vehículo.
        if (caseta.estado === 'cerrada') {
          expect(caseta.sentidoId).toBeNull();
          expect(caseta.vehiculoId).toBeNull();
        }
        // Solo las reservadas cuentan atrás.
        expect(caseta.faltaParaAbrir === null).toBe(caseta.estado !== 'reservada');
      }
      const suma = Object.values(escena.pozo.porEstado).reduce((a, b) => a + b, 0);
      expect(suma).toBe(traza.metadatos.pozoTotal);
    }
  });

  it('una caseta reservada cuenta atrás hasta su instante de apertura', () => {
    const traza = simularTraza(construirEscenario(), 1);
    const reserva = traza.eventos.find((e) => e.tipo === 'casetaReservada');
    expect(reserva).toBeDefined();
    const mitad = (reserva.t + reserva.abreEn) / 2;
    const caseta = escenaEnInstante(traza, mitad).casetas[reserva.casetaId];
    expect(caseta.estado).toBe('reservada');
    expect(caseta.faltaParaAbrir).toBeCloseTo(reserva.abreEn - mitad, 6);
  });
});

describe('avisos de reasignación y de bloqueo', () => {
  it('un bloqueo aparece y se va solo', () => {
    const traza = simularTraza(construirEscenario(), 1);
    const bloqueo = traza.eventos.find((e) => e.tipo === 'peticionBloqueada');
    expect(bloqueo).toBeDefined();
    const justoDespues = escenaEnInstante(traza, bloqueo.t + 1).avisos;
    expect(justoDespues.some((a) => a.tipo === 'bloqueo')).toBe(true);
    const muchoDespues = escenaEnInstante(traza, bloqueo.t + 300).avisos;
    expect(muchoDespues.some((a) => a.tipo === 'bloqueo' && a.t === bloqueo.t)).toBe(false);
  });

  it('una reasignación anota de dónde y hacia dónde', () => {
    const traza = simularTraza(construirEscenario({ regla: { reasignacionActiva: true } }), 1);
    const reasignacion = traza.eventos.find((e) => e.tipo === 'casetaReasignada');
    if (!reasignacion) return; // con esta semilla puede no haber: no es un fallo
    const aviso = escenaEnInstante(traza, reasignacion.t + 1).avisos.find(
      (a) => a.tipo === 'reasignacion',
    );
    expect(aviso.casetaId).toBe(reasignacion.casetaId);
    expect(aviso.sentidoId).toBe(reasignacion.haciaSentidoId);
  });
});

describe('avance incremental y determinismo', () => {
  it('avanzar en pasos pequeños da lo mismo que calcular de golpe', () => {
    for (const [nombre, escenario] of ESCENARIOS) {
      const traza = simularTraza(escenario, 7);
      const modelo = crearModeloEscena(traza);
      const final = traza.metadatos.instanteFinalSegundos;
      for (let t = 0; t <= final; t += final / 50) {
        const incremental = modelo.enInstante(t);
        const deGolpe = escenaEnInstante(traza, t);
        expect(incremental, `${nombre} en t=${t.toFixed(1)}`).toEqual(deGolpe);
      }
    }
  });

  it('no recorre todos los eventos en cada fotograma', () => {
    const traza = simularTraza(construirEscenario(), 1);
    const modelo = crearModeloEscena(traza);
    const final = traza.metadatos.instanteFinalSegundos;
    const pasos = 200;
    let consumidosPrevios = 0;
    for (let i = 1; i <= pasos; i += 1) {
      modelo.enInstante((final * i) / pasos);
      // El cursor solo avanza: nunca se vuelve a leer lo ya leído.
      expect(modelo.eventosConsumidos).toBeGreaterThanOrEqual(consumidosPrevios);
      consumidosPrevios = modelo.eventosConsumidos;
    }
    // Y al final se han leído todos, una sola vez.
    expect(modelo.eventosConsumidos).toBe(traza.eventos.length);
  });

  it('rebobinar rehace el estado y da el mismo modelo', () => {
    const traza = simularTraza(construirEscenario(), 1);
    const modelo = crearModeloEscena(traza);
    modelo.enInstante(3000);
    const volviendo = modelo.enInstante(900);
    expect(volviendo).toEqual(escenaEnInstante(traza, 900));
    // Y se puede seguir adelante después de rebobinar.
    expect(modelo.enInstante(2000)).toEqual(escenaEnInstante(traza, 2000));
  });

  it('es determinista: el mismo instante da el mismo modelo', () => {
    const traza = simularTraza(construirEscenario(), 5);
    for (const t of [0, 777, 1500, 3333]) {
      expect(escenaEnInstante(traza, t)).toEqual(escenaEnInstante(traza, t));
    }
  });

  it('con prefers-reduced-motion no hay fases cosméticas, pero los contadores no cambian', () => {
    const traza = simularTraza(construirEscenario(), 1);
    for (const t of [300, 1500, 2900]) {
      const normal = escenaEnInstante(traza, t);
      const reducido = escenaEnInstante(traza, t, { reducirMovimiento: true });
      // La simulación es la misma: los contadores coinciden (DEC-039).
      expect(reducido.contadores.map((c) => [c.cola, c.enServicio, c.atendidos])).toEqual(
        normal.contadores.map((c) => [c.cola, c.enServicio, c.atendidos]),
      );
      // Y no queda ningún vehículo en una fase de interpolación.
      expect(reducido.vehiculos.some((v) => ['llegando', 'enTransito', 'saliendo'].includes(v.fase))).toBe(
        false,
      );
    }
  });
});

describe('el módulo es puro', () => {
  it('no importa three, ni React, ni el motor', async () => {
    const { readFileSync } = await import('node:fs');
    const fuente = readFileSync(
      new URL('../vista3d/modeloEscena.js', import.meta.url),
      'utf8',
    );
    const importaciones = [...fuente.matchAll(/^import .*? from '(.+?)';$/gm)].map((m) => m[1]);
    for (const ruta of importaciones) {
      expect(ruta, `importa ${ruta}`).not.toMatch(/three|@react-three|react/);
      expect(ruta, `importa el motor: ${ruta}`).not.toMatch(/motor\/(peaje|simulador|sentido)/);
    }
    expect(importaciones).toContain('../reloj.js');
  });
});
