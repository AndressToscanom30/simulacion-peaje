import { describe, expect, it } from 'vitest';
import { simularPeaje } from '../../motor/peaje.js';
import { aConfiguracionPeaje, construirEscenario, SERVICIO_LENTO } from '../../config/escenario.js';
import { rhoEnInstante, muestrasRhoPorEvento, seriesRhoHasta } from '../rho.js';

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

function correrConObservador(escenario, semilla) {
  const reloj = { ahora: 0 };
  const eventos = [];
  const observaciones = [];
  const configuracion = aConfiguracionPeaje(escenario);

  simularPeaje({
    ...configuracion,
    semilla,
    reloj,
    anotar: (tipo, datos) => eventos.push({ t: reloj.ahora, tipo, ...datos }),
    observador({ sentidos }) {
      observaciones.push({
        cantidadEventos: eventos.length,
        rhos: sentidos.map((sentido) => sentido.rho()),
      });
    },
  });

  return {
    eventos,
    observaciones,
    traza: {
      eventos,
      metadatos: {
        escenario,
        pozoTotal: escenario.pozo.total,
        duracionIntervaloSegundos: escenario.tiempo.duracionIntervaloSegundos,
        sentidos: escenario.sentidos.map((sentido, id) => ({ id, etiqueta: sentido.etiqueta })),
      },
    },
  };
}

describe('ρ reconstruido desde la traza', () => {
  for (const [nombre, escenario] of ESCENARIOS) {
    it(`${nombre}: coincide con el motor en cada observación de las 30 semillas`, () => {
      for (let semilla = 1; semilla <= 30; semilla += 1) {
        const { traza, observaciones } = correrConObservador(escenario, semilla);
        const muestras = muestrasRhoPorEvento(traza);
        for (const observacion of observaciones) {
          const reconstruidos = muestras[observacion.cantidadEventos];
          observacion.rhos.forEach((rho, sentidoId) => {
            const reconstruido = reconstruidos[sentidoId];
            if (rho === Infinity) {
              expect(reconstruido, `${nombre}, semilla ${semilla}, sentido ${sentidoId}`).toBe(Infinity);
            } else {
              expect(reconstruido, `${nombre}, semilla ${semilla}, sentido ${sentidoId}`).toBeCloseTo(rho, 12);
            }
          });
        }
      }
    });
  }

  it('mantiene la última poda aunque el tiempo avance sin nuevas llegadas', () => {
    const escenario = construirEscenario();
    const { traza } = correrConObservador(escenario, 1);
    const llegadas = traza.eventos.filter((evento) => evento.tipo === 'llegada' && !evento.inicial);
    const ultimaLlegada = llegadas.at(-1);
    const despues = ultimaLlegada.t + escenario.regla.ventanaRhoSegundos * 2;
    expect(rhoEnInstante(traza, despues)).toEqual(rhoEnInstante(traza, ultimaLlegada.t));
  });

  it('las series llegan hasta el instante reproducido y conservan ambos sentidos', () => {
    const escenario = construirEscenario();
    const { traza } = correrConObservador(escenario, 2);
    const series = seriesRhoHasta(traza, 900);
    expect(series).toHaveLength(2);
    expect(series.every((serie) => serie.puntos.at(-1).t === 900)).toBe(true);
  });
});
