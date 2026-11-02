import { describe, it, expect } from 'vitest';

import {
  ESCENARIO_BASE,
  construirEscenario,
  problemasDelEscenario,
} from '../escenario.js';
import {
  SITUACIONES,
  ORDEN_SITUACIONES,
  aplicarSituacion,
  listaDeSituaciones,
  situacionDe,
  diaYHoraDeSentidos,
  horasDistintas,
} from '../situaciones.js';
import {
  RUTA_PROMEDIO_ATENCION,
  leerDerivado,
  muVehHora,
  lambdaVehHora,
  lambdasVehHora,
  llegadasDelSentido,
} from '../derivados.js';
import { conteos } from '../datos.js';
import { parametros, SEGUNDOS_POR_HORA } from '../parametros.js';

const base = construirEscenario();

// ===========================================================================
// Situaciones predefinidas (DEC-052)
// ===========================================================================

describe('situaciones: el festivo es el escenario base', () => {
  it('aplicar el festivo al base lo deja idéntico', () => {
    expect(aplicarSituacion(ESCENARIO_BASE, 'festivo')).toEqual(ESCENARIO_BASE);
  });

  it('y hasta el orden de las claves coincide, para que el JSON sea el mismo', () => {
    expect(JSON.stringify(aplicarSituacion(ESCENARIO_BASE, 'festivo'))).toBe(
      JSON.stringify(ESCENARIO_BASE),
    );
  });

  it('el festivo usa el sustituto de C→P de los parámetros, no el conteo crudo', () => {
    const sentidos = aplicarSituacion(base, 'festivo').sentidos;
    const sustituto = parametros.sustitutoFestivoCP;
    expect(sentidos[1].conteo).toBe(sustituto.conteo);
    expect(sentidos[1].casetasIniciales).toBe(sustituto.casetasIniciales);
    // Las casetas del conteo del viernes son otras: el sustituto arranca con 1.
    expect(sentidos[1].casetasIniciales).not.toBe(conteos.viernes.casetas[0]);
  });
});

describe('situaciones: las tres son escenarios válidos', () => {
  it('ninguna deja problemas de validación', () => {
    for (const clave of ORDEN_SITUACIONES) {
      const escenario = construirEscenario({}, aplicarSituacion(base, clave));
      expect(problemasDelEscenario(escenario), clave).toEqual([]);
    }
  });

  it('todas traen título, descripción y aviso en lenguaje de usuario', () => {
    for (const { clave, titulo, descripcion, aviso } of listaDeSituaciones()) {
      expect(titulo, clave).toBeTruthy();
      expect(descripcion, clave).toBeTruthy();
      expect(aviso, clave).toBeTruthy();
      // El aviso es para el usuario: sin numeración interna.
      for (const texto of [titulo, descripcion, aviso]) {
        expect(texto, clave).not.toMatch(/DEC-\d|PEN-\d/);
      }
    }
  });

  it('se ofrecen en orden y las claves son las tres pedidas', () => {
    expect(ORDEN_SITUACIONES).toEqual(['festivo', 'domingo', 'diaNormal']);
    expect(listaDeSituaciones().map((s) => s.clave)).toEqual(ORDEN_SITUACIONES);
    expect(Object.keys(SITUACIONES).sort()).toEqual([...ORDEN_SITUACIONES].sort());
  });

  it('cada situación se reconoce a partir de sus conteos', () => {
    for (const clave of ORDEN_SITUACIONES) {
      expect(situacionDe(aplicarSituacion(base, clave)), clave).toBe(clave);
    }
  });

  it('cambiar el factor de demanda no deja de reconocer la situación', () => {
    const aplicado = aplicarSituacion(base, 'domingo');
    const conFactor = {
      ...aplicado,
      sentidos: aplicado.sentidos.map((s) => ({ ...s, factorDemanda: 1.3 })),
    };
    expect(situacionDe(conFactor)).toBe('domingo');
  });

  it('una situación desconocida se rechaza', () => {
    expect(() => aplicarSituacion(base, 'martes')).toThrow(RangeError);
  });
});

