# Plan actual

Estado: 30/10/2026. Las fases se trabajan en orden. Una fase no se da por
cerrada mientras sus pruebas no pasen.

**Las siete fases están cerradas**, más dos añadidos posteriores: el
**disparador anticipativo por tasa** (DEC-046), que el estudio recomendaba sin
medir y ya está implementado y medido, y el **estudio de arranque en frío**
(DEC-047), que cierra PEN-016. El estudio está completo: el documento con las ocho
etapas está en `docs/estudio.md` y la política recomendada en
`docs/politica-recomendada.md`.

## Corrección de base del 30/10/2026 (DEC-042) ✅

Hecha antes de la fase 7, para que el documento del estudio no se la llevara
dentro.

- [x] **DEC-042**: la columna `cola` de los cuatro conteos es el **total de
      vehículos esperando por sentido**, no la fila más larga de una caseta.
      **Supera a la DEC-024**, que era incorrecta. Sustento por tres vías:
      confirmación del autor de las mediciones, las dos líneas del contexto que
      la DEC-024 contradecía, y la ley de Little, que reconstruye los `Wq`
      declarados **en los cuatro conteos** y solo cuadra con la columna leída
      como total
- [x] **PEN-002 cerrado**: el 1,28 min del festivo sale de
      `Wq = Lq / λ = 22,667 / 1.064 = 1,2782 min`. El recálculo anterior usaba la
      fórmula de la sección 3 y no era la vía
- [x] **PEN-008 reescrito**: la conclusión (el modelo subestima el pico) sigue en
      pie; el razonamiento cambia de desigualdad a comparación directa, y la
      hipótesis del desbalance pierde el lugar privilegiado que le daba la
      DEC-024
- [x] **PEN-010 y DEC-025**: la derivación del servicio implícito de 15,5 s
      vuelve a ser válida (nota en la DEC-025). Sigue sin ser una medición, así
      que el escenario sigue siendo sensibilidad, pero deja de estar anulado
- [x] **PEN-004**: quitada la nota del 27/10 que decía que ni el máximo
      muestreado era comparable
- [x] **DEC-038 punto 1**: la decisión sigue en pie con un argumento menos (nota)
- [x] Prosa, rótulos y comentarios corregidos en la interfaz (5 archivos), los
      generadores de informes (4) y los documentos (4). **La lógica del motor no
      se tocó:** siempre simuló la cola total
- [x] Los seis informes regenerados con sus scripts
- [x] **373 pruebas en verde.** Una prueba afirmaba el texto incorrecto de la
      interfaz y se corrigió para afirmar el correcto

**Ninguna conclusión de las fases 1 a 4 cambió**, y está comprobado: los informes
de las fases 2, 3 y 4 se regeneraron con **cero diferencias numéricas** (solo la
fecha y la prosa). Lo que cambió es lo que se puede concluir de esos números.

**Hallazgo nuevo que la lectura anterior no permitía ver:** el sesgo del modelo
tiene **un solo signo**. En 0 de los 48 intervalos la lectura de campo queda por
debajo del rango de las 30 réplicas. Con la DEC-024 esto era incomprobable,
porque todo intervalo en que la simulación quedaba por encima salía rotulado «no
concluyente». Refuerza PEN-008: no es dispersión, es sesgo.

## Fase 1 — Motor de un sentido con casetas fijas + validación ✅

- [x] PRNG propio con semilla (mulberry32) y pruebas de reproducibilidad
- [x] Generador gamma por Marsaglia–Tsang (k = 4,68; θ = 2,58 s)
- [x] Llegadas Poisson por tramos de 5 min con factor de escala de demanda
- [x] Motor de eventos discretos de un sentido: llegada, fin de servicio, cambio
      de intervalo y muestreo de cola, con cola única FIFO
- [x] `c(t)` en modo **programado** (copia el conteo observado)
- [x] Cola inicial y casetas iniciales como parámetros
- [x] Una caseta marcada para cerrar no interrumpe el servicio en curso
- [x] Medidas por réplica: caudal, `Wq` por intervalo y por hora, cola máxima,
      % de intervalos sobre 2,5 min, carriles-intervalo
