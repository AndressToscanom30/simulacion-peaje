# Contexto inicial — Simulación del peaje Los Acacios

Estado: 26/10/2026. Lo que está aquí está decidido y no se reabre. Si choca con el código o los datos, se anota en `docs/pendientes.md` y se sigue con lo más razonable.
La arquitectura del código (estructura de carpetas, librerías, nombres) NO está decidida aquí: se decide en el desarrollo y se registra en `docs/decisiones/registro.md`.

## 1. Qué se construye

Software de simulación hecho en **React + JavaScript** del peaje Los Acacios (vía Cúcuta–Pamplona), con **visualización 3D** del flujo de vehículos. El usuario configura los datos, corre la simulación y ve el resultado. Es un proyecto universitario (Modelos Matemáticos, UDES) que sigue las etapas de un estudio de simulación: definición, formulación, datos, implementación, validación, experimentación, interpretación y documentación.

**Propósito:** diseñar y evaluar una **política de apertura y cierre de las casetas de cobro en efectivo según la demanda**, dimensionada para días pico (festivos y temporada alta). En días normales el peaje funciona bien (viernes, ρ ≈ 0,40); el problema está en picos como el retorno de un festivo.

## 2. Modelo

- Cola **M/M/c**: una cola única FIFO por sentido, atendida por `c(t)` casetas idénticas. Se simulan los dos sentidos.
- **6 casetas de efectivo** compartidas entre sentidos (pozo común): mínimo 1 y máximo 5 por sentido. El carril TAG queda fuera.
- Clientes: vehículos de pago en efectivo. Fuera del modelo: motocicletas, carril TAG y retén policial (los conteos se tomaron después de él).
- La categoría del vehículo no entra al modelo.
- Configuración base (solo para el diagrama): 3 casetas por sentido en tráfico constante.

## 3. Parámetros

| Parámetro | Valor |
|---|---|
| Tiempo medio de atención | 12,1016 s (50 mediciones) |
| Tasa de servicio μ | 297,48 veh/h por caseta (≈ 24,8 veh/5 min) |
| Desviación del servicio | 5,59 s (CV = 0,46) |
| Mín. / máx. observados | 4,13 s / 29,18 s |

- **Servicio: distribución gamma** con `k = 4,68` y `θ = 2,58 s`. No es exponencial. El máximo de 29,18 s es válido y no se descarta.
- **Llegadas: Poisson por tramos.** La tasa de cada intervalo de 5 min es el conteo real de ese intervalo (en veh/5 min) multiplicado por el factor del escenario.
- Espera estimada en cola: `Wq_est = Lq × 12,1 / c` segundos.

## 4. Regla de apertura y cierre (por sentido)

Se dispara por **cola observada** (total de vehículos esperando en todas las casetas abiertas del sentido, sin contar los que están siendo atendidos). Se evalúa tras cada llegada y cada fin de servicio. Todos los valores son **configurables**.

| Casetas abiertas | Abrir otra si cola > | Cerrar una si cola < |
|---|---|---|
| 1 | 4 | — |
| 2 | 9 | 2 |
| 3 | 14 | 4 |
| 4 | 19 | 7 |
| 5 | no hay más | 9 |

- **Apertura:** al cumplirse la condición se programa para `t + demora` (caso base 5 min; sensibilidad 0 y 10). Una sola apertura pendiente por sentido.
- **Cierre:** la cola debe mantenerse bajo el umbral **15 min seguidos**. Si sube, se reinicia el conteo. Se marca una caseta y se cierra al terminar su servicio (no se interrumpe).
- **Caseta liberada:** si el otro sentido tiene ρ > 0,60 (ρ = llegadas de los últimos 5 min ÷ (c × 24,8)) y c < 5, la caseta se **reasigna** a ese sentido (con la misma demora de apertura). Si no, solo se cierra y vuelve al pozo.
- **Sin casetas libres al abrir:** si piden dos sentidos, gana el que supere 2,5 min de espera estimada, empezando por el peor; si ninguno la supera, gana donde más baje la cola total. Si pide uno solo, espera a que se cierre una.
- **Derivación (M/M/c con Wq ≤ 1 min):** abrir la 2.ª en 21 llegadas/5 min, la 3.ª en 46, la 4.ª en 70 y la 5.ª en 95. Con 5 casetas la capacidad máxima es 124 veh/5 min.
- Dos modos de control de `c`: **programado** (copia lo que hizo el operador, para validar) y **por regla**.

## 5. Criterio de desempeño

- **Meta:** espera promedio en cola `Wq ≤ 1 min`.
- **Máximo tolerable:** 2,5 min (≈ 12 carros por caseta). Se acepta superarlo en a lo sumo el 5 % de los intervalos.

## 6. Corrida y validación

- Horizonte: la hora observada. **30 réplicas**, con semilla distinta por réplica (1…30) y las mismas semillas en todos los escenarios.
- Cola inicial y casetas iniciales son **parámetros**. Festivo: 23 vehículos en cola y 4 casetas en Pamplona→Cúcuta. Demás conteos: cola 0 y las casetas del primer intervalo observado.
- La cola se lee en un instante aleatorio dentro de cada intervalo de 5 min; además se guarda la cola máxima de la hora.
- Medidas por réplica: espera de cada vehículo (llegada → inicio de servicio), Wq por intervalo y por hora, % de intervalos con espera > 2,5 min, cola máxima, caudal de la hora, carriles-intervalo (integral de `c` ÷ 5 min).
- **Validación** (cada conteo se simula como un solo sentido con sus casetas observadas): caudal del festivo ≈ 1.064 veh/h; cola máxima 32 (festivo), 8 y 7 (domingos), 1 (viernes); carriles-intervalo contra lo que hizo el operador. El M/M/c coincide con la espera observada en los tres conteos normales (0,06 / 0,24 / 0,41 min) y se queda unas 20 veces corto en el festivo (1,28 contra 0,06 min); la simulación debe cerrar esa brecha. **No se ajustan parámetros para forzar el ajuste:** se reporta lo que sale.

