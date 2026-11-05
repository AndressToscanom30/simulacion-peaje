import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ESCENA_3D, ESTADOS_CASETA } from '../../config/escena3d.js';
import { crearModeloEscena } from './modeloEscena.js';
import { PREAJUSTES_CAMARA } from './geometria.js';
import { horaDelConteo, num, relojSimulado } from '../formato.js';

/**
 * La escena se carga **diferida** (DEC-037): three no entra en el paquete
 * principal, así que quien no abra la vista 3D no lo descarga.
 */
const Escena3D = lazy(() => import('./Escena3D.jsx'));

/**
 * ¿Hay WebGL en este navegador?
 *
 * Exportada porque la vista de simulación la necesita para decidir si el cajón
 * de gráficos es el contenido principal (DEC-053).
 */
export function hayWebGL() {
  try {
    const lienzo = document.createElement('canvas');
    return Boolean(
      window.WebGLRenderingContext &&
        (lienzo.getContext('webgl2') || lienzo.getContext('webgl')),
    );
  } catch {
    return false;
  }
}

/** ¿El sistema pide menos movimiento? */
function prefiereMenosMovimiento() {
  try {
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  } catch {
    return false;
  }
}

/**
 * Panel "Vista 3D" de la pestaña Tiempo real.
 *
 * **Comparte el reloj y los controles con los tableros 2D**: recibe el instante
 * ya calculado, así que la vista 3D y los gráficos no pueden desincronizarse
 * (DEC-036).
 */
