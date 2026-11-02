# Plan de mejora del frontend

Estado: 01/11/2026. Mejora posterior al cierre de las siete fases. Se trabaja
por etapas, en orden. Una etapa no se da por cerrada mientras sus pruebas no
pasen y los informes de las fases 2 a 4 no se regeneren con **cero diferencias
numéricas** (solo la fecha).

Las reglas de `CLAUDE.md` valen igual que en las fases: ningún número dentro de
la lógica, el motor sin React/DOM/three, las decisiones del registro no se
reabren (se añade una nueva que diga qué supera) y, al terminar cada etapa, se
marca este plan, se escribe en `docs/bitacora.md` y se registran las decisiones
nuevas con el siguiente número libre.

## Objetivo

1. La vista principal pasa a ser la **simulación 3D a pantalla completa**. El
   estudio por lotes (las 30 réplicas) sigue accesible.
2. Dentro de esa vista, un **panel de controles**: λ, promedio de atención (μ),
   situación (día y hora), umbrales de apertura y cierre, y tiempos de la regla.
3. La interfaz **no muestra numeración interna** (DEC-, PEN-). Las advertencias
   del estudio se quedan, reescritas en lenguaje de usuario.
4. Interfaz rediseñada, **solo modo claro**.

## Decisiones tomadas con la usuaria (01/11/2026)

Hay que registrarlas como decisiones nuevas en la etapa en que se implementen.

- **λ = factor de escala, uno por sentido.** El panel edita
  `sentidos[i].factorDemanda`. Al lado de cada factor se muestra, en solo
  lectura, el λ resultante en veh/h (suma de las llegadas del sentido × factor;
  si hay llegadas escritas a mano, sobre esas). No hay tasa plana: el modelo
  sigue siendo Poisson por tramos (DEC-005 intacta).
- **Promedio de atención editable, μ calculado, uno solo para los dos
  sentidos.** μ = 3600 ÷ promedio, en solo lectura. Al editar el promedio:
  `gammaEscalaSegundos = promedio ÷ gammaForma` (k fijo, mismo CV, igual que
  el servicio lento de la DEC-025) **y** `mediaNominalSegundos = promedio` (la
  regla sigue el valor nuevo). La separación de la DEC-027 punto 7 sigue
  existiendo en el modelo y en la configuración avanzada; lo nuevo es que el
  panel ata los dos valores por defecto.
  - **Trampa:** hoy k·θ = 4,68 × 2,58 = 12,0744 s y el nominal es 12,1016 s.
    El campo muestra el nominal, pero **solo escribe cuando el usuario lo
    edita**. Montar el panel no puede cambiar θ. *Restablecer* devuelve
    exactamente k = 4,68, θ = 2,58 y nominal = 12,1016. Va con prueba.
  - Las tablas por tasa (DEC-046) dependen de la capacidad nominal; si están en
    `null` se regeneran solas con el nominal nuevo. Hay que documentarlo.
- **Día y hora = situaciones predefinidas.** El modelo siempre simula los dos
  sentidos, pero cada conteo mide uno solo. Selector con:
  - **Festivo 12/10**: P→C medido (16:25–17:25) + C→P sustituido por el viernes
    (DEC-029). Tiene que ser **idéntico** a `ESCENARIO_BASE`.
  - **Domingo 13/09**: P→C (13:00–14:00) y C→P (11:50–12:50), los dos medidos,
    rotulado como conteos de **horas distintas**.
  - **Día normal**: viernes C→P + domingo P→C, rotulado como **construido** con
    dos días distintos (como `escenarioDiaNormal`).
  Se construyen con las funciones que ya existen en `src/config/escenarios.js`,
  respetando el orden de sentidos de cada una (el primero usa el flujo original
  del PRNG, DEC-027 punto 1). La hora no es libre: se deriva del conteo de cada
  sentido, el HUD muestra las dos, y un campo hh:mm mueve la barra de tiempo
  dentro de la hora.
- **Recalcular explícito.** El modo tiempo real reproduce una traza (DEC-033):
  el panel edita un **borrador**; *Aplicar y recalcular* corre la traza nueva en
  el Worker. Mientras tanto, la traza anterior sigue visible y atenuada, con
  «Recalculando…» y opción de cancelar.
- **Navegación: barra superior** con *Simulación 3D* (principal), *Estudio por
  lotes* y *Configuración avanzada*, por `#hash` sin librería (DEC-034). En el
  panel, un botón **«Correr 30 réplicas con esta configuración»** abre los lotes
  con la configuración actual elegida.
- **La configuración avanzada se conserva** como vista propia: es el único sitio
  para el pozo, el reparto, el criterio de desempeño, la demanda tramo por
  tramo, el disparador por tasa y la importación/exportación en JSON. Se puede
  replantear después.

## Etapa 1 — Capa pura (sin tocar lo visual) ✅

