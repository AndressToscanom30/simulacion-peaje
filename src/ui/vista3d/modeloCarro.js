/**
 * Carga `public/models/carro.glb` y lo deja listo para dibujar con
 * `InstancedMesh` (DEC-040).
 *
 * El archivo es un Ford Mustang de Sketchfab: 47 primitivas, 26 materiales y
 * **82 602 triángulos**. Dibujarlo tal cual ciento y pico de veces por
 * fotograma no se sostiene, así que al cargarlo se hacen cuatro cosas:
 *
 * 1. se hornea la matriz de mundo de cada malla en sus vértices, que se puede
 *    porque ningún nodo usa la piel del archivo (`skins` está, pero no hay
 *    `JOINTS_0` en ninguna primitiva: es un resto del exportador);
 * 2. se agrupan los 26 materiales en unos pocos **papeles** por el nombre
 *    (`rolDeMaterial`), tirando los que no se ven desde fuera —interior, motor
 *    y chasis, el 22 % de la malla—;
 * 3. se normaliza el tamaño: el modelo viene en 4,8 cm y se lleva al largo de
 *    vehículo de la escena, con la base a ras de suelo y el morro en +Z;
 * 4. se fusiona cada papel en una sola geometría y se **simplifica por
 *    rejilla**, que es lo que de verdad baja el coste.
 *
 * Las texturas del archivo no se usan: a la escala de la escena un coche ocupa
 * unos pocos píxeles. Cada papel lleva un material plano de
 * `ESCENA_3D.carro.roles`, y solo el de la carrocería recibe el color del
 * vehículo, para poder seguir uno con la vista (DEC-003).
 *
 * Esto es **solo dibujo**: no entra en el motor ni cambia ninguna medida.
 */

import { Box3, BufferAttribute, BufferGeometry, Vector3 } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

import { ESCENA_3D, rolDeMaterial } from '../../config/escena3d.js';

/** Atributos que se conservan: sin texturas no hacen falta las UV ni la tangente. */
const ATRIBUTOS = ['position', 'normal'];

/**
 * Simplifica una geometría agrupando los vértices por celdas de una rejilla.
 *
 * Cada celda ocupada se queda con **un** vértice, puesto en el centro de masas
 * de los que caían dentro y con la normal media. Los triángulos cuyos tres
 * vértices no acaban en tres celdas distintas desaparecen, y los repetidos se
 * descartan. Es el método clásico de agrupamiento por celdas: pierde detalle
 * fino, que a esta escala no se ve, y no necesita conocer la topología, así que
 * no se atraganta con una malla cosida a trozos como esta.
 *
 * @param {BufferGeometry} geometria indexada o no, con posición y normal
 * @param {number} tamanoCelda lado de la celda, en unidades de escena
 * @returns {BufferGeometry} geometría nueva, indexada
 */
