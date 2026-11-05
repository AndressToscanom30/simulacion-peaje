# La interfaz

Interfaz de simulación 3D, estudio por lotes y configuración avanzada. La vista
principal reproduce una traza y muestra el estado en vivo; las vistas se
seleccionan por `#hash` (DEC-053).

```sh
npm install
npm run dev      # interfaz en http://localhost:5173
npm test         # 532 pruebas, motor e interfaz
```

## Indicador de carga ρ (DEC-061)

El HUD muestra, junto a la cola de cada sentido, el mismo ρ que usa el motor:
dos decimales con coma decimal, o «sin casetas» si no hay capacidad efectiva.
Al alcanzar el umbral configurable de colapso se muestra también la palabra
«colapso» y una figura, no solo un cambio de color. En el cajón de gráficos, el
SVG de ρ por sentido marca las referencias de 1 y de reasignación.

El valor se reconstruye de la traza y el escenario en `src/ui/rho.js`; no se
añade estado al motor. La reconstrucción replica que la ventana móvil solo se
poda cuando llega un vehículo.

## Las vistas

**Tiempo real.** Se elige la semilla (1 por defecto), se pulsa *Simular y
reproducir* y la réplica se reproduce con controles de iniciar, pausa, reinicio,
velocidad (1×, 10×, 60× y una configurable) y una barra para saltar a cualquier
instante. Incluye la **vista 3D** del peaje, que comparte ese mismo reloj y se
puede ocultar (ver `docs/vista3d.md`). Arriba se ve el reloj simulado, `t = mm:ss` más la hora real del
conteo (el festivo arranca a las 16:25). Durante la reproducción se muestra, por
sentido, la cola, los vehículos en servicio, los atendidos y las casetas
abiertas; el esquema del pozo con el estado de cada caseta (en el pozo,
reservada, abierta, marcada para cerrar); y tres gráficos dibujados **hasta el
instante reproducido**. Al llegar al final aparece la tabla de medidas de la
réplica, la misma de los informes.

**Por lotes.** Se eligen escenarios del catálogo (E1 a E5) o la configuración
actual, el número de réplicas (30 por defecto) y los regímenes de servicio.
Hay barra de progreso y botón de cancelar. La tabla de resultados trae las
medias con intervalo de confianza al 95 %, se puede comparar contra un escenario
de referencia, y se exporta en CSV y JSON.

**Configuración.** El formulario, generado desde el catálogo de parámetros.

## El formulario

Los campos **no están escritos a mano**: se generan desde
`src/config/catalogoParametros.js`, que es el mismo archivo con el que se genera
`docs/parametros.md` (DEC-030). Añadir un parámetro al catálogo lo hace aparecer
en el formulario sin tocar la interfaz.

Cada campo muestra su unidad, su valor por defecto, el rango válido y de dónde
sale (contexto o decisión). Lo que difiere del escenario base queda **marcado en
amarillo**, con un botón para restablecer ese campo y otro para restablecer todo.
La validación corre en cada cambio con `validarEscenario` y muestra **todos los
problemas juntos**, en castellano.

Se puede editar la demanda **intervalo por intervalo** (12 valores por sentido),
las casetas programadas del operador y las tablas de umbrales; o quedarse con la
forma corta de conteo base más factor. Un escenario entero se importa y exporta
en JSON, y la última configuración se recuerda en `localStorage` como
**comodidad**: si el almacenamiento falla, la interfaz arranca en el escenario
base sin quejarse.

El pozo se puede configurar hasta 10 casetas y el tope por sentido por encima de
5. Al subir el tope, las tablas de umbrales **se regeneran** con las fórmulas de
DEC-031, y la interfaz avisa de que los valores por encima de 5 son
**extrapolados**, no del contexto.

## Lo que la interfaz rotula a propósito

Hay un panel fijo de **Supuestos y limitaciones** con los tres supuestos no
medidos de los que depende cualquier número de esta pantalla (PEN-010, PEN-013,
PEN-008). Además:

- El **servicio lento** (15,5 s) y los **sustitutos alternativos de C→P**
  (domingoPC, domingoCP) se marcan como **sensibilidad, no medición**.