- [x] Corrida por lotes de 30 réplicas (semillas 1…30)
- [x] M/M/c de referencia por Erlang C
- [x] Validación contra los 4 conteos → `docs/resultados/validacion-fase1.md`
- [x] Pruebas unitarias del motor (58 pruebas en verde)

Resultado: las llegadas quedan validadas (error < 1,6 % en los cuatro conteos) y
los carriles-intervalo coinciden exactamente con la operación real. La espera
queda corta en los cuatro casos, y en el festivo 4,6 veces corta: ver PEN-008.

## Fase 2 — Regla de apertura y cierre ✅

- [x] Modo `c(t)` **por regla**, evaluada tras cada llegada y cada fin de servicio
- [x] Umbrales de apertura (cola > 4 / 9 / 14 / 19) y de cierre (cola < 2 / 4 / 7 / 9)
- [x] Apertura programada a `t + demora`, con una sola apertura pendiente por sentido
- [x] Cierre solo si la cola se mantiene bajo el umbral 15 min seguidos, con
      reinicio del conteo si sube
- [x] Casetas marcadas que no interrumpen el servicio en curso
- [x] Casos límite decididos y cubiertos con pruebas (DEC-026)
- [x] Sensibilidad de la demora (0, 5 y 10 min)
- [x] Escenario de sensibilidad "servicio lento" (DEC-025)
- [x] Comparación de la regla contra la operación real observada
      → `docs/resultados/fase2-regla.md`
- [x] Diagnóstico de la definición de cola de campo (DEC-024, **superada por la
      DEC-042 el 30/10**: la columna `cola` es el total por sentido)
      → `docs/resultados/diagnostico-festivo.md`
- [x] 86 pruebas en verde, incluida la regresión del modo programado contra
      `validacion-fase1.md`

Resultado: con el servicio medido (12,10 s) el operador y la regla cumplen el
criterio en los cuatro conteos, y en el festivo la regla queda algo peor
(PEN-011) gastando un 7,4 % más de carriles-intervalo (PEN-012). Con el servicio
lento de sensibilidad (15,5 s) ninguno cumple, pero la regla baja `Wq` de 2,90 a
1,23 min y el % de intervalos sobre 2,5 min de 50,0 % a 9,2 %, por un 7 % más de
carriles. La conclusión depende del régimen de servicio.

## Fase 3 — Reparto de casetas entre sentidos ✅

- [x] Los dos sentidos a la vez sobre el pozo común de 6 casetas (1 a 5 por sentido)
- [x] Motor de dos sentidos con un solo reloj (`simularPeaje`), reutilizando la
      lógica por sentido de las fases 1 y 2 sin duplicarla
- [x] Un flujo de PRNG por sentido, con el primero usando la semilla tal cual
- [x] Reserva de caseta al ordenar la apertura, con peticiones bloqueadas y
      reintento cuando el pozo libera
- [x] Reasignación de la caseta liberada si el otro sentido tiene ρ > 0,60 y c < 5
- [x] Desempate cuando los dos sentidos piden caseta y no hay libres
- [x] Sustituir la demanda no medida de Cúcuta→Pamplona en el festivo por el
      conteo del domingo 1:00–2:00 p. m. (195 veh/h), arrancando con 1 caseta
- [x] Casos límite decididos y cubiertos con pruebas (DEC-027)
- [x] Sensibilidades: demora 0 y 10 min, `ofrecerPozoPorRho`, sustituto domingoCP
- [x] Escenario de sanidad de día normal → sin disputa de casetas, comprobado
- [x] Experimentos → `docs/resultados/fase3-reparto.md`
- [x] 123 pruebas en verde, con la equivalencia exacta contra las fases 1 y 2