export default function PanelVista3D({
  traza,
  escenario,
  instante,
  visible,
  alCambiarVisible,
  /**
   * Si se dibuja el interruptor de mostrar u ocultar. En la vista de simulación
   * va a `false`, porque ahí la escena **es** la página y no hay nada que
   * ocultar (DEC-053). Por defecto `true`, que es como lo usaba la pestaña de
   * tiempo real.
   */
  conInterruptor = true,
  /**
   * Si el panel dibuja su propio HUD. En la vista de simulación va a `false`:
   * allí el HUD lo pone la vista, encima de la escena, y si el panel pusiera
   * además el suyo saldrían los dos en la misma esquina, uno sobre otro.
   */
  conHud = true,
}) {
  const [preajuste, setPreajuste] = useState('todo');
  /**
   * Cada clic en un preajuste es una **petición** nueva, aunque sea el mismo
   * botón: así el botón vuelve a servir para recentrar después de orbitar a
   * mano (DEC-041).
   */
  const [peticionCamara, setPeticionCamara] = useState(0);
  const [camaraLibre, setCamaraLibre] = useState(false);
  const [claveCalidad, setClaveCalidad] = useState('alta');
  const [msPorFotograma, setMsPorFotograma] = useState(null);
  const [estadoCarro, setEstadoCarro] = useState({ carro: null, cargando: false, error: null });
  const [soportaWebGL] = useState(() => hayWebGL());
  const reducirMovimiento = useMemo(() => prefiereMenosMovimiento(), []);

  /** Pide un encuadre: la cámara viaja hasta él y deja de estar libre. */
  const pedirEncuadre = useCallback((clave) => {
    setPreajuste(clave);
    setPeticionCamara((n) => n + 1);
    setCamaraLibre(false);
  }, []);

  const alTomarElMando = useCallback(() => setCamaraLibre(true), []);
  const alCargarCarro = useCallback((estado) => setEstadoCarro(estado), []);

  const calidad = ESCENA_3D.calidades[claveCalidad];

  // Un modelo de escena por traza, que avanza con el cursor del reproductor.
  const modeloRef = useRef(null);
  const trazaRef = useRef(null);
  if (traza && trazaRef.current !== traza) {
    trazaRef.current = traza;
    modeloRef.current = crearModeloEscena(traza, { reducirMovimiento });
  }

  const escena = useMemo(
    () => (traza && modeloRef.current ? modeloRef.current.enInstante(instante) : null),
    [traza, instante],
  );

  useEffect(() => {
    if (!visible) setMsPorFotograma(null);
  }, [visible]);

  if (!traza) return null;

  const etiquetas = traza.metadatos.sentidos.map((s) => s.etiqueta);
  const conteoDeLaHora = traza.metadatos.sentidos[0].conteo;

  return (
    <section className="vista3d">
      <div className="barra">
        <h3>Vista 3D</h3>
        {conInterruptor && (
          <label>
            <input
              type="checkbox"
              checked={visible}
              onChange={(evento) => alCambiarVisible(evento.target.checked)}
            />
            Mostrar
          </label>
        )}
      </div>

      {!visible && (
        <p className="nota">
          La vista 3D está oculta. Los tableros y el resultado siguen funcionando igual.
        </p>
      )}

      {visible && !soportaWebGL && (
        <div className="problemas" role="alert">
          <strong>Este navegador no tiene WebGL</strong>, así que la vista 3D no se puede
          dibujar. Todo lo demás —los controles, los tableros y la tabla de medidas— sigue
          funcionando: la vista 3D no calcula nada, solo dibuja lo que ya está simulado.
        </div>
      )}

      {visible && soportaWebGL && escena && (
        <>
          <div className="vista3d__lienzo">
            <Suspense fallback={<p className="nota">Cargando la escena…</p>}>
              <Escena3D
                escena={escena}
                pozoTotal={traza.metadatos.pozoTotal}
                preajuste={preajuste}
                peticionCamara={peticionCamara}
                calidad={calidad}
                reducirMovimiento={reducirMovimiento}
                alMedirFotograma={setMsPorFotograma}
                alTomarElMando={alTomarElMando}
                alCargarCarro={alCargarCarro}
              />
            </Suspense>
          </div>

          {conHud && (
            <Hud
              escena={escena}
              etiquetas={etiquetas}
              conteo={conteoDeLaHora}
              escenario={escenario}
              calidad={calidad}
            />
          )}

          {/* Barra de instrumentos: debajo de la escena, que es lo que
              gobierna. Encima manda el pórtico del HUD (DEC-058). */}
          <div className="vista3d__pie">
            <span className="grupo-velocidad">
              Cámara:
              {PREAJUSTES_CAMARA.map((p) => (
                <button
                  key={p.clave}
                  type="button"
                  className={!camaraLibre && preajuste === p.clave ? 'activo' : undefined}
                  onClick={() => pedirEncuadre(p.clave)}
                  aria-pressed={!camaraLibre && preajuste === p.clave}
                  title="Lleva la cámara a este encuadre; después se puede seguir girando a mano"
                >
                  {p.etiqueta}
                </button>
              ))}
            </span>
            {camaraLibre && (
              <span className="nota" role="status">
                Vista libre
              </span>
            )}
            <label>
              Calidad:
              <select value={claveCalidad} onChange={(evento) => setClaveCalidad(evento.target.value)}>
                {Object.values(ESCENA_3D.calidades).map((c) => (
                  <option key={c.clave} value={c.clave}>
                    {c.etiqueta}
                  </option>
                ))}
              </select>
            </label>
            <Leyenda />
            <EstadoDelCarro estado={estadoCarro} calidad={calidad} />
          </div>
        </>
      )}
    </section>
  );
}

/**
 * Indicador corto de qué se está dibujando como vehículo (DEC-057).
 *
 * Antes era un párrafo con la ruta del archivo y el recuento de triángulos. Eso
 * describe cómo está hecho el programa, no ayuda a usarlo: vive en
 * `docs/vista3d.md`. Lo que sí importa mientras se mira la escena es si lo que
 * se ve son cajas o el modelo, y por qué.
 */
function EstadoDelCarro({ estado, calidad }) {
  if (!calidad.carro) return <span className="vista3d__estado">Vehículos: cajas</span>;
  if (estado.error) {
    return (
      <span className="vista3d__estado" role="status">
        Vehículos: cajas (el modelo no cargó)
      </span>
    );
  }
  if (estado.cargando || !estado.carro) {
    return (
      <span className="vista3d__estado" role="status">
        Cargando el modelo…
      </span>
    );
  }
  return <span className="vista3d__estado">Vehículos: modelo 3D</span>;
}

