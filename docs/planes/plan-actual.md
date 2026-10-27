# Plan actual

Estado: 27/10/2026. Las fases se trabajan en orden. Una fase no se da por
cerrada mientras sus pruebas no pasen.

## Fase 1 — Motor de un sentido con casetas fijas + validación

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
- [x] Pruebas unitarias del motor

## Fase 2 — Regla de apertura y cierre

- [ ] Modo `c(t)` **por regla**, evaluada tras cada llegada y cada fin de servicio
- [ ] Umbrales de apertura (cola > 4 / 9 / 14 / 19) y de cierre (cola < 2 / 4 / 7 / 9)
- [ ] Apertura programada a `t + demora`, con una sola apertura pendiente por sentido
- [ ] Cierre solo si la cola se mantiene bajo el umbral 15 min seguidos, con
      reinicio del conteo si sube
- [ ] Sensibilidad de la demora (0, 5 y 10 min)
- [ ] Comparación de la regla contra la operación real observada

## Fase 3 — Reparto de casetas entre sentidos

- [ ] Los dos sentidos a la vez sobre el pozo común de 6 casetas (1 a 5 por sentido)
- [ ] Reasignación de la caseta liberada si el otro sentido tiene ρ > 0,60 y c < 5
- [ ] Desempate cuando los dos sentidos piden caseta y no hay libres
- [ ] Sustituir la demanda no medida de Cúcuta→Pamplona en el festivo por el
      conteo del domingo 1:00–2:00 p. m. (195 veh/h), arrancando con 1 caseta

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
