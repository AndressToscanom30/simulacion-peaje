import { useState } from 'react';
import {
  camposDelFormulario,
  leerRuta,
  problemas,
  rutasModificadas,
  restablecerTodo,
} from '../modeloFormulario.js';
import { construirEscenario, escenarioAJson, escenarioDesdeJson } from '../../config/escenario.js';
import { catalogoFase4, etiquetaRegimen, REGIMENES } from '../../config/escenarios.js';
import Campo from './Campo.jsx';

const ESCENARIO_COMPLETO_BASE = construirEscenario();

/** Un escenario de arranque por código del catálogo, sin repetir regímenes. */
function puntosDePartida() {
  const vistos = new Set();
  return catalogoFase4().filter((caso) => {
    const clave = `${caso.codigo}|${caso.regimen}`;
    if (vistos.has(clave)) return false;
    vistos.add(clave);
    return true;
  });
}

/**
 * Formulario de configuración. Los campos **se generan** desde el catálogo de
 * parámetros (DEC-030); aquí solo se decide el orden de las secciones y cómo se
 * presentan.
 */
export default function Formulario({ escenario, alCambiar, alRestablecer, alReemplazar }) {
  const [textoJson, setTextoJson] = useState('');
  const [errorJson, setErrorJson] = useState(null);
  const [seccionAbierta, setSeccionAbierta] = useState('demanda');

  const secciones = camposDelFormulario(escenario);
  const modificadas = rutasModificadas(escenario);
  const listaProblemas = problemas(escenario);

  const importar = () => {
    try {
      alReemplazar(escenarioDesdeJson(textoJson));
      setErrorJson(null);
    } catch (error) {
      setErrorJson(error.message);
    }
  };

  const exportar = () => setTextoJson(escenarioAJson(escenario));

  return (
    <section className="formulario">
      <h2>Configuración</h2>

      <div className="barra">
        <label>
          Partir de un escenario del catálogo:
          <select
            defaultValue=""
            onChange={(evento) => {
              const elegido = puntosDePartida().find((c) => `${c.codigo}|${c.regimen}` === evento.target.value);
              if (elegido) alReemplazar(construirEscenario({}, elegido.escenario));
            }}
          >
            <option value="">— elegir —</option>
            {['E1', 'E2', 'E3', 'E4', 'E5'].map((grupo) => (
              <optgroup key={grupo} label={grupo}>
                {puntosDePartida()
                  .filter((c) => c.grupo === grupo)
                  .map((c) => (
                    <option key={`${c.codigo}|${c.regimen}`} value={`${c.codigo}|${c.regimen}`}>
                      {c.nombre} · {c.regimen}
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
        </label>

        <label>
          Régimen de servicio:
          <select
            value={escenario.servicio.regimen === 'base' ? 'base' : 'lento'}
            onChange={(evento) => alReemplazar(construirEscenario({ servicio: REGIMENES[evento.target.value].servicio }, escenario))}
          >
            {Object.keys(REGIMENES).map((clave) => (
              <option key={clave} value={clave}>
                {etiquetaRegimen(clave)}
              </option>
            ))}
          </select>
        </label>

        <button type="button" onClick={() => alReemplazar(restablecerTodo())}>
          Restablecer todo
        </button>
      </div>

      {escenario.servicio.regimen !== 'base' && (
        <p className="etiqueta-sensibilidad">
          Régimen de <strong>sensibilidad</strong> ({escenario.servicio.regimen}): es una hipótesis,
          no una medición (DEC-025, PEN-010). Repórtalo siempre junto al caso base.
        </p>
      )}

      <p className="nota">
        {modificadas.size === 0 ? (
          <>Igual al escenario base.</>
        ) : (
          <>
            <strong>{modificadas.size}</strong> parámetro(s) distintos del escenario base, marcados
            en amarillo.
          </>
        )}
      </p>

      {listaProblemas.length > 0 && (
        <div className="problemas" role="alert">
          <strong>
            {listaProblemas.length} problema(s) en la configuración. No se puede simular así:
          </strong>
          <ul>
            {listaProblemas.map((mensaje) => (
              <li key={mensaje}>{mensaje}</li>
            ))}
          </ul>
        </div>
      )}

      {secciones.map((seccion) => (
        <details
          key={seccion.clave}
          open={seccionAbierta === seccion.clave}
          onToggle={(evento) => evento.target.open && setSeccionAbierta(seccion.clave)}
        >
          <summary>
            {seccion.titulo}
            {seccion.campos.some((c) => modificadas.has(c.ruta)) && <span className="punto-modificado" />}
          </summary>
          <div className="campos">
            {seccion.campos.map((campo) => (
              <Campo
                key={campo.id}
                campo={campo}
                escenario={escenario}
                valorBase={leerRuta(ESCENARIO_COMPLETO_BASE, campo.ruta)}
                modificado={modificadas.has(campo.ruta)}
                alCambiar={alCambiar}
                alRestablecer={alRestablecer}
              />
            ))}
          </div>
        </details>
      ))}

      <details>
        <summary>Importar y exportar JSON</summary>
        <div className="json">
          <textarea
            value={textoJson}
            rows={10}
            spellCheck={false}
            aria-label="JSON del escenario"
            onChange={(evento) => setTextoJson(evento.target.value)}
            placeholder="Pega aquí un escenario en JSON, o pulsa Exportar para ver el actual."
          />
          <div className="barra">
            <button type="button" onClick={exportar}>
              Exportar el actual
            </button>
            <button type="button" onClick={importar} disabled={textoJson.trim() === ''}>
              Importar
            </button>
          </div>
          {errorJson && (
            <div className="problemas" role="alert">
              {errorJson}
            </div>
          )}
        </div>
      </details>
    </section>
  );
}
