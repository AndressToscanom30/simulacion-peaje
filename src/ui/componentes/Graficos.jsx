/**
 * Gráficos en SVG escrito a mano (DEC-034).
 *
 * Son tres: la cola por sentido contra el tiempo, las casetas abiertas en
 * escalón, y la espera por intervalo con la meta y el máximo tolerable. Todos
 * se dibujan **hasta el instante reproducido**, no hasta el final de la traza.
 */

import { SEGUNDOS_POR_MINUTO } from '../../config/parametros.js';
import { num, enMinutos } from '../formato.js';

const ANCHO = 560;
const ALTO = 180;
const MARGEN = { arriba: 12, derecha: 12, abajo: 26, izquierda: 38 };
const COLORES = ['var(--serie-1)', 'var(--serie-2)'];

const areaAncho = ANCHO - MARGEN.izquierda - MARGEN.derecha;
const areaAlto = ALTO - MARGEN.arriba - MARGEN.abajo;

/** Marco común: ejes, rejilla y etiquetas. */
function Marco({ titulo, maximoY, maximoX, etiquetaY, children, leyenda }) {
  const marcasY = [0, 0.25, 0.5, 0.75, 1].map((f) => f * maximoY);
  const marcasX = [0, 0.25, 0.5, 0.75, 1].map((f) => f * maximoX);

  return (
    <figure className="grafico">
      <figcaption>
        {titulo}
        {leyenda && <span className="leyenda">{leyenda}</span>}
      </figcaption>
      <svg viewBox={`0 0 ${ANCHO} ${ALTO}`} role="img" aria-label={titulo}>
        {marcasY.map((valor, i) => {
          const y = MARGEN.arriba + areaAlto - (valor / (maximoY || 1)) * areaAlto;
          return (
            <g key={i}>
              <line x1={MARGEN.izquierda} y1={y} x2={ANCHO - MARGEN.derecha} y2={y} className="rejilla" />
              <text x={MARGEN.izquierda - 6} y={y + 4} className="eje" textAnchor="end">
                {num(valor, maximoY >= 10 ? 0 : 1)}
              </text>
            </g>
          );
        })}
        {marcasX.map((valor, i) => {
          const x = MARGEN.izquierda + (valor / (maximoX || 1)) * areaAncho;
          return (
            <text key={i} x={x} y={ALTO - 8} className="eje" textAnchor="middle">
              {num(valor / SEGUNDOS_POR_MINUTO, 0)}
            </text>
          );
        })}
        <text x={2} y={10} className="eje">
          {etiquetaY}
        </text>
        <text x={ANCHO - MARGEN.derecha} y={ALTO - 8} className="eje" textAnchor="end">
          min
        </text>
        {children}
      </svg>
    </figure>
  );
}

const escalaX = (t, maximoX) => MARGEN.izquierda + (t / (maximoX || 1)) * areaAncho;
const escalaY = (v, maximoY) => MARGEN.arriba + areaAlto - (v / (maximoY || 1)) * areaAlto;

/**
 * Cola por sentido contra el tiempo, dibujada hasta `instante`.
 *
 * En los escenarios de conteo superpone la cola observada, que son las lecturas
 * de campo. Va rotulada: **no es comparable de frente** (DEC-024).
 */
export function GraficoCola({ hitos, instante, etiquetas, colaObservada }) {
  const visibles = hitos.filter((h) => h.t <= instante);
  const maximoX = Math.max(instante, 1);
  const maximoCola = Math.max(
    5,
    ...visibles.flatMap((h) => h.colas),
    ...(colaObservada ?? []).flatMap((serie) => serie.valores ?? []),
  );

  return (
    <Marco
      titulo="Cola por sentido"
      maximoY={maximoCola}
      maximoX={maximoX}
      etiquetaY="veh"
      leyenda={etiquetas.map((e, i) => (
        <span key={e} style={{ color: COLORES[i] }}>
          ■ {e}
        </span>
      ))}
    >
      {etiquetas.map((_, sentido) => (
        <polyline
          key={sentido}
          fill="none"
          stroke={COLORES[sentido]}
          strokeWidth="1.6"
          points={visibles.map((h) => `${escalaX(h.t, maximoX)},${escalaY(h.colas[sentido], maximoCola)}`).join(' ')}
        />
      ))}

      {(colaObservada ?? []).map((serie, sentido) =>
        serie.valores
          ? serie.valores.map((valor, intervalo) => {
              const t = (intervalo + 0.5) * serie.duracionIntervalo;
              if (t > instante) return null;
              return (
                <circle
                  key={`${sentido}-${intervalo}`}
                  cx={escalaX(t, maximoX)}
                  cy={escalaY(valor, maximoCola)}
                  r="3"
                  className="observado"
                  stroke={COLORES[sentido]}
                />
              );
            })
          : null,
      )}
    </Marco>
  );
}

