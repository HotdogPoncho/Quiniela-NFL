# 🏈 Quiniela NFL 2026

Dashboard web para visualizar la quiniela NFL durante las 18 semanas de temporada.

## Reglas de puntuación

- 0 puntos: no se acierta al ganador.
- 2 puntos: se acierta al ganador, pero no el rango de diferencia.
- 3 puntos: se acierta al ganador y el rango de diferencia (`0-7` o `8+`).
- Si el partido termina empatado, todos obtienen 0 puntos.
- El punto de diferencia sólo se obtiene cuando también se acierta al ganador.

## Estructura inicial

- `index.html`: página principal.
- `css/styles.css`: estilos.
- `js/app.js`: comportamiento y cálculos de interfaz.
- `data/season.json`: participantes y estructura de 18 semanas.

Esta es la base inicial. Los picks, partidos y resultados en vivo se incorporarán en los siguientes pasos.