- La **cola observada** que se superpone en el gráfico, en puntos huecos, es el
  **total de vehículos esperando por sentido** (DEC-042), que es la misma
  variable que dibuja la curva simulada: las dos series se **comparan de
  frente**. El rótulo recuerda que son lecturas puntuales, una por intervalo de
  5 min.

## Arquitectura

### Worker

El motor corre **fuera del hilo de la interfaz**, así que la pantalla no se
congela calculando 30 réplicas.

| Archivo | Qué hace |
|---|---|
| `src/ui/worker/trabajos.js` | Los dos trabajos (`traza` y `lote`), sin nada de `postMessage`. Se pueden probar sin montar un Worker. |
| `src/ui/worker/simulacion.worker.js` | El cable: traduce mensajes a llamadas de `trabajos.js`. Acepta `{tipo:'traza'}`, `{tipo:'lote'}` y `{tipo:'cancelar'}`, y emite progreso. |
| `src/ui/worker/cliente.js` | Envuelve `postMessage` en promesas. **Si el entorno no tiene Workers** (las pruebas en jsdom, Node) corre los trabajos en el mismo hilo: el resultado es idéntico. |

### Traza y reloj

El modo tiempo real **reproduce una traza grabada**, no simula paso a paso
(DEC-033). El motor corre la réplica completa con un grabador y la interfaz la
reproduce. Eso la hace determinista, pausable y **rebobinable**, que con un
motor por pasos sería imposible, y la fase 6 pintará el 3D desde la misma traza.

| Archivo | Qué hace |
|---|---|
| `src/motor/traza.js` | El grabador y el formato, documentado en `docs/traza.md`. `reconstruirDesdeTraza` y `estadoEnInstante` rehacen el estado sin usar el motor. |
| `src/ui/reloj.js` | `crearRelojReproduccion`, **puro**: el tiempo se le inyecta con `avanzar(dt)`, sin `Date.now` ni DOM, así que se prueba exactamente. Y `crearReproductor`, que mantiene un cursor sobre los eventos. |

El bucle de fotogramas (`requestAnimationFrame`) vive en el componente y solo
mide el tiempo real y se lo pasa al reloj.

### El resto

| Archivo | Qué hace |
|---|---|
| `src/ui/modeloFormulario.js` | **Puro.** Genera los campos del catálogo, lee y escribe rutas del escenario, dice qué difiere del base y restablece campos. |
| `src/ui/formato.js` | Números con coma decimal, minutos, porcentajes, el reloj `mm:ss`, la hora del conteo y CSV. |
| `src/ui/almacen.js` | `localStorage` con try/catch en cada acceso. |
| `src/ui/componentes/` | Los componentes de React. Los gráficos son **SVG escrito a mano**, sin librerías (DEC-034). |
| `src/ui/vista3d/` | La visualización 3D (fase 6). `modeloEscena.js` y `geometria.js` son puros y se prueban en Node; `Escena3D.jsx` es lo único que importa three y se carga en diferido. Ver `docs/vista3d.md`. |

El motor sigue sin importar React, DOM ni nada de la interfaz (DEC-012), y las
pruebas lo garantizan: corren en entorno `node` y solo
`src/ui/__tests__/interfaz.test.jsx` pide `jsdom`, archivo por archivo.

## Qué se verificó

- Las **532 pruebas** pasan y los informes de las fases 1 a 4 se regeneran
  idénticos (salvo la línea de la fecha).
- Grabar la traza **no cambia ningún resultado**: en cinco escenarios y las 30
  semillas, con y sin grabador salen las mismas medidas y los mismos números
  aleatorios consumidos.
- **Reconstruir desde la traza coincide con el motor** en atendidos, cola máxima
  y carriles-intervalo, en cuatro escenarios y las 30 semillas.
- La reconstrucción de ρ coincide con `s.rho()` en cuatro escenarios y las 30
  semillas; traspasos y préstamos mantienen la reconstrucción de cola, servicio,
  casetas y carriles-intervalo.
- **La corrida por lotes de la interfaz da los mismos números que
  `docs/resultados/fase4-escenarios.md`**: hay una prueba que lee el informe
  publicado y compara el `Wq` del peaje de E2 en los dos regímenes.