/** Casetas abiertas por sentido, en escalón. */
export function GraficoCasetas({ hitos, instante, etiquetas, maximoPorSentido }) {
  const visibles = hitos.filter((h) => h.t <= instante);
  const maximoX = Math.max(instante, 1);
  const maximoY = maximoPorSentido + 1;

  /** Escalón: cada punto se mantiene hasta el siguiente. */
  const puntosEscalon = (sentido) => {
    const puntos = [];
    let anterior = null;
    for (const h of visibles) {
      const valor = h.casetas[sentido];
      if (anterior !== null) puntos.push(`${escalaX(h.t, maximoX)},${escalaY(anterior, maximoY)}`);
      puntos.push(`${escalaX(h.t, maximoX)},${escalaY(valor, maximoY)}`);
      anterior = valor;
    }
    if (anterior !== null) puntos.push(`${escalaX(instante, maximoX)},${escalaY(anterior, maximoY)}`);
    return puntos.join(' ');
  };

  return (
    <Marco
      titulo="Casetas abiertas por sentido"
      maximoY={maximoY}
      maximoX={maximoX}
      etiquetaY="casetas"
      leyenda={etiquetas.map((e, i) => (
        <span key={e} style={{ color: COLORES[i] }}>
          ■ {e}
        </span>
      ))}
    >
      {etiquetas.map((_, sentido) => (
        <polyline key={sentido} fill="none" stroke={COLORES[sentido]} strokeWidth="1.6" points={puntosEscalon(sentido)} />
      ))}
    </Marco>
  );
}

/** Espera por intervalo, con la meta y el máximo tolerable como referencias. */
export function GraficoEspera({ series, instante, duracionIntervalo, metaSegundos, maximoSegundos, etiquetas }) {
  const intervalos = series[0]?.wqSegundos.length ?? 0;
  const maximoX = intervalos * duracionIntervalo;
  const intervaloActual = Math.min(Math.floor(instante / duracionIntervalo), intervalos - 1);
  const maximoY = Math.max(
    maximoSegundos * 1.3,
    ...series.flatMap((s) => s.wqSegundos.slice(0, intervaloActual + 1).filter((x) => x !== null)),
  );

  const anchoBarra = (areaAncho / intervalos) * 0.36;

  return (
    <Marco
      titulo="Espera media por intervalo"
      maximoY={maximoY}
      maximoX={maximoX}
      etiquetaY="s"
      leyenda={
        <>
          <span className="ref-meta">— meta {enMinutos(metaSegundos, 1)} min</span>{' '}
          <span className="ref-max">— máximo {enMinutos(maximoSegundos, 1)} min</span>
        </>
      }
    >
      <line
        x1={MARGEN.izquierda}
        y1={escalaY(metaSegundos, maximoY)}
        x2={ANCHO - MARGEN.derecha}
        y2={escalaY(metaSegundos, maximoY)}
        className="ref-meta"
      />
      <line
        x1={MARGEN.izquierda}
        y1={escalaY(maximoSegundos, maximoY)}
        x2={ANCHO - MARGEN.derecha}
        y2={escalaY(maximoSegundos, maximoY)}
        className="ref-max"
      />
      {series.map((serie, sentido) =>
        serie.wqSegundos.map((wq, intervalo) => {
          if (wq === null || intervalo > intervaloActual) return null;
          const centro = (intervalo + 0.5) * duracionIntervalo;
          const x = escalaX(centro, maximoX) + (sentido === 0 ? -anchoBarra : 0);
          const y = escalaY(wq, maximoY);
          return (
            <rect
              key={`${sentido}-${intervalo}`}
              x={x}
              y={y}
              width={anchoBarra}
              height={Math.max(1, MARGEN.arriba + areaAlto - y)}
              fill={COLORES[sentido]}
              opacity="0.85"
            >
              <title>{`${etiquetas[sentido]}, intervalo ${intervalo + 1}: ${enMinutos(wq)} min`}</title>
            </rect>
          );
        }),
      )}
    </Marco>
  );
}
