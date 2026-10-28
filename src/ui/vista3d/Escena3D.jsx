import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree, extend } from '@react-three/fiber';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Color, Object3D, Vector3 } from 'three';

import { ESCENA_3D, ESTADOS_CASETA, colorDeVehiculo, largoDeVehiculo } from '../../config/escena3d.js';
import { anchoDeLaPlaza, encuadre, fondoDeLaCola, posicionDeCaseta, situarVehiculo } from './geometria.js';
import { flechaDe, texturaDeLetrero } from './texto.js';

extend({ OrbitControls });

const { plaza, vehiculo: vehiculoCfg, colores } = ESCENA_3D;

/** Objetos reutilizados para no crear basura en cada fotograma. */
const auxiliar = new Object3D();
const colorAuxiliar = new Color();

// --------------------------------------------------------------- escenario ---

/** Calzada, arcenes y marcas. Geometría procedural, sin texturas (DEC-037). */
function Calzada({ pozoTotal }) {
  const ancho = pozoTotal * plaza.separacionCarriles + plaza.anchoArcen * 2;
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[ancho, plaza.largoCalzada * 2]} />
        <meshStandardMaterial color={colores.asfalto} />
      </mesh>
      {/* Líneas que separan los carriles. */}
      {Array.from({ length: pozoTotal + 1 }, (_, i) => {
        const x = (i - pozoTotal / 2) * plaza.separacionCarriles;
        return (
          <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0, 0]}>
            <planeGeometry args={[0.14, plaza.largoCalzada * 2]} />
            <meshStandardMaterial color={colores.marca} />
          </mesh>
        );
      })}
    </group>
  );
}

/**
 * Una caseta: isleta, cabina y letrero aéreo.
 *
 * El letrero lleva la flecha del sentido al que sirve y el estado **en texto**,
 * y el indicador cambia de **forma y altura** según el estado, no solo de color
 * (DEC-039). Las casetas son reversibles: no son de ningún sentido (DEC-038).
 */
function Caseta({ caseta, pozoTotal, calidad }) {
  const [x] = posicionDeCaseta(caseta.id, pozoTotal);
  const estado = ESTADOS_CASETA[caseta.estado];
  const abierta = caseta.estado !== 'cerrada';

  const textura = useMemo(() => {
    const cuenta =
      caseta.faltaParaAbrir === null ? estado.texto : `ABRE ${Math.ceil(caseta.faltaParaAbrir)} s`;
    return texturaDeLetrero({
      titulo: `${caseta.id} ${flechaDe(caseta.sentidoId)}`,
      estado: cuenta,
      color: estado.color,
      fondo: colores.letrero,
    });
    // La cuenta atrás se redondea a segundos para no regenerar la textura por fotograma.
  }, [caseta.id, caseta.sentidoId, caseta.estado, Math.ceil(caseta.faltaParaAbrir ?? -1), estado]);

  return (
    <group position={[x, 0, 0]}>
      {/* Isleta */}
      <mesh position={[0, 0.1, 0]} receiveShadow>
        <boxGeometry args={[plaza.anchoCaseta + 0.5, 0.2, plaza.largoCaseta]} />
        <meshStandardMaterial color={colores.isleta} />
      </mesh>
      {/* Cabina */}
      <mesh position={[0, plaza.altoCaseta / 2 + 0.2, 0]} castShadow={calidad.sombras}>
        <boxGeometry args={[plaza.anchoCaseta, plaza.altoCaseta, plaza.largoCaseta * 0.6]} />
        <meshStandardMaterial
          color={colores.caseta}
          transparent
          opacity={abierta ? 1 : 0.45}
        />
      </mesh>
      {/* Techo */}
      <mesh position={[0, plaza.altoCaseta + 0.35, 0]}>
        <boxGeometry args={[plaza.anchoCaseta + 0.6, 0.2, plaza.largoCaseta * 0.8]} />
        <meshStandardMaterial color={colores.techoCaseta} />
      </mesh>

      {/* Poste y letrero aéreo, con el texto en los dos lados */}
      <mesh position={[0, plaza.alturaLetrero / 2, 0]}>
        <cylinderGeometry args={[0.1, 0.1, plaza.alturaLetrero, 8]} />
        <meshStandardMaterial color={colores.techoCaseta} />
      </mesh>
      {[1, -1].map((cara) => (
        <mesh key={cara} position={[0, plaza.alturaLetrero, cara * 0.06]} rotation={[0, cara > 0 ? 0 : Math.PI, 0]}>
          <planeGeometry args={[plaza.anchoLetrero, plaza.altoLetrero]} />
          <meshBasicMaterial map={textura} toneMapped={false} />
        </mesh>
      ))}

      {/* Indicador de estado: la FORMA y la altura lo distinguen, no solo el color */}
      <IndicadorEstado estado={estado} calidad={calidad} />

      {/* Barrera: baja cuando la caseta no atiende */}
      <mesh
        position={[0, 1.1, (caseta.sentidoId === 0 ? 1 : -1) * plaza.largoCaseta * 0.5]}
        rotation={[abierta ? -Math.PI / 2.2 : 0, 0, 0]}
        visible={caseta.sentidoId !== null}
      >
        <boxGeometry args={[plaza.separacionCarriles * 0.7, 0.12, 0.12]} />
        <meshStandardMaterial color={estado.color} />
      </mesh>
    </group>
  );
}

