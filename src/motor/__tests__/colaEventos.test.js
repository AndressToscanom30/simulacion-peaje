import { describe, it, expect } from 'vitest';
import { crearColaEventos, TIPO_EVENTO } from '../colaEventos.js';

describe('calendario de eventos', () => {
  it('saca los eventos en orden de instante', () => {
    const cola = crearColaEventos();
    for (const t of [50, 10, 90, 30, 70]) cola.programar(t, TIPO_EVENTO.LLEGADA);
    const instantes = [];
    for (let e = cola.sacar(); e; e = cola.sacar()) instantes.push(e.instante);
    expect(instantes).toEqual([10, 30, 50, 70, 90]);
  });

  it('desempata por tipo: fin de servicio, cambio de intervalo, apertura, llegada, muestreo (DEC-017, DEC-026)', () => {
    const cola = crearColaEventos();
    cola.programar(100, TIPO_EVENTO.MUESTREO_COLA);
    cola.programar(100, TIPO_EVENTO.LLEGADA);
    cola.programar(100, TIPO_EVENTO.APERTURA_CASETA);
    cola.programar(100, TIPO_EVENTO.CAMBIO_INTERVALO);
    cola.programar(100, TIPO_EVENTO.FIN_SERVICIO);
    const tipos = [];
    for (let e = cola.sacar(); e; e = cola.sacar()) tipos.push(e.tipo);
    expect(tipos).toEqual([
      TIPO_EVENTO.FIN_SERVICIO,
      TIPO_EVENTO.CAMBIO_INTERVALO,
      TIPO_EVENTO.APERTURA_CASETA,
      TIPO_EVENTO.LLEGADA,
      TIPO_EVENTO.MUESTREO_COLA,
    ]);
  });

  it('a igual instante y tipo, respeta el orden de programación', () => {
    const cola = crearColaEventos();
    for (const id of ['a', 'b', 'c']) cola.programar(5, TIPO_EVENTO.LLEGADA, { id });
    const ids = [];
    for (let e = cola.sacar(); e; e = cola.sacar()) ids.push(e.datos.id);
    expect(ids).toEqual(['a', 'b', 'c']);
  });

  it('devuelve null cuando está vacío', () => {
    expect(crearColaEventos().sacar()).toBeNull();
    expect(crearColaEventos().proximo()).toBeNull();
  });

  it('rechaza instantes no finitos y tipos desconocidos', () => {
    const cola = crearColaEventos();
    expect(() => cola.programar(Number.NaN, TIPO_EVENTO.LLEGADA)).toThrow(TypeError);
    expect(() => cola.programar(1, 'INVENTADO')).toThrow(TypeError);
  });

  it('mantiene el orden con muchos eventos desordenados', () => {
    const cola = crearColaEventos();
    // Secuencia determinista (sin Math.random) que entra muy desordenada.
    for (let i = 0; i < 2000; i += 1) cola.programar((i * 7919) % 2003, TIPO_EVENTO.LLEGADA);
    let anterior = -Infinity;
    for (let e = cola.sacar(); e; e = cola.sacar()) {
      expect(e.instante).toBeGreaterThanOrEqual(anterior);
      anterior = e.instante;
    }
  });
});