describe('situaciones: solo tocan los sentidos', () => {
  it('conservan servicio, pozo y regla tal cual', () => {
    const tocado = construirEscenario({
      servicio: { mediaNominalSegundos: 15.5 },
      pozo: { total: 8, maximoPorSentido: 7 },
      regla: { demoraAperturaSegundos: 0 },
    });
    for (const clave of ORDEN_SITUACIONES) {
      const despues = aplicarSituacion(tocado, clave);
      expect(despues.servicio, clave).toEqual(tocado.servicio);
      expect(despues.pozo, clave).toEqual(tocado.pozo);
      expect(despues.regla, clave).toEqual(tocado.regla);
      expect(despues.desempeno, clave).toEqual(tocado.desempeno);
      expect(despues.corridas, clave).toEqual(tocado.corridas);
    }
  });

  it('conservan el modo de cada sentido: cambiar de día no cambia el control', () => {
    const programado = {
      ...base,
      sentidos: base.sentidos.map((s) => ({ ...s, modo: 'programado' })),
    };
    for (const clave of ORDEN_SITUACIONES) {
      const modos = aplicarSituacion(programado, clave).sentidos.map((s) => s.modo);
      expect(modos, clave).toEqual(['programado', 'programado']);
    }
  });

  it('dejan las llegadas y las casetas fijas en null, y el factor en 1', () => {
    const aMano = {
      ...base,
      sentidos: base.sentidos.map((s) => ({
        ...s,
        factorDemanda: 1.4,
        llegadas: new Array(base.tiempo.intervalos).fill(50),
        casetasFijas: new Array(base.tiempo.intervalos).fill(3),
      })),
    };
    for (const clave of ORDEN_SITUACIONES) {
      for (const sentido of aplicarSituacion(aMano, clave).sentidos) {
        expect(sentido.llegadas, clave).toBeNull();
        expect(sentido.casetasFijas, clave).toBeNull();
        expect(sentido.factorDemanda, clave).toBe(1);
      }
    }
  });

  it('es pura: no muta el escenario que recibe', () => {
    const antes = JSON.stringify(base);
    aplicarSituacion(base, 'domingo');
    expect(JSON.stringify(base)).toBe(antes);
  });

  it('el día normal respeta el orden de escenarioDiaNormal: C→P primero', () => {
    const sentidos = aplicarSituacion(base, 'diaNormal').sentidos;
    expect(sentidos.map((s) => s.conteo)).toEqual(['viernes', 'domingoPC']);
  });
});

describe('situaciones: día y hora salen del conteo', () => {
  it('cada sentido trae su conteo, su etiqueta y su hora de inicio', () => {
    for (const clave of ORDEN_SITUACIONES) {
      const escenario = aplicarSituacion(base, clave);
      const info = diaYHoraDeSentidos(escenario);
      expect(info, clave).toHaveLength(escenario.sentidos.length);
      info.forEach((dato, indice) => {
        const conteo = conteos[escenario.sentidos[indice].conteo];
        expect(dato.horaInicio, clave).toBe(conteo.horaInicio);
        expect(dato.etiquetaConteo, clave).toBe(conteo.etiqueta);
        // La hora derivada es la que ya dice la etiqueta del conteo.
        expect(conteo.etiqueta, clave).toContain(conteo.horaInicio);
      });
    }
  });

  it('el domingo tiene los dos sentidos medidos, a horas distintas', () => {
    const domingo = aplicarSituacion(base, 'domingo');
    expect(diaYHoraDeSentidos(domingo).map((d) => d.horaInicio)).toEqual(['13:00', '11:50']);
    expect(horasDistintas(domingo)).toBe(true);
  });
});

// ===========================================================================
// Valores derivados de solo lectura (DEC-051)
// ===========================================================================

