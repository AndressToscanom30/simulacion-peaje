# Traspasos atendidos y préstamos por colapso

Generado por `npm run traspasos` el 2026-11-05.
**No editar a mano:** este archivo se regenera.

Dos perfiles, cuatro variantes cada uno, 30 réplicas por caso, semillas 1 a 30.
Cada grupo usa las mismas semillas para comparar con números aleatorios comunes (DEC-010).
La reasignación de la DEC-008 permanece activa en todos los casos; la demanda alta es E3 ×1,13.
Se reporta lo que salga: no se ajustaron umbrales ni parámetros.

| Perfil | Variante | Wq P→C (min) | Wq C→P (min) | Wq peaje (min) | Cola máx. muestr. (suma) | Carriles-int. | Préstamos/caso | Cumple |
|---|---|---:|---:|---:|---:|---:|---:|---|
| Festivo | Regla + reasignación | 0,53 ± 0,10 | 0,39 ± 0,10 | 0,51 ± 0,08 | 35,6 | 69,6 | 0,00 | sí |
| Festivo | Con préstamo | 0,37 ± 0,06 | 0,49 ± 0,12 | 0,39 ± 0,05 | 33,8 | 68,4 | 1,27 | sí |
| Festivo | Traspaso atendido | 0,40 ± 0,07 | 0,38 ± 0,10 | 0,40 ± 0,05 | 32,4 | 70,9 | 0,00 | sí |
| Festivo | Ambas opciones | 0,27 ± 0,04 | 0,46 ± 0,09 | 0,30 ± 0,03 | 30,1 | 70,7 | 2,07 | sí |
| Demanda ×1,13 (E3) | Regla + reasignación | 0,76 ± 0,23 | 0,81 ± 0,20 | 0,77 ± 0,18 | 54,1 | 70,2 | 0,00 | **no** |
| Demanda ×1,13 (E3) | Con préstamo | 0,73 ± 0,19 | 0,84 ± 0,20 | 0,75 ± 0,15 | 54,5 | 69,5 | 0,73 | **no** |
| Demanda ×1,13 (E3) | Traspaso atendido | 0,66 ± 0,20 | 0,80 ± 0,20 | 0,69 ± 0,15 | 49,0 | 70,9 | 0,00 | **no** |
| Demanda ×1,13 (E3) | Ambas opciones | 0,69 ± 0,25 | 0,75 ± 0,20 | 0,70 ± 0,19 | 49,8 | 70,9 | 1,00 | **no** |

`Wq` incluye el intervalo de confianza del 95 %; las colas máximas por sentido se suman, no son simultáneas.
El modelo subestima el pico (PEN-008): estas cifras sirven para comparar variantes, no como predicción del peaje.

