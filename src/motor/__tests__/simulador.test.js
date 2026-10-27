import { describe, it, expect } from 'vitest';
import { simularSentido } from '../simulador.js';
import { correrReplicas } from '../lotes.js';
import { media } from '../estadisticas.js';
import { conteos } from '../../config/datos.js';
import { parametros } from '../../config/parametros.js';

const p = parametros;

/** Margen para comparar la integral ∫c(t)dt, acumulada en coma flotante. */
const EPSILON_INTEGRAL = 1e-9;

/** Configuración base de un conteo, sin semilla. */
function configDe(clave, extra = {}) {
  return {
    llegadas: conteos[clave].llegadas,
    casetasProgramadas: conteos[clave].casetas,
    duracionIntervaloSegundos: p.tiempo.duracionIntervaloSegundos,
    gammaForma: p.servicio.gammaForma,
    gammaEscalaSegundos: p.servicio.gammaEscalaSegundos,
    maximoTolerableWqSegundos: p.desempeno.maximoTolerableWqSegundos,
    ...extra,
  };
}

describe('reproducibilidad', () => {
  it('con la misma semilla el resultado es idéntico', () => {
    const a = simularSentido(configDe('festivoPC', { semilla: 7, colaInicial: 23 }));
    const b = simularSentido(configDe('festivoPC', { semilla: 7, colaInicial: 23 }));
    expect(a).toEqual(b);
  });

  it('con semillas distintas el resultado cambia', () => {
    const a = simularSentido(configDe('festivoPC', { semilla: 1, colaInicial: 23 }));
    const b = simularSentido(configDe('festivoPC', { semilla: 2, colaInicial: 23 }));
    expect(a.wqHoraSegundos).not.toBe(b.wqHoraSegundos);
  });

  it('las 30 réplicas de las semillas 1…30 se repiten exactamente', () => {
    const semillas = Array.from({ length: 30 }, (_, i) => i + 1);
    const primera = correrReplicas(configDe('domingoCP'), semillas);
    const segunda = correrReplicas(configDe('domingoCP'), semillas);
    expect(primera).toEqual(segunda);
  });
});

describe('coherencia temporal', () => {
  it('ningún vehículo se atiende antes de llegar', () => {
    for (const clave of Object.keys(conteos)) {
      for (const semilla of [1, 2, 3]) {
        const r = simularSentido(
          configDe(clave, { semilla, colaInicial: clave === 'festivoPC' ? 23 : 0, guardarEsperas: true }),
        );
        for (const espera of r.esperas) {
          expect(espera).toBeGreaterThanOrEqual(0);
        }
      }
    }
  });

  it('atiende a todos los vehículos que llegaron (la cola se drena)', () => {
    const r = simularSentido(configDe('festivoPC', { semilla: 5, colaInicial: 23 }));
    expect(r.atendidosTotal).toBe(r.llegadasSimuladas + 23);
    expect(r.colaFinal).toBe(0);
  });

  it('respeta el FIFO: las esperas se registran en orden de llegada', () => {
    const r = simularSentido(configDe('domingoPC', { semilla: 3, guardarEsperas: true }));
    const llegadas = r.vehiculos.map((v) => v.instanteLlegada);
    const ordenadas = [...llegadas].sort((a, b) => a - b);
    expect(llegadas).toEqual(ordenadas);
  });
});

describe('llegadas Poisson por tramos', () => {
  it('la media de llegadas por intervalo se acerca al conteo', () => {
    const clave = 'festivoPC';
    const semillas = Array.from({ length: 400 }, (_, i) => i + 1);
    const replicas = correrReplicas(configDe(clave, { guardarEsperas: true }), semillas);

    const esperado = conteos[clave].llegadas;
    const observadoPorIntervalo = esperado.map(() => 0);
    for (const r of replicas) {
      for (const v of r.vehiculos) observadoPorIntervalo[v.intervaloLlegada] += 1;
    }

    esperado.forEach((n, i) => {
      const mediaSimulada = observadoPorIntervalo[i] / replicas.length;
      // Error estándar de la media = √n / √réplicas; 4 errores estándar.
      const tolerancia = (4 * Math.sqrt(n)) / Math.sqrt(replicas.length);
      expect(Math.abs(mediaSimulada - n)).toBeLessThan(tolerancia);
    });
  });

  it('la media del total de la hora se acerca al total contado', () => {
    const semillas = Array.from({ length: 300 }, (_, i) => i + 1);
    for (const clave of Object.keys(conteos)) {
      const total = conteos[clave].llegadas.reduce((a, b) => a + b, 0);
      const replicas = correrReplicas(configDe(clave), semillas);
      const mediaTotal = media(replicas.map((r) => r.llegadasSimuladas));
      expect(Math.abs(mediaTotal - total)).toBeLessThan((4 * Math.sqrt(total)) / Math.sqrt(semillas.length));
    }
  });

  it('el factor de escala de demanda multiplica las llegadas', () => {
    const semillas = Array.from({ length: 200 }, (_, i) => i + 1);
    const base = media(correrReplicas(configDe('viernes'), semillas).map((r) => r.llegadasSimuladas));
    const escalado = media(
      correrReplicas(configDe('viernes', { factorEscalaDemanda: 2 }), semillas).map(
        (r) => r.llegadasSimuladas,
      ),
    );
    expect(escalado / base).toBeCloseTo(2, 1);
  });

  it('no genera llegadas después del horizonte', () => {
    const r = simularSentido(configDe('festivoPC', { semilla: 4, guardarEsperas: true }));
    const horizonte = conteos.festivoPC.llegadas.length * p.tiempo.duracionIntervaloSegundos;
    for (const v of r.vehiculos) expect(v.instanteLlegada).toBeLessThan(horizonte);
  });
});

