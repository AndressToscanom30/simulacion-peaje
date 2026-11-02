import { conteos } from '../../config/datos.js';
import { enMinutos } from '../formato.js';
import EsquemaCasetas from './EsquemaCasetas.jsx';
import TablaMedidas from './TablaMedidas.jsx';
import { GraficoCola, GraficoCasetas, GraficoEspera } from './Graficos.jsx';

/**
 * Cajón plegable con los gráficos, el esquema de casetas y la tabla de medidas.
 *
 * Reutiliza los componentes que ya existían en la pestaña de tiempo real: aquí
 * solo cambian de sitio, porque la escena pasa a ser la página (DEC-053).
 *
 * @param {object} args
 * @param {boolean} args.abierto
 * @param {boolean} [args.principal] sin WebGL el cajón es el contenido
 *   principal, así que se dibuja sin el plegable.
 */
export default function CajonMedidas({
  traza,
  escenario,
  estado,
  instante,
  semilla,
  abierto,
  alAlternar,
  principal = false,
}) {
  if (!traza || !estado) return null;

  const etiquetas = traza.metadatos.sentidos.map((s) => s.etiqueta);
  const duracion = traza.metadatos.instanteFinalSegundos ?? 0;

  /** Lecturas de cola de campo: el total en espera por sentido (DEC-042). */
  const colaObservada = traza.metadatos.sentidos.map((sentido) => {
    const conteo = conteos[sentido.conteo];
    const propia = escenario.sentidos[sentido.id]?.llegadas !== null;
    return conteo && !propia
      ? { valores: conteo.cola, duracionIntervalo: traza.metadatos.duracionIntervaloSegundos }
      : {};
  });
  const hayObservada = colaObservada.some((s) => s.valores);

  const contenido = (
    <div className="cajon__contenido">
      <EsquemaCasetas pozo={estado.pozo} etiquetas={etiquetas} />

      <div className="graficos">
        <GraficoCola
          hitos={estado.hitos}
          instante={instante}
          etiquetas={etiquetas}
          colaObservada={colaObservada}
        />
        <GraficoCasetas
          hitos={estado.hitos}
          instante={instante}
          etiquetas={etiquetas}
          maximoPorSentido={traza.metadatos.maximoPorSentido}
        />
        <GraficoEspera
          series={traza.seriesPorIntervalo}
          instante={instante}
          duracionIntervalo={traza.metadatos.duracionIntervaloSegundos}
          metaSegundos={escenario.desempeno.metaWqSegundos}
          maximoSegundos={escenario.desempeno.maximoTolerableWqSegundos}
          etiquetas={etiquetas}
        />
      </div>

      {hayObservada && (
        <p className="etiqueta-sensibilidad">
          Los puntos huecos del gráfico de cola son las lecturas de campo: el{' '}
          <strong>total de vehículos esperando en el sentido</strong>, que es la misma
          variable que dibuja la curva simulada, así que las dos se{' '}
          <strong>comparan de frente</strong>. Son lecturas puntuales, una por
          intervalo de 5 min.
        </p>
      )}

      {instante >= duracion ? (
        <>
          <h3>Resultado de la réplica (semilla {semilla})</h3>
          <TablaMedidas medidas={traza.medidas} desempeno={escenario.desempeno} />
        </>
      ) : (
        <p className="nota">
          La tabla de medidas aparece al llegar al final de la reproducción (
          {enMinutos(duracion - instante, 1)} min simulados por delante).
        </p>
      )}
    </div>
  );

  if (principal) {
    return (
      <section className="cajon cajon--principal">
        <h2>Gráficos y medidas</h2>
        {contenido}
      </section>
    );
  }

  return (
    <section className={`cajon${abierto ? ' cajon--abierto' : ''}`}>
      <button
        type="button"
        className="cajon__tirador"
        onClick={alAlternar}
        aria-expanded={abierto}
      >
        {abierto ? '▾' : '▸'} Gráficos y medidas
      </button>
      {abierto && contenido}
    </section>
  );
}
