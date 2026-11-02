import { CONTROLES, TIPOS_ORIGEN } from '../../config/catalogoParametros.js';
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

  /** Solo las etiquetas que advierten algo; las otras dos no se pintan. */
  const etiqueta =
    sensibilidad || campo.tipoOrigen === TIPOS_ORIGEN.SENSIBILIDAD
      ? TIPOS_ORIGEN.SENSIBILIDAD
      : campo.tipoOrigen === TIPOS_ORIGEN.SUPUESTO
        ? TIPOS_ORIGEN.SUPUESTO
        : null;

  return (
    <div className={`campo${modificado ? ' campo--modificado' : ''}`}>
      <div className="campo__cabecera">
        {/*
          El significado va como `title`: ayuda al pasar el cursor sin ocupar
          sitio (DEC-057). La explicación larga vive en `docs/parametros.md`.
        */}
        <label htmlFor={idCampo} title={campo.significado}>
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

      <Control campo={campo} escenario={escenario} valor={valor} idCampo={idCampo} alCambiar={alCambiar} />

      {/*
        De `tipoOrigen` solo se pintan las dos etiquetas que **advierten** algo
        (DEC-057): «Supuesto» y «Sensibilidad». «Medido en campo» y
        «Configuración» no añaden nada al usar el programa, así que no se
        muestran. `esSensibilidad` marca además los casos que lo son por el
        escenario y no por el parámetro (un conteo sustituto, el servicio de
        prueba).
      */}
      {etiqueta && <p className="campo__aviso">{etiqueta}</p>}
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
      {propia && (
        <p className="campo__meta">
          Escrita a mano.{' '}
          <button type="button" className="campo__restablecer" onClick={() => alCambiar(campo.ruta, null)}>
            volver al conteo
          </button>
        </p>
      )}
    </div>
  );
}

/** Tabla de umbrales: un valor por número de casetas abiertas. */
function TablaUmbrales({ campo, valor, alCambiar }) {
  const entradas = Object.entries(valor ?? {});
  /** Los umbrales de más de 5 casetas no se midieron: se extrapolan (DEC-031). */
  const hayExtrapolados = entradas.some(([clave]) => Number(clave) > 5);

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
      {/* Aviso funcional, y solo cuando de verdad hay valores extrapolados. */}
      {hayExtrapolados && (
        <p className="campo__aviso">Por encima de 5 casetas los valores son estimados.</p>
      )}
    </div>
  );
}
