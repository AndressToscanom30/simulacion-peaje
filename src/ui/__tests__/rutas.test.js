import { describe, it, expect } from 'vitest';

import {
  VISTA,
  VISTAS,
  VISTA_POR_DEFECTO,
  esVista,
  hashDeVista,
  vistaDeHash,
  tituloDeVista,
} from '../rutas.js';
import {
  horaInicioDelConteo,
  partirHora,
  instanteDeHora,
  horaDeInstante,
} from '../formato.js';
import { conteos } from '../../config/datos.js';

// ===========================================================================
// Navegación por hash (DEC-053)
// ===========================================================================

describe('el hash elige la vista', () => {
  it('reconoce las tres vistas', () => {
    expect(vistaDeHash('#/simulacion')).toBe(VISTA.SIMULACION);
    expect(vistaDeHash('#/lotes')).toBe(VISTA.LOTES);
    expect(vistaDeHash('#/configuracion')).toBe(VISTA.CONFIGURACION);
  });

  it('un hash desconocido va a la simulación', () => {
    for (const hash of ['', '#', '#/', '#/nada', '#otra-cosa', '#/lotes/extra', null, undefined, 7]) {
      expect(vistaDeHash(hash), String(hash)).toBe(VISTA.SIMULACION);
    }
  });

  it('la vista por defecto es la simulación', () => {
    expect(VISTA_POR_DEFECTO).toBe(VISTA.SIMULACION);
  });

  it('acepta las formas que de verdad salen en la barra de direcciones', () => {
    expect(vistaDeHash('#lotes')).toBe(VISTA.LOTES);
    expect(vistaDeHash('#/lotes/')).toBe(VISTA.LOTES);
    expect(vistaDeHash('  #/LOTES  ')).toBe(VISTA.LOTES);
  });

  it('ida y vuelta: de vista a hash y de vuelta a la misma vista', () => {
    for (const vista of VISTAS) {
      expect(vistaDeHash(hashDeVista(vista.clave)), vista.clave).toBe(vista.clave);
    }
  });

  it('el hash de una vista desconocida es el de la simulación', () => {
    expect(hashDeVista('inventada')).toBe(hashDeVista(VISTA.SIMULACION));
  });

  it('las tres vistas tienen título y descripción, en orden', () => {
    expect(VISTAS.map((v) => v.clave)).toEqual([
      VISTA.SIMULACION,
      VISTA.LOTES,
      VISTA.CONFIGURACION,
    ]);
    for (const vista of VISTAS) {
      expect(vista.titulo, vista.clave).toBeTruthy();
      expect(vista.descripcion, vista.clave).toBeTruthy();
      expect(esVista(vista.clave), vista.clave).toBe(true);
      expect(tituloDeVista(vista.clave)).toBe(vista.titulo);
      // Texto para el usuario: sin numeración interna.
      expect(vista.titulo + vista.descripcion).not.toMatch(/DEC-\d|PEN-\d/);
    }
  });
});

// ===========================================================================
// Hora del reloj e instante simulado
// ===========================================================================

describe('la hora de inicio sale del dato, no de la etiqueta', () => {
  it('lee `horaInicio` de cada conteo', () => {
    for (const [clave, conteo] of Object.entries(conteos)) {
      const partido = partirHora(conteo.horaInicio);
      expect(horaInicioDelConteo(clave), clave).toEqual(partido);
    }
  });

  it('el festivo arranca a las 16:25', () => {
    expect(horaInicioDelConteo('festivoPC')).toEqual({ horas: 16, minutos: 25 });
  });

  it('un conteo que no existe no da hora', () => {
    expect(horaInicioDelConteo('martes')).toBeNull();
  });
});

describe('partir una hora hh:mm', () => {
  it('acepta con y sin cero delante', () => {
    expect(partirHora('9:05')).toEqual({ horas: 9, minutos: 5 });
    expect(partirHora('09:05')).toEqual({ horas: 9, minutos: 5 });
    expect(partirHora(' 16:25 ')).toEqual({ horas: 16, minutos: 25 });
  });

  it('rechaza lo que no es una hora', () => {
    for (const malo of ['', '16', '16:', ':25', '16:5', '16:60', '24:00', '25:99', 'hola', null]) {
      expect(partirHora(malo), String(malo)).toBeNull();
    }
  });
});

describe('ir a una hora dentro de la hora simulada', () => {
  const DURACION = 3600;

  it('el arranque del conteo es el instante 0', () => {
    expect(instanteDeHora('16:25', 'festivoPC', DURACION)).toBe(0);
  });

  it('media hora después son 1.800 s', () => {
    expect(instanteDeHora('16:55', 'festivoPC', DURACION)).toBe(1800);
  });

  it('el final de la ventana es la duración', () => {
    expect(instanteDeHora('17:25', 'festivoPC', DURACION)).toBe(DURACION);
  });

  it('fuera de la ventana no da instante, ni antes ni después', () => {
    expect(instanteDeHora('16:24', 'festivoPC', DURACION)).toBeNull();
    expect(instanteDeHora('17:26', 'festivoPC', DURACION)).toBeNull();
  });

  it('una hora que no se entiende no da instante', () => {
    expect(instanteDeHora('nada', 'festivoPC', DURACION)).toBeNull();
    expect(instanteDeHora('16:25', 'martes', DURACION)).toBeNull();
  });

  it('ida y vuelta: de hora a instante y de vuelta a la misma hora', () => {
    for (const hora of ['16:25', '16:40', '16:55', '17:10', '17:25']) {
      const instante = instanteDeHora(hora, 'festivoPC', DURACION);
      expect(horaDeInstante('festivoPC', instante), hora).toBe(hora);
    }
  });

  it('cada conteo se mide desde su propia hora', () => {
    // El domingo C→P empieza a las 11:50, no a las 16:25.
    expect(instanteDeHora('11:50', 'domingoCP', DURACION)).toBe(0);
    expect(instanteDeHora('16:25', 'domingoCP', DURACION)).toBeNull();
  });
});
