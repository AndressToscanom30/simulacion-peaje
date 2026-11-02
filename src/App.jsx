import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { construirEscenario, problemasDelEscenario } from './config/escenario.js';
import { aplicarSituacion } from './config/situaciones.js';
import { cambiarCampo, restablecerCampo, sonIguales } from './ui/modeloFormulario.js';
import { crearClienteSimulacion, fueDescartado } from './ui/worker/cliente.js';
import { guardarEscenario, leerEscenario } from './ui/almacen.js';
import { VISTA, hashDeVista, vistaDeHash } from './ui/rutas.js';
import BarraSuperior from './ui/componentes/BarraSuperior.jsx';
import VistaSimulacion from './ui/componentes/VistaSimulacion.jsx';
import Advertencias from './ui/componentes/Advertencias.jsx';
import Formulario from './ui/componentes/Formulario.jsx';
import ModoLotes from './ui/componentes/ModoLotes.jsx';

/** Escenario de arranque: el guardado si sirve, y si no el base. */
function escenarioInicial() {
  const guardado = leerEscenario();
  if (!guardado) return construirEscenario();
  try {
    const completo = construirEscenario(guardado);
    return problemasDelEscenario(completo).length === 0 ? completo : construirEscenario();
  } catch {
    return construirEscenario();
  }
}

/** Vista que dice el hash, ahora mismo. */
function vistaActual() {
  try {
    return vistaDeHash(window.location.hash);
  } catch {
    return VISTA.SIMULACION;
  }
}

