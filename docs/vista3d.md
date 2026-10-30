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
   ├─ modeloCarro.js ───→ el modelo 3D del vehículo, simplificado
   │   (three, diferido)    (public/models/carro.glb → 6 piezas)
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
- **Todos los vehículos son de la misma clase.** Todos usan el mismo modelo 3D
  (DEC-040); el color de la carrocería y el largo varían con el identificador,
  solo para poder seguir uno con la vista. La categoría no entra al modelo
  (DEC-003), así que el coche que se ve no dice nada del vehículo simulado: es
  el mismo Mustang para un bus y para una moto.
- El abanico con el que los vehículos salen de la cola hacia su caseta es un
  arreglo de dibujo: sin él, varios que entran a la vez se solapan en un punto.

**Nada de lo que se ve en 3D es un resultado.** Los resultados están en
`docs/resultados/` y en la tabla de medidas de la pestaña.

## El modelo del vehículo

Los vehículos se dibujan con **`public/models/carro.glb`** (DEC-040), que supera
la parte de la DEC-037 que descartaba modelos externos. El resto de la escena
—calzada, casetas, letreros, indicadores— sigue siendo procedural.

El archivo **no se usa tal cual**: trae 47 primitivas, 26 materiales,
26 texturas PNG y **82 602 triángulos**, y en la escena puede haber más de cien
vehículos a la vez. `modeloCarro.js` lo prepara al cargarlo:

| Paso | Qué hace |
|---|---|
| Hornear | Mete la matriz de mundo de cada malla en sus vértices. Se puede porque la piel del archivo es un resto del exportador: ningún nodo la referencia y ninguna primitiva trae `JOINTS_0`. |
| Agrupar | Reparte los 26 materiales en **seis papeles** por el nombre (`rolDeMaterial`): carrocería, cromados, cristales, neumáticos, faros y plásticos. Gana el patrón más largo, para que `light_glass` no se lo lleve `lights`. |
| Descartar | Tira interior, motor y chasis: **el 22 % de la malla** que no se ve desde fuera. |
| Normalizar | Lleva el modelo de los 4,8 cm con que viene al largo de vehículo de la escena, base a ras de suelo y morro hacia delante. El eje largo **se detecta**, no se da por sabido. |
| Fusionar | Una geometría por papel: de 47 objetos de dibujo a 6. |
| Simplificar | Agrupamiento por celdas: una celda de la rejilla, un vértice (en su centro de masas, con la normal media). |

Resultado medido en el navegador: **82 602 → 10 727 triángulos** y **6 objetos
de dibujo** para toda la escena, con `InstancedMesh`. A la escala de la escena un
coche ocupa unos pocos píxeles, así que la pérdida de detalle fino no se ve y
**las texturas del archivo no se usan**: cada papel lleva un material plano de
`ESCENA_3D.carro.roles`.

Solo la **carrocería** recibe el color del vehículo; cristales, neumáticos y
cromados conservan el suyo. De eso se encarga `instanceColor`, puesto únicamente
en la pieza de pintura.

### Cuándo se ven cajas

Las cajas de la fase 6 siguen ahí como red de seguridad, y el panel dice en
texto qué se está dibujando:

- mientras el archivo se descarga (son 10,9 MB, y solo se piden al abrir la
  vista 3D: la carga es diferida);
- si falta o falla la carga —entonces se olvida el fallo, así que cambiar de
  calidad y volver reintenta—;
- en **calidad baja**, a propósito.

**La escena nunca se queda vacía por un archivo**, y ninguna medida depende del
modelo: entra justo donde estaba la caja, con el mismo largo y la misma
posición.

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

## Cámara libre

La vista es **libre** (DEC-041): se orbita el peaje **desde cualquier ángulo**
—también por debajo de la calzada—, la rueda acerca y aleja, y con el botón
derecho o la rueda pulsada se desplaza.

| Gesto | Qué hace |
|---|---|
| Arrastrar | Orbitar, de casi cenital a casi nadiral. |
| Rueda | Acercar y alejar, entre los topes. |
| Botón derecho o rueda pulsada | Desplazar el punto al que mira. |
| Botón de cámara | Viajar a ese encuadre; **también sirve para recentrar**. |

Los cinco preajustes —**Aérea**, **Lateral**, **Seguir cola P→C**, **Seguir cola
C→P** y **Encuadrar todo**— ya no son modos: son **viajes**. Un clic lleva la
cámara hasta el encuadre y en cuanto se arrastra el viaje se corta y manda el
ratón; el panel rotula «Vista libre» mientras la cámara no está en un preajuste.
Antes la cámara se interpolaba hacia el preajuste en todos los fotogramas, así
que cualquier órbita se deshacía sola: eso es lo que la DEC-041 arregla.