## 7. Escenarios

1. Operación real observada (validación).
2. Operación con la regla propuesta.
3. Demanda alta: factores 1,10, 1,13 y 1,20 sobre los 12 intervalos del festivo, con la regla y con 5 casetas fijas. El 1,13 viene de la ANI (enero vs. promedio feb–jul); por defecto se aplica a ambos sentidos y es configurable.
4. Sensibilidad: demora de apertura (0, 5, 10 min), meta de espera y cola inicial 0 en el festivo.

Demanda de Cúcuta→Pamplona en el festivo: **no se midió**; se usa el conteo del domingo 1:00–2:00 p. m. (195 veh/h) como sustituto. Arranca con 1 caseta.

> **Nota del 28/10/2026 (DEC-029).** El sustituto por defecto pasó a ser el conteo del **viernes 02/10/2026 (238 veh/h) × un factor configurable**, porque ese sí se midió en el sentido Cúcuta→Pamplona. El domingo 1:00–2:00 p. m. (195 veh/h) se había medido en Pamplona→Cúcuta, el sentido contrario. Queda como alternativa de sensibilidad junto con domingoCP (451 veh/h). Esto cambia **solo el valor por defecto**; el resto de esta sección sigue igual. Ver `docs/decisiones/registro.md` (DEC-029) y PEN-013.

## 8. Limitaciones declaradas

- Los 50 tiempos de atención son de un solo sentido (Cúcuta→Pamplona) y se usan en todos los casos.
- Se registró el total de cola por sentido, no por caseta; el modelo de cola única no reproduce el desbalance entre casetas visto en campo.
- La demora real de apertura no está medida (entra como sensibilidad).
- Nunca se midieron los dos sentidos a la vez; la competencia por casetas se alimenta de un supuesto.
- Los datos de la ANI solo sirven como factor de escala (no se sabe si incluyen TAG). Pendiente de confirmar con la profesora.

## 9. Restricciones del desarrollo

- React + JavaScript (no TypeScript). Visualización 3D del flujo.
- El **motor de simulación es independiente** de React y del 3D (JS puro, sin DOM), para poder correr las 30 réplicas sin interfaz.
- Dos modos de ejecución: **tiempo real con tiempo simulado** (velocidad configurable: 1×, 10×, 60×, con pausa y reinicio) y **por lotes** (réplicas sin 3D).
- Aleatoriedad con generador propio y semilla (no `Math.random`). Gamma por Marsaglia–Tsang.
- Todo número de este documento va en una configuración editable, no escrito dentro de la lógica.

## 10. Datos de campo

Cada arreglo tiene 12 posiciones (intervalos de 5 min, en orden). `cola` es la lectura puntual del total en espera.

```js
export const conteos = {
  viernes: {            // 02/10/2026, Cúcuta→Pamplona, 12:00–13:00
    llegadas: [18, 21, 24, 19, 17, 23, 22, 20, 18, 21, 16, 19],   // 238
    casetas:  [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
    cola:     [0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0],
  },
  domingoCP: {          // 13/09/2026, Cúcuta→Pamplona, 11:50–12:50
    llegadas: [30, 49, 38, 37, 35, 38, 46, 32, 33, 37, 38, 38],   // 451
    casetas:  [3, 3, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3],
    cola:     [0, 0, 7, 0, 0, 4, 0, 5, 0, 0, 0, 6],
  },
  domingoPC: {          // 13/09/2026, Pamplona→Cúcuta, 13:00–14:00
    llegadas: [10, 22, 22, 13, 11, 25, 18, 16, 14, 17, 12, 15],   // 195
    casetas:  [2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    cola:     [0, 0, 6, 0, 0, 8, 2, 0, 0, 0, 0, 0],
  },
  festivoPC: {          // 12/10/2026, Pamplona→Cúcuta, 16:25–17:25
    llegadas: [92, 78, 60, 108, 92, 124, 78, 102, 86, 101, 99, 44], // 1.064
    casetas:  [4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 5],
    cola:     [23, 30, 20, 26, 21, 32, 20, 15, 17, 28, 26, 14],
  },
};

export const tiemposAtencion = [   // segundos, 50 mediciones, suma 605,08
  8.89, 10.82, 11.49, 9.15, 15.90, 6.08, 9.79, 19.65, 10.38, 11.75,
  15.30, 20.10, 9.08, 17.80, 9.23, 4.45, 9.30, 10.72, 23.82, 13.33,
  5.61, 6.14, 21.41, 8.03, 23.22, 12.24, 14.04, 8.24, 14.88, 15.94,
  16.24, 7.93, 6.01, 13.04, 8.55, 7.62, 10.35, 14.81, 12.62, 29.18,
  6.25, 10.26, 9.05, 4.13, 5.64, 16.98, 7.97, 22.30, 8.58, 10.79,
];
```

Tráfico mensual de la ANI 2026 (solo factor de escala): enero 274.302 veh (9.143/día), febrero 212.615, marzo 242.800, abril 226.534, mayo 244.703, junio 249.383, julio 252.730. Enero queda ≈ 13 % sobre el promedio de febrero a julio.
