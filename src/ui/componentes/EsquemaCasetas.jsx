import { num } from '../formato.js';

/**
 * Esquema 2D mínimo del estado de las casetas. **No es la visualización 3D**,
 * que es la fase 6: aquí solo se ve, de un vistazo, quién tiene cada caseta y
 * en qué estado está.
 */
const ESTADOS = {
  cerrada: { etiqueta: 'en el pozo', clase: 'caseta--cerrada' },
  reservada: { etiqueta: 'reservada', clase: 'caseta--reservada' },
  abierta: { etiqueta: 'abierta', clase: 'caseta--abierta' },
  marcada: { etiqueta: 'marcada para cerrar', clase: 'caseta--marcada' },
};

export default function EsquemaCasetas({ pozo, etiquetas }) {
  const estadoDe = (indice) => {
    if (pozo.marcada[indice]) return 'marcada';
    if (pozo.duenoDeCaseta[indice] !== null) return 'abierta';
    if (pozo.reservadaPara[indice] !== null) return 'reservada';
    return 'cerrada';
  };

  const duenoDe = (indice) => {
    const dueno = pozo.duenoDeCaseta[indice] ?? pozo.reservadaPara[indice];
    return dueno === null || dueno === undefined ? null : etiquetas[dueno];
  };

  return (
    <div className="esquema">
      <h3>Casetas del pozo ({pozo.total})</h3>
      <div className="esquema__casetas">
        {Array.from({ length: pozo.total }, (_, indice) => {
          const estado = estadoDe(indice);
          const dueno = duenoDe(indice);
          return (
            <div
              key={indice}
              className={`caseta ${ESTADOS[estado].clase}`}
              title={`Caseta ${indice}: ${ESTADOS[estado].etiqueta}${dueno ? ` · ${dueno}` : ''}`}
            >
              <span className="caseta__id">{indice}</span>
              <span className="caseta__dueno">{dueno ?? '—'}</span>
              <span className="caseta__estado">{ESTADOS[estado].etiqueta}</span>
            </div>
          );
        })}
      </div>
      <p className="nota">
        Libres en el pozo: <strong>{num(pozo.libres, 0)}</strong>
      </p>
    </div>
  );
}