/** Figura sobre el letrero: cono, prisma o caja según el estado (DEC-039). */
function IndicadorEstado({ estado, calidad }) {
  const alto = estado.alturaIndicador;
  const y = plaza.alturaLetrero + plaza.altoLetrero / 2 + alto / 2 + 0.1;
  return (
    <mesh position={[0, y, 0]}>
      {estado.figura === 'cono' && <coneGeometry args={[0.42, alto, calidad.segmentos]} />}
      {estado.figura === 'prisma' && <cylinderGeometry args={[0.36, 0.36, alto, 3]} />}
      {estado.figura === 'caja' && <boxGeometry args={[0.6, alto, 0.6]} />}
      <meshStandardMaterial color={estado.color} />
    </mesh>
  );
}

// ---------------------------------------------------------------- vehículos ---

/**
 * Todos los vehículos en un `InstancedMesh`: un solo objeto de dibujo para
 * cientos de coches, que es lo que hace que el festivo a 60× vaya fluido.
 *
 * La variación de color y de largo sale del `vehiculoId` y es determinista: sirve
 * para seguir uno con la vista, no para distinguir categorías, que no entran al
 * modelo (DEC-003).
 */
function Vehiculos({ vehiculos, pozoTotal, cola, maximo }) {
  const referencia = useRef();

  useLayoutEffect(() => {
    const malla = referencia.current;
    if (!malla) return;

    const cuantos = Math.min(vehiculos.length, maximo);
    for (let i = 0; i < cuantos; i += 1) {
      const v = vehiculos[i];
      const { posicion, giro } = situarVehiculo(v, pozoTotal, cola);
      const largo = largoDeVehiculo(v.id);

      auxiliar.position.set(posicion[0], vehiculoCfg.alto / 2 + 0.2, posicion[2]);
      auxiliar.rotation.set(0, giro, 0);
      auxiliar.scale.set(1, 1, largo / vehiculoCfg.largo);
      auxiliar.updateMatrix();
      malla.setMatrixAt(i, auxiliar.matrix);

      colorAuxiliar.set(colorDeVehiculo(v.id, v.sentidoId));
      // Los que están siendo atendidos se aclaran, para verlos en la caseta.
      if (v.fase === 'enServicio') colorAuxiliar.offsetHSL(0, 0, 0.18);
      malla.setColorAt(i, colorAuxiliar);
    }

    // Los que sobran se esconden lejos en vez de borrarse: cambiar el tamaño
    // del InstancedMesh en cada fotograma costaría más que esto.
    auxiliar.position.set(0, -1000, 0);
    auxiliar.scale.set(0.001, 0.001, 0.001);
    auxiliar.updateMatrix();
    for (let i = cuantos; i < maximo; i += 1) malla.setMatrixAt(i, auxiliar.matrix);

    malla.count = maximo;
    malla.instanceMatrix.needsUpdate = true;
    if (malla.instanceColor) malla.instanceColor.needsUpdate = true;
  }, [vehiculos, pozoTotal, cola, maximo]);

  return (
    <instancedMesh ref={referencia} args={[undefined, undefined, maximo]} castShadow>
      <boxGeometry args={[vehiculoCfg.ancho, vehiculoCfg.alto, vehiculoCfg.largo]} />
      <meshStandardMaterial />
    </instancedMesh>
  );
}

// ------------------------------------------------------------------- avisos ---

/** Marcador breve de reasignación o de petición bloqueada. */
function Avisos({ avisos, instante, pozoTotal, reducirMovimiento }) {
  const { avisoSegundos } = ESCENA_3D.duraciones;

  return (
    <group>
      {avisos
        .filter((aviso) => aviso.tipo !== 'lecturaCola')
        .map((aviso, i) => {
          const edad = (instante - aviso.t) / avisoSegundos;
          const opacidad = Math.max(0, 1 - edad);
          const esReasignacion = aviso.tipo === 'reasignacion';
          const [x] = esReasignacion ? posicionDeCaseta(aviso.casetaId, pozoTotal) : [0];
          const z = esReasignacion ? 0 : (aviso.sentidoId === 0 ? 1 : -1) * ESCENA_3D.cola.separacionDeLaPlaza;
          const latido = reducirMovimiento ? 1 : 1 + Math.sin(instante * 2) * 0.12;

          return (
            <mesh
              key={`${aviso.tipo}-${aviso.t}-${i}`}
              position={[x, plaza.alturaLetrero + 2.4, z]}
              scale={esReasignacion ? latido : 1}
            >
              {esReasignacion ? (
                <torusGeometry args={[0.8, 0.18, 8, 16]} />
              ) : (
                <octahedronGeometry args={[0.9]} />
              )}
              <meshStandardMaterial
                color={esReasignacion ? colores.reasignacion : colores.aviso}
                transparent
                opacity={opacidad}
                emissive={esReasignacion ? colores.reasignacion : colores.aviso}
                emissiveIntensity={0.4}
              />
            </mesh>
          );
        })}
    </group>
  );
}

