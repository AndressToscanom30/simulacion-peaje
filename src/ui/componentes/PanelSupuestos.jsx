import { SUPUESTOS } from '../modeloFormulario.js';

/**
 * Panel fijo con los tres supuestos no medidos de los que depende todo
 * resultado de esta simulación.
 *
 * No es decorativo: cualquier número que salga de la interfaz es condicional a
 * estos tres, y los tres empujan en la misma dirección (el modelo es optimista).
 */
export default function PanelSupuestos() {
  return (
    <aside className="supuestos" aria-labelledby="titulo-supuestos">
      <h2 id="titulo-supuestos">Supuestos y limitaciones</h2>
      <p className="nota">
        Todo lo que calcula esta pantalla es <strong>condicional a tres supuestos que no se
        midieron</strong>. Los tres empujan en la misma dirección, así que el modelo es optimista.
      </p>
      <ul>
        {SUPUESTOS.map((supuesto) => (
          <li key={supuesto.clave}>
            <strong>{supuesto.titulo}</strong> <code>{supuesto.clave}</code>
            <br />
            {supuesto.texto}
          </li>
        ))}
      </ul>
      <p className="nota">
        La cola que se compara con el campo es la <strong>fila más larga de una caseta</strong>,
        no el total del sentido (DEC-024): las dos series no son comparables de frente.
      </p>
    </aside>
  );
}
