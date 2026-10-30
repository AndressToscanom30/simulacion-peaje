/**
 * Pruebas de lo que se puede probar del modelo del carro **sin navegador**: el
 * reparto de los materiales del archivo en papeles y el simplificador de malla.
 *
 * La carga en sí (`cargarCarro`) necesita `fetch` y WebGL, así que se verifica
 * en el navegador: lo que sale de ahí está anotado en `docs/vista3d.md`.
 */
import { describe, it, expect } from 'vitest';
import { BoxGeometry, SphereGeometry } from 'three';

import { ESCENA_3D, rolDeMaterial } from '../../config/escena3d.js';
import { simplificarPorRejilla } from '../vista3d/modeloCarro.js';
import { encuadre, limitesDeNavegacion, PREAJUSTES_CAMARA } from '../vista3d/geometria.js';

/** Los 26 materiales que trae `public/models/carro.glb`, tal como se llaman. */
const MATERIALES_DEL_ARCHIVO = [
  'ChromeS',
  'CarPaint',
  'Interior',
  'phong20SG1',
  'Ford_Mustang302LP_1970_Wheel2A_3D_3DWheel2A_Material1',
  'phong21SG1',
  'Engine',
  'Chassis',
  'PlasS',
  'Color_2',
  'Badge_SetA',
  'phong22SG1',
  'Badge',
  'Lights',
  'Nickel',
  'PlasR',
  'Light_glass',
  'Window',
  'Trim',
  'Caliper',
  'Red_Glass',
  'mirror',
  'Tiked',
  'plate',
  'Ford_Mustang302LP_1970_CallipersCalliperAnodised_Material1',
  'phong23SG1',
];