Lo único acotado es el **punto al que mira**, que se queda dentro de un cubo
centrado en la plaza, y el acercamiento y el alejamiento. Así se cumple la otra
mitad de lo pedido —ver **todo** el modelo—: no hay forma de desplazarse hasta
perder el peaje de vista.

Las distancias y los topes **se calculan del contenido**, no son números fijos:
con un pozo de 10 la plaza es casi el doble de ancha que con uno de 6, y una
cámara fija dejaría medio peaje fuera del cuadro. Hay una prueba que comprueba
que **los cinco preajustes caben dentro de los topes** en tres tamaños de pozo y
las tres calidades: si no, tocar el ratón después de un preajuste daría un salto.

Como se puede mirar **desde abajo**, la calzada se dibuja dos veces: la cara de
arriba opaca y un **reverso translúcido** que no escribe profundidad, de modo
que desde abajo se ven las casetas y los vehículos a través del asfalto. Una
losa opaca dejaría la vista en negro justo cuando más libre es. Las marcas de
carril sí van a dos caras, para que dibujen la planta sobre el velo, y una luz
de hemisferio ilumina las caras que miran hacia abajo.

La niebla empieza más allá de cualquier preajuste, para que mirar el peaje
entero no lo deje en bruma.

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
| `navegacion.*` | Topes y velocidades de la cámara libre: distancias, ángulo polar, cubo del objetivo, suavizado del viaje a un preajuste. |
| `niebla.desde`, `hasta` | Dónde empieza y acaba la niebla, como factores del tamaño de la escena. |
| `carro.roles` | Cómo se reparten los 26 materiales del modelo en papeles, y el material plano de cada uno. |
| `carro.niveles` | Resolución de la rejilla de simplificación y qué papeles se dibujan, por calidad. |
| `carro.ruta`, `factorDeLargo`, `alturaDeRodadura` | Qué archivo se carga, a qué largo se escala y a qué altura rueda. |

## Rendimiento medido

**La lógica no es el cuello de botella.** Calcular el modelo de escena y situar
todos los vehículos, por fotograma, con un paso de 1 s simulado (lo que toca a
60× y 60 fps):

| Caso | Eventos de la traza | Mediana | p95 | Máximo |
|---|---|---|---|---|
| Festivo, pozo 6 | 4.275 | 0,010 ms | 0,027 ms | 1,71 ms |
| Estrés, pozo 10, demanda ×1,6 | 6.530 | 0,009 ms | 0,042 ms | 2,18 ms |

El coste está **todo en el dibujado**, y ahí este contenedor **no sirve para
medir**: no tiene GPU y usa WebGL por software (SwiftShader). Con las cajas de
la fase 6 daba 74–118 ms por fotograma en calidad alta; con el modelo del carro
las lecturas van de 30 a 1 200 ms según el encuadre y **se contradicen entre
sí** —en una tanda la calidad media, con 3 043 triángulos por coche, salió más
lenta que la alta, con 10 727—, lo que delata que lo medido es el rasterizador
por software, no la escena.

Así que se deja lo que se **cuenta**, no lo que se cronometra aquí:

| Calidad | Vehículo | Triángulos por vehículo | Objetos de dibujo | Cola dibujada |
|---|---|---|---|---|
| alta | modelo completo | 10 727 | 6 | 45 |
| media | modelo reducido | 3 043 | 4 | 30 |
| baja | caja | 12 | 1 | 16 |

Con el tope de instancias (unas 126 en calidad alta con pozo 6) eso es algo más
de un millón de triángulos por fotograma en el peor caso, en seis llamadas de
dibujo. Un equipo con GPU lo dibuja con holgura, pero **desde aquí no se puede
medir**, y por eso queda en PEN-019 en vez de afirmar que va fluido. El selector
de calidad está para eso.

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
estrés con pozo 10, en dos cámaras. Más tres de la vista libre:

| Captura | Qué enseña |
|---|---|
| `libre-orbita.png` | El peaje orbitado a mano, fuera de todo preajuste. |
| `libre-bajo-la-calzada.png` | Desde **debajo** de la calzada: el asfalto se vuelve translúcido y se siguen viendo casetas, barreras y cola. |
| `libre-carro-de-cerca.png` | El modelo del vehículo de cerca, con la variación de color por identificador. |
