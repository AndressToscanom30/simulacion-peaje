# Documentación — Simulación del peaje Los Acacios

Índice de `docs/`. Cada archivo tiene un papel distinto; antes de tocar código
conviene pasar por los tres primeros.

| Archivo | Para qué sirve |
|---|---|
| `contexto/contexto-inicial.md` | **Fuente de verdad.** Modelo, parámetros, regla de apertura y cierre, criterios de desempeño, escenarios, limitaciones y datos de campo. Lo que dice está decidido y no se reabre. No se edita para "arreglar" un resultado. |
| `planes/plan-actual.md` | Plan de trabajo por fases con casillas. Dice qué está hecho y qué sigue. Se marca al terminar cada intervención. |
| `decisiones/registro.md` | Bitácora de decisiones (`DEC-001`, `DEC-002`, …) con fecha, decisión, motivo y qué descarta. Lo que está aquí no se reabre: para cambiarlo se añade una decisión nueva que diga qué supera. |
| `pendientes.md` | Preguntas abiertas y ambigüedades. Si algo no está claro se anota aquí y se sigue con la opción más razonable, dejando dicho cuál se tomó. Incluye lo que falta confirmar con la profesora. |
| `bitacora.md` | Una entrada por intervención: fecha, qué cambió, qué quedó a medias y qué sigue. Sirve para retomar el trabajo sin releer todo el repo. |
| `resultados/` | Salidas de las corridas. `validacion-fase1.md` es la validación del motor de un sentido contra los cuatro conteos; `diagnostico-festivo.md` compara la cola de campo con la simulada intervalo por intervalo; `fase2-regla.md` enfrenta la regla de apertura y cierre a la operación real. Son archivos generados: se regeneran con sus scripts, no se editan a mano. |

## Dónde está cada cosa en el código

| Ruta | Contenido |
|---|---|
| `src/config/datos.js` | Datos de campo transcritos de la sección 10 del contexto: los 4 conteos (llegadas, casetas y cola por intervalo de 5 min), los 50 tiempos de atención y el tráfico mensual de la ANI. |
| `src/config/parametros.js` | Todos los parámetros editables: servicio gamma, umbrales de la regla, demora de apertura, ventana de 15 min, ρ de reasignación, meta y máximo tolerable, réplicas y semillas. |
| `src/motor/` | Motor de simulación en JS puro (sin React, sin DOM, sin Three.js). Corre con Node. |
| `scripts/simular.js` | Validación de la fase 1 (`npm run simular`). |
| `scripts/diagnostico-festivo.js` | Diagnóstico de la cola, campo contra simulación (`npm run diagnostico`). |
| `scripts/fase2.js` | Experimentos de la fase 2, operador contra regla (`npm run fase2`). |
| `src/` (resto) | Interfaz React. Todavía es un cascarón. |

## Comandos

```sh
npm install
npm run dev       # interfaz en el navegador
npm test          # pruebas unitarias (Vitest)
npm run simular     # validación de la fase 1 (30 réplicas por conteo)
npm run diagnostico # compara la cola de campo con la simulada
npm run fase2       # operador contra regla, con sensibilidad de demora y servicio
```