- [x] Lista ordenada de rutas del panel (`RUTAS_DEL_PANEL`) en
      `catalogoParametros.js`, y `camposDelPanel(escenario)` en
      `modeloFormulario.js` que reutiliza `camposDelFormulario` filtrando, sin
      duplicar campos (DEC-050). Hay prueba de que cada campo del panel es el
      mismo objeto que el del formulario completo
- [x] Entrada derivada del promedio de atención (DEC-051), con lectura y
      escritura puras, y valores de solo lectura para μ y para el λ resultante
      por sentido, en `src/config/derivados.js`
- [x] `SITUACIONES` y `aplicarSituacion(escenario, clave)` puras en
      `src/config/situaciones.js` (DEC-052), más `diaYHoraDeSentidos` y
      `horasDistintas`. `horaInicio` añadido a los cuatro conteos de `datos.js`
      sin cambiar ningún valor existente
- [x] Pruebas: **51 nuevas, 457 en total** (eran 406). Festivo = base exacto
      hasta el orden de las claves; generar el panel no altera θ; restablecer
      devuelve k = 4,68, θ = 2,58 y nominal = 12,1016; μ = 297,48 veh/h;
      λ del festivo P→C = 1.064 veh/h y escala lineal; las tres situaciones
      validan sin problemas; las tablas por tasa se regeneran con el nominal
      nuevo solo si estaban en `null`
- [x] Informes de las fases 2 a 4 regenerados: **una sola línea cambia en cada
      uno, la de la fecha**
- [x] Decisiones **DEC-050**, **DEC-051** y **DEC-052** registradas. La DEC-051
      dice explícitamente que **no supera la DEC-027 punto 7**
- [x] Sin tocar `src/motor/`, ni componentes `.jsx`, ni estilos

**Pendiente abierto:** PEN-023, el orden de los sentidos de la situación
«domingo», que no estaba fijado en ningún sitio y elegí yo (P→C primero). Importa
porque el primer sentido usa el flujo original del PRNG.

## Etapa 2 — Estructura nueva y flujo de recalcular

- [ ] Tres vistas por `#hash`; la 3D es la de arranque
- [ ] Al abrir se simula el escenario aplicado, sin pulsar nada
- [ ] Panel de controles con borrador, «Cambios sin aplicar», *Aplicar y
      recalcular*, cancelar, y el botón bloqueado si hay errores de validación
- [ ] HUD y barra de reproducción sobre la escena; gráficos, esquema de
      casetas y tabla de medidas en un cajón plegable; semilla en «Avanzado»
- [ ] Sin WebGL, el cajón pasa a ser el contenido principal
- [ ] Botón «Correr 30 réplicas con esta configuración» hacia los lotes
- [ ] Pruebas de interfaz actualizadas, cada cambio con su motivo
- [ ] Decisión: vista principal 3D y recalculado explícito (apoyada en la
      DEC-033, sin reabrirla)

## Etapa 3 — Lenguaje de usuario

- [ ] Fuera del texto visible toda numeración DEC-/PEN-. Los comentarios del
      código y los documentos la conservan
- [ ] El `origen` del catálogo se queda (genera `docs/parametros.md`) pero no
      se muestra; en su lugar, una etiqueta corta: *Medido en campo*,
      *Supuesto*, *Sensibilidad* o *Configuración*
- [ ] Panel «Cómo leer estos resultados» y franja fija «sirven para comparar
      escenarios entre sí, no para predecir minutos». Contenido que no se
      pierde: el modelo subestima la congestión del pico; el contraflujo del
      festivo no se midió; el servicio lento es hipótesis; la cola de campo y
      la simulada se comparan de frente; lo que se ve en 3D es animación del
      modelo, no una medida
- [ ] La prueba que exige «DEC-» en el formulario se invierte: una prueba nueva
      falla si el texto renderizado contiene `DEC-\d` o `PEN-\d`
- [ ] Decisión: lenguaje de usuario en la interfaz

## Etapa 4 — Diseño visual y solo modo claro

- [ ] Dirección visual con la skill de frontend design; tokens de color,
      tipografía y espaciado en `estilos.css`
- [ ] Fuera el bloque `prefers-color-scheme: dark`; `color-scheme: light`
- [ ] Panel, HUD, barra de reproducción, cajón, vista de lotes y configuración
      avanzada rediseñados
- [ ] Paleta de la escena armonizada en `src/config/escena3d.js`
- [ ] Accesibilidad: el color nunca es la única señal (DEC-039), foco visible,
      `prefers-reduced-motion`
- [ ] No se tocan `modeloEscena.js` ni `geometria.js`: la escena sigue siendo
      función pura de la traza y del instante (DEC-036)
- [ ] Decisión: solo modo claro y nueva dirección visual

## Etapa 5 — Cierre

- [ ] `docs/ui.md` y `docs/vista3d.md` reescritos
- [ ] Capturas regeneradas en `docs/capturas/`, más dos del panel
- [ ] Informes regenerados con cero diferencias numéricas; todas las pruebas en
      verde
- [ ] Plan marcado y entrada final en la bitácora
