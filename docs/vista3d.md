# La vista 3D

Visualización 3D del peaje (fase 6). Se abre dentro de la pestaña **Tiempo
real**, compartiendo el reloj y los controles con los tableros 2D.

```sh
npm run dev      # http://localhost:5173 → Tiempo real → Simular y reproducir
```

## Cómo se traduce la traza en escena

La escena es una **función pura de la traza y del instante** (DEC-036): no habla
con el motor, no simula nada y no tiene reloj propio.

```
traza (docs/traza.md)
   │
   ├─ modeloEscena.js ──→ qué hay que dibujar: vehículos con su fase,
   │   (puro, sin three)   casetas con su estado, contadores, avisos
   │
   ├─ geometria.js ─────→ dónde va cada cosa: posiciones y cámaras
   │   (puro, sin three)
   │
   └─ Escena3D.jsx ─────→ el dibujo (three + @react-three/fiber)
       (carga diferida)
```

`modeloEscena.js` avanza con el **cursor de `crearReproductor`** de la fase 5,
así que un fotograma solo lee los eventos que caen en ese salto. Al rebobinar
rehace el estado desde el principio.

### Las fases de un vehículo

Dos de las cinco son **interpolación visual**, no estados del modelo:

| Fase | Desde | El motor lo cuenta en |
|---|---|---|
| `llegando` | el evento `llegada` | **la cola** |
| `enCola` | pasada la entrada visual | **la cola** |
| `enTransito` | el evento `ingresoACaseta` | **en servicio** |
| `enServicio` | pasado el tránsito visual | **en servicio** |
| `saliendo` | el evento `salida` | ya atendido, fuera |

O sea: `cola` del motor = `llegando` + `enCola`, y `en servicio` =
`enTransito` + `enServicio`. Hay una prueba que lo comprueba contra
`estadoEnInstante` en cuatro escenarios y las 30 semillas.

## Qué es cosmético

La escena representa **el modelo**, no una foto del peaje (DEC-038). Donde las
dos cosas difieren, manda el modelo y la escena lo rotula:

- **El modelo no tiene distancias ni velocidades.** Un vehículo pasa de la cola
  a la caseta en el instante del evento. La entrada desde el borde, el avance a
  la caseta y la salida son **interpolación** y no afectan a ninguna medida.
- **La cola se dibuja como un solo embudo por sentido**, en un bloque de hileras
  más estrecho que la línea de casetas. El modelo es de **cola única** (DEC-001)
  y la cola de campo que se midió era la fila más larga de una caseta (DEC-024):
  dibujar una fila por caseta sugeriría que el modelo las tiene.
- **Las casetas son reversibles.** El letrero lleva la flecha del sentido al que
  sirve en cada momento, porque en el modelo son un recurso compartido que
  cambia de dueño (DEC-002, DEC-008).
- **Todos los vehículos son de la misma clase.** El color y el tamaño varían con
  el identificador, solo para poder seguir uno con la vista. La categoría no
  entra al modelo (DEC-003).
- El abanico con el que los vehículos salen de la cola hacia su caseta es un
  arreglo de dibujo: sin él, varios que entran a la vez se solapan en un punto.

**Nada de lo que se ve en 3D es un resultado.** Los resultados están en
`docs/resultados/` y en la tabla de medidas de la pestaña.

## Leyenda

El **color no es la única señal** (DEC-039): cada estado se distingue además por
la **figura** y la altura del indicador sobre el letrero, y por su **texto**.

| Estado | Texto del letrero | Figura | Qué significa |
|---|---|---|---|
| en el pozo | `POZO` | caja baja | La caseta no es de ningún sentido. La cabina se dibuja translúcida. |
| reservada | `ABRE n s` | cono | Ya tiene destino y cuenta atrás hasta abrir, pero todavía no atiende (DEC-027). |
| abierta | `ABIERTA` | prisma alto | Operando. |
| marcada | `CIERRA` | cono medio | Cerrará al terminar su servicio; **no se interrumpe** (DEC-007). |

Los avisos breves sobre la plaza: **anillo dorado** sobre una caseta que acaba
de reasignarse, **octaedro rojo** sobre el sentido cuya petición de caseta se
quedó bloqueada porque el pozo estaba agotado. El HUD los repite en texto.

## Cámaras

Cinco preajustes, con botones: **Aérea**, **Lateral**, **Seguir cola P→C**,
**Seguir cola C→P** y **Encuadrar todo**. Más órbita con el ratón.

Las distancias **se calculan del contenido**, no son números fijos: con un pozo
de 10 la plaza es casi el doble de ancha que con uno de 6, y una cámara fija
dejaría medio peaje fuera del cuadro.

## Constantes configurables

Todas en `src/config/escena3d.js` (DEC-039). Las que más cambian el resultado:

| Constante | Qué controla |
|---|---|
| `duraciones.llegadaSegundos`, `transitoSegundos`, `salidaSegundos` | Cuánto duran las interpolaciones. **No miden nada.** |
| `duraciones.fraccionMaximaDelServicio` | Tope del tránsito como fracción del servicio, para que no se coma la atención entera. |
| `duraciones.avisoSegundos` | Cuánto se queda visible un aviso. |
| `plaza.*` | Dimensiones de carriles, casetas y letreros. |
| `cola.hileras`, `separacion`, `separacionHileras` | Forma del embudo. Conviene mantenerlo **más estrecho que la línea de casetas**. |
| `cola.visiblesMaximos` | Cuántos vehículos de la cola se dibujan. Los que no caben los cuenta el HUD. |
| `calidades.*` | Sombras, segmentos de las figuras y cola dibujada. |
| `camaras.*` | Factores de altura y distancia de cada preajuste. |

## Rendimiento medido

**La lógica no es el cuello de botella.** Calcular el modelo de escena y situar
todos los vehículos, por fotograma, con un paso de 1 s simulado (lo que toca a
60× y 60 fps):

| Caso | Eventos de la traza | Mediana | p95 | Máximo |
|---|---|---|---|---|
| Festivo, pozo 6 | 4.275 | 0,010 ms | 0,027 ms | 1,71 ms |
| Estrés, pozo 10, demanda ×1,6 | 6.530 | 0,009 ms | 0,042 ms | 2,18 ms |

El coste está **todo en el dibujado**. Medido en este contenedor, que **no tiene
GPU** y usa WebGL por software (SwiftShader), a 60× y 1280×720:

| Caso | Calidad alta | Calidad media | Calidad baja |
|---|---|---|---|
| Festivo, pozo 6 | 74 ms | 46 ms | 65 ms |
| Estrés, pozo 10, ×1,6 | 118 ms | 101 ms | 81 ms |

Eso son 8–13 fotogramas por segundo. **Son números de software**: un equipo con
GPU dibuja esta escena —un puñado de cajas y un `InstancedMesh`— con holgura,
pero desde aquí no puedo medirlo, y por eso queda anotado en PEN-019 en vez de
afirmar que va fluido. El selector de calidad está para eso.

## Si no hay WebGL

El panel lo detecta y lo dice con claridad. **Todo lo demás sigue funcionando**:
los controles de reproducción, los tableros 2D, el esquema de casetas y la tabla
de medidas. La vista 3D no calcula nada, solo dibuja lo que ya está simulado.

Con `prefers-reduced-motion` se reduce **lo decorativo** (las interpolaciones y
los marcadores que laten), nunca la simulación: los mismos eventos en los mismos
instantes.

## Capturas

En `docs/capturas/`, generadas con WebGL por software en tres instantes
(arranque, peor momento de cola y final) para el festivo y para el caso de
estrés con pozo 10, en dos cámaras.