// ------------------------------------------------------------------ cámara ---

/** Órbita más preajustes. El movimiento a la posición nueva es suave. */
function Camara({ preajuste, pozoTotal, cola, reducirMovimiento }) {
  const { camera, gl } = useThree();
  const controles = useRef();
  const destino = useMemo(() => encuadre(preajuste, pozoTotal, cola), [preajuste, pozoTotal, cola]);
  const objetivoVector = useRef(new Vector3());

  useEffect(() => {
    if (!reducirMovimiento) return;
    camera.position.set(...destino.posicion);
    controles.current?.target.set(...destino.objetivo);
    controles.current?.update();
  }, [destino, camera, reducirMovimiento]);

  useFrame((_, delta) => {
    if (!controles.current) return;
    if (!reducirMovimiento) {
      const suavizado = 1 - Math.exp(-delta * 4);
      camera.position.lerp(objetivoVector.current.set(...destino.posicion), suavizado);
      controles.current.target.lerp(
        new Vector3(...destino.objetivo),
        suavizado,
      );
    }
    controles.current.update();
  });

  return <orbitControls ref={controles} args={[camera, gl.domElement]} enableDamping dampingFactor={0.08} />;
}

// ------------------------------------------------------------------- escena ---

/** Bucle que avisa cuánto cuesta cada fotograma, para la medición de PASO 2. */
function MedidorDeFotogramas({ alMedir }) {
  const acumulado = useRef({ cuantos: 0, suma: 0 });

  useFrame((_, delta) => {
    if (!alMedir) return;
    const estado = acumulado.current;
    estado.cuantos += 1;
    estado.suma += delta * 1000;
    if (estado.cuantos >= 30) {
      alMedir(estado.suma / estado.cuantos);
      estado.cuantos = 0;
      estado.suma = 0;
    }
  });

  return null;
}

/**
 * La escena 3D. Recibe el **modelo de escena** ya calculado: no sabe nada de la
 * traza ni del motor (DEC-036).
 */
export default function Escena3D({
  escena,
  pozoTotal,
  preajuste,
  calidad,
  reducirMovimiento,
  alMedirFotograma,
  oscuro,
}) {
  const colaAjustada = useMemo(
    () => ({ ...ESCENA_3D.cola, visiblesMaximos: calidad.colaVisible }),
    [calidad],
  );

  // La niebla se abre con el tamaño de la escena: si fuera fija, con un pozo
  // de 10 se comería medio peaje.
  const referencia = Math.max(anchoDeLaPlaza(pozoTotal), fondoDeLaCola(colaAjustada) * 1.55);
  const nieblaDesde = referencia * 1.6;
  const nieblaHasta = referencia * 4;

  /** Tope de instancias: la cola visible de los dos sentidos, más las casetas. */
  const maximoVehiculos = useMemo(
    () => calidad.colaVisible * 2 + pozoTotal * 2 + 24,
    [calidad, pozoTotal],
  );

  // Se recortan los que no caben en la longitud visible: el HUD los cuenta.
  const visibles = useMemo(
    () =>
      escena.vehiculos.filter(
        (v) => v.posicionCola === null || v.posicionCola < calidad.colaVisible,
      ),
    [escena.vehiculos, calidad],
  );

  return (
    <Canvas
      shadows={calidad.sombras}
      dpr={calidad.clave === 'baja' ? 1 : [1, 2]}
      camera={{ position: encuadre('todo', pozoTotal).posicion, fov: ESCENA_3D.campoDeVision }}
      gl={{ antialias: calidad.clave !== 'baja', preserveDrawingBuffer: true }}
      frameloop="always"
    >
      <color attach="background" args={[oscuro ? colores.cieloOscuro : colores.cielo]} />
      <fog
        attach="fog"
        args={[oscuro ? colores.cieloOscuro : colores.cielo, nieblaDesde, nieblaHasta]}
      />

      <ambientLight intensity={oscuro ? 0.5 : 0.75} />
      <directionalLight
        position={[24, 38, 20]}
        intensity={oscuro ? 0.7 : 1.1}
        castShadow={calidad.sombras}
        shadow-mapSize={[1024, 1024]}
      />

      <Calzada pozoTotal={pozoTotal} />

      {escena.casetas.map((caseta) => (
        <Caseta key={caseta.id} caseta={caseta} pozoTotal={pozoTotal} calidad={calidad} />
      ))}

      <Vehiculos
        vehiculos={visibles}
        pozoTotal={pozoTotal}
        cola={colaAjustada}
        maximo={maximoVehiculos}
      />

      <Avisos
        avisos={escena.avisos}
        instante={escena.instante}
        pozoTotal={pozoTotal}
        reducirMovimiento={reducirMovimiento}
      />

      <Camara preajuste={preajuste} pozoTotal={pozoTotal} cola={colaAjustada} reducirMovimiento={reducirMovimiento} />
      <MedidorDeFotogramas alMedir={alMedirFotograma} />
    </Canvas>
  );
}
