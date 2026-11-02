import { useEffect, useState } from 'react';
import { VELOCIDADES } from '../reloj.js';
import { horaDeInstante, instanteDeHora, relojSimulado } from '../formato.js';

/**
 * Barra de reproducción: iniciar y pausar, reinicio, velocidades, la barra de
 * tiempo y un campo para ir a una hora concreta.
 *
 * El campo de hora se refiere a la hora del **primer sentido**, que es la que
 * marca el reloj de la escena. Si los dos sentidos vienen de conteos de horas
 * distintas, al lado se muestra la hora equivalente del otro.
 */
export default function BarraReproduccion({
  instante,
  duracion,
  enMarcha,
  velocidad,
  conteos,
  alAlternar,
  alReiniciar,
  alCambiarVelocidad,
  alSaltar,
}) {
  const [velocidadPropia, setVelocidadPropia] = useState(30);
  const conteoPrincipal = conteos[0];
  const [horaEscrita, setHoraEscrita] = useState('');
  const [horaMal, setHoraMal] = useState(false);

  // Mientras no se esté escribiendo, el campo sigue al reloj.
  const horaDelReloj = horaDeInstante(conteoPrincipal, instante);
  useEffect(() => {
    setHoraEscrita(horaDelReloj ?? '');
    setHoraMal(false);
  }, [horaDelReloj]);

  const irALaHora = (texto) => {
    const segundos = instanteDeHora(texto, conteoPrincipal, duracion);
    if (segundos === null) {
      setHoraMal(true);
      return;
    }
    setHoraMal(false);
    alSaltar(segundos);
  };

  // La hora equivalente del otro sentido, cuando su conteo empieza a otra hora.
  const horasDeLosDemas = conteos
    .slice(1)
    .map((conteo, indice) => ({
      clave: conteo ?? `sentido-${indice + 1}`,
      hora: horaDeInstante(conteo, instante),
    }))
    .filter((x) => x.hora && x.hora !== horaDelReloj);

  return (
    <div className="barra-reproduccion">
      <div className="barra-reproduccion__botones">
        <button type="button" onClick={alAlternar}>
          {enMarcha ? '⏸ Pausa' : '▶ Iniciar'}
        </button>
        <button type="button" onClick={alReiniciar}>
          ⏮ Reinicio
        </button>
      </div>

      <span className="grupo-velocidad">
        Velocidad:
        {VELOCIDADES.map((v) => (
          <button
            key={v}
            type="button"
            className={velocidad === v ? 'activo' : undefined}
            onClick={() => alCambiarVelocidad(v)}
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
                alCambiarVelocidad(v);
              }
            }}
          />
          ×
        </label>
      </span>

      <input
        className="barra-reproduccion__tiempo"
        type="range"
        min="0"
        max={duracion}
        step="1"
        value={instante}
        aria-label="Saltar a un instante"
        onChange={(evento) => alSaltar(Number(evento.target.value))}
      />

      <span className="nota">
        {relojSimulado(instante)} de {relojSimulado(duracion)}
      </span>

      {horaDelReloj && (
        <span className="barra-reproduccion__hora">
          <label>
            Ir a la hora:
            <input
              type="text"
              inputMode="numeric"
              placeholder="hh:mm"
              size="5"
              value={horaEscrita}
              aria-invalid={horaMal || undefined}
              onChange={(evento) => {
                setHoraEscrita(evento.target.value);
                setHoraMal(false);
              }}
              onBlur={(evento) => irALaHora(evento.target.value)}
              onKeyDown={(evento) => {
                if (evento.key === 'Enter') {
                  evento.preventDefault();
                  irALaHora(evento.target.value);
                }
              }}
            />
          </label>
          {horasDeLosDemas.length > 0 && (
            <span className="nota">
              {horasDeLosDemas.map((x) => `· el otro sentido va por las ${x.hora}`).join(' ')}
            </span>
          )}
          {horaMal && (
            <span className="barra-reproduccion__error" role="alert">
              Esa hora está fuera de la hora simulada.
            </span>
          )}
        </span>
      )}
    </div>
  );
}
