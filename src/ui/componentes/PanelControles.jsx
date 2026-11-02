import { useMemo } from 'react';
import { camposDelPanel, rutasModificadas, valorDelCampo } from '../modeloFormulario.js';
import { construirEscenario } from '../../config/escenario.js';
import { listaDeSituaciones, situacionDe, diaYHoraDeSentidos, horasDistintas } from '../../config/situaciones.js';
import { lambdasVehHora, muVehHora, RUTA_PROMEDIO_ATENCION } from '../../config/derivados.js';
import { num } from '../formato.js';
import Campo from './Campo.jsx';

const BASE = construirEscenario();

/**
 * Secciones del panel, en el orden en que se ven. Cada una toma sus campos de
 * `camposDelPanel` filtrando por ruta: **no hay campos escritos a mano**
 * (DEC-050).
 */
const SECCIONES = [
  {
    clave: 'demanda',
    titulo: 'Cuánto tráfico llega',
    rutas: (campo) => campo.ruta.endsWith('factorDemanda'),
  },
  {
    clave: 'servicio',
    titulo: 'Cuánto tarda cada cobro',
    rutas: (campo) => campo.ruta === RUTA_PROMEDIO_ATENCION,
  },
  {
    clave: 'regla',
    titulo: 'Cuándo abrir y cerrar casetas',
    rutas: (campo) => campo.ruta.startsWith('regla.'),
  },
];

/**
 * Panel de controles de la vista de simulación (DEC-053, DEC-054).
 *
 * Edita el **borrador**, no el escenario aplicado: nada de lo que se toque aquí
 * cambia lo que se está viendo hasta pulsar «Aplicar y recalcular».
 */
