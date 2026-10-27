import { ordenConteos, conteos, observado } from './config/datos.js';
import { parametros } from './config/parametros.js';

/**
 * Cascarón de la interfaz. La configuración y el modo tiempo real son la fase 5
 * y la visualización 3D la fase 6 (ver docs/planes/plan-actual.md). Por ahora
 * esto solo confirma que la interfaz lee la misma configuración que el motor.
 */
export default function App() {
  return (
    <main>
      <h1>Peaje Los Acacios</h1>
      <p className="nota">
        Fase 1: motor de un sentido con casetas programadas. La corrida por lotes
        va por <code>npm run simular</code>; la interfaz llega en la fase 5.
      </p>

      <h2>Conteos de campo</h2>
      <table>
        <thead>
          <tr>
            <th>Conteo</th>
            <th>Llegadas (veh/h)</th>
            <th>Casetas</th>
            <th>Cola máxima observada</th>
          </tr>
        </thead>
        <tbody>
          {ordenConteos.map((clave) => (
            <tr key={clave}>
              <td>{conteos[clave].etiqueta}</td>
              <td>{observado[clave].caudalVehHora}</td>
              <td>{`${Math.min(...conteos[clave].casetas)}–${Math.max(...conteos[clave].casetas)}`}</td>
              <td>{observado[clave].colaMaxima}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Criterio de desempeño</h2>
      <ul>
        <li>Meta: Wq ≤ {parametros.desempeno.metaWqSegundos / 60} min</li>
        <li>Máximo tolerable: {parametros.desempeno.maximoTolerableWqSegundos / 60} min</li>
        <li>Réplicas por escenario: {parametros.corridas.replicas}</li>
      </ul>
    </main>
  );
}
