# 🏈 Quiniela NFL 2026

Dashboard web de la quiniela NFL 2026.

## Estado actual

La Semana 1 ya contiene los 16 partidos y los picks capturados en el Excel original.

La página calcula automáticamente:

- 0 puntos si falla el ganador.
- 2 puntos si acierta el ganador pero falla el rango.
- 3 puntos si acierta ganador y rango (`0-7` o `8+`).
- 0 puntos para todos cuando el marcador está empatado.

## Archivos principales

- `index.html`: interfaz.
- `css/styles.css`: estilos.
- `js/app.js`: motor de puntuación y renderizado.
- `data/season.json`: participantes y estructura de temporada.
- `data/week-01.json`: partidos y picks de la Semana 1.

## Próximo paso

Validar el motor con marcadores reales y después automatizar la actualización desde el Excel / resultados NFL.