export default function PanelControles({
  borrador,
  aplicado,
  alCambiar,
  alRestablecer,
  alAplicarSituacion,
  alAplicar,
  alDescartar,
  hayCambiosSinAplicar,
  problemas,
  recalculando,
  semilla,
  alCambiarSemilla,
  alCorrerLotes,
  alVerSupuestos,
}) {
  const campos = useMemo(() => camposDelPanel(borrador), [borrador]);
  const modificadas = useMemo(() => rutasModificadas(borrador), [borrador]);
  const lambdas = useMemo(() => lambdasVehHora(borrador), [borrador]);
  const mu = useMemo(() => muVehHora(borrador), [borrador]);
  const dias = useMemo(() => diaYHoraDeSentidos(borrador), [borrador]);

  const situacionActual = situacionDe(borrador);
  const situaciones = listaDeSituaciones();
  const elegida = situaciones.find((s) => s.clave === situacionActual) ?? null;
  const sinAplicarPorSituacion = situacionDe(aplicado) !== situacionActual;

  const puedeAplicar = problemas.length === 0 && hayCambiosSinAplicar && !recalculando;

  return (
    <div className="panel-controles">
      <div className="panel-controles__cuerpo">
        {/* ------------------------------------------------- 1. situación --- */}
        <section className="panel-seccion">
          <h3>Qué día y a qué hora</h3>

          <label className="panel-campo">
            <span>Situación</span>
            <select
              value={situacionActual ?? ''}
              onChange={(evento) => alAplicarSituacion(evento.target.value)}
            >
              {!situacionActual && <option value="">(configuración propia)</option>}
              {situaciones.map((s) => (
                <option key={s.clave} value={s.clave}>
                  {s.titulo}
                </option>
              ))}
            </select>
          </label>

          {elegida ? (
            <>
              <p className="panel-nota">{elegida.descripcion}</p>
              <p className="panel-aviso" role="note">
                {elegida.aviso}
              </p>
            </>
          ) : (
            <p className="panel-nota">
              Los conteos de los dos sentidos no son de ninguna de las situaciones
              preparadas. Es una configuración propia, hecha en la configuración avanzada.
            </p>
          )}

          <dl className="panel-dias">
            {dias.map((dia) => (
              <div key={dia.etiqueta}>
                <dt>{dia.etiqueta}</dt>
                <dd>
                  {dia.horaInicio ? `desde las ${dia.horaInicio}` : 'sin hora'}
                  <span className="panel-nota"> · {dia.etiquetaConteo}</span>
                </dd>
              </div>
            ))}
          </dl>

          {horasDistintas(borrador) && (
            <p className="panel-aviso" role="note">
              Los dos sentidos vienen de conteos tomados a horas distintas, así que no son
              una foto simultánea del peaje.
            </p>
          )}
        </section>

        {/* ------------------------------- 2 a 4: campos del catálogo ------ */}
        {SECCIONES.map((seccion) => {
          const suyos = campos.filter(seccion.rutas);
          if (suyos.length === 0) return null;
          return (
            <section key={seccion.clave} className="panel-seccion">
              <h3>{seccion.titulo}</h3>

              {suyos.map((campo, indice) => (
                <div key={campo.id} className="panel-campo-derivado">
                  <Campo
                    campo={campo}
                    escenario={borrador}
                    valorBase={valorDelCampo(BASE, campo)}
                    modificado={modificadas.has(campo.ruta)}
                    alCambiar={alCambiar}
                    alRestablecer={alRestablecer}
                  />

                  {/* Lo que resulta de ese campo, en solo lectura. */}
                  {seccion.clave === 'demanda' && (
                    <p className="panel-resultado">
                      Llegan <strong>{num(lambdas[indice], 0)}</strong> vehículos por hora
                    </p>
                  )}
                  {seccion.clave === 'servicio' && (
                    <p className="panel-resultado">
                      Cada caseta atiende <strong>{num(mu, 0)}</strong> vehículos por hora
                    </p>
                  )}
                </div>
              ))}
            </section>
          );
        })}

        {/* --------------------------------------------------- avanzado ---- */}
        <details className="panel-seccion panel-avanzado">
          <summary>Avanzado</summary>
          <label className="panel-campo">
            <span>Semilla del azar</span>
            <input
              type="number"
              min="1"
              value={semilla}
              onChange={(evento) =>
                alCambiarSemilla(Number.parseInt(evento.target.value, 10) || 1)
              }
            />
          </label>
          <p className="panel-nota">
            Con la misma semilla la simulación sale igual. Cambiarla también hace falta
            aplicar.
          </p>
          <button type="button" className="boton-texto" onClick={alVerSupuestos}>
            Ver supuestos y limitaciones
          </button>
        </details>
      </div>

      {/* ----------------------------------------------------- acciones ---- */}
      <div className="panel-controles__acciones">
        {problemas.length > 0 && (
          <div className="problemas" role="alert">
            <strong>
              Hay {problemas.length} cosa{problemas.length === 1 ? '' : 's'} que corregir:
            </strong>
            <ul>
              {problemas.map((problema) => (
                <li key={problema}>{problema}</li>
              ))}
            </ul>
          </div>
        )}

        {hayCambiosSinAplicar && problemas.length === 0 && (
          <p className="panel-sin-aplicar" role="status">
            Cambios sin aplicar
            {sinAplicarPorSituacion && ', incluida la situación'}
          </p>
        )}

        <div className="panel-botones">
          <button type="button" className="boton-principal" onClick={alAplicar} disabled={!puedeAplicar}>
            {recalculando ? 'Recalculando…' : 'Aplicar y recalcular'}
          </button>
          <button
            type="button"
            onClick={alDescartar}
            disabled={!hayCambiosSinAplicar || recalculando}
          >
            Descartar cambios
          </button>
        </div>

        <button
          type="button"
          onClick={alCorrerLotes}
          disabled={hayCambiosSinAplicar}
          title={
            hayCambiosSinAplicar
              ? 'Aplica los cambios primero'
              : 'Abre el estudio por lotes con esta configuración'
          }
        >
          Correr 30 réplicas con esta configuración
        </button>
        {hayCambiosSinAplicar && <p className="panel-nota">Aplica los cambios primero.</p>}
      </div>
    </div>
  );
}