describe('casetas programadas', () => {
  it('los carriles-intervalo igualan la suma de casetas programadas', () => {
    for (const clave of Object.keys(conteos)) {
      const esperado = conteos[clave].casetas.reduce((a, b) => a + b, 0);
      const r = simularSentido(configDe(clave, { semilla: 1, colaInicial: clave === 'festivoPC' ? 23 : 0 }));
      // Una caseta marcada para cerrar sigue abierta mientras atiende, así que
      // la integral puede quedar por encima de lo programado, nunca por debajo.
      // EPSILON cubre el error de redondeo de acumular ∫c(t)dt evento a evento.
      expect(r.carrilesIntervalo).toBeGreaterThanOrEqual(esperado - EPSILON_INTEGRAL);
      expect(r.carrilesIntervalo).toBeLessThan(esperado + conteos[clave].casetas.length);
    }
  });

  it('una caseta marcada para cerrar no interrumpe el servicio en curso', () => {
    // Un solo intervalo largo con 3 casetas y luego 1, con demanda alta: al
    // bajar a 1 hay servicios en curso en las otras dos. Si se interrumpieran,
    // se perderían vehículos: atendidos + cola final no cerraría con lo llegado.
    const r = simularSentido({
      semilla: 11,
      llegadas: [60, 10, 10, 10],
      casetasProgramadas: [3, 1, 1, 1],
      colaInicial: 5,
      duracionIntervaloSegundos: p.tiempo.duracionIntervaloSegundos,
      gammaForma: p.servicio.gammaForma,
      gammaEscalaSegundos: p.servicio.gammaEscalaSegundos,
      maximoTolerableWqSegundos: p.desempeno.maximoTolerableWqSegundos,
      guardarEsperas: true,
    });
    expect(r.atendidosTotal).toBe(r.llegadasSimuladas + 5);
    // Al pasar de 3 a 1 casetas se queda abierta de más mientras drena el
    // servicio en curso: la integral supera lo programado (3+1+1+1 = 6).
    expect(r.carrilesIntervalo).toBeGreaterThan(6);
  });

  it('arranca con las casetas iniciales indicadas, no con las programadas', () => {
    const comun = {
      semilla: 1,
      llegadas: [100, 100],
      casetasProgramadas: [1, 1],
      duracionIntervaloSegundos: p.tiempo.duracionIntervaloSegundos,
      gammaForma: p.servicio.gammaForma,
      gammaEscalaSegundos: p.servicio.gammaEscalaSegundos,
      maximoTolerableWqSegundos: p.desempeno.maximoTolerableWqSegundos,
    };
    const conUna = simularSentido(comun);
    const conCuatro = simularSentido({ ...comun, casetasIniciales: 4, maximoCasetas: 4 });
    // Arrancar con 4 casetas deja más carriles-intervalo y menos espera.
    expect(conCuatro.carrilesIntervalo).toBeGreaterThan(conUna.carrilesIntervalo);
    expect(conCuatro.wqHoraSegundos).toBeLessThan(conUna.wqHoraSegundos);
  });
});

describe('medidas por réplica', () => {
  const r = simularSentido(configDe('festivoPC', { semilla: 1, colaInicial: 23 }));

  it('registra una lectura de cola por intervalo', () => {
    expect(r.colaMuestreada).toHaveLength(conteos.festivoPC.llegadas.length);
    for (const c of r.colaMuestreada) expect(Number.isInteger(c)).toBe(true);
  });

  it('la cola máxima continua es mayor o igual que el máximo muestreado', () => {
    expect(r.colaMaximaContinua).toBeGreaterThanOrEqual(r.colaMaximaMuestreada);
  });

  it('la cola inicial cuenta como cola máxima mínima', () => {
    expect(r.colaMaximaContinua).toBeGreaterThanOrEqual(23);
  });

  it('da Wq por intervalo y por hora, y Wq sin la cola inicial es menor', () => {
    expect(r.wqPorIntervaloSegundos).toHaveLength(12);
    expect(r.wqHoraSegundos).toBeGreaterThan(0);
    expect(r.wqHoraSinColaInicialSegundos).toBeLessThan(r.wqHoraSegundos);
  });

  it('la fracción de intervalos sobre el umbral está entre 0 y 1', () => {
    expect(r.fraccionIntervalosSobreUmbral).toBeGreaterThanOrEqual(0);
    expect(r.fraccionIntervalosSobreUmbral).toBeLessThanOrEqual(1);
  });

  it('el caudal en el horizonte no supera lo que entró al sistema', () => {
    expect(r.caudalEnHorizonte).toBeLessThanOrEqual(r.llegadasSimuladas + 23);
  });
});

describe('validación de la configuración', () => {
  it('rechaza configuraciones mal formadas', () => {
    expect(() => simularSentido(configDe('viernes', { semilla: 1, llegadas: [] }))).toThrow(TypeError);
    expect(() =>
      simularSentido({ ...configDe('viernes', { semilla: 1 }), casetasProgramadas: [2, 2] }),
    ).toThrow(TypeError);
    expect(() =>
      simularSentido({ ...configDe('viernes', { semilla: 1 }), casetasProgramadas: new Array(12).fill(1.5) }),
    ).toThrow(RangeError);
    expect(() =>
      simularSentido(configDe('viernes', { semilla: 1, duracionIntervaloSegundos: 0 })),
    ).toThrow(RangeError);
  });
});
