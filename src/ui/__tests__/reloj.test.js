import { describe, it, expect } from 'vitest';
import { crearRelojReproduccion, crearReproductor, VELOCIDADES } from '../reloj.js';
import { construirEscenario } from '../../config/escenario.js';
import { simularTraza } from '../../corridas.js';

const DURACION = 3600;
const reloj = (opciones = {}) => crearRelojReproduccion({ duracionSegundos: DURACION, ...opciones });

describe('reloj de reproducción', () => {
  it('arranca en pausa, en el instante 0 y a 1×', () => {
    expect(reloj().estado()).toMatchObject({
      instante: 0,
      velocidad: 1,
      enMarcha: false,
      progreso: 0,
    });
  });

  it('en pausa no avanza', () => {
    const r = reloj();
    r.avanzar(10);
    expect(r.estado().instante).toBe(0);
  });

  it('en marcha avanza el tiempo real por la velocidad', () => {
    const r = reloj({ enMarcha: true });
    r.avanzar(10);
    expect(r.estado().instante).toBe(10);
    r.cambiarVelocidad(60);
    r.avanzar(10);
    expect(r.estado().instante).toBe(610);
  });

  it('las tres velocidades del contexto funcionan', () => {
    expect(VELOCIDADES).toEqual([1, 10, 60]);
    for (const velocidad of VELOCIDADES) {
      const r = reloj({ enMarcha: true, velocidad });
      r.avanzar(5);
      expect(r.estado().instante).toBe(5 * velocidad);
    }
  });

  it('acepta una velocidad configurable que no esté en la lista', () => {
    const r = reloj({ enMarcha: true, velocidad: 7.5 });
    r.avanzar(2);
    expect(r.estado().instante).toBe(15);
  });

  it('cambiar de velocidad en marcha no pierde el instante', () => {
    const r = reloj({ enMarcha: true });
    r.avanzar(100);
    r.cambiarVelocidad(10);
    expect(r.estado()).toMatchObject({ instante: 100, enMarcha: true });
    r.avanzar(1);
    expect(r.estado().instante).toBe(110);
  });

  it('no se pasa del final y se detiene al llegar', () => {
    const r = reloj({ enMarcha: true, velocidad: 60 });
    r.avanzar(1000); // 60.000 s simulados, muy por encima del horizonte
    expect(r.estado()).toMatchObject({ instante: DURACION, enMarcha: false, terminado: true, progreso: 1 });
  });

  it('pausa y reanuda donde iba', () => {
    const r = reloj({ enMarcha: true });
    r.avanzar(30);
    r.pausar();
    r.avanzar(100);
    expect(r.estado().instante).toBe(30);
    r.iniciar();
    r.avanzar(5);
    expect(r.estado().instante).toBe(35);
  });

  it('alternar cambia entre marcha y pausa', () => {
    const r = reloj();
    expect(r.alternar().enMarcha).toBe(true);
    expect(r.alternar().enMarcha).toBe(false);
  });

  it('iniciar al final vuelve a empezar', () => {
    const r = reloj({ enMarcha: true, velocidad: 60 });
    r.avanzar(1000);
    expect(r.estado().terminado).toBe(true);
    expect(r.iniciar()).toMatchObject({ instante: 0, enMarcha: true });
  });

  it('reinicia al principio y en pausa', () => {
    const r = reloj({ enMarcha: true });
    r.avanzar(500);
    expect(r.reiniciar()).toMatchObject({ instante: 0, enMarcha: false });
  });

  it('salta a un instante y acota al rango', () => {
    const r = reloj();
    expect(r.saltarA(1234).instante).toBe(1234);
    expect(r.saltarA(-50).instante).toBe(0);
    expect(r.saltarA(99999).instante).toBe(DURACION);
    expect(r.saltarA(Number.NaN).instante).toBe(0);
  });

  it('saltar en marcha sigue en marcha, salvo al final', () => {
    const r = reloj({ enMarcha: true });
    expect(r.saltarA(100).enMarcha).toBe(true);
    expect(r.saltarA(DURACION).enMarcha).toBe(false);
  });

  it('salta por fracción del total', () => {
    const r = reloj();
    expect(r.saltarAProgreso(0.5).instante).toBe(DURACION / 2);
    expect(r.saltarAProgreso(1).progreso).toBe(1);
  });

  it('rechaza duraciones y velocidades absurdas', () => {
    expect(() => crearRelojReproduccion({ duracionSegundos: 0 })).toThrow(RangeError);
    expect(() => crearRelojReproduccion({ duracionSegundos: -1 })).toThrow(RangeError);
    expect(() => reloj({ velocidad: 0 })).toThrow(RangeError);
    expect(() => reloj().cambiarVelocidad(-1)).toThrow(RangeError);
  });
});

describe('reproductor sobre una traza', () => {
  const traza = simularTraza(construirEscenario(), 1);

  it('consume los eventos en orden y sin repetir', () => {
    const reproductor = crearReproductor(traza);
    const vistos = [];
    const final = traza.metadatos.instanteFinalSegundos;
    for (let t = 0; t <= final; t += 60) {
      vistos.push(...reproductor.irA(t).eventos);
    }
    // El último tramo no cae en un múltiplo de 60: hay que cerrarlo.
    vistos.push(...reproductor.irA(final).eventos);
    expect(vistos).toHaveLength(traza.eventos.length);
    expect(vistos.map((e) => e.t)).toEqual(traza.eventos.map((e) => e.t));
  });

  it('avanzar a tirones o de golpe consume lo mismo', () => {
    const aTirones = crearReproductor(traza);
    const deGolpe = crearReproductor(traza);
    let cuentaTirones = 0;
    for (let t = 0; t <= 1800; t += 10) cuentaTirones += aTirones.irA(t).eventos.length;
    expect(cuentaTirones).toBe(deGolpe.irA(1800).eventos.length);
  });

  it('rebobinar rehace desde el principio', () => {
    const reproductor = crearReproductor(traza);
    reproductor.irA(1800);
    const cursorMedio = reproductor.cursor;
    const atras = reproductor.irA(600);
    expect(atras.rebobinado).toBe(true);
    expect(reproductor.cursor).toBeLessThan(cursorMedio);
    expect(atras.eventos.every((e) => e.t <= 600)).toBe(true);
  });

  it('avisa al avanzar con los eventos consumidos', () => {
    const avisos = [];
    const reproductor = crearReproductor(traza, (estado, eventos) =>
      avisos.push({ instante: estado.instante, cuantos: eventos.length }),
    );
    reproductor.irA(300);
    reproductor.irA(600);
    expect(avisos).toHaveLength(2);
    expect(avisos[0].instante).toBe(300);
    expect(avisos[0].cuantos).toBeGreaterThan(0);
  });

  it('reiniciar vuelve el cursor a cero', () => {
    const reproductor = crearReproductor(traza);
    reproductor.irA(1800);
    reproductor.reiniciar();
    expect(reproductor.cursor).toBe(0);
  });
});
