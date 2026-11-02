import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { crearRelojReproduccion, VELOCIDADES } from '../reloj.js';
import { estadoEnInstante } from '../../motor/traza.js';
import PanelVista3D, { hayWebGL } from '../vista3d/PanelVista3D.jsx';
import PanelControles from './PanelControles.jsx';
import Hud from './Hud.jsx';
import BarraReproduccion from './BarraReproduccion.jsx';
import CajonMedidas from './CajonMedidas.jsx';

/**
 * Vista principal: la simulación 3D a pantalla completa (DEC-053).
 *
 * La escena ocupa la ventana; encima van el HUD y la barra de reproducción, al
 * lado el panel de controles y abajo el cajón de gráficos y medidas. El reloj
 * de reproducción vive aquí y lo comparten la escena y los tableros, que es lo
 * que impide que se desincronicen (DEC-036).
 */
export default function VistaSimulacion({
  traza,
  escenarioAplicado,
  borrador,
  alCambiar,
  alRestablecer,
  alAplicarSituacion,
  alAplicar,
  alDescartar,
  hayCambiosSinAplicar,
  problemas,
  recalculando,
  alCancelar,
  error,
  semilla,
  alCambiarSemilla,
  alCorrerLotes,
  alVerSupuestos,
}) {
  const [velocidad, setVelocidad] = useState(VELOCIDADES[1]);
  const [instante, setInstante] = useState(0);
  const [enMarcha, setEnMarcha] = useState(false);
  const [panelAbierto, setPanelAbierto] = useState(true);
  const [cajonAbierto, setCajonAbierto] = useState(false);

  const relojRef = useRef(null);
  const animacionRef = useRef(null);
  const ultimoRef = useRef(null);

  const duracion = traza?.metadatos.instanteFinalSegundos ?? 0;
  const conWebGL = useMemo(() => hayWebGL(), []);

  // Un reloj nuevo por traza: la duración cambia con ella, y la reproducción
  // vuelve a t = 0 en pausa (DEC-054).
  useEffect(() => {
    if (!traza) return;
    relojRef.current = crearRelojReproduccion({
      duracionSegundos: Math.max(duracion, 1),
      velocidad,
    });
    setInstante(0);
    setEnMarcha(false);
  }, [traza, duracion]); // eslint-disable-line react-hooks/exhaustive-deps

  const volcar = useCallback((estadoReloj) => {
    setInstante(estadoReloj.instante);
    setEnMarcha(estadoReloj.enMarcha);
  }, []);

  // Bucle de fotogramas: mide el tiempo real y lo pasa al reloj.
  useEffect(() => {
    if (!enMarcha || !relojRef.current) return undefined;

    const paso = (marca) => {
      if (ultimoRef.current !== null) {
        const dtReal = (marca - ultimoRef.current) / 1000;
        volcar(relojRef.current.avanzar(dtReal));
      }
      ultimoRef.current = marca;
      animacionRef.current = requestAnimationFrame(paso);
    };

    animacionRef.current = requestAnimationFrame(paso);
    return () => {
      cancelAnimationFrame(animacionRef.current);
      ultimoRef.current = null;
    };
  }, [enMarcha, volcar]);

  const estado = useMemo(
    () => (traza ? estadoEnInstante(traza, instante) : null),
    [traza, instante],
  );

  const conteosDeSentidos = useMemo(
    () => traza?.metadatos.sentidos.map((s) => s.conteo) ?? [],
    [traza],
  );

  const panel = (
    <PanelControles
      borrador={borrador}
      aplicado={escenarioAplicado}
      alCambiar={alCambiar}
      alRestablecer={alRestablecer}
      alAplicarSituacion={alAplicarSituacion}
      alAplicar={alAplicar}
      alDescartar={alDescartar}
      hayCambiosSinAplicar={hayCambiosSinAplicar}
      problemas={problemas}
      recalculando={recalculando}
      semilla={semilla}
      alCambiarSemilla={alCambiarSemilla}
      alCorrerLotes={alCorrerLotes}
      alVerSupuestos={alVerSupuestos}
    />
  );

  return (
    <div className={`vista-simulacion${panelAbierto ? '' : ' vista-simulacion--panel-cerrado'}`}>
      <aside className="vista-simulacion__panel">
        <button
          type="button"
          className="vista-simulacion__tirador"
          onClick={() => setPanelAbierto((previo) => !previo)}
          aria-expanded={panelAbierto}
        >
          {panelAbierto ? '◂ Ocultar controles' : '▸ Controles'}
        </button>
        {panelAbierto && panel}
      </aside>

      <div className="vista-simulacion__escena">
        {error && (
          <div className="problemas" role="alert">
            {error}
          </div>
        )}

        {!traza && !error && (
          <p className="vista-simulacion__esperando" role="status">
            Preparando la simulación…
          </p>
        )}

        {traza && (
          <>
            <div
              className={`vista-simulacion__lienzo${
                recalculando ? ' vista-simulacion__lienzo--atenuado' : ''
              }`}
            >
              {/*
                Sin WebGL este panel ya pone su propio aviso, y el cajón de
                abajo pasa a ser el contenido principal.
              */}
              <PanelVista3D
                traza={traza}
                escenario={escenarioAplicado}
                instante={instante}
                visible
                alCambiarVisible={() => {}}
                conInterruptor={false}
              />

              <Hud estado={estado} instante={instante} escenario={escenarioAplicado} traza={traza} />
            </div>

            {recalculando && (
              <div className="vista-simulacion__recalculando" role="status">
                <span>Recalculando…</span>
                <button type="button" onClick={alCancelar}>
                  Cancelar
                </button>
              </div>
            )}

            <BarraReproduccion
              instante={instante}
              duracion={duracion}
              enMarcha={enMarcha}
              velocidad={velocidad}
              conteos={conteosDeSentidos}
              alAlternar={() => volcar(relojRef.current.alternar())}
              alReiniciar={() => volcar(relojRef.current.reiniciar())}
              alCambiarVelocidad={(v) => {
                setVelocidad(v);
                volcar(relojRef.current.cambiarVelocidad(v));
              }}
              alSaltar={(segundos) => volcar(relojRef.current.saltarA(segundos))}
            />
          </>
        )}
      </div>

      <CajonMedidas
        traza={traza}
        escenario={escenarioAplicado}
        estado={estado}
        instante={instante}
        semilla={semilla}
        abierto={cajonAbierto}
        alAlternar={() => setCajonAbierto((previo) => !previo)}
        principal={!conWebGL}
      />
    </div>
  );
}