describe('papeles de los materiales del carro (DEC-040)', () => {
  it('cada material del archivo cae en un papel declarado', () => {
    for (const nombre of MATERIALES_DEL_ARCHIVO) {
      const rol = rolDeMaterial(nombre);
      expect(rol, nombre).toBeDefined();
      expect(ESCENA_3D.carro.roles[rol.clave], nombre).toBe(rol);
    }
  });

  it('gana el patrón más largo: `light_glass` es cristal, no faro', () => {
    expect(rolDeMaterial('Light_glass').clave).toBe('cristal');
    expect(rolDeMaterial('Lights').clave).toBe('luces');
    expect(rolDeMaterial('Red_Glass').clave).toBe('cristal');
  });

  it('la carrocería es el único papel que se tiñe con el color del vehículo', () => {
    expect(rolDeMaterial('CarPaint').clave).toBe(ESCENA_3D.carro.rolDePintura);
    const otros = MATERIALES_DEL_ARCHIVO.filter((n) => n !== 'CarPaint');
    for (const nombre of otros) {
      expect(rolDeMaterial(nombre).clave, nombre).not.toBe(ESCENA_3D.carro.rolDePintura);
    }
  });

  it('interior, motor y chasis se descartan: no se ven desde fuera', () => {
    for (const nombre of ['Interior', 'Engine', 'Chassis']) {
      expect(rolDeMaterial(nombre).oculto, nombre).toBe(true);
    }
  });

  it('un material desconocido va al papel por omisión, no se pierde', () => {
    const rol = rolDeMaterial('material_que_no_existe');
    expect(rol.clave).toBe(ESCENA_3D.carro.rolPorDefecto);
    expect(rol.oculto).toBeUndefined();
    // Y un nombre ausente tampoco rompe la carga.
    expect(rolDeMaterial(undefined).clave).toBe(ESCENA_3D.carro.rolPorDefecto);
  });

  it('todo papel que se dibuja trae material plano; el oculto no hace falta', () => {
    for (const rol of Object.values(ESCENA_3D.carro.roles)) {
      if (rol.oculto) continue;
      expect(rol.color, rol.clave).toMatch(/^#[0-9a-f]{6}$/i);
      expect(rol.metalico, rol.clave).toBeGreaterThanOrEqual(0);
      expect(rol.rugosidad, rol.clave).toBeGreaterThan(0);
    }
  });

  it('los niveles de detalle solo piden papeles que existen, y el de pintura siempre', () => {
    for (const nivel of Object.values(ESCENA_3D.carro.niveles)) {
      expect(nivel.roles).toContain(ESCENA_3D.carro.rolDePintura);
      expect(nivel.celdasALoLargo).toBeGreaterThan(8);
      for (const clave of nivel.roles) {
        expect(ESCENA_3D.carro.roles[clave], clave).toBeDefined();
        expect(ESCENA_3D.carro.roles[clave].oculto, clave).toBeUndefined();
      }
    }
    // A menos detalle, rejilla más gruesa y menos papeles.
    const { completo, reducido } = ESCENA_3D.carro.niveles;
    expect(reducido.celdasALoLargo).toBeLessThan(completo.celdasALoLargo);
    expect(reducido.roles.length).toBeLessThanOrEqual(completo.roles.length);
  });
});

describe('simplificación por rejilla', () => {
  /** Caja de 1 unidad muy subdividida: 2 400 triángulos para 12 que bastan. */
  const caja = () => new BoxGeometry(1, 1, 1, 20, 20, 20);
  const triangulos = (g) => (g.getIndex()?.count ?? g.getAttribute('position').count) / 3;

  it('baja mucho el número de triángulos', () => {
    const original = caja();
    const simple = simplificarPorRejilla(original, 0.25);
    expect(triangulos(simple)).toBeLessThan(triangulos(original) / 4);
    expect(triangulos(simple)).toBeGreaterThan(0);
  });

  it('con celdas finísimas no se pierde casi nada', () => {
    const original = caja();
    const simple = simplificarPorRejilla(original, 0.001);
    expect(triangulos(simple)).toBeGreaterThan(triangulos(original) * 0.9);
  });

  it('no se sale de la caja del original: el coche no crece ni se mueve', () => {
    const original = caja();
    original.computeBoundingBox();
    const simple = simplificarPorRejilla(original, 0.2);
    simple.computeBoundingBox();
    for (const eje of ['x', 'y', 'z']) {
      expect(simple.boundingBox.min[eje]).toBeGreaterThanOrEqual(original.boundingBox.min[eje] - 1e-6);
      expect(simple.boundingBox.max[eje]).toBeLessThanOrEqual(original.boundingBox.max[eje] + 1e-6);
    }
  });

  it('no deja triángulos degenerados ni repetidos', () => {
    const simple = simplificarPorRejilla(new SphereGeometry(1, 48, 32), 0.15);
    const indice = simple.getIndex();
    const vistos = new Set();
    for (let i = 0; i < indice.count; i += 3) {
      const t = [indice.getX(i), indice.getX(i + 1), indice.getX(i + 2)];
      expect(new Set(t).size).toBe(3);
      const clave = [...t].sort((a, b) => a - b).join('|');
      expect(vistos.has(clave)).toBe(false);
      vistos.add(clave);
    }
  });

  it('deja normales unitarias, que es lo que necesita la iluminación', () => {
    const simple = simplificarPorRejilla(new SphereGeometry(1, 48, 32), 0.15);
    const normal = simple.getAttribute('normal');
    expect(normal.count).toBe(simple.getAttribute('position').count);
    for (let v = 0; v < normal.count; v += 1) {
      const largo = Math.hypot(normal.getX(v), normal.getY(v), normal.getZ(v));
      expect(largo).toBeCloseTo(1, 5);
    }
  });
});

describe('navegación libre (DEC-041)', () => {
  const pozos = [6, 8, 10];
  const calidades = Object.values(ESCENA_3D.calidades);

  it('el cubo del objetivo está centrado en la plaza y crece con el pozo', () => {
    const seis = limitesDeNavegacion(6);
    expect(seis.objetivoMinimo[0]).toBeCloseTo(-seis.objetivoMaximo[0], 9);
    expect(seis.objetivoMinimo[2]).toBeCloseTo(-seis.objetivoMaximo[2], 9);
    expect(limitesDeNavegacion(10).objetivoMaximo[0]).toBeGreaterThan(seis.objetivoMaximo[0]);
    expect(limitesDeNavegacion(10).distanciaMaxima).toBeGreaterThan(seis.distanciaMaxima);
  });

  it('se puede mirar desde debajo de la calzada y desde casi el cenit', () => {
    const { anguloPolarMinimo, anguloPolarMaximo } = limitesDeNavegacion(6);
    expect(anguloPolarMinimo).toBeGreaterThan(0);
    expect(anguloPolarMinimo).toBeLessThan(0.1);
    // Pasado π/2 la cámara está por debajo del horizonte.
    expect(anguloPolarMaximo).toBeGreaterThan(Math.PI / 2);
    expect(anguloPolarMaximo).toBeLessThan(Math.PI);
  });

  it('la niebla no tiñe el peaje: ni en los preajustes ni al alejarse del todo', () => {
    for (const pozoTotal of pozos) {
      for (const calidad of calidades) {
        const cola = { ...ESCENA_3D.cola, visiblesMaximos: calidad.colaVisible };
        const limites = limitesDeNavegacion(pozoTotal, cola);
        expect(limites.nieblaHasta).toBeGreaterThan(limites.nieblaDesde);

        // Ningún preajuste cae dentro de la niebla.
        for (const { clave } of PREAJUSTES_CAMARA) {
          const { posicion, objetivo } = encuadre(clave, pozoTotal, cola);
          const distancia = Math.hypot(
            posicion[0] - objetivo[0],
            posicion[1] - objetivo[1],
            posicion[2] - objetivo[2],
          );
          expect(distancia, `${clave} pozo ${pozoTotal}`).toBeLessThan(limites.nieblaDesde);
        }

        // Y al tope de alejamiento el centro de la escena apenas se vela.
        const velo =
          (limites.distanciaMaxima - limites.nieblaDesde) /
          (limites.nieblaHasta - limites.nieblaDesde);
        expect(velo).toBeLessThan(0.15);
      }
    }
  });

  it('todos los preajustes caben dentro de los topes: ninguno da un salto al tocar el ratón', () => {
    for (const pozoTotal of pozos) {
      for (const calidad of calidades) {
        const cola = { ...ESCENA_3D.cola, visiblesMaximos: calidad.colaVisible };
        const limites = limitesDeNavegacion(pozoTotal, cola);
        for (const { clave } of PREAJUSTES_CAMARA) {
          const { posicion, objetivo } = encuadre(clave, pozoTotal, cola);
          const donde = `${clave} pozo ${pozoTotal} calidad ${calidad.clave}`;
          const distancia = Math.hypot(
            posicion[0] - objetivo[0],
            posicion[1] - objetivo[1],
            posicion[2] - objetivo[2],
          );
          expect(distancia, donde).toBeGreaterThanOrEqual(limites.distanciaMinima);
          expect(distancia, donde).toBeLessThanOrEqual(limites.distanciaMaxima);
          for (let eje = 0; eje < 3; eje += 1) {
            expect(objetivo[eje], `${donde} eje ${eje}`).toBeGreaterThanOrEqual(limites.objetivoMinimo[eje]);
            expect(objetivo[eje], `${donde} eje ${eje}`).toBeLessThanOrEqual(limites.objetivoMaximo[eje]);
          }
        }
      }
    }
  });
});
