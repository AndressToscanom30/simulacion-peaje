import { useEffect, useMemo, useRef, useState } from 'react';
import {
  construirEscenario,
  problemasDelEscenario,
  escenarioAJson,
} from './config/escenario.js';
import { cambiarCampo, restablecerCampo } from './ui/modeloFormulario.js';
import { crearClienteSimulacion } from './ui/worker/cliente.js';
import { guardarEscenario, leerEscenario } from './ui/almacen.js';
import { mediaGeneradaSegundos } from './config/escenario.js';
import { num } from './ui/formato.js';
import Formulario from './ui/componentes/Formulario.jsx';
import PanelSupuestos from './ui/componentes/PanelSupuestos.jsx';
import TiempoReal from './ui/componentes/TiempoReal.jsx';
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

export default function App() {
  const [escenario, setEscenario] = useState(escenarioInicial);
  const [pestana, setPestana] = useState('tiempoReal');
  const [semilla, setSemilla] = useState(1);
  const [traza, setTraza] = useState(null);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState(null);

  const clienteRef = useRef(null);
  if (!clienteRef.current) clienteRef.current = crearClienteSimulacion();
  const cliente = clienteRef.current;

  useEffect(() => () => cliente.terminar(), [cliente]);

  // Recordar la última configuración. Si no se puede, da igual (almacen.js).
  useEffect(() => {
    guardarEscenario(escenario);
  }, [escenario]);

  const listaProblemas = useMemo(() => problemasDelEscenario(escenario), [escenario]);
  const configuracionValida = listaProblemas.length === 0;

  const simularTraza = async () => {
    setError(null);
    setOcupado(true);
    try {
      const respuesta = await cliente.pedir({ tipo: 'traza', escenario, semilla });
      setTraza(respuesta.traza);
    } catch (e) {
      setError(e.message);
      setTraza(null);
    } finally {
      setOcupado(false);
    }
  };

  // Una configuración nueva invalida la traza: no se reproduce algo que ya no
  // corresponde a lo que el formulario muestra.
  useEffect(() => {
    setTraza(null);
  }, [escenario]);

  return (
    <main>
      <header>
        <h1>Peaje Los Acacios</h1>
        <p className="nota">
          Simulación de eventos discretos con cola única FIFO por sentido y{' '}
          {escenario.pozo.total} casetas de efectivo compartidas (entre{' '}
          {escenario.pozo.minimoPorSentido} y {escenario.pozo.maximoPorSentido} por sentido).
          Servicio gamma de media {num(mediaGeneradaSegundos(escenario.servicio), 2)} s. La
          visualización 3D es la fase 6.
        </p>
      </header>

      <PanelSupuestos />

      <nav className="pestanas">
        {[
          ['tiempoReal', 'Tiempo real'],
          ['lotes', 'Por lotes'],
          ['configuracion', 'Configuración'],
        ].map(([clave, titulo]) => (
          <button
            key={clave}
            type="button"
            className={pestana === clave ? 'activo' : undefined}
            onClick={() => setPestana(clave)}
          >
            {titulo}
          </button>
        ))}
      </nav>

      {!configuracionValida && (
        <div className="problemas" role="alert">
          <strong>La configuración tiene {listaProblemas.length} problema(s).</strong> Corrígelos en
          la pestaña Configuración antes de simular.
        </div>
      )}

      <div className="contenido">
        {pestana === 'tiempoReal' && (
          <TiempoReal
            traza={configuracionValida ? traza : null}
            escenario={escenario}
            semilla={semilla}
            alCambiarSemilla={setSemilla}
            alSimular={simularTraza}
            ocupado={ocupado}
            error={configuracionValida ? error : 'Arregla la configuración para poder simular.'}
          />
        )}

        {pestana === 'lotes' && (
          <ModoLotes
            escenario={escenario}
            cliente={cliente}
            ocupado={ocupado}
            setOcupado={setOcupado}
          />
        )}

        {pestana === 'configuracion' && (
          <Formulario
            escenario={escenario}
            alCambiar={(ruta, valor) => setEscenario((previo) => cambiarCampo(previo, ruta, valor))}
            alRestablecer={(ruta) => setEscenario((previo) => restablecerCampo(previo, ruta))}
            alReemplazar={setEscenario}
          />
        )}
      </div>

      <footer>
        <p className="nota">
          Escenario: <code>{escenario.nombre}</code> · {escenario.corridas.replicas} réplicas desde
          la semilla {escenario.corridas.primeraSemilla} ·{' '}
          {cliente.enWorker ? 'el motor corre en un Web Worker' : 'el motor corre en este hilo'}.
          El catálogo completo de parámetros está en <code>docs/parametros.md</code> y el formato de
          la traza en <code>docs/traza.md</code>.
        </p>
        <details>
          <summary>Ver el escenario en JSON</summary>
          <pre>{escenarioAJson(escenario)}</pre>
        </details>
      </footer>
    </main>
  );
}
