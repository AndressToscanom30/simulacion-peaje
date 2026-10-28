# Documentación — Simulación del peaje Los Acacios

Índice de `docs/`. Cada archivo tiene un papel distinto; antes de tocar código
conviene pasar por los tres primeros.

| Archivo | Para qué sirve |
|---|---|
| `contexto/contexto-inicial.md` | **Fuente de verdad.** Modelo, parámetros, regla de apertura y cierre, criterios de desempeño, escenarios, limitaciones y datos de campo. Lo que dice está decidido y no se reabre. No se edita para "arreglar" un resultado. |
| `planes/plan-actual.md` | Plan de trabajo por fases con casillas. Dice qué está hecho y qué sigue. Se marca al terminar cada intervención. |
| `decisiones/registro.md` | Bitácora de decisiones (`DEC-001`, `DEC-002`, …) con fecha, decisión, motivo y qué descarta. Lo que está aquí no se reabre: para cambiarlo se añade una decisión nueva que diga qué supera. |
| `ui.md` | Cómo se usa la interfaz y cómo está hecha: las tres pestañas, el formulario generado, el worker, la traza y el reloj de reproducción. |
| `traza.md` | Formato de la traza que graba el motor y reproduce la interfaz. Basta para interpretarla sin leer el motor; la fase 6 pintará el 3D desde ahí. |
| `parametros.md` | Catálogo de los 30 parámetros del modelo: significado, unidad, valor por defecto, origen (contexto o decisión) y rango. Generado con `npm run parametros`, leyendo los valores por defecto del escenario base, así que no puede quedar desfasado. Es la especificación del formulario de la fase 5. |
| `pendientes.md` | Preguntas abiertas y ambigüedades. Si algo no está claro se anota aquí y se sigue con la opción más razonable, dejando dicho cuál se tomó. Incluye lo que falta confirmar con la profesora. |
| `bitacora.md` | Una entrada por intervención: fecha, qué cambió, qué quedó a medias y qué sigue. Sirve para retomar el trabajo sin releer todo el repo. |
| `resultados/` | Salidas de las corridas. `validacion-fase1.md` es la validación del motor de un sentido contra los cuatro conteos; `diagnostico-festivo.md` compara la cola de campo con la simulada intervalo por intervalo; `fase2-regla.md` enfrenta la regla de apertura y cierre a la operación real; `fase3-reparto.md` reparte las 6 casetas entre los dos sentidos; `fase4-escenarios.md` es la matriz de 160 escenarios con el punto de quiebre. Son archivos generados: se regeneran con sus scripts, no se editan a mano. |

## Dónde está cada cosa en el código

| Ruta | Contenido |
|---|---|
| `src/config/datos.js` | Datos de campo transcritos de la sección 10 del contexto: los 4 conteos (llegadas, casetas y cola por intervalo de 5 min), los 50 tiempos de atención y el tráfico mensual de la ANI. |
| `src/config/parametros.js` | Todos los parámetros editables: servicio gamma, umbrales de la regla, demora de apertura, ventana de 15 min, ρ de reasignación, meta y máximo tolerable, réplicas y semillas, reparto del pozo y sustituto de C→P. |
| `src/config/escenario.js` | Qué es un escenario: objeto declarativo serializable a JSON, escenario base más sobreescrituras, validación y tablas de umbrales. |
| `src/config/escenarios.js` | Cómo se arman los dos sentidos a partir de los conteos, y el catálogo de los 160 escenarios de la fase 4. |
| `src/config/catalogoParametros.js` | Metadatos de cada parámetro (significado, unidad, origen, rango) con los que se genera `docs/parametros.md`. |
| `src/corridas.js` | Runner: traduce escenarios a configuración del motor, corre las réplicas y resuelve el cumplimiento. `simularTraza` graba una réplica para el modo tiempo real. |
| `src/motor/traza.js` | Grabador de trazas y reconstrucción del estado sin usar el motor. |
| `src/ui/` | La interfaz: `reloj.js` y `modeloFormulario.js` son puros y se prueban sin DOM; `worker/` corre el motor fuera del hilo de la pantalla; `componentes/` son los componentes de React. |
| `src/motor/` | Motor de simulación en JS puro (sin React, sin DOM, sin Three.js). Corre con Node. `sentido.js` tiene la lógica de un sentido; `simulador.js` la corre sola (fases 1 y 2) y `peaje.js` corre los dos sentidos sobre el pozo común de `pozo.js` (fase 3). |
| `scripts/simular.js` | Validación de la fase 1 (`npm run simular`). |
| `scripts/diagnostico-festivo.js` | Diagnóstico de la cola, campo contra simulación (`npm run diagnostico`). |
| `scripts/fase2.js` | Experimentos de la fase 2, operador contra regla (`npm run fase2`). |
| `scripts/fase3.js` | Experimentos de la fase 3, reparto entre sentidos (`npm run fase3`). |
| `scripts/fase4.js` | Matriz de escenarios de la fase 4 (`npm run fase4`). |
| `scripts/parametros.js` | Genera `docs/parametros.md` (`npm run parametros`). |
| `src/App.jsx` | Las tres pestañas de la interfaz: tiempo real, por lotes y configuración. |

## Comandos

```sh
npm install
npm run dev       # interfaz en el navegador
npm test          # pruebas unitarias (Vitest)
npm run simular     # validación de la fase 1 (30 réplicas por conteo)
npm run diagnostico # compara la cola de campo con la simulada
npm run fase2       # operador contra regla, con sensibilidad de demora y servicio
npm run fase3       # reparto de las 6 casetas entre los dos sentidos
npm run fase4       # matriz de 160 escenarios y punto de quiebre
npm run parametros  # regenera el catálogo de parámetros
```

La interfaz (`npm run dev`) permite configurar cualquier parámetro, reproducir
una réplica en tiempo real con pausa y rebobinado, y correr lotes con exportación
a CSV y JSON. Ver `docs/ui.md`.