Resultado: con el pozo compartido aparece la competencia que las fases 1 y 2 no
podían ver (el pozo está agotado 56 de los 60 min del festivo). Con servicio
base los tres controles cumplen la meta en los dos sentidos; con servicio lento
ninguno, aunque la regla baja `Wq` de P→C de 2,90 a 1,26 min. La reasignación
por ρ es casi inerte en el pico (PEN-015) y cuando actúa favorece al sentido con
menos casetas (PEN-014). Lo que decide el resultado es el sustituto de C→P, que
no se midió (PEN-013).

## Fase 4 — Escenarios y corridas por lotes ✅

- [x] Escenario como objeto declarativo serializable a JSON, con escenario base
      más sobreescrituras, validación en castellano e importación/exportación
- [x] Configurabilidad total: pozo, tope por sentido, servicio, umbrales,
      demora, ventana, ρ, meta, réplicas y semillas (DEC-030)
- [x] Tablas de umbrales que siguen al tope por sentido (DEC-031), reproduciendo
      los valores del contexto para c de 1 a 5
- [x] `docs/parametros.md`: los 30 parámetros con su valor por defecto leído del
      escenario base, origen y rango. Especificación del formulario de la fase 5
- [x] E1 operador; E2 regla sin y con reasignación
- [x] E3 demanda alta con factores 1,10, 1,13 y 1,20, con la regla y con casetas
      fijas, más un caso con reasignación
- [x] E4 dieciocho sensibilidades: demora, meta de evaluación, umbrales ×0,6 y
      ×1,4, ventana de cierre, cola inicial 0, factor de C→P y sustitutos
- [x] E5 barrido de estrés de 1,00 a 1,60 con pozo de 6 y de 8
- [x] 30 réplicas con las mismas semillas (1…30) en todos los escenarios
- [x] Tabla comparativa de 160 escenarios con IC al 95 %
      → `docs/resultados/fase4-escenarios.md`
- [x] 198 pruebas en verde, con las regresiones de las fases 1, 2 y 3 intactas

Resultado: con el servicio medido cumplen 33 de 80 escenarios; con el servicio
lento, 4 de 80. El quiebre está en **×1,10** de demanda con el pozo de 6, y un
pozo de 8 lo desplaza a **×1,55** solo si la regla puede mover las casetas (con
casetas fijas no lo desplaza nada, porque el cuello es C→P clavado en 1). La
sensibilidad que más mueve el resultado es el sustituto de C→P (+6,94 min), no
ningún parámetro de la regla.

## Fase 5 — Interfaz de configuración y modo tiempo real ✅

- [x] Traza versionada que graba el motor, documentada en `docs/traza.md`
- [x] Grabador que no cambia ningún resultado, comprobado en 5 escenarios × 30 semillas
- [x] Reconstrucción desde la traza, que coincide con el motor en atendidos,
      cola máxima y carriles-intervalo
- [x] Web Worker con trabajos de traza y de lote, progreso y cancelación
- [x] Reloj de reproducción puro: 1×, 10×, 60× y configurable, pausa, reinicio y
      salto a cualquier instante
- [x] Formulario **generado** desde `catalogoParametros.js`, en siete secciones,
      con unidad, valor por defecto, rango y origen de cada campo
- [x] Validación en línea con todos los problemas juntos, marcado de lo que
      difiere del base y restablecer por campo y total
- [x] Demanda editable por intervalo, casetas del operador y tablas de umbrales
- [x] Selector de escenarios del catálogo, importar y exportar JSON, y
      `localStorage` con try/catch
- [x] Pozo de hasta 10 casetas y topes mayores de 5, probados con 8 y 10
- [x] Modo tiempo real: controles, reloj simulado con la hora del conteo, estado
      en vivo por sentido y esquema 2D de las casetas
- [x] Tableros en SVG propio: cola por sentido, casetas abiertas en escalón y
      espera por intervalo contra la meta y el máximo tolerable
- [x] Modo por lotes con barra de progreso, cancelación, comparación contra una
      referencia y exportación CSV y JSON