describe('mu se calcula del promedio de atención', () => {
  it('con el base da los 297,48 veh/h del contexto', () => {
    expect(muVehHora(base)).toBeCloseTo(297.48, 2);
  });

  it('sale de las conversiones, no de un 3600 escrito a mano', () => {
    expect(muVehHora(base)).toBe(SEGUNDOS_POR_HORA / base.servicio.mediaNominalSegundos);
  });

  it('un promedio más lento da una mu más baja', () => {
    const lento = construirEscenario({ servicio: { mediaNominalSegundos: 15.5 } });
    expect(muVehHora(lento)).toBeCloseTo(SEGUNDOS_POR_HORA / 15.5, 6);
    expect(muVehHora(lento)).toBeLessThan(muVehHora(base));
  });
});

describe('lambda resultante por sentido', () => {
  it('el festivo P→C da los 1.064 veh/h contados, con factor 1', () => {
    expect(lambdaVehHora(base, 0)).toBeCloseTo(1064, 6);
    expect(lambdaVehHora(base, 1)).toBeCloseTo(238, 6);
  });

  it('escala linealmente con el factor de demanda', () => {
    for (const factor of [0.5, 1.13, 2]) {
      const escenario = construirEscenario({ sentidos: [{ factorDemanda: factor }, {}] });
      expect(lambdaVehHora(escenario, 0), String(factor)).toBeCloseTo(1064 * factor, 6);
      // El otro sentido no se mueve.
      expect(lambdaVehHora(escenario, 1), String(factor)).toBeCloseTo(238, 6);
    }
  });

  it('si hay llegadas escritas a mano, manda esa serie', () => {
    const porIntervalo = 10;
    const escenario = construirEscenario({
      sentidos: [{ llegadas: new Array(base.tiempo.intervalos).fill(porIntervalo) }, {}],
    });
    expect(llegadasDelSentido(escenario, 0)).toBe(porIntervalo * base.tiempo.intervalos);
    expect(lambdaVehHora(escenario, 0)).toBeCloseTo(porIntervalo * base.tiempo.intervalos, 6);
  });

  it('no supone que el horizonte sea una hora', () => {
    // La misma demanda en media hora es el doble de veh/h.
    const intervalos = base.tiempo.intervalos / 2;
    const escenario = construirEscenario({
      tiempo: { intervalos },
      sentidos: [{ llegadas: new Array(intervalos).fill(50) }, {}],
    });
    const esperado =
      (50 * intervalos * SEGUNDOS_POR_HORA) /
      (intervalos * base.tiempo.duracionIntervaloSegundos);
    expect(lambdaVehHora(escenario, 0)).toBeCloseTo(esperado, 6);
  });

  it('da un lambda por sentido, en el orden del escenario', () => {
    expect(lambdasVehHora(base)).toHaveLength(base.sentidos.length);
    expect(lambdasVehHora(base)[0]).toBeCloseTo(lambdaVehHora(base, 0), 9);
  });

  it('un sentido que no existe se rechaza', () => {
    expect(() => lambdaVehHora(base, 9)).toThrow(RangeError);
  });

  it('las tres situaciones dan el lambda de sus conteos', () => {
    for (const clave of ORDEN_SITUACIONES) {
      const escenario = aplicarSituacion(base, clave);
      escenario.sentidos.forEach((sentido, indice) => {
        const contado = conteos[sentido.conteo].llegadas.reduce((a, b) => a + b, 0);
        expect(lambdaVehHora(escenario, indice), clave + ' ' + indice).toBeCloseTo(contado, 6);
      });
    }
  });
});

describe('el promedio de atención se lee del nominal', () => {
  it('muestra el nominal, no la media que genera la gamma', () => {
    expect(leerDerivado(base, RUTA_PROMEDIO_ATENCION)).toBe(base.servicio.mediaNominalSegundos);
    // Los dos son distintos a propósito (DEC-027 punto 7).
    const generada = base.servicio.gammaForma * base.servicio.gammaEscalaSegundos;
    expect(leerDerivado(base, RUTA_PROMEDIO_ATENCION)).not.toBe(generada);
  });

  it('una ruta que no es derivada se rechaza', () => {
    expect(() => leerDerivado(base, 'servicio.gammaForma')).toThrow(RangeError);
  });
});
