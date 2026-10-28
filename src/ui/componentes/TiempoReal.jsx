import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { crearRelojReproduccion, VELOCIDADES } from '../reloj.js';
import { estadoEnInstante } from '../../motor/traza.js';
import { conteos } from '../../config/datos.js';
import { horaDelConteo, relojSimulado, num, enMinutos } from '../formato.js';
import EsquemaCasetas from './EsquemaCasetas.jsx';
import TablaMedidas from './TablaMedidas.jsx';
import { GraficoCola, GraficoCasetas, GraficoEspera } from './Graficos.jsx';

/**
 * Modo tiempo real: reproduce una traza ya grabada (DEC-033).
 *
 * El reloj de reproducción es puro y vive fuera de React; aquí solo se le
 * inyecta el tiempo real de cada fotograma y se vuelca su estado.
 */
export default function TiempoReal({ traza, escenario, semilla, alCambiarSemilla, alSimular, ocupado, error }) {
  const [velocidad, setVelocidad] = useState(VELOCIDADES[1]);
  const [velocidadPropia, setVelocidadPropia] = useState(30);
  const [instante, setInstante] = useState(0);
  const [enMarcha, setEnMarcha] = useState(false);

  const relojRef = useRef(null);
  const animacionRef = useRef(null);
  const ultimoRef = useRef(null);

  const duracion = traza?.metadatos.instanteFinalSegundos ?? 0;

  // Un reloj nuevo por traza: la duración cambia con ella.
  useEffect(() => {
    if (!traza) return;
    relojRef.current = crearRelojReproduccion({
      duracionSegundos: Math.max(duracion, 1),
      velocidad,
    });
    setInstante(0);
    setEnMarcha(false);
  }, [traza, duracion]); // eslint-disable-line react-hooks/exhaustive-deps

  const volcar = useCallback((estado) => {
    setInstante(estado.instante);
    setEnMarcha(estado.enMarcha);
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

  if (error) {
    return (
      <section>
        <h2>Tiempo real</h2>
        <div className="problemas" role="alert">
          {error}
        </div>
      </section>
    );
  }

  if (!traza) {
    return (
      <section>
        <h2>Tiempo real</h2>
        <p className="nota">
          Se corre una réplica completa y después se reproduce (DEC-033): así se puede pausar,
          rebobinar y saltar a cualquier instante.
        </p>
        <div className="barra">
          <label>
            Semilla:
            <input
              type="number"
              min="1"
              value={semilla}
              onChange={(evento) => alCambiarSemilla(Number.parseInt(evento.target.value, 10) || 1)}
            />
          </label>
          <button type="button" onClick={alSimular} disabled={ocupado}>
            {ocupado ? 'Simulando…' : 'Simular y reproducir'}
          </button>
        </div>
      </section>
    );
  }

  const etiquetas = traza.metadatos.sentidos.map((s) => s.etiqueta);
  const conteoDeLaHora = traza.metadatos.sentidos[0].conteo;
  const hora = horaDelConteo(conteoDeLaHora, instante);

  /** Lecturas de cola de campo, para superponerlas rotuladas (DEC-024). */
  const colaObservada = traza.metadatos.sentidos.map((sentido) => {
    const conteo = conteos[sentido.conteo];
    const propia = escenario.sentidos[sentido.id]?.llegadas !== null;
    return conteo && !propia
      ? { valores: conteo.cola, duracionIntervalo: traza.metadatos.duracionIntervaloSegundos }
      : {};
  });

  const hayObservada = colaObservada.some((s) => s.valores);

  return (
    <section>
      <h2>Tiempo real</h2>

      <div className="barra controles">
        <button type="button" onClick={() => volcar(relojRef.current.alternar())}>
          {enMarcha ? '⏸ Pausa' : '▶ Iniciar'}
        </button>
        <button type="button" onClick={() => volcar(relojRef.current.reiniciar())}>
          ⏮ Reinicio
        </button>

        <span className="grupo-velocidad">
          Velocidad:
          {VELOCIDADES.map((v) => (
            <button
              key={v}
              type="button"
              className={velocidad === v ? 'activo' : undefined}
              onClick={() => {
                setVelocidad(v);
                volcar(relojRef.current.cambiarVelocidad(v));
              }}
            >
              {v}×
            </button>
          ))}
          <label>
            otra:
            <input
              type="number"
              min="0.1"
              step="0.1"
              value={velocidadPropia}
              onChange={(evento) => {
                const v = Number.parseFloat(evento.target.value);
                if (v > 0) {
                  setVelocidadPropia(v);
                  setVelocidad(v);
                  volcar(relojRef.current.cambiarVelocidad(v));
                }
              }}
            />
            ×
          </label>
        </span>

        <label>
          Semilla:
          <input
            type="number"
            min="1"
            value={semilla}
            onChange={(evento) => alCambiarSemilla(Number.parseInt(evento.target.value, 10) || 1)}
          />
        </label>
        <button type="button" onClick={alSimular} disabled={ocupado}>
          {ocupado ? 'Simulando…' : 'Volver a simular'}
        </button>
      </div>

      <div className="barra reloj">
        <strong className="reloj__tiempo">
          t = {relojSimulado(instante)}
          {hora && <> · {hora}</>}
        </strong>
        <input
          type="range"
          min="0"
          max={duracion}
          step="1"
          value={instante}
          aria-label="Saltar a un instante"
          onChange={(evento) => volcar(relojRef.current.saltarA(Number(evento.target.value)))}
        />
        <span className="nota">de {relojSimulado(duracion)}</span>
      </div>

      <div className="estado-vivo">
        {estado.porSentido.map((s, i) => (
          <div key={s.etiqueta} className="estado-vivo__sentido">
            <h3>{s.etiqueta}</h3>
            <dl>
              <dt>En cola</dt>
              <dd className="grande">{num(s.cola, 0)}</dd>
              <dt>En servicio</dt>
              <dd>{num(s.enServicio, 0)}</dd>
              <dt>Atendidos</dt>
              <dd>{num(s.atendidos, 0)}</dd>
              <dt>Casetas abiertas</dt>
              <dd>{num(s.casetasAbiertas, 0)}</dd>
              <dt>Cola máxima hasta aquí</dt>
              <dd>{num(s.colaMaxima, 0)}</dd>
            </dl>
            {escenario.sentidos[i] && (
              <p className="nota">
                {escenario.sentidos[i].modo === 'regla' ? 'por regla' : 'programado'} ·{' '}
                {escenario.sentidos[i].conteo}
              </p>
            )}
          </div>
        ))}
      </div>

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
          Los puntos huecos del gráfico de cola son las lecturas de campo, que son la{' '}
          <strong>fila más larga de una caseta</strong>, no el total del sentido:{' '}
          <strong>no comparables directamente</strong> con la cola simulada (DEC-024).
        </p>
      )}

      {instante >= duracion && (
        <>
          <h3>Resultado de la réplica (semilla {semilla})</h3>
          <TablaMedidas medidas={traza.medidas} desempeno={escenario.desempeno} />
        </>
      )}

      {instante < duracion && (
        <p className="nota">
          La tabla de medidas aparece al llegar al final de la reproducción (
          {enMinutos(duracion - instante, 1)} min simulados por delante).
        </p>
      )}
    </section>
  );
}
