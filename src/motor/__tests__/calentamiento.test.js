import { describe, it, expect } from 'vitest';

import { simularSentido, MODO_CASETAS } from '../simulador.js';
import { esperasDeCalentamiento, conCalentamiento } from '../calentamiento.js';
import { conteos } from '../../config/datos.js';
import { parametros, semillasReplicas } from '../../config/parametros.js';

const p = parametros;
const CONTEO = 'festivoPC';

/** Argumentos del calentamiento del festivo. */
function args({ intervalos = 3, semilla = 1 } = {}) {
  return {
    llegadasPrimerIntervalo: conteos[CONTEO].llegadas[0],
    casetasIniciales: conteos[CONTEO].casetas[0],
    intervalos,
    duracionIntervaloSegundos: p.tiempo.duracionIntervaloSegundos,
    gammaForma: p.servicio.gammaForma,
    gammaEscalaSegundos: p.servicio.gammaEscalaSegundos,
    semilla,
    flujo: p.calentamiento.flujoBase,
  };
}

/** Configuración del festivo en modo programado. */
function configFestivo(extra = {}) {
  return {
    semilla: 1,
    llegadas: conteos[CONTEO].llegadas,
    casetasProgramadas: conteos[CONTEO].casetas,
    casetasIniciales: conteos[CONTEO].casetas[0],
    modoCasetas: MODO_CASETAS.PROGRAMADO,
    duracionIntervaloSegundos: p.tiempo.duracionIntervaloSegundos,
    gammaForma: p.servicio.gammaForma,
    gammaEscalaSegundos: p.servicio.gammaEscalaSegundos,
    maximoTolerableWqSegundos: p.desempeno.maximoTolerableWqSegundos,
    ...extra,
  };
}

describe('calentamiento: la cola que deja', () => {
  it('sin calentamiento devuelve una cola vacía', () => {
    expect(esperasDeCalentamiento(args({ intervalos: 0 }))).toEqual([]);
  });

  it('rechaza duraciones que no sean enteros no negativos', () => {
    expect(() => esperasDeCalentamiento(args({ intervalos: -1 }))).toThrow(RangeError);
    expect(() => esperasDeCalentamiento(args({ intervalos: 1.5 }))).toThrow(RangeError);
  });

  it('todas las esperas son no negativas y menores que el calentamiento', () => {
    const intervalos = 3;
    const horizonte = intervalos * p.tiempo.duracionIntervaloSegundos;
    for (const semilla of semillasReplicas()) {
      for (const espera of esperasDeCalentamiento(args({ intervalos, semilla }))) {
        expect(espera).toBeGreaterThanOrEqual(0);
        expect(espera).toBeLessThanOrEqual(horizonte);
      }
    }
  });

  it('es reproducible con la misma semilla y cambia con otra', () => {
    expect(esperasDeCalentamiento(args({ semilla: 7 }))).toEqual(
      esperasDeCalentamiento(args({ semilla: 7 })),
    );
    expect(esperasDeCalentamiento(args({ semilla: 7 }))).not.toEqual(
      esperasDeCalentamiento(args({ semilla: 8 })),
    );
  });

  it('corre en su propio flujo: no copia el primer intervalo de la hora', () => {
    // Si el calentamiento usara la semilla tal cual, su tráfico sería el mismo
    // que el del primer intervalo de la hora observada (misma tasa, mismo flujo).
    const conFlujoPropio = esperasDeCalentamiento(args({ semilla: 1, intervalos: 1 }));
    const conFlujoCero = esperasDeCalentamiento({ ...args({ semilla: 1, intervalos: 1 }), flujo: 0 });
    expect(conFlujoPropio).not.toEqual(conFlujoCero);
  });
});

describe('calentamiento: cómo entra en el motor', () => {
  it('con 0 intervalos devuelve la configuración intacta', () => {
    const config = configFestivo({ colaInicial: 23 });
    expect(conCalentamiento(config, { intervalos: 0, semilla: 1, flujo: 10 })).toBe(config);
  });

  it('la cola heredada cuenta su espera desde que llegó, no desde t = 0', () => {
    // Un solo vehículo que ya llevaba 120 s esperando: su espera tiene que
    // salir al menos esos 120 s, mientras el tratamiento de la DEC-018 le daría
    // casi 0 porque se atiende de inmediato.
    const esperaPrevia = 120;
    const conEspera = simularSentido(
      configFestivo({ colaInicial: 0, colaInicialEsperas: [esperaPrevia] }),
    );
    const inyectado = simularSentido(configFestivo({ colaInicial: 1 }));
    expect(conEspera.colaInicialVehiculos).toBe(1);
    expect(conEspera.esperaHeredadaMediaSegundos).toBe(esperaPrevia);
    expect(inyectado.esperaHeredadaMediaSegundos).toBe(0);
    expect(conEspera.wqHoraSegundos).toBeGreaterThan(inyectado.wqHoraSegundos);
  });

  it('la cola heredada respeta FIFO: primero el que más llevaba esperando', () => {
    // Con una sola caseta y sin llegadas, el orden de atención se lee en las
    // esperas: el primero sale con su espera previa casi intacta.
    const r = simularSentido({
      ...configFestivo(),
      llegadas: [0, 0],
      casetasProgramadas: [1, 1],
      casetasIniciales: 1,
      colaInicial: 0,
      colaInicialEsperas: [10, 300, 60],
      guardarEsperas: true,
    });
    // Tres vehículos atendidos, y el primero es el de 300 s.
    expect(r.esperas).toHaveLength(3);
    expect(r.esperas[0]).toBeGreaterThanOrEqual(300);
    expect(r.esperas[0]).toBeGreaterThan(r.esperas[1]);
  });

  it('la cola heredada no cuenta como demanda para el disparador por tasa', () => {
    // Mismo criterio que la cola inicial de la DEC-018: es rezago (DEC-027).
    const r = simularSentido({
      ...configFestivo(),
      llegadas: new Array(12).fill(0),
      casetasProgramadas: new Array(12).fill(1),
      casetasIniciales: 1,
      modoCasetas: MODO_CASETAS.REGLA,
      regla: {
        abrirSiColaMayorQue: { 1: 1e9, 2: 1e9, 3: 1e9, 4: 1e9, 5: null },
        cerrarSiColaMenorQue: { 1: null, 2: 2, 3: 4, 4: 7, 5: 9 },
        abrirSiTasaMayorQue: { 1: 21, 2: 46, 3: 70, 4: 95, 5: null },
        disparadorPorTasa: true,
        demoraAperturaSegundos: 0,
        ventanaCierreSegundos: 900,
        maximoCasetas: 5,
        minimoCasetas: 1,
      },
      colaInicial: 0,
      colaInicialEsperas: new Array(80).fill(60),
    });
    expect(r.aperturasAnticipadas).toBe(0);
    expect(r.aperturas).toBe(0);
  });

  it('el escenario base no calienta: el parámetro viene apagado', () => {
    expect(p.calentamiento.intervalos).toBe(0);
  });

  it('el flujo del calentamiento no pisa los de los sentidos', () => {
    expect(p.calentamiento.flujoBase).toBeGreaterThan(1);
  });
});
