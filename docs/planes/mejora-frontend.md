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

## Etapa 2 — Estructura nueva y flujo de recalcular ✅

- [x] Tres vistas por `#hash`; la 3D es la de arranque (DEC-053). La traducción
      de hash a vista es pura, en `src/ui/rutas.js`, con prueba; la barra usa
      enlaces de verdad, así que atrás y adelante del navegador funcionan
- [x] Al abrir se simula el escenario aplicado, sin pulsar nada (DEC-054)
- [x] Panel de controles con **borrador**, «Cambios sin aplicar», *Aplicar y
      recalcular*, *Descartar cambios*, cancelar, y el botón bloqueado con los
      problemas listados si la validación falla. El panel y la configuración
      avanzada editan **el mismo borrador**
- [x] HUD y barra de reproducción sobre la escena; gráficos, esquema de casetas
      y tabla de medidas en un cajón plegable; semilla en «Avanzado». Campo
      hh:mm para ir a una hora, con conversión pura y probada
- [x] Sin WebGL, el cajón pasa a ser el contenido principal
- [x] Botón «Correr 30 réplicas con esta configuración», deshabilitado con
      cambios sin aplicar
- [x] Pruebas: **488 en total** (eran 457). Las 7 de «la aplicación entera
      monta» se reescribieron, cada una diciendo qué cambió; `vista3d.test.jsx`
      y las de `modeloEscena` y `geometria` siguen en verde **sin tocarlas**
- [x] Decisiones **DEC-053** (vista principal 3D y tres vistas por hash),
      **DEC-054** (borrador y recalculado explícito, apoyada en la DEC-033 sin
      reabrirla) y **DEC-055** (orden de sentidos del domingo, cierra PEN-023)
- [x] Informes de las fases 2 a 4 regenerados con cero diferencias; `npm run
      build` limpio; comprobado en el navegador que la vista 3D arranca sola,
      que aplicar recalcula y que la navegación y el botón atrás funcionan

**Medido:** una traza del festivo tarda **8,3 ms** y la del caso de estrés con
pozo de 10 y demanda ×1,6, **8,8 ms**. Así que «Recalculando…» apenas se ve y el
botón de cancelar es una red de seguridad, no un control de uso frecuente.

**Lo que quedó pendiente de limpiar:** `TiempoReal.jsx` ya no lo usa la
aplicación, pero sigue en el repositorio porque `vista3d.test.jsx` lo monta y
esta etapa no podía tocar ese archivo. Retirarlo es de la etapa 5 (PEN-024).

## Etapa 3 — Lenguaje de usuario ✅

Se hizo en dos sesiones: una primera que dejó el catálogo y parte de los textos
(commit `4a1853b`), y una segunda que cerró lo que faltaba.

- [x] Fuera del texto visible toda numeración DEC-/PEN-. Los comentarios del
      código y los documentos la conservan
- [x] El `origen` del catálogo se queda (genera `docs/parametros.md`) pero ya no
      se muestra; en su lugar `tipoOrigen`, escrito por parámetro y no deducido
      del texto de `origen`. La tabla de las 34 asignaciones está en la DEC-056
- [x] Franja fija «sirven para comparar escenarios entre sí, no para predecir
      minutos de espera» y panel «Cómo leer los resultados», en la simulación y
      en los lotes, con las cuatro advertencias que no se pierden
- [x] **La prueba invertida** (`lenguajeUsuario.test.jsx`): monta las tres
      vistas, despliega lo plegable y falla si el texto o los atributos `title`,
      `aria-label`, `placeholder` y `alt` traen la numeración o una clave de
      conteo; lo mismo con el panel 3D montado solo
- [x] **DEC-056** registrada (la sesión anterior la citaba en el código sin que
      existiera en el registro)

**Lo que cerró la segunda sesión:** los seis textos de `PanelVista3D`, el panel
de supuestos y sus claves `PEN-`, que `Campo` dibujara `tipoOrigen` en vez de
`origen`, las claves de conteo de los dos selectores, los grupos `E1`…`E5`, la
prueba invertida y la DEC-056.

**Tres fugas que encontró la prueba** y que la revisión a ojo no había visto: los
nombres «Sustituto domingoPC/domingoCP» de los lotes, el selector de conteo base
y el selector de escenarios del catálogo.

## Etapa 4a — Simplificación ✅