export function simplificarPorRejilla(geometria, tamanoCelda) {
  const posicion = geometria.getAttribute('position');
  const normal = geometria.getAttribute('normal');
  const indice = geometria.getIndex();
  const cuantosVertices = posicion.count;

  /** Celda de cada vértice original, y acumulados de cada celda. */
  const celdaDeVertice = new Int32Array(cuantosVertices);
  const celdas = new Map();
  const acumulado = [];

  for (let v = 0; v < cuantosVertices; v += 1) {
    const cx = Math.floor(posicion.getX(v) / tamanoCelda);
    const cy = Math.floor(posicion.getY(v) / tamanoCelda);
    const cz = Math.floor(posicion.getZ(v) / tamanoCelda);
    const clave = `${cx}|${cy}|${cz}`;

    let celda = celdas.get(clave);
    if (celda === undefined) {
      celda = acumulado.length;
      celdas.set(clave, celda);
      acumulado.push({ x: 0, y: 0, z: 0, nx: 0, ny: 0, nz: 0, cuantos: 0 });
    }
    const a = acumulado[celda];
    a.x += posicion.getX(v);
    a.y += posicion.getY(v);
    a.z += posicion.getZ(v);
    if (normal) {
      a.nx += normal.getX(v);
      a.ny += normal.getY(v);
      a.nz += normal.getZ(v);
    }
    a.cuantos += 1;
    celdaDeVertice[v] = celda;
  }

  const triangulos = [];
  const vistos = new Set();
  const cuantosIndices = indice ? indice.count : cuantosVertices;

  for (let i = 0; i < cuantosIndices; i += 3) {
    const a = celdaDeVertice[indice ? indice.getX(i) : i];
    const b = celdaDeVertice[indice ? indice.getX(i + 1) : i + 1];
    const c = celdaDeVertice[indice ? indice.getX(i + 2) : i + 2];
    // Degenerado: dos esquinas han caído en la misma celda.
    if (a === b || b === c || a === c) continue;

    // Repetido: el mismo triángulo ya salió de otro trozo de la malla.
    const clave = [a, b, c].sort((p, q) => p - q).join('|');
    if (vistos.has(clave)) continue;
    vistos.add(clave);
    triangulos.push(a, b, c);
  }

  const posiciones = new Float32Array(acumulado.length * 3);
  const normales = new Float32Array(acumulado.length * 3);
  for (let i = 0; i < acumulado.length; i += 1) {
    const a = acumulado[i];
    posiciones[i * 3] = a.x / a.cuantos;
    posiciones[i * 3 + 1] = a.y / a.cuantos;
    posiciones[i * 3 + 2] = a.z / a.cuantos;
    const largo = Math.hypot(a.nx, a.ny, a.nz) || 1;
    normales[i * 3] = a.nx / largo;
    normales[i * 3 + 1] = a.ny / largo;
    normales[i * 3 + 2] = a.nz / largo;
  }

  const salida = new BufferGeometry();
  salida.setAttribute('position', new BufferAttribute(posiciones, 3));
  salida.setAttribute('normal', new BufferAttribute(normales, 3));
  salida.setIndex(triangulos);
  salida.computeBoundingSphere();
  return salida;
}

/** Cuenta los triángulos de una geometría. */
const triangulosDe = (geometria) =>
  (geometria.getIndex()?.count ?? geometria.getAttribute('position').count) / 3;

/**
 * Deja la geometría con solo los atributos que se usan y la matriz de la malla
 * ya horneada en los vértices, para poder fusionarla con las demás.
 */
function prepararGeometria(malla) {
  const original = malla.geometry;
  const copia = new BufferGeometry();

  for (const nombre of ATRIBUTOS) {
    const atributo = original.getAttribute(nombre);
    if (atributo) copia.setAttribute(nombre, atributo.clone());
  }
  if (original.getIndex()) copia.setIndex(original.getIndex().clone());
  if (!copia.getAttribute('normal')) copia.computeVertexNormals();

  malla.updateWorldMatrix(true, false);
  copia.applyMatrix4(malla.matrixWorld);
  return copia;
}

/**
 * Matriz de normalización: lleva el modelo al largo que pide la escena, con el
 * eje largo en Z, el morro en +Z, centrado en X y Z y con la base en y = 0.
 *
 * El eje largo y el frente **se detectan**, no se dan por sabidos: si el
 * archivo cambiara por otro coche, lo único que habría que revisar es
 * `frenteHaciaZPositivo` en la configuración.
 *
 * @returns {{escala: number, giroY: number, centro: Vector3, tamano: Vector3}}
 */
function normalizacion(caja) {
  const { carro, vehiculo } = ESCENA_3D;
  const tamano = caja.getSize(new Vector3());
  const centro = caja.getCenter(new Vector3());

  // El eje horizontal más largo es el del coche; si es X, se gira un cuarto.
  const ejeLargoEsX = tamano.x > tamano.z;
  const largoOriginal = ejeLargoEsX ? tamano.x : tamano.z;
  const giroY = (ejeLargoEsX ? Math.PI / 2 : 0) + (carro.frenteHaciaZPositivo ? 0 : Math.PI);

  return {
    escala: (vehiculo.largo * carro.factorDeLargo) / largoOriginal,
    giroY,
    centro,
    tamano,
  };
}

