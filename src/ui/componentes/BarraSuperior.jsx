import { VISTAS, hashDeVista } from '../rutas.js';

/**
 * Barra superior fina: el nombre y las tres vistas (DEC-053).
 *
 * Los enlaces son `<a href="#/…">` de verdad, no botones: así atrás y adelante
 * del navegador funcionan sin librería de rutas (DEC-034).
 */
export default function BarraSuperior({ vista, hayCambiosSinAplicar }) {
  return (
    <header className="barra-superior">
      <span className="barra-superior__nombre">Peaje Los Acacios</span>

      <nav className="barra-superior__vistas" aria-label="Vistas">
        {VISTAS.map((v) => (
          <a
            key={v.clave}
            href={hashDeVista(v.clave)}
            className={v.clave === vista ? 'activo' : undefined}
            aria-current={v.clave === vista ? 'page' : undefined}
            title={v.descripcion}
          >
            {v.titulo}
          </a>
        ))}
      </nav>

      {hayCambiosSinAplicar && (
        <span className="barra-superior__aviso" role="status">
          Cambios sin aplicar
        </span>
      )}
    </header>
  );
}