- [x] Panel fijo de supuestos y rótulos de sensibilidad
- [x] 319 pruebas en verde, con las regresiones de las fases 1 a 4 intactas
- [x] `docs/ui.md` y `docs/traza.md`

Verificado: la corrida por lotes de la interfaz da los **mismos números** que
`docs/resultados/fase4-escenarios.md` (hay una prueba que lee el informe
publicado y compara), y `npm run build` y `npm run dev` funcionan.

## Fase 6 — Visualización 3D ✅

- [x] Modelo de escena **puro**: función de la traza y del instante, sin three,
      sin React y sin el motor; avanza con el cursor del reproductor
- [x] Escena del peaje con una caseta por carril del pozo, letrero aéreo con
      número, flecha del sentido y estado en texto
- [x] Vehículos que entran, hacen cola única por sentido, pasan a caseta y salen
- [x] Casetas que abren, se marcan y cierran visiblemente, con cuenta atrás
      cuando están reservadas
- [x] Avisos de reasignación y de petición bloqueada
- [x] Cámara con órbita y cinco preajustes, con distancias calculadas del
      contenido para que un pozo de 10 también quepa
- [x] HUD con reloj, contadores por sentido, estado del pozo y registro de
      eventos en texto; leyenda y nota de escena esquemática
- [x] Integrado en la pestaña Tiempo real, compartiendo reloj y controles, con
      interruptor para ocultarlo
- [x] Sin WebGL, aviso claro y el resto funcionando; calidad ajustable y
      `prefers-reduced-motion`
- [x] Carga diferida: three no entra en el paquete principal
- [x] 38 pruebas nuevas (357 en total) y seis capturas revisadas en
      `docs/capturas/`
- [x] `docs/vista3d.md`

Resultado: la escena es determinista y se prueba sin WebGL. Revisando las
capturas aparecieron tres defectos reales, corregidos: el encuadre general
cortaba la cola, los vehículos que entraban a caseta a la vez se solapaban, y la
cuenta atrás se salía del letrero. El rendimiento de la lógica es despreciable
(0,01 ms por fotograma); el del dibujado solo está medido con WebGL por software
(PEN-019).

## Ajuste de la vista 3D — cámara libre y modelo del carro ✅

Pedido después de cerrar la fase 6, sin tocar el motor ni los resultados.

- [x] **Cámara libre** (DEC-041): se orbita desde cualquier ángulo, se acerca y
      se desplaza; los preajustes pasan a ser viajes a un encuadre y sirven para
      recentrar. Antes la cámara se interpolaba al preajuste en cada fotograma y
      deshacía sola cualquier órbita
- [x] Topes sacados del contenido (`limitesDeNavegacion`), con el punto al que
      mira acotado para que el peaje no se pueda perder de vista
- [x] Reverso translúcido de la calzada y luz de hemisferio, para que desde
      abajo se siga viendo el modelo entero en vez del asfalto
- [x] **Modelo del carro** de `public/models/carro.glb` (DEC-040), preparado al
      cargarlo: 26 materiales a 6 papeles, interior y motor descartados,
      normalizado y simplificado por rejilla de **82 602 a 10 727 triángulos**
- [x] Cajas como red de seguridad mientras carga, si falla y en calidad baja,
      con el estado en texto en el panel
- [x] 16 pruebas nuevas (373 en total) y `docs/capturas/` regeneradas, con tres
      capturas más de la vista libre
- [x] `docs/vista3d.md`, PEN-021 y PEN-022

Resultado: el motor, la traza y los informes de las fases 1 a 4 quedan intactos.
Lo que se vio al revisar las capturas y se corrigió: desde abajo la calzada
opaca tapaba la escena entera, que es justo lo contrario de «verlo todo desde
cualquier ángulo».

## Fase 7 — Resultados y documentación del estudio ✅

- [x] **Interpretación de los resultados y política recomendada**
      → `docs/politica-recomendada.md`, con las cinco conclusiones del estudio en
      la etapa 7 de `docs/estudio.md`
