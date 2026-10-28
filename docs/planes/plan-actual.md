# Plan actual

Estado: 30/10/2026. Las fases se trabajan en orden. Una fase no se da por
cerrada mientras sus pruebas no pasen.

**Fases 1 a 6 cerradas.** Siguiente y última: fase 7 (resultados y documentación
del estudio). Todo el material está: los informes de `docs/resultados/`, el
catálogo de parámetros, la interfaz y las capturas de `docs/capturas/`.

Antes de empezarla, leer en `docs/pendientes.md`: **PEN-013** (la demanda de C→P
no se midió y es la sensibilidad que más mueve el resultado), PEN-008 (el modelo
de cola única subestima la congestión del pico, así que todo factor de quiebre
es una cota superior), y **PEN-016** (la cola inicial le hace de aviso temprano a
la regla: sin ella, P→C deja de cumplir). Y el disparador anticipativo por tasa
de llegadas, que **DEC-028 dejó expresamente para esta fase** (PEN-011).

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
- [x] Diagnóstico de la definición de cola de campo (DEC-024)
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

## Fase 7 — Resultados y documentación del estudio

- [ ] Interpretación de los resultados y política recomendada
- [ ] Documento del estudio con las ocho etapas de simulación
- [ ] Limitaciones y trabajo futuro
