import { useState } from 'react';
import { ADVERTENCIAS, FRANJA } from '../modeloFormulario.js';

const CLAVE_ALMACEN = 'peaje-los-acacios:como-leer-abierto';

/** ¿Estaba abierto el panel la última vez? La primera vez, sí. */
function abiertoAlPrincipio() {
  try {
    const guardado = localStorage.getItem(CLAVE_ALMACEN);
    return guardado === null ? true : guardado === 'si';
  } catch {
    // Sin almacenamiento, se abre: es la primera vez de cada visita.
    return true;
  }
}

function recordar(abierto) {
  try {
    localStorage.setItem(CLAVE_ALMACEN, abierto ? 'si' : 'no');
  } catch {
    // Da igual: era comodidad.
  }
}

/**
 * Franja fija con lo único que hay que leer siempre, y un panel corto detrás
 * (DEC-057).
 *
 * Sustituye al panel de supuestos, que ocupaba la cabecera entera con tres
 * párrafos y su numeración interna. Lo que no se pierde son las cuatro
 * advertencias: viven en `ADVERTENCIAS`, se prueban desde ahí y se escriben en
 * lenguaje de usuario, sin citar decisiones ni documentos.
 */
export default function Advertencias() {
  const [abierto, setAbierto] = useState(abiertoAlPrincipio);

  const alternar = () => {
    setAbierto((previo) => {
      recordar(!previo);
      return !previo;
    });
  };

  return (
    <aside className="advertencias">
      <div className="advertencias__franja">
        <p>{FRANJA}</p>
        <button type="button" onClick={alternar} aria-expanded={abierto}>
          Cómo leer los resultados
        </button>
      </div>

      {abierto && (
        <ul className="advertencias__lista">
          {ADVERTENCIAS.map((texto) => (
            <li key={texto}>{texto}</li>
          ))}
        </ul>
      )}
    </aside>
  );
}
