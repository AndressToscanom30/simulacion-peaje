import { useMemo } from 'react';
import { horaDelConteo, num, relojSimulado } from '../formato.js';
import { rhoEnInstante } from '../rho.js';

/**
 * Datos en vivo superpuestos a la escena: el reloj y, por sentido, la cola, los
 * que están en servicio, los atendidos y las casetas abiertas.
 *
 * Son los mismos datos que mostraba el estado en vivo de la pestaña de tiempo
 * real; aquí van encima de la escena porque la escena es la página (DEC-053).
 */
export default function Hud({ estado, instante, escenario, traza }) {
  const rhos = useMemo(() => (traza ? rhoEnInstante(traza, instante) : []), [traza, instante]);
  if (!estado || !traza) return null;

  const conteoDeLaHora = traza.metadatos.sentidos[0]?.conteo;
  const hora = horaDelConteo(conteoDeLaHora, instante);
  const rhoColapso = escenario.regla.rhoColapso;

  return (
    <div className="hud">
      <div className="hud__reloj">
        <strong>t = {relojSimulado(instante)}</strong>
        {hora && <span className="hud__hora">{hora}</span>}
      </div>

      <div className="hud__sentidos">
        {estado.porSentido.map((sentido, indice) => (
          <div key={sentido.etiqueta} className="hud__sentido">
            <h3>{sentido.etiqueta}</h3>
            <dl>
              <div>
                <dt>En cola</dt>
                <dd className="grande">{num(sentido.cola, 0)}</dd>
              </div>
              <div>
                <dt>ρ</dt>
                <dd>
                  {rhos[indice] === Infinity ? 'sin casetas' : num(rhos[indice])}
                  {rhos[indice] >= rhoColapso && (
                    <span className="hud__colapso" aria-label="Colapso">
                      {' '}▲ colapso
                    </span>
                  )}
                </dd>
              </div>
              <div>
                <dt>Cobrando</dt>
                <dd>{num(sentido.enServicio, 0)}</dd>
              </div>
              <div>
                <dt>Ya pasaron</dt>
                <dd>{num(sentido.atendidos, 0)}</dd>
              </div>
              <div>
                <dt>Casetas abiertas</dt>
                <dd>{num(sentido.casetasAbiertas, 0)}</dd>
              </div>
            </dl>
            {escenario.sentidos[indice] && (
              <p className="hud__nota">
                {escenario.sentidos[indice].modo === 'regla'
                  ? 'las casetas las decide la regla'
                  : 'las casetas las decide el operador'}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