- [x] **Documento del estudio con las ocho etapas** de simulación —definición,
      formulación, datos, implementación, validación, experimentación,
      interpretación y documentación, las que fija la sección 1 del contexto—
      → `docs/estudio.md`
- [x] **Limitaciones y trabajo futuro** → `docs/estudio.md`, secciones finales:
      seis limitaciones ordenadas por cuánto pesan y doce líneas de trabajo
      futuro, cinco de ellas mediciones
- [x] Las advertencias de los pendientes, incorporadas a la interpretación en vez
      de arrastradas: **PEN-013** (la demanda de C→P no se midió y es la
      incertidumbre dominante), **PEN-009** (el modelo dice que la operación real
      ya cumple, así que los resultados van en términos relativos y los `Wq`
      absolutos no se presentan como predicción) y **PEN-011** (la regla es
      reactiva y el operador fue anticipativo)
- [x] **DEC-043**, **DEC-044** y **DEC-045** registradas

Resultado: el estudio se formula **en términos relativos y como seguro, no como
predicción** (DEC-043), porque tres resultados medidos lo obligan: el modelo dice
que la operación real ya cumple, subestima el pico con sesgo de un solo signo, y
la entrada que más mueve el resultado no se midió.

## Añadido — Arranque en frío ✅

Lo que la DEC-046 y PEN-016 dejaron abierto: ¿aguanta la política un festivo que
empiece con el peaje vacío?

- [x] **DEC-047**: diseño del experimento. Cuatro factores —arranque (cola 23 /
      cola 0), capacidad inicial (4 casetas / 1), perfil (medido / rampa) y
      control (regla / regla+tasa)— en los dos regímenes: **32 casos**
- [x] La **rampa** son los 12 intervalos medidos **reordenados de menor a mayor**:
      mismos valores, mismo total, otro orden. Escenario **construido** y
      rotulado como tal; no entra ni un número sin medir
- [x] Medida nueva `instantePrimeraOrdenSegundos`, que es la que mide la reacción
      de cada control. No se agrega con las demás escalares porque vale `null`
      cuando no hubo apertura y el `null` no tiene media
- [x] Informe generado → `docs/resultados/fase7-arranque-frio.md`
      (`npm run arranque`)
- [x] **6 pruebas nuevas (395 en total)**
- [x] **PEN-016 resuelto**; su redacción corregida

**Resultado 1: el disparador recupera lo que daba la cola heredada, y con
holgura.** Con servicio base y las casetas observadas, en frío la regla por cola
da 0,42 min y con disparador 0,28; es decir, **en frío con disparador sale mejor
que en caliente sin él** (0,32). Lo contundente está en la reacción: la regla por
cola tarda **20,46 min** en pedir la primera caseta y en 3 de 30 réplicas no la
pide nunca, mientras el disparador la pide a los **11,38 min** en las 30.
**9,09 min de ventaja.**

**Resultado 2, y es el que más consecuencias prácticas tiene: ninguna regla
compensa abrir el pico sin capacidad.** Con el perfil medido y servicio base,
pasar de 4 casetas iniciales a 1 multiplica la espera por **8,3** (0,28 → 2,35
min) y **ningún control cumple**; el disparador es ahí literalmente inerte (2,35
contra 2,35). La regla solo añade una caseta a la vez y cada una cuesta la
demora, así que **no recupera la capacidad que no se le dio al empezar**: 48,6
carriles-intervalo contra 51,8.

**Resultado 3, que sale al revés de la premisa del propio experimento: la demanda
que sube es el caso fácil.** El perfil medido es peor que la rampa en los 4 de 4
casos en frío (con 1 caseta, 2,35 contra 0,78 min), porque una rampa le regala
tiempo a una regla reactiva. **El caso malo es la demanda que ya empieza
arriba**, que es lo que hizo el festivo medido: arrancó en 92 veh/5 min. Se
corrigió la redacción de PEN-016, que decía lo contrario.

