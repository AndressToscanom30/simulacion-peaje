import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree, extend } from '@react-three/fiber';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Color, DoubleSide, Object3D, Vector3 } from 'three';

import { ESCENA_3D, ESTADOS_CASETA, colorDeVehiculo, largoDeVehiculo } from '../../config/escena3d.js';
import { encuadre, limitesDeNavegacion, posicionDeCaseta, situarVehiculo } from './geometria.js';
import { cargarCarro } from './modeloCarro.js';
import { flechaDe, texturaDeLetrero } from './texto.js';

extend({ OrbitControls });

const { plaza, vehiculo: vehiculoCfg, carro: carroCfg, navegacion, luces, colores } = ESCENA_3D;

/** Objetos reutilizados para no crear basura en cada fotograma. */
const auxiliar = new Object3D();
const colorAuxiliar = new Color();

// --------------------------------------------------------------- escenario ---

/**
 * Calzada, arcenes y marcas. Geometría procedural (DEC-037).
 *
 * El asfalto se dibuja **dos veces**: la cara de arriba, opaca, y un **reverso
 * translúcido**. Con la vista libre se puede orbitar por debajo de la calzada
 * (DEC-041), y ahí una losa opaca taparía la escena entera: lo pedido es ver
 * el modelo desde cualquier ángulo, no quedarse mirando el asfalto. Con el
 * reverso a media opacidad y sin escribir profundidad, desde abajo se ven las
 * casetas y los vehículos a través de la calzada, que sigue leyéndose como
 * suelo. Las marcas sí van a dos caras: dibujan la planta sobre el velo.
 */
function Calzada({ pozoTotal }) {
  const ancho = pozoTotal * plaza.separacionCarriles + plaza.anchoArcen * 2;
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[ancho, plaza.largoCalzada * 2]} />
        <meshStandardMaterial color={colores.asfalto} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -0.03, 0]}>
        <planeGeometry args={[ancho, plaza.largoCalzada * 2]} />
        <meshStandardMaterial
          color={colores.asfalto}
          transparent
          opacity={plaza.opacidadReverso}
          depthWrite={false}
        />
      </mesh>
      {/* Líneas que separan los carriles. */}
      {Array.from({ length: pozoTotal + 1 }, (_, i) => {
        const x = (i - pozoTotal / 2) * plaza.separacionCarriles;
        return (
          <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0, 0]}>
            <planeGeometry args={[0.14, plaza.largoCalzada * 2]} />
            <meshStandardMaterial color={colores.marca} side={DoubleSide} />
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
    const destino = flechaDe(caseta.sentidoDestinoId);
    const cuenta =
      caseta.estado === ESTADOS_CASETA.traspaso.clave
        ? caseta.traspasoVencido
          ? `TERMINA → ${destino}`
          : `→ ${destino} ${Math.ceil(caseta.faltaParaAbrir)} s`
        : caseta.faltaParaAbrir === null
          ? estado.texto
          : `ABRE ${Math.ceil(caseta.faltaParaAbrir)} s`;
    return texturaDeLetrero({
      titulo: `${caseta.id} ${flechaDe(caseta.sentidoId)}`,
      estado: cuenta,
      color: estado.color,
      fondo: colores.letrero,
    });
    // La cuenta atrás se redondea a segundos para no regenerar la textura por fotograma.
  },   [
    caseta.id,
    caseta.sentidoId,
    caseta.sentidoDestinoId,
    caseta.estado,
    caseta.traspasoVencido,
    Math.ceil(caseta.faltaParaAbrir ?? -1),
    estado,
  ]);

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
 * Carga el modelo del carro una vez por nivel de detalle y la comparte entre
 * montajes: cambiar de calidad y volver no vuelve a descargar los 10,9 MB.
 */
const modelosDelCarro = new Map();

/**
 * Pide el modelo del carro para un nivel de detalle.
 *
 * Mientras llega —o si no llega— se dibujan cajas: la escena **nunca** se
 * queda en blanco por un archivo que falte (DEC-040).
 *
 * @param {string|null} nivel `completo`, `reducido`, o `null` para pedir cajas
 */
function useCarro(nivel) {
  const [estado, setEstado] = useState({ carro: null, cargando: Boolean(nivel), error: null });

  useEffect(() => {
    if (!nivel) {
      setEstado({ carro: null, cargando: false, error: null });
      return undefined;
    }
    if (!modelosDelCarro.has(nivel)) modelosDelCarro.set(nivel, cargarCarro(nivel));

    let vivo = true;
    setEstado((anterior) => ({ ...anterior, cargando: !anterior.carro || anterior.carro.nivel !== nivel }));
    modelosDelCarro.get(nivel).then(
      (carro) => vivo && setEstado({ carro, cargando: false, error: null }),
      (error) => {
        // Se olvida el fallo para que un reintento (cambiar de calidad y volver)
        // no herede la promesa rota.
        modelosDelCarro.delete(nivel);
        if (vivo) setEstado({ carro: null, cargando: false, error });
      },
    );
    return () => {
      vivo = false;
    };
  }, [nivel]);

  return estado;
}

