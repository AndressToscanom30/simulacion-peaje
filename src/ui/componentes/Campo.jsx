import { CONTROLES } from '../../config/catalogoParametros.js';
import {
  interpretarValor,
  leerRuta,
  opcionesDe,
  serieDelCampo,
  esSensibilidad,
  valorDelCampo,
} from '../modeloFormulario.js';
import { valorLegible } from '../formato.js';

/**
 * Un campo del formulario, generado a partir de su entrada del catálogo de
 * parámetros. No hay ningún campo escrito a mano (DEC-030).
 *
 * Muestra siempre unidad, valor por defecto, rango válido y de dónde sale el
 * parámetro, que es lo que hace falta para no configurar a ciegas.
 */
export default function Campo({ campo, escenario, valorBase, modificado, alCambiar, alRestablecer }) {
  // `valorDelCampo` y no `leerRuta`: los parámetros derivados no viven en el
  // escenario, se calculan (DEC-051).
  const valor = valorDelCampo(escenario, campo);
  const sensibilidad = esSensibilidad(campo, escenario);
  const idCampo = `campo-${campo.ruta}`;

  return (
    <div className={`campo${modificado ? ' campo--modificado' : ''}`}>
      <div className="campo__cabecera">
        <label htmlFor={idCampo}>
          {campo.nombreCompleto}
          {campo.unidad !== '—' && <span className="campo__unidad"> ({campo.unidad})</span>}
        </label>
        {modificado && (
          <button
            type="button"
            className="campo__restablecer"
            onClick={() => alRestablecer(campo.ruta)}
            title={`Volver al valor del escenario base: ${valorLegible(valorBase)}`}
          >
            restablecer
          </button>
        )}
      </div>

      {sensibilidad && (
        <p className="etiqueta-sensibilidad">
          Sensibilidad: no es una medición. Repórtalo siempre junto al caso base.
        </p>
      )}

      <Control campo={campo} escenario={escenario} valor={valor} idCampo={idCampo} alCambiar={alCambiar} />

      <p className="campo__ayuda">{campo.significado}</p>
      <p className="campo__meta">
        Por defecto <code>{valorLegible(valorBase)}</code> · Rango: {campo.rango} · {campo.origen}
      </p>
    </div>
  );
}

function Control({ campo, escenario, valor, idCampo, alCambiar }) {
  const cambiar = (crudo) => alCambiar(campo.ruta, interpretarValor(campo, crudo));

  switch (campo.control) {
    case CONTROLES.BOOLEANO:
      return (
        <input
          id={idCampo}
          type="checkbox"
          checked={Boolean(valor)}
          onChange={(evento) => alCambiar(campo.ruta, evento.target.checked)}
        />
      );

    case CONTROLES.CONTEO:
    case CONTROLES.MODO:
      return (
        <select id={idCampo} value={valor ?? ''} onChange={(evento) => cambiar(evento.target.value)}>
          {opcionesDe(campo).map((opcion) => (
            <option key={opcion.valor} value={opcion.valor} title={opcion.titulo}>
              {opcion.etiqueta}
            </option>
          ))}
        </select>
      );

    case CONTROLES.SERIE_INTERVALOS:
      return <SerieIntervalos campo={campo} escenario={escenario} valor={valor} alCambiar={alCambiar} />;

    case CONTROLES.TABLA_UMBRALES:
      return <TablaUmbrales campo={campo} valor={valor} alCambiar={alCambiar} />;

    case CONTROLES.TEXTO:
      return (
        <input
          id={idCampo}
          type="text"
          value={valor ?? ''}
          onChange={(evento) => cambiar(evento.target.value)}
        />
      );

    default:
      return (
        <input
          id={idCampo}
          type="number"
          value={valor ?? ''}
          min={campo.minimo}
          max={campo.maximo}
          step={campo.paso ?? (campo.control === CONTROLES.ENTERO ? 1 : 'any')}
          onChange={(evento) => cambiar(evento.target.value)}
        />
      );
  }
}

/** Doce valores editables, uno por intervalo de 5 min. */
function SerieIntervalos({ campo, escenario, valor, alCambiar }) {
  const { valores, propia } = serieDelCampo(escenario, campo);

  const cambiarUno = (indice, crudo) => {
    const numero = Number.parseFloat(String(crudo).replace(',', '.'));
    const siguientes = [...valores];
    siguientes[indice] = Number.isNaN(numero) ? 0 : numero;
    alCambiar(campo.ruta, siguientes);
  };

  return (
    <div className="serie">
      <div className="serie__valores">
        {valores.map((x, indice) => (
          <label key={indice} className="serie__celda">
            <span>{indice + 1}</span>
            <input
              type="number"
              min="0"
              value={x}
              aria-label={`${campo.nombreCompleto}, intervalo ${indice + 1}`}
              onChange={(evento) => cambiarUno(indice, evento.target.value)}
            />
          </label>
        ))}
      </div>
      <p className="campo__meta">
        {propia ? (
          <>
            Escrita a mano.{' '}
            <button type="button" className="campo__restablecer" onClick={() => alCambiar(campo.ruta, null)}>
              volver al conteo
            </button>
          </>
        ) : (
          <>Tomada del conteo. Al editar cualquier valor pasa a ser propia de este escenario.</>
        )}
      </p>
    </div>
  );
}

/** Tabla de umbrales: un valor por número de casetas abiertas. */
function TablaUmbrales({ campo, valor, alCambiar }) {
  const entradas = Object.entries(valor ?? {});

  const cambiarUno = (clave, crudo) => {
    const numero = Number.parseInt(crudo, 10);
    alCambiar(campo.ruta, { ...valor, [clave]: Number.isNaN(numero) ? null : numero });
  };

  return (
    <div className="serie">
      <div className="serie__valores">
        {entradas.map(([clave, umbral]) => (
          <label key={clave} className="serie__celda">
            <span>c={clave}</span>
            {umbral === null ? (
              <input type="text" value="—" disabled aria-label={`${campo.nombreCompleto}, c=${clave}: no aplica`} />
            ) : (
              <input
                type="number"
                min="0"
                value={umbral}
                aria-label={`${campo.nombreCompleto}, c=${clave}`}
                onChange={(evento) => cambiarUno(clave, evento.target.value)}
              />
            )}
          </label>
        ))}
      </div>
      <p className="campo__meta">
        Los valores de 1 a 5 casetas son los del estudio. Por encima de 5 son{' '}
        <strong>extrapolados</strong>: se calculan siguiendo la misma pauta, pero nadie los
        midió.
      </p>
    </div>
  );
}