La conclusión de mayor valor es incómoda: **la palanca no está en la regla, está
en los datos que faltan.** El sustituto no medido de la demanda de C→P mueve el
`Wq` del peaje hasta 6,94 min; el parámetro de la regla que más mueve llega a
0,31 min. Más de veinte veces.

El **disparador anticipativo por tasa** que la DEC-028 dejó para esta fase se
recomendó primero sin medir (DEC-044) y después **se implementó y se midió**
a petición del usuario: ver el apartado siguiente.

## Añadido — Disparador anticipativo por tasa de llegadas ✅

Pedido después de cerrar la fase 7, cuando el estudio lo recomendaba sin haberlo
medido (DEC-044).

- [x] **DEC-046**: se implementa el disparador por tasa. **Supera de la DEC-006
      solo la parte que descartaba disparar por tasa** —el disparador por cola
      sigue siendo el principal— y de la DEC-044, la parte que decía "no se
      adopta". Se dispara lo que ocurra primero, cola o tasa
- [x] Tabla de umbrales **derivada, no transcrita**:
      `redondear(c × capacidad nominal − 4)` reproduce exactamente los
      21 / 46 / 70 / 95 del contexto, y **ningún otro desplazamiento entero lo
      hace**. Así sigue al tope por sentido igual que las de cola (DEC-031)
- [x] **Apagado por defecto:** el escenario base sigue siendo la regla tal como
      la especifica el contexto, y todos los resultados de las fases 1 a 4
      siguen comparables
- [x] Lee la **misma ventana móvil de 5 min que ρ**, sin parámetro nuevo y sin
      efectos laterales sobre el ρ del árbitro (hay prueba de las dos cosas).
      La cola inicial no entra en la ventana: mide demanda, no rezago (DEC-027)
- [x] Escenarios nuevos: `regla+tasa` en la fase 2 (4 conteos × 2 regímenes),
      en la fase 3 con el pozo compartido y **E2c más el barrido de estrés
      completo** en la fase 4. La matriz pasa de 160 a **214 escenarios**
- [x] **16 pruebas nuevas (389 en total)**, con las regresiones de las fases 1 a
      4 intactas
- [x] Los tres informes regenerados, y `docs/parametros.md` con los 33 parámetros
- [x] **PEN-011 cerrado**; PEN-016 resuelto en parte
- [x] `docs/estudio.md` y `docs/politica-recomendada.md` al día

**Resultado: el diagnóstico de PEN-011 era correcto y la corrección funciona.**
En el festivo con servicio base, `Wq` baja de 0,32 a **0,23 min** y la regla
**pasa por delante del operador** (0,28), que es justo lo que no conseguía con la
demora de 5 min. Cuesta 1,7 carriles-intervalo y hace 1,63 aperturas anticipadas
por réplica. Los cuatro conteos mejoran.

**Y queda confirmado por contraste:** con servicio lento el disparador es casi
inerte (1,23 → 1,19 min, 0,03 aperturas anticipadas), porque con la cola ya
desbordada el umbral de cola se cruza solo y **no queda nada que anticipar**.
Sirve donde el operador le ganaba a la regla y no donde la regla ya ganaba, que
es el patrón que predice el diagnóstico de la latencia.

**Dos límites que el estudio reporta y no suaviza:**

1. **No compra holgura de capacidad.** El punto de quiebre sigue en **×1,10** con
   el pozo de 6, exactamente igual que sin el disparador, y con el pozo de 8
   desplaza lo mismo que la regla por cola (+0,45 y +0,20). No añade casetas:
   reparte en el tiempo las que ya hay.
2. **Parte de la mejora sale del otro sentido.** Con el pozo compartido P→C baja
   de 0,35 a 0,23 min, pero C→P pierde 0,7 carriles-intervalo y el pozo queda
   agotado 8,4 min más.

Así que **la conclusión central del estudio no se mueve** (DEC-043): el
disparador mueve el `Wq` del peaje 0,09 min y el sustituto no medido de C→P lo
mueve 6,94. La palanca sigue estando en los datos que faltan.
