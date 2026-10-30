# Formato de la traza

Una **traza** es una réplica completa convertida en lista de eventos. El motor
la graba de una vez y la interfaz la **reproduce** (DEC-033). La fase 6 pintará
el 3D desde aquí, así que este documento tiene que bastar: no hace falta leer el
motor para interpretar una traza.

Se genera con `simularTraza(escenario, semilla)` de `src/corridas.js` y es
serializable a JSON. Todos los instantes (`t`) son **segundos de tiempo
simulado** desde el arranque de la réplica.

## Versión

`version: 1`. Si el formato cambia de forma incompatible, el número sube. Quien
lea una traza debe comprobarlo.

## Estructura

```js
{
  version: 1,
  metadatos: { … },        // de qué réplica es
  eventos: [ … ],          // todo lo que pasó, en orden
  seriesPorIntervalo: [ … ], // una entrada por sentido, para los gráficos
  medidas: { … },          // lo que el motor reporta, igual que en los informes
}
```

### `metadatos`

| Campo | Qué es |
|---|---|
| `escenario` | El escenario completo, tal cual (`docs/parametros.md`). |
| `semilla` | Semilla de la réplica. Con el mismo escenario y la misma semilla, la traza es idéntica. |
| `horizonteSegundos` | `intervalos × duracionIntervaloSegundos`. Las llegadas se cortan aquí. |
| `duracionIntervaloSegundos`, `intervalos` | Tramos del conteo (300 s × 12 = la hora observada). |
| `pozoTotal`, `minimoPorSentido`, `maximoPorSentido` | Casetas del peaje y límites por sentido. |
| `sentidos` | `[{id, etiqueta, conteo, modo, colaInicial, casetasIniciales}]`. El `id` es el índice y es el que usan los eventos. |
| `instanteFinalSegundos` | Último instante grabado. **Puede pasar del horizonte**: la réplica sigue hasta atender a los vehículos que ya habían llegado (DEC-019). |

### `eventos`

Cada evento trae `t` (instante) y `tipo`. Están en el orden en que ocurrieron,
así que reproducir es recorrerlos de principio a fin.

**De vehículo:**

| `tipo` | Campos propios | Qué pasó |
|---|---|---|
| `llegada` | `sentidoId`, `vehiculoId`, `intervalo`, `inicial`, `cola` | Un vehículo entra a la cola. `inicial: true` son los de la cola de arranque, con `t = 0` (DEC-018). |
| `ingresoACaseta` | `sentidoId`, `vehiculoId`, `casetaId`, `esperaSegundos`, `duracionServicioSegundos`, `cola` | Sale de la cola y empieza a ser atendido. `esperaSegundos` es su espera (llegada → inicio de servicio). |
| `salida` | `sentidoId`, `vehiculoId`, `casetaId`, `cola` | Termina el servicio y se va. |

Un vehículo da siempre los tres eventos, en ese orden. `cola` es el número de
vehículos esperando en ese sentido **después** del evento, por comodidad.

**De caseta:** `casetaId` es el índice en el pozo, de 0 a `pozoTotal − 1`.

| `tipo` | Campos propios | Qué pasó |
|---|---|---|
| `casetaReservada` | `sentidoId`, `casetaId`, `abreEn`, `porReasignacion` | Se ordenó abrirla: queda apartada y abrirá en `abreEn` (DEC-027). Todavía no atiende. |
| `casetaAbre` | `sentidoId`, `casetaId`, `motivo` | Empieza a operar. `motivo`: `arranque` (las casetas iniciales), `programado` (el conteo del operador) o `regla`. |
| `casetaMarcada` | `sentidoId`, `casetaId` | Se marcó para cerrar, pero **sigue atendiendo** su vehículo: no se interrumpe (DEC-007). |
| `casetaCierra` | `sentidoId`, `casetaId`, `estaba` | Vuelve al pozo. `estaba`: `libre` (cerró en el acto) o `marcada` (cerró al terminar su servicio). |
| `casetaReasignada` | `casetaId`, `desdeSentidoId`, `haciaSentidoId`, `desdeElPozo?` | Una caseta liberada pasa al otro sentido por ρ (DEC-008). Va seguida de su `casetaReservada`. |
| `cierreCancelado` | `sentidoId`, `casetaId` | Se canceló un cierre marcado porque hacía falta capacidad (DEC-026, punto 2). |

**De pozo y de medición:**

| `tipo` | Campos propios | Qué pasó |
|---|---|---|
| `peticionBloqueada` | `sentidoId`, `cola` | Pidió caseta y el pozo estaba agotado. Se reintentará cuando se libere una. |
| `lecturaCola` | `sentidoId`, `intervalo`, `cola` | Lectura puntual del **total en espera** del sentido, en un instante aleatorio del intervalo (contexto, sección 6). Es la misma variable que la columna `cola` de los conteos (DEC-042), así que es directamente comparable con el dato de campo. |

### `seriesPorIntervalo`

Una entrada por sentido, para dibujar sin recorrer los eventos:

```js
{ sentidoId, etiqueta, llegadas: [12], wqSegundos: [12], colaMuestreada: [12] }
```

`llegadas` se cuenta de los propios eventos de la traza (sin los iniciales);
`wqSegundos` y `colaMuestreada` vienen de las medidas del motor.

### `medidas`

`{sentidos, total, pozo}`, exactamente lo que devuelve `simularPeaje` y lo que
aparece en los informes de `docs/resultados/`. Está en la traza para que la
interfaz muestre la tabla final sin recalcular nada.

## Reconstruir el estado

`reconstruirDesdeTraza(traza)` de `src/motor/traza.js` recorre los eventos y
devuelve el estado por sentido (cola, en servicio, atendidos, casetas abiertas,
cola máxima, carriles-intervalo), el reparto del pozo y la serie de hitos.
`estadoEnInstante(traza, t)` hace lo mismo hasta un instante.

**Esto es la comprobación de que la traza es completa:** lo que sale de
reconstruir coincide con lo que reportó el motor en los atendidos, la cola
máxima y los carriles-intervalo. Hay una prueba que lo verifica en las 30
semillas.

Para reproducir hacia adelante conviene `crearReproductor(traza)` de
`src/ui/reloj.js`, que mantiene un cursor y no vuelve a empezar en cada
fotograma.

## Lo que la traza no trae

- **El estado interno de la regla** (el conteo de los 15 min bajo el umbral, la
  ventana móvil de ρ). Se puede deducir de los eventos, pero no está grabado.
- **Los números aleatorios.** La traza es el resultado, no la semilla del
  resultado; para rehacerla hacen falta el escenario y la semilla, que sí están.
