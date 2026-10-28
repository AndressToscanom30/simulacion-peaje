import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import { ESCENA_3D, ESTADOS_CASETA, FASES_VEHICULO } from '../../config/escena3d.js';
import { crearModeloEscena } from './modeloEscena.js';
import { PREAJUSTES_CAMARA } from './geometria.js';
import { horaDelConteo, num, relojSimulado } from '../formato.js';

/**
 * La escena se carga **diferida** (DEC-037): three no entra en el paquete
 * principal, así que quien no abra la vista 3D no lo descarga.
 */
const Escena3D = lazy(() => import('./Escena3D.jsx'));

/** ¿Hay WebGL en este navegador? */
function hayWebGL() {
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

/** ¿El sistema está en modo oscuro? Solo cambia el cielo de la escena. */
function prefiereOscuro() {
  try {
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
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
export default function PanelVista3D({ traza, escenario, instante, visible, alCambiarVisible }) {
  const [preajuste, setPreajuste] = useState('todo');
  const [claveCalidad, setClaveCalidad] = useState('alta');
  const [msPorFotograma, setMsPorFotograma] = useState(null);
  const [soportaWebGL] = useState(() => hayWebGL());
  const reducirMovimiento = useMemo(() => prefiereMenosMovimiento(), []);
  const oscuro = useMemo(() => prefiereOscuro(), []);

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
        <label>
          <input
            type="checkbox"
            checked={visible}
            onChange={(evento) => alCambiarVisible(evento.target.checked)}
          />
          Mostrar
        </label>
        {visible && soportaWebGL && (
          <>
            <span className="grupo-velocidad">
              Cámara:
              {PREAJUSTES_CAMARA.map((p) => (
                <button
                  key={p.clave}
                  type="button"
                  className={preajuste === p.clave ? 'activo' : undefined}
                  onClick={() => setPreajuste(p.clave)}
                  aria-pressed={preajuste === p.clave}
                >
                  {p.etiqueta}
                </button>
              ))}
            </span>
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
            {msPorFotograma !== null && (
              <span className="nota" title="Media de los últimos 30 fotogramas">
                {num(msPorFotograma, 1)} ms/fotograma
              </span>
            )}
          </>
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
                calidad={calidad}
                reducirMovimiento={reducirMovimiento}
                alMedirFotograma={setMsPorFotograma}
                oscuro={oscuro}
              />
            </Suspense>
          </div>

          <Hud
            escena={escena}
            etiquetas={etiquetas}
            conteo={conteoDeLaHora}
            escenario={escenario}
            calidad={calidad}
          />

          <Leyenda />

          <p className="etiqueta-sensibilidad">
            <strong>Escena esquemática:</strong> el tránsito entre cola y caseta es cosmético.
            El modelo no tiene distancias ni velocidades, así que la entrada desde el borde y
            el avance a la caseta son interpolación visual y <strong>no afectan a ninguna
            medida</strong> (DEC-038). La cola se dibuja como <strong>un solo embudo por
            sentido</strong> porque el modelo es de cola única, no de una fila por caseta
            (DEC-001, DEC-024).
            {reducirMovimiento && (
              <>
                {' '}El sistema pide menos movimiento: se ha reducido lo decorativo, no la
                simulación.
              </>
            )}
          </p>
        </>
      )}
    </section>
  );
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
  return `lectura de cola de ${sentido}: ${aviso.cola} veh`;
}

/** Leyenda: los estados de caseta y las fases de vehículo. */
function Leyenda() {
  return (
    <details className="leyenda-3d">
      <summary>Leyenda</summary>
      <div className="leyenda-3d__columnas">
        <div>
          <h4>Casetas</h4>
          <ul>
            {Object.values(ESTADOS_CASETA).map((estado) => (
              <li key={estado.clave}>
                <span className="muestra" style={{ background: estado.color }} aria-hidden="true" />
                <code>{estado.texto}</code> — {estado.etiqueta} (figura: {estado.figura})
              </li>
            ))}
          </ul>
          <p className="nota">
            El letrero lleva el número de caseta, la flecha del sentido al que sirve y el
            estado en texto. El color <strong>no es la única señal</strong>: la figura y la
            altura del indicador también lo distinguen (DEC-039).
          </p>
        </div>
        <div>
          <h4>Vehículos</h4>
          <ul>
            {Object.values(FASES_VEHICULO).map((fase) => (
              <li key={fase.clave}>
                <code>{fase.clave}</code> — {fase.etiqueta}
                {fase.cuentaComo === 'cola' && ' · el motor lo cuenta en la cola'}
                {fase.cuentaComo === 'enServicio' && ' · el motor lo cuenta en servicio'}
              </li>
            ))}
          </ul>
          <p className="nota">
            El color y el tamaño varían con el identificador del vehículo, solo para poder
            seguir uno con la vista. Todos son de la misma clase: la categoría no entra al
            modelo (DEC-003).
          </p>
        </div>
      </div>
    </details>
  );
}
