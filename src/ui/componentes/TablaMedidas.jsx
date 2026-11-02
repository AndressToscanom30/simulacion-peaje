import { num, enMinutos, porcentaje } from '../formato.js';

/**
 * Las medidas de una réplica, las mismas que aparecen en los informes de
 * `docs/resultados/`.
 */
export default function TablaMedidas({ medidas, desempeno }) {
  const cumpleSentido = (s) =>
    s.wqHoraSegundos !== null &&
    s.wqHoraSegundos <= desempeno.metaWqSegundos &&
    (s.fraccionIntervalosSobreUmbral ?? 0) <= desempeno.fraccionIntervalosSobreMaximoAceptada;

  return (
    <div className="tabla-envoltorio">
      <table>
        <caption>
          Medidas de la réplica. El criterio se evalúa <strong>en cada sentido</strong>: un peaje
          con un sentido bien y el otro colapsado no cumple.
        </caption>
        <thead>
          <tr>
            <th>Medida</th>
            {medidas.sentidos.map((s) => (
              <th key={s.etiqueta}>{s.etiqueta}</th>
            ))}
            <th>Peaje</th>
          </tr>
        </thead>
        <tbody>
          <Fila titulo="Llegadas en la hora (veh)" valores={medidas.sentidos.map((s) => num(s.llegadasSimuladas, 0))} total={num(medidas.total.llegadasSimuladas, 0)} />
          <Fila titulo="Caudal: salidas en la hora (veh)" valores={medidas.sentidos.map((s) => num(s.caudalEnHorizonte, 0))} total={num(medidas.total.caudalEnHorizonte, 0)} />
          <Fila titulo="Wq de la hora (min)" valores={medidas.sentidos.map((s) => enMinutos(s.wqHoraSegundos))} total={enMinutos(medidas.total.wqHoraSegundos)} destacada />
          <Fila titulo="Wq sin la cola inicial (min)" valores={medidas.sentidos.map((s) => enMinutos(s.wqHoraSinColaInicialSegundos))} total="—" />
          <Fila titulo="% de intervalos > máximo tolerable" valores={medidas.sentidos.map((s) => porcentaje(s.fraccionIntervalosSobreUmbral))} total={porcentaje(medidas.total.fraccionIntervalosSobreUmbral)} />
          <Fila titulo="Cola máxima muestreada (veh)" valores={medidas.sentidos.map((s) => num(s.colaMaximaMuestreada, 0))} total={`${num(medidas.total.sumaColaMaximaMuestreada, 0)} (suma)`} />
          <Fila titulo="Cola máxima continua (veh)" valores={medidas.sentidos.map((s) => num(s.colaMaximaContinua, 0))} total={`${num(medidas.total.sumaColaMaximaContinua, 0)} (suma)`} />
          <Fila titulo="Carriles-intervalo" valores={medidas.sentidos.map((s) => num(s.carrilesIntervalo, 2))} total={num(medidas.total.carrilesIntervalo, 2)} />
          <Fila titulo="Aperturas / cierres" valores={medidas.sentidos.map((s) => `${s.aperturas} / ${s.cierres}`)} total={`${medidas.total.aperturas} / ${medidas.total.cierres}`} />
          <Fila titulo="Cambios de c" valores={medidas.sentidos.map((s) => num(s.cambiosDeC, 0))} total={num(medidas.total.cambiosDeC, 0)} />
          <Fila titulo="Peticiones bloqueadas" valores={medidas.sentidos.map((s) => num(s.peticionesBloqueadas, 0))} total={num(medidas.pozo.peticionesBloqueadas, 0)} />
          <Fila titulo="Minutos esperando carril" valores={medidas.sentidos.map((s) => enMinutos(s.segundosBloqueados, 1))} total={enMinutos(medidas.pozo.segundosBloqueados, 1)} />
          <Fila titulo="Reasignaciones recibidas" valores={medidas.sentidos.map((s) => num(s.reasignacionesRecibidas, 0))} total={num(medidas.pozo.reasignaciones, 0)} />
          <tr>
            <th scope="row">Cumple el criterio</th>
            {medidas.sentidos.map((s) => (
              <td key={s.etiqueta} className={cumpleSentido(s) ? 'si' : 'no'}>
                {cumpleSentido(s) ? 'sí' : 'no'}
              </td>
            ))}
            <td className={medidas.sentidos.every(cumpleSentido) ? 'si' : 'no'}>
              {medidas.sentidos.every(cumpleSentido) ? 'sí' : 'no'}
            </td>
          </tr>
        </tbody>
      </table>
      <p className="nota">
        Minutos con el pozo agotado: <strong>{enMinutos(medidas.pozo.segundosAgotado, 1)}</strong>
      </p>
    </div>
  );
}

function Fila({ titulo, valores, total, destacada }) {
  return (
    <tr className={destacada ? 'destacada' : undefined}>
      <th scope="row">{titulo}</th>
      {valores.map((valor, i) => (
        <td key={i}>{valor}</td>
      ))}
      <td>{total}</td>
    </tr>
  );
}