export default function App() {
  /**
   * Dos escenarios, y esta es la idea central de la etapa (DEC-054):
   *
   * - `aplicado` es el que generó la traza que se está viendo.
   * - `borrador` es lo que el panel y la configuración avanzada editan.
   *
   * Editar no cambia lo que se ve; solo «Aplicar y recalcular» lo hace.
   */
  const [aplicado, setAplicado] = useState(escenarioInicial);
  const [borrador, setBorrador] = useState(aplicado);

  const [vista, setVista] = useState(vistaActual);
  const [semilla, setSemilla] = useState(1);
  const [semillaAplicada, setSemillaAplicada] = useState(1);
  const [traza, setTraza] = useState(null);
  const [recalculando, setRecalculando] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState(null);

  const clienteRef = useRef(null);
  if (!clienteRef.current) clienteRef.current = crearClienteSimulacion();
  const cliente = clienteRef.current;

  useEffect(() => () => cliente.terminar(), [cliente]);

  // El hash manda: atrás y adelante del navegador funcionan solos (DEC-053).
  useEffect(() => {
    const alCambiarHash = () => setVista(vistaActual());
    window.addEventListener('hashchange', alCambiarHash);
    return () => window.removeEventListener('hashchange', alCambiarHash);
  }, []);

  /**
   * Se recuerda el escenario **aplicado**, que es el que corresponde a lo que
   * se vio. Si `localStorage` falla, da igual (almacen.js).
   */
  useEffect(() => {
    guardarEscenario(aplicado);
  }, [aplicado]);

  const problemasBorrador = useMemo(() => problemasDelEscenario(borrador), [borrador]);

  /**
   * ¿El borrador difiere de lo aplicado? Se compara con `sonIguales`, que es la
   * comparación que ya usaba el formulario; no se escribe otra.
   */
  const hayCambiosSinAplicar = useMemo(
    () => !sonIguales(borrador, aplicado) || semilla !== semillaAplicada,
    [borrador, aplicado, semilla, semillaAplicada],
  );

  /** Pide la traza de un escenario y la pone en pantalla. */
  const pedirTraza = useCallback(
    async (escenario, suSemilla) => {
      setError(null);
      setRecalculando(true);
      try {
        const respuesta = await cliente.pedir({ tipo: 'traza', escenario, semilla: suSemilla });
        setTraza(respuesta.traza);
      } catch (e) {
        // Un pedido descartado no es un fallo: alguien canceló o pidió otra
        // cosa. Se conserva la traza anterior (DEC-054).
        if (!fueDescartado(e)) {
          setError(e.message);
          setTraza(null);
        }
      } finally {
        setRecalculando(false);
      }
    },
    [cliente],
  );

/**
   * Al abrir se simula lo aplicado, sin pulsar nada (DEC-054).
   *
   * El guardado se **deshace al limpiar**, y eso no es un adorno: en modo de
   * desarrollo React monta, desmonta y vuelve a montar, y al desmontar se
   * termina el worker con el pedido en vuelo. Si el guardado sobreviviera al
   * remontaje —los `useRef` sobreviven—, el segundo montaje no volvería a
   * pedir y la pantalla se quedaría en «Preparando la simulación…» para
   * siempre. Deshaciéndolo, el segundo montaje pide de nuevo con un worker
   * nuevo. En producción solo hay un montaje y se pide una vez.
   */
  const arrancado = useRef(false);
  useEffect(() => {
    if (arrancado.current) return undefined;
    arrancado.current = true;
    if (problemasDelEscenario(aplicado).length === 0) pedirTraza(aplicado, semillaAplicada);
    return () => {
      arrancado.current = false;
    };
  }, [aplicado, semillaAplicada, pedirTraza]);

  const aplicarYRecalcular = useCallback(() => {
    if (problemasBorrador.length > 0) return;
    // Lo que esté pidiéndose ya no vale.
    cliente.descartarPendientes();
    setAplicado(borrador);
    setSemillaAplicada(semilla);
    pedirTraza(borrador, semilla);
  }, [borrador, semilla, problemasBorrador, cliente, pedirTraza]);

  const cancelarRecalculo = useCallback(() => {
    // Descartar deja la traza anterior en pantalla y el borrador como estaba.
    cliente.descartarPendientes();
    setRecalculando(false);
  }, [cliente]);

  const descartarCambios = useCallback(() => {
    setBorrador(aplicado);
    setSemilla(semillaAplicada);
  }, [aplicado, semillaAplicada]);

  const irALotes = useCallback(() => {
    window.location.hash = hashDeVista(VISTA.LOTES);
  }, []);

  const cambiarEnBorrador = useCallback(
    (ruta, valor) => setBorrador((previo) => cambiarCampo(previo, ruta, valor)),
    [],
  );
  const restablecerEnBorrador = useCallback(
    (ruta) => setBorrador((previo) => restablecerCampo(previo, ruta)),
    [],
  );
  const cambiarSituacion = useCallback((clave) => {
    if (!clave) return;
    setBorrador((previo) => aplicarSituacion(previo, clave));
  }, []);

  return (
    <div className="aplicacion">
      <BarraSuperior vista={vista} hayCambiosSinAplicar={hayCambiosSinAplicar} />

      <main className={`vista vista--${vista}`}>
        {vista === VISTA.SIMULACION && (
          <>
            <Advertencias />
            <VistaSimulacion
            traza={traza}
            escenarioAplicado={aplicado}
            borrador={borrador}
            alCambiar={cambiarEnBorrador}
            alRestablecer={restablecerEnBorrador}
            alAplicarSituacion={cambiarSituacion}
            alAplicar={aplicarYRecalcular}
            alDescartar={descartarCambios}
            hayCambiosSinAplicar={hayCambiosSinAplicar}
            problemas={problemasBorrador}
            recalculando={recalculando}
            alCancelar={cancelarRecalculo}
            error={error}
            semilla={semilla}
            alCambiarSemilla={setSemilla}
              alCorrerLotes={irALotes}
            />
          </>
        )}

        {vista === VISTA.LOTES && (
          <section className="vista-lotes">
            <Advertencias />
            <ModoLotes
              escenario={aplicado}
              cliente={cliente}
              ocupado={ocupado}
              setOcupado={setOcupado}
            />
          </section>
        )}

        {vista === VISTA.CONFIGURACION && (
          <section className="vista-configuracion">
            <div className="vista-configuracion__acciones">
              {problemasBorrador.length > 0 && (
                <div className="problemas" role="alert">
                  <strong>
                    Hay {problemasBorrador.length} cosa
                    {problemasBorrador.length === 1 ? '' : 's'} que corregir antes de aplicar.
                  </strong>
                </div>
              )}
              {hayCambiosSinAplicar && problemasBorrador.length === 0 && (
                <p className="panel-sin-aplicar" role="status">
                  Cambios sin aplicar
                </p>
              )}
              <button
                type="button"
                className="boton-principal"
                onClick={aplicarYRecalcular}
                disabled={problemasBorrador.length > 0 || !hayCambiosSinAplicar || recalculando}
              >
                {recalculando ? 'Recalculando…' : 'Aplicar y recalcular'}
              </button>
              <button
                type="button"
                onClick={descartarCambios}
                disabled={!hayCambiosSinAplicar || recalculando}
              >
                Descartar cambios
              </button>
            </div>

            <Formulario
              escenario={borrador}
              alCambiar={cambiarEnBorrador}
              alRestablecer={restablecerEnBorrador}
              alReemplazar={setBorrador}
            />
          </section>
        )}
      </main>
    </div>
  );
}
