const tabs = document.querySelectorAll(".tab");
const views = document.querySelectorAll(".view");

tabs.forEach(tab => {
  tab.addEventListener("click", () => {
    tabs.forEach(t => t.classList.remove("active"));
    views.forEach(v => v.classList.remove("active"));
    tab.classList.add("active");
    document.getElementById(tab.dataset.view).classList.add("active");
  });
});

function tableHTML(rows) {
  return `<table>
    <thead><tr><th>Pos.</th><th>Participante</th><th class="points">Puntos</th></tr></thead>
    <tbody>${rows.map((r,i) => `<tr>
      <td class="position">${i + 1}</td>
      <td>${r.name}</td>
      <td class="points">${r.points}</td>
    </tr>`).join("")}</tbody>
  </table>`;
}

fetch("data/season.json")
  .then(r => r.json())
  .then(data => {
    const weekIndex = data.currentWeek - 1;
    const weekly = data.participants
      .map(p => ({ name: p.name, points: p.weeklyPoints[weekIndex] ?? 0 }))
      .sort((a,b) => b.points - a.points);

    const general = data.participants
      .map(p => ({ name: p.name, points: p.weeklyPoints.reduce((a,b) => a+b, 0) }))
      .sort((a,b) => b.points - a.points);

    document.getElementById("ranking").innerHTML = tableHTML(weekly);
    document.getElementById("general-ranking").innerHTML = tableHTML(general);
  })
  .catch(() => {
    document.getElementById("ranking").innerHTML =
      '<div class="empty">No se pudieron cargar los datos.</div>';
  });
