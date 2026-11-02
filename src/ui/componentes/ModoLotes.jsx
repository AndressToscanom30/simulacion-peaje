import { useMemo, useState } from 'react';
import { catalogoFase4, etiquetaRegimen, GRUPOS_LOTES } from '../../config/escenarios.js';
import { num, enMinutos, porcentaje, aCsv } from '../formato.js';

/** Columnas de la tabla de resultados, las mismas de `docs/resultados/`. */
const COLUMNAS = [
  { clave: 'nombre', titulo: 'Escenario', valor: (f) => f.nombre },
  { clave: 'regimen', titulo: 'Servicio', valor: (f) => f.regimen },
  { clave: 'sentido', titulo: 'Sentido', valor: (f) => f.sentido },
  { clave: 'wq', titulo: 'Wq (min)', valor: (f) => enMinutos(f.wq) },
  { clave: 'wqIc', titulo: '± IC 95 %', valor: (f) => enMinutos(f.wqIc) },
  { clave: 'sobreMaximo', titulo: '% int. > máx.', valor: (f) => porcentaje(f.sobreMaximo) },
  { clave: 'colaMuestreada', titulo: 'Cola máx. muestr.', valor: (f) => num(f.colaMuestreada, 1) },
  { clave: 'colaContinua', titulo: 'Cola máx. cont.', valor: (f) => num(f.colaContinua, 1) },
  { clave: 'carriles', titulo: 'Carriles-int.', valor: (f) => num(f.carriles, 2) },
  { clave: 'cambios', titulo: 'Cambios de c', valor: (f) => num(f.cambios, 1) },
  { clave: 'cumple', titulo: 'Cumple', valor: (f) => (f.cumple ? 'sí' : 'no') },
];

/** Aplana un resultado del lote en una fila por sentido más la del peaje. */
function filasDe(resultado) {
  const filas = resultado.resumen.sentidos.map((s, i) => ({
    clave: `${resultado.codigo}-${resultado.regimen}-${i}`,
    nombre: resultado.nombre,
    regimen: resultado.regimen,
    sentido: s.etiqueta,
    wq: s.escalares.wqHoraSegundos.media,
    wqIc: s.escalares.wqHoraSegundos.semiamplitudIc95,
    sobreMaximo: s.escalares.fraccionIntervalosSobreUmbral.media,
    colaMuestreada: s.escalares.colaMaximaMuestreada.media,
    colaContinua: s.escalares.colaMaximaContinua.media,
    carriles: s.escalares.carrilesIntervalo.media,
    cambios: s.escalares.cambiosDeC.media,
    cumple: resultado.cumplimiento.porSentido[i].cumpleTodo,
  }));

  const t = resultado.resumen.total;
  filas.push({
    clave: `${resultado.codigo}-${resultado.regimen}-peaje`,
    nombre: resultado.nombre,
    regimen: resultado.regimen,
    sentido: 'peaje',
    esPeaje: true,
    wq: t.wqHoraSegundos.media,
    wqIc: t.wqHoraSegundos.semiamplitudIc95,
    sobreMaximo: t.fraccionIntervalosSobreUmbral.media,
    colaMuestreada: t.sumaColaMaximaMuestreada.media,
    colaContinua: t.sumaColaMaximaContinua.media,
    carriles: t.carrilesIntervalo.media,
    cambios: t.cambiosDeC.media,
    cumple: resultado.cumplimiento.mediaCumple,
  });

  return filas;
}

/** Baja un archivo generado en el navegador. */
function descargar(nombre, contenido, tipo) {
  const url = URL.createObjectURL(new Blob([contenido], { type: tipo }));
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombre;
  enlace.click();
  URL.revokeObjectURL(url);
}

/**
 * Modo por lotes: varias réplicas de varios escenarios, con progreso,
 * cancelación, comparación contra una referencia y exportación.
 */
