# Plan actual

Estado: 27/10/2026. Las fases se trabajan en orden. Una fase no se da por
cerrada mientras sus pruebas no pasen.

**Fases 1, 2 y 3 cerradas.** Siguiente: fase 4 (escenarios y corridas por
lotes). Antes de empezarla, leer en `docs/pendientes.md`: **PEN-013** (la
demanda de C→P no se midió y el sustituto decide el resultado del reparto: es la
incertidumbre dominante), PEN-008 (el modelo de cola única subestima la
congestión del pico, así que las casetas que salgan de aquí son cota inferior),
PEN-014 y PEN-015 (la reasignación por ρ favorece al sentido con menos casetas y
casi no se activa en el pico).

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

## Fase 4 — Escenarios y corridas por lotes

- [ ] Escenario 1: operación real observada (validación)
- [ ] Escenario 2: operación con la regla propuesta
- [ ] Escenario 3: demanda alta con factores 1,10, 1,13 y 1,20, con la regla y
      con 5 casetas fijas
- [ ] Escenario 4: sensibilidad de demora, meta de espera y cola inicial 0
- [ ] 30 réplicas con las mismas semillas (1…30) en todos los escenarios
- [ ] Tabla comparativa de escenarios con intervalos de confianza

## Fase 5 — Interfaz de configuración y modo tiempo real

- [ ] Formulario de configuración de datos y parámetros
- [ ] Modo tiempo real con tiempo simulado: 1×, 10×, 60×, pausa y reinicio
- [ ] Modo por lotes desde la interfaz, con barra de progreso
- [ ] Tableros de resultados (cola, espera, casetas abiertas en el tiempo)

## Fase 6 — Visualización 3D

- [ ] Escena del peaje con casetas y carriles
- [ ] Vehículos que avanzan, hacen cola y son atendidos
- [ ] Casetas que abren y cierran visiblemente
- [ ] Cámara y controles

## Fase 7 — Resultados y documentación del estudio

- [ ] Interpretación de los resultados y política recomendada
- [ ] Documento del estudio con las ocho etapas de simulación
- [ ] Limitaciones y trabajo futuro