/**
 * Todos los vehículos en `InstancedMesh`: **un objeto de dibujo por papel del
 * modelo** (carrocería, cromados, cristales, ruedas…), no uno por coche, que
 * es lo que hace que el festivo a 60× siga yendo fluido con cientos de copias.
 *
 * Las matrices se calculan **una sola vez** y se copian tal cual a cada papel:
 * todas las piezas de un mismo coche comparten transformación.
 *
 * La variación de color y de largo sale del `vehiculoId` y es determinista:
 * sirve para seguir uno con la vista, no para distinguir categorías, que no
 * entran al modelo (DEC-003). Solo la carrocería se tiñe; los cristales y los
 * neumáticos conservan su color.
 */
function Vehiculos({ vehiculos, pozoTotal, cola, maximo, carro, calidad }) {
  const mallas = useRef([]);
  const piezas = carro?.piezas ?? null;
  const alturaBase = piezas ? carroCfg.alturaDeRodadura : vehiculoCfg.alto / 2 + carroCfg.alturaDeRodadura;

  /** Matrices y colores de esta tanda, reutilizados entre fotogramas. */
  const tanda = useMemo(
    () => ({ matrices: new Float32Array(maximo * 16), colores: new Float32Array(maximo * 3) }),
    [maximo],
  );

  useLayoutEffect(() => {
    const { matrices, colores: tintes } = tanda;
    const cuantos = Math.min(vehiculos.length, maximo);

    for (let i = 0; i < cuantos; i += 1) {
      const v = vehiculos[i];
      const { posicion, giro } = situarVehiculo(v, pozoTotal, cola);
      const largo = largoDeVehiculo(v.id);

      auxiliar.position.set(posicion[0], alturaBase, posicion[2]);
      auxiliar.rotation.set(0, giro, 0);
      auxiliar.scale.set(1, 1, largo / vehiculoCfg.largo);
      auxiliar.updateMatrix();
      auxiliar.matrix.toArray(matrices, i * 16);

      colorAuxiliar.set(colorDeVehiculo(v.id, v.sentidoId));
      // Los que están siendo atendidos se aclaran, para verlos en la caseta.
      if (v.fase === 'enServicio') colorAuxiliar.offsetHSL(0, 0, 0.18);
      colorAuxiliar.toArray(tintes, i * 3);
    }

    // Los que sobran simplemente no se dibujan: `count` es un parámetro de la
    // llamada de dibujo, bajarlo no cuesta nada y con el modelo del carro cada
    // instancia de más son 10 700 triángulos (DEC-040).
    for (const malla of mallas.current) {
      if (!malla) continue;
      malla.instanceMatrix.array.set(matrices);
      malla.instanceMatrix.needsUpdate = true;
      malla.count = cuantos;

      // El color del vehículo solo lo lleva la carrocería (o la caja entera).
      if (malla.userData.tinta) {
        if (!malla.instanceColor) malla.setColorAt(0, colorAuxiliar);
        malla.instanceColor.array.set(tintes);
        malla.instanceColor.needsUpdate = true;
      }
    }
  }, [vehiculos, pozoTotal, cola, maximo, tanda, alturaBase, piezas]);

  if (!piezas) {
    return (
      <instancedMesh
        ref={(malla) => {
          mallas.current = [malla];
          if (malla) malla.userData.tinta = true;
        }}
        args={[undefined, undefined, maximo]}
        castShadow={calidad.sombras}
        frustumCulled={false}
      >
        <boxGeometry args={[vehiculoCfg.ancho, vehiculoCfg.alto, vehiculoCfg.largo]} />
        <meshStandardMaterial />
      </instancedMesh>
    );
  }

  return (
    <group>
      {piezas.map((pieza, i) => (
        <instancedMesh
          key={pieza.rol.clave}
          ref={(malla) => {
            mallas.current[i] = malla;
            if (malla) malla.userData.tinta = pieza.rol.clave === carroCfg.rolDePintura;
          }}
          args={[pieza.geometria, undefined, maximo]}
          castShadow={calidad.sombras}
          frustumCulled={false}
        >
          <meshStandardMaterial
            color={pieza.rol.clave === carroCfg.rolDePintura ? '#ffffff' : pieza.rol.color}
            metalness={pieza.rol.metalico}
            roughness={pieza.rol.rugosidad}
            transparent={pieza.rol.opacidad !== undefined}
            opacity={pieza.rol.opacidad ?? 1}
            side={DoubleSide}
          />
        </instancedMesh>
      ))}
    </group>
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

/**
 * Cámara **libre** (DEC-041).
 *
 * Se orbita, se acerca y se desplaza desde cualquier ángulo, también por
 * debajo de la calzada. Los preajustes no son modos: son **viajes** a un
 * encuadre, y en cuanto se arrastra el viaje se corta y manda el ratón. Antes
 * la cámara se interpolaba hacia el preajuste en todos los fotogramas, así que
 * cualquier órbita se deshacía sola; esto es lo que arregla.
 *
 * Lo único que queda acotado es el punto al que mira, que se queda dentro de
 * un cubo centrado en la plaza: se puede ver el modelo desde donde se quiera,
 * pero no perderlo de vista.
 */
function Camara({ preajuste, peticion, pozoTotal, cola, reducirMovimiento, limites, alTomarElMando }) {
  const { camera, gl } = useThree();
  const controles = useRef();

  const destino = useMemo(() => encuadre(preajuste, pozoTotal, cola), [preajuste, pozoTotal, cola]);
  const posicionDestino = useMemo(() => new Vector3(...destino.posicion), [destino]);
  const objetivoDestino = useMemo(() => new Vector3(...destino.objetivo), [destino]);
  const cubo = useMemo(
    () => ({
      minimo: new Vector3(...limites.objetivoMinimo),
      maximo: new Vector3(...limites.objetivoMaximo),
    }),
    [limites],
  );

  /** ¿Hay un viaje a un preajuste en curso? Cada petición arranca uno nuevo. */
  const viajando = useRef(true);
  useEffect(() => {
    viajando.current = true;
  }, [peticion, posicionDestino]);

  // El primer gesto corta el viaje: no se pelea con el arrastre.
  useEffect(() => {
    const mando = controles.current;
    if (!mando) return undefined;
    const alEmpezar = () => {
      viajando.current = false;
      alTomarElMando?.();
    };
    mando.addEventListener('start', alEmpezar);
    return () => mando.removeEventListener('start', alEmpezar);
  }, [alTomarElMando]);

  useFrame((_, delta) => {
    const mando = controles.current;
    if (!mando) return;

    if (viajando.current) {
      const llegar = () => {
        camera.position.copy(posicionDestino);
        mando.target.copy(objetivoDestino);
        viajando.current = false;
      };
      if (reducirMovimiento) {
        llegar();
      } else {
        const suavizado = 1 - Math.exp(-delta * navegacion.suavizadoPreajuste);
        camera.position.lerp(posicionDestino, suavizado);
        mando.target.lerp(objetivoDestino, suavizado);
        if (camera.position.distanceTo(posicionDestino) < navegacion.toleranciaPreajuste) llegar();
      }
    }

    mando.target.clamp(cubo.minimo, cubo.maximo);
    mando.update();
  });

  return (
    <orbitControls
      ref={controles}
      args={[camera, gl.domElement]}
      enableDamping
      dampingFactor={navegacion.amortiguacion}
      enableRotate
      enableZoom
      enablePan
      screenSpacePanning
      rotateSpeed={navegacion.velocidadRotacion}
      zoomSpeed={navegacion.velocidadZoom}
      panSpeed={navegacion.velocidadDesplazamiento}
      minDistance={limites.distanciaMinima}
      maxDistance={limites.distanciaMaxima}
      minPolarAngle={limites.anguloPolarMinimo}
      maxPolarAngle={limites.anguloPolarMaximo}
    />
  );
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
  peticionCamara,
  calidad,
  reducirMovimiento,
  alMedirFotograma,
  alTomarElMando,
  alCargarCarro,
}) {
  const colaAjustada = useMemo(
    () => ({ ...ESCENA_3D.cola, visiblesMaximos: calidad.colaVisible }),
    [calidad],
  );

  // Topes de la navegación y niebla, los dos sacados del tamaño de la escena:
  // si fueran fijos, con un pozo de 10 la niebla se comería medio peaje.
  const limites = useMemo(
    () => limitesDeNavegacion(pozoTotal, colaAjustada),
    [pozoTotal, colaAjustada],
  );

  // El modelo del carro llega cuando llega; hasta entonces, cajas (DEC-040).
  const { carro, cargando, error } = useCarro(calidad.carro);
  useEffect(() => {
    alCargarCarro?.({ carro, cargando, error });
  }, [alCargarCarro, carro, cargando, error]);

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
      <color attach="background" args={[colores.cielo]} />
      <fog attach="fog" args={[colores.cielo, limites.nieblaDesde, limites.nieblaHasta]} />

      <ambientLight intensity={luces.ambiente.claro} />
      {/* Cielo arriba, suelo abajo: es lo que deja leer el reverso de la
          calzada cuando la cámara se mete por debajo (DEC-041). */}
      <hemisphereLight
        args={[colores.cielo, luces.hemisferio.suelo, luces.hemisferio.claro]}
      />
      <directionalLight
        position={luces.direccional.posicion}
        intensity={luces.direccional.claro}
        castShadow={calidad.sombras}
        shadow-mapSize={[luces.direccional.resolucionSombra, luces.direccional.resolucionSombra]}
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
        carro={carro}
        calidad={calidad}
      />

      <Avisos
        avisos={escena.avisos}
        instante={escena.instante}
        pozoTotal={pozoTotal}
        reducirMovimiento={reducirMovimiento}
      />

      <Camara
        preajuste={preajuste}
        peticion={peticionCamara}
        pozoTotal={pozoTotal}
        cola={colaAjustada}
        reducirMovimiento={reducirMovimiento}
        limites={limites}
        alTomarElMando={alTomarElMando}
      />
      <MedidorDeFotogramas alMedir={alMedirFotograma} />
    </Canvas>
  );
}