export default function ModoLotes({ escenario, cliente, ocupado, setOcupado }) {
  const catalogo = useMemo(() => catalogoFase4(), []);
  const [seleccionados, setSeleccionados] = useState(['E2a']);
  const [incluirActual, setIncluirActual] = useState(false);
  const [regimenes, setRegimenes] = useState(['base', 'lento']);
  const [replicas, setReplicas] = useState(30);
  const [progreso, setProgreso] = useState(null);
  const [resultados, setResultados] = useState(null);
  const [referencia, setReferencia] = useState('');
  const [error, setError] = useState(null);

  /** Códigos del catálogo, sin repetir por régimen. */
  const codigos = useMemo(() => {
    const vistos = new Map();
    for (const caso of catalogo) {
      if (!vistos.has(caso.codigo)) vistos.set(caso.codigo, caso);
    }
    return [...vistos.values()];
  }, [catalogo]);

  const correr = async () => {
    setError(null);
    setOcupado(true);
    setProgreso({ hechos: 0, total: 0 });

    const elegidos = catalogo.filter(
      (caso) => seleccionados.includes(caso.codigo) && regimenes.includes(caso.regimen),
    );
    if (incluirActual) {
      for (const regimen of regimenes) {
        elegidos.push({
          grupo: 'actual',
          codigo: `actual-${regimen}`,
          nombre: `Configuración actual (${escenario.nombre})`,
          cambia: 'lo que esté en el formulario',
          regimen,
          escenario,
        });
      }
    }

    try {
      const respuesta = await cliente.pedir(
        { tipo: 'lote', escenarios: elegidos, replicas },
        (p) => setProgreso(p),
      );
      setResultados(respuesta.resultados ?? []);
      if (respuesta.tipo === 'cancelado') setError('Corrida cancelada.');
    } catch (e) {
      setError(e.message);
    } finally {
      setOcupado(false);
      setProgreso(null);
    }
  };

  const filas = resultados ? resultados.flatMap(filasDe) : [];
  const filaReferencia = filas.find((f) => f.esPeaje && `${f.nombre}|${f.regimen}` === referencia);

  return (
    <section>
      <h2>Corrida por lotes</h2>

      <div className="barra">
        <label>
          Réplicas:
          <input
            type="number"
            min="1"
            max="200"
            value={replicas}
            onChange={(evento) => setReplicas(Math.max(1, Number.parseInt(evento.target.value, 10) || 1))}
          />
        </label>
        {['base', 'lento'].map((regimen) => (
          <label key={regimen}>
            <input
              type="checkbox"
              checked={regimenes.includes(regimen)}
              onChange={(evento) =>
                setRegimenes((previos) =>
                  evento.target.checked ? [...previos, regimen] : previos.filter((r) => r !== regimen),
                )
              }
            />
            {etiquetaRegimen(regimen)}
          </label>
        ))}
        <label>
          <input
            type="checkbox"
            checked={incluirActual}
            onChange={(evento) => setIncluirActual(evento.target.checked)}
          />
          Incluir la configuración actual
        </label>
      </div>

      <details open>
        <summary>Escenarios del catálogo ({seleccionados.length} elegidos)</summary>
        <div className="lista-escenarios">
          {GRUPOS_LOTES.map((grupo) => (
            <fieldset key={grupo.codigo}>
              <legend title={grupo.descripcion}>{grupo.titulo}</legend>
              {codigos
                .filter((caso) => caso.grupo === grupo.codigo)
                .map((caso) => (
                  <label key={caso.codigo}>
                    <input
                      type="checkbox"
                      checked={seleccionados.includes(caso.codigo)}
                      onChange={(evento) =>
                        setSeleccionados((previos) =>
                          evento.target.checked
                            ? [...previos, caso.codigo]
                            : previos.filter((c) => c !== caso.codigo),
                        )
                      }
                    />
                    <span title={caso.cambiaUsuario}>{caso.nombreUsuario ?? caso.nombre}</span>
                  </label>
                ))}
            </fieldset>
          ))}
        </div>
      </details>

      <div className="barra">
        <button type="button" onClick={correr} disabled={ocupado || (seleccionados.length === 0 && !incluirActual)}>
          {ocupado ? 'Corriendo…' : 'Correr el lote'}
        </button>
        {ocupado && (
          <button type="button" onClick={() => cliente.cancelar()}>
            Cancelar
          </button>
        )}
      </div>

      {progreso && progreso.total > 0 && (
        <div className="progreso">
          <progress value={progreso.hechos} max={progreso.total} />
          <span>
            {progreso.hechos} de {progreso.total} · {progreso.ultimo}
          </span>
        </div>
      )}

      {error && (
        <div className="problemas" role="alert">
          {error}
        </div>
      )}

      {resultados && resultados.length > 0 && (
        <>
          <div className="barra">
            <label>
              Comparar contra:
              <select value={referencia} onChange={(evento) => setReferencia(evento.target.value)}>
                <option value="">— sin referencia —</option>
                {filas
                  .filter((f) => f.esPeaje)
                  .map((f) => (
                    <option key={f.clave} value={`${f.nombre}|${f.regimen}`}>
                      {f.nombre} · {f.regimen}
                    </option>
                  ))}
              </select>
            </label>
            <button
              type="button"
              onClick={() => descargar('lote.csv', aCsv(filas, COLUMNAS), 'text/csv;charset=utf-8')}
            >
              Exportar CSV
            </button>
            <button
              type="button"
              onClick={() =>
                descargar('lote.json', JSON.stringify(resultados, null, 2), 'application/json')
              }
            >
              Exportar JSON
            </button>
          </div>

          <div className="tabla-envoltorio">
            <table>
              <caption>Medias entre réplicas, con intervalo de confianza al 95 %</caption>
              <thead>
                <tr>
                  {COLUMNAS.map((columna) => (
                    <th key={columna.clave}>{columna.titulo}</th>
                  ))}
                  {filaReferencia && <th>Δ Wq contra la referencia</th>}
                </tr>
              </thead>
              <tbody>
                {filas.map((fila) => (
                  <tr key={fila.clave} className={fila.esPeaje ? 'destacada' : undefined}>
                    {COLUMNAS.map((columna) => (
                      <td
                        key={columna.clave}
                        className={columna.clave === 'cumple' ? (fila.cumple ? 'si' : 'no') : undefined}
                      >
                        {columna.valor(fila)}
                      </td>
                    ))}
                    {filaReferencia && (
                      <td>
                        {fila.esPeaje
                          ? `${fila.wq - filaReferencia.wq >= 0 ? '+' : ''}${enMinutos(fila.wq - filaReferencia.wq)}`
                          : ''}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