La interfaz muestra el programa y sus funciones, no la documentación del modelo
(DEC-057). En pantalla se queda lo que se usa y los avisos funcionales de una
línea.

- [x] **De cada campo** se fueron el significado como párrafo, el rango, el valor
      por defecto en texto y el `origen`. Se quedan nombre con unidad, control,
      marca de modificado con su botón y errores de validación. El significado
      pasa a `title`
- [x] **De `tipoOrigen` solo se pintan «Supuesto» y «Sensibilidad»**, que son las
      que advierten algo; «Medido en campo» y «Configuración» no se pintan
- [x] **De la vista 3D** se fueron los párrafos de lo cosmético, del modelo del
      carro y de la cámara libre, y el indicador de ms por fotograma. Se quedan
      selector de cámara, de calidad, aviso sin WebGL y **leyenda compacta** con
      muestra, texto y figura de los cuatro estados. **La DEC-039 no se toca**
- [x] Lo que se dibuja queda como indicador corto: «Vehículos: modelo 3D» o
      «Vehículos: cajas»
- [x] **Fuera las notas explicativas** de lotes, formulario y tableros. Se queda
      una leyenda de una línea por gráfico («Puntos huecos: cola medida en
      campo») y el veredicto
- [x] **Fuera el panel de supuestos**, sustituido por la franja fija y el panel
      «Cómo leer los resultados», de cuatro frases, plegable y visible la
      primera vez
- [x] El pie de página y el visor de JSON de `App.jsx` ya se habían ido en la
      etapa 2; importar y exportar siguen en la configuración avanzada
- [x] **DEC-057** registrada: supera **el punto 3 de la DEC-038** (la nota fija
      de la escena) y nada más. Se comprobó que la **DEC-030 no entra**: no fija
      qué muestra el formulario

## Etapa 4b — Diseño visual y solo modo claro ✅

La dirección visual sale de la **infraestructura vial**: hormigón y asfalto en
las superficies, y el verde de guía, el amarillo de demarcación y el rojo de
señal para lo que significa algo (DEC-058).

- [x] Tokens de color, tipografía y espaciado en `estilos.css`, con los nombres
      viejos (`--fondo`, `--acento`, `--alerta`…) apuntando a los nuevos
- [x] **Barlow y Barlow Condensed**, la única dependencia externa de la
      interfaz: no entra nada en `package.json` y, sin red, la pila del sistema
      la sustituye. Extiende la DEC-034 en vez de contradecirla
- [x] Fuera el bloque `prefers-color-scheme: dark`; `color-scheme: light`. En
      la escena, fuera `cieloOscuro`, las intensidades `oscuro` de las tres
      luces y la consulta `prefers-color-scheme` de `PanelVista3D`
- [x] Panel, HUD, barra de reproducción, cajón, vista de lotes y configuración
      avanzada rediseñados. **El HUD es un pórtico de señalización**: travesaño
      de asfalto con el reloj y, colgando, un panel verde de señal de guía por
      sentido. Es lo único llamativo y el único sitio con mayúsculas
- [x] Paleta de la escena armonizada en `src/config/escena3d.js`: los mismos
      tonos de asfalto y hormigón que la pantalla, vehículos apagados a
      propósito, y el letrero en el asfalto oscuro del pórtico
- [x] Accesibilidad: **17 pares de color medidos, todos sobre 4,5:1** (hubo que
      oscurecer `--texto-suave` a `#555e65`), foco visible en verde de guía,
      `prefers-reduced-motion` global; el color nunca va solo (DEC-039)
- [x] No se tocan `modeloEscena.js` ni `geometria.js` (DEC-036)
- [x] **DEC-058** registrada

**Tres arreglos de maquetación que venían de antes** y que salieron al mirarlo
en el navegador: dos HUD superpuestos en la misma esquina desde la etapa 2
(ahora `conHud={false}` en la vista de simulación); los controles de cámara
tapados por el pórtico, que bajan a la barra del pie (ver PEN-025); y la
aplicación creciendo más que la ventana, que dejaba la barra de reproducción
fuera de la pantalla.

## Etapa 5 — Cierre

- [ ] `docs/ui.md` y `docs/vista3d.md` reescritos
- [ ] Capturas regeneradas en `docs/capturas/`, más dos del panel
- [ ] Informes regenerados con cero diferencias numéricas; todas las pruebas en
      verde
- [ ] Plan marcado y entrada final en la bitácora