/** Contadores y registro de eventos recientes, en texto. */
function Hud({ escena, etiquetas, conteo, escenario, calidad }) {
  const hora = horaDelConteo(conteo, escena.instante);

  return (
    <div className="hud">
      <div className="hud__reloj">
        <strong>
          t = {relojSimulado(escena.instante)}
          {hora && <> · {hora}</>}
        </strong>
      </div>

      {escena.contadores.map((contador, i) => (
        <div key={contador.etiqueta} className="hud__sentido">
          <h4>
            {contador.etiqueta} <span className="hud__flecha">{i === 0 ? '▼' : '▲'}</span>
          </h4>
          <dl>
            <dt>En cola</dt>
            <dd className="grande">{num(contador.cola, 0)}</dd>
            <dt>En servicio</dt>
            <dd>{num(contador.enServicio, 0)}</dd>
            <dt>Atendidos</dt>
            <dd>{num(contador.atendidos, 0)}</dd>
            <dt>Casetas abiertas</dt>
            <dd>{num(contador.casetasAbiertas, 0)}</dd>
          </dl>
          {contador.cola > calidad.colaVisible && (
            <p className="nota">
              {contador.cola - calidad.colaVisible} vehículo(s) de la cola no caben en la
              escena y no se dibujan.
            </p>
          )}
        </div>
      ))}

      <div className="hud__pozo">
        <h4>Pozo ({escena.pozo.total} casetas)</h4>
        <dl>
          {Object.entries(escena.pozo.porEstado).map(([clave, cuantas]) => (
            <div key={clave} className="hud__linea">
              <dt>{ESTADOS_CASETA[clave].etiqueta}</dt>
              <dd>{cuantas}</dd>
            </div>
          ))}
          <div className="hud__linea">
            <dt>
              <strong>libres</strong>
            </dt>
            <dd>
              <strong>{escena.pozo.libres}</strong>
            </dd>
          </div>
        </dl>
      </div>

      <div className="hud__registro">
        <h4>Eventos recientes</h4>
        {escena.avisos.length === 0 ? (
          <p className="nota">Sin eventos en los últimos {ESCENA_3D.duraciones.avisoSegundos} s.</p>
        ) : (
          <ul>
            {[...escena.avisos].reverse().slice(0, 8).map((aviso, i) => (
              <li key={`${aviso.t}-${i}`}>
                <code>{relojSimulado(aviso.t)}</code> {textoDeAviso(aviso, etiquetas)}
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="nota hud__pie">
        Meta {escenario.desempeno.metaWqSegundos / 60} min · máximo tolerable{' '}
        {escenario.desempeno.maximoTolerableWqSegundos / 60} min. Los resultados están en la
        tabla de medidas, no en la escena.
      </p>
    </div>
  );
}

function textoDeAviso(aviso, etiquetas) {
  const sentido = etiquetas[aviso.sentidoId] ?? '—';
  if (aviso.tipo === 'reasignacion') {
    const desde = aviso.desdeSentidoId === null ? 'el pozo' : etiquetas[aviso.desdeSentidoId];
    return `caseta ${aviso.casetaId} reasignada de ${desde} a ${sentido}`;
  }
  if (aviso.tipo === 'bloqueo') {
    return `${sentido} pidió caseta y el pozo estaba agotado (cola ${aviso.cola})`;
  }
  if (aviso.tipo === 'prestamo') {
    return `caseta ${aviso.casetaId} prestada de ${etiquetas[aviso.desdeSentidoId]} a ${sentido}`;
  }
  return `lectura de cola de ${sentido}: ${aviso.cola} veh`;
}

/**
 * Leyenda **compacta** de los estados de caseta (DEC-057).
 *
 * Cada estado trae su muestra de color, su **figura** y su **texto**: el color
 * no es la única señal, que es lo que exige la DEC-039 y que esta
 * simplificación **no toca**. Fuera quedan las fases de vehículo y los dos
 * párrafos que explicaban cómo está hecha la escena.
 */
export function Leyenda() {
  return (
    <details className="leyenda-3d">
      <summary>Leyenda</summary>
      <ul className="leyenda-3d__lista">
        {Object.values(ESTADOS_CASETA).map((estado) => (
          <li key={estado.clave}>
            <span className="muestra" style={{ background: estado.color }} aria-hidden="true" />
            <code>{estado.texto}</code> {estado.etiqueta} · {estado.figura}
          </li>
        ))}
      </ul>
    </details>
  );
}