/**
 * Carga el modelo y devuelve una pieza por papel, lista para instanciar.
 *
 * @param {string} claveNivel `completo` o `reducido` (ver `carro.niveles`)
 * @param {object} [opciones]
 * @param {string} [opciones.ruta] por omisión, la de la configuración
 * @returns {Promise<{piezas: object[], largo: number, alto: number, ancho: number,
 *   triangulos: number, triangulosDelArchivo: number}>}
 */
export async function cargarCarro(claveNivel, { ruta } = {}) {
  const { carro } = ESCENA_3D;
  const nivel = carro.niveles[claveNivel];
  if (!nivel) throw new Error(`Nivel de detalle del carro desconocido: ${claveNivel}`);

  const base = typeof import.meta.env?.BASE_URL === 'string' ? import.meta.env.BASE_URL : '/';
  const direccion = ruta ?? `${base.endsWith('/') ? base : `${base}/`}${carro.ruta}`;

  const gltf = await new GLTFLoader().loadAsync(direccion);
  gltf.scene.updateMatrixWorld(true);

  /** Geometrías por papel, ya en coordenadas de mundo del archivo. */
  const porRol = new Map();
  let triangulosDelArchivo = 0;

  gltf.scene.traverse((objeto) => {
    if (!objeto.isMesh || !objeto.geometry?.getAttribute('position')) return;
    triangulosDelArchivo += triangulosDe(objeto.geometry);

    const rol = rolDeMaterial(objeto.material?.name);
    if (rol.oculto || !nivel.roles.includes(rol.clave)) return;
    if (!porRol.has(rol.clave)) porRol.set(rol.clave, []);
    porRol.get(rol.clave).push(prepararGeometria(objeto));
  });

  if (porRol.size === 0) throw new Error('El modelo del carro no trajo ninguna malla visible');

  // Fusión por papel: de 47 objetos de dibujo a uno por papel.
  const fusionadas = new Map();
  for (const [clave, geometrias] of porRol) {
    const fusionada = geometrias.length === 1 ? geometrias[0] : mergeGeometries(geometrias);
    if (!fusionada) throw new Error(`No se pudieron fusionar las mallas del papel ${clave}`);
    fusionadas.set(clave, fusionada);
    for (const g of geometrias) if (g !== fusionada) g.dispose();
  }

  // El tamaño se mide sobre lo que de verdad se va a ver.
  const caja = new Box3();
  for (const geometria of fusionadas.values()) {
    geometria.computeBoundingBox();
    caja.union(geometria.boundingBox);
  }
  const { escala, giroY, centro, tamano } = normalizacion(caja);
  const tamanoCelda = (ESCENA_3D.vehiculo.largo * carro.factorDeLargo) / nivel.celdasALoLargo;

  const piezas = [];
  let triangulos = 0;
  for (const [clave, geometria] of fusionadas) {
    // Centrado en planta, apoyado en el suelo, escalado y orientado.
    geometria.translate(-centro.x, -caja.min.y, -centro.z);
    geometria.scale(escala, escala, escala);
    if (giroY !== 0) geometria.rotateY(giroY);

    const simplificada = simplificarPorRejilla(geometria, tamanoCelda);
    geometria.dispose();
    triangulos += triangulosDe(simplificada);
    piezas.push({ rol: carro.roles[clave], geometria: simplificada });
  }

  // Se dibuja de dentro afuera: los cristales, al final.
  const orden = nivel.roles;
  piezas.sort((a, b) => orden.indexOf(a.rol.clave) - orden.indexOf(b.rol.clave));

  return {
    nivel: claveNivel,
    piezas,
    largo: ESCENA_3D.vehiculo.largo * carro.factorDeLargo,
    ancho: (giroY % Math.PI === 0 ? tamano.x : tamano.z) * escala,
    alto: tamano.y * escala,
    triangulos,
    triangulosDelArchivo,
  };
}
