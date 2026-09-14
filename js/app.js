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

function normalize(value) {
  return typeof value === "string" ? value.trim() : value;
}

function evaluatePick(game, pick) {
  if (
    game.awayScore === null ||
    game.homeScore === null ||
    !pick ||
    !pick.winner
  ) {
    return { points: null, winner: null, margin: null };
  }

  const awayScore = Number(game.awayScore);
  const homeScore = Number(game.homeScore);

  // Empate final/provisional: 0 puntos para todos.
  if (awayScore === homeScore) {
    return { points: 0, winner: "TIE", margin: null };
  }

  const winner = awayScore > homeScore ? game.away : game.home;
  const difference = Math.abs(awayScore - homeScore);
  const margin = difference <= 7 ? "0-7" : "8+";

  if (normalize(pick.winner) !== winner) {
    return { points: 0, winner, margin };
  }

  if (normalize(pick.margin) === margin) {
    return { points: 3, winner, margin };
  }

  return { points: 2, winner, margin };
}

function rankingTable(rows) {
  return `<table>
    <thead>
      <tr>
        <th>Pos.</th>
        <th>Participante</th>
        <th class="points">Puntos</th>
      </tr>
    </thead>
    <tbody>
      ${rows.map((r, i) => `
        <tr>
          <td class="position">${i + 1}</td>
          <td>${r.name}</td>
          <td class="points">${r.points}</td>
        </tr>`).join("")}
    </tbody>
  </table>`;
}

function renderGame(game, participants) {
  const hasScore = game.awayScore !== null && game.homeScore !== null;
  let resultText = "Pendiente";

  if (hasScore) {
    const difference = Math.abs(Number(game.awayScore) - Number(game.homeScore));
    const margin = difference === 0 ? "Empate" : difference <= 7 ? "0-7" : "8+";
    resultText = `${game.away} ${game.awayScore} - ${game.homeScore} ${game.home} · ${margin}`;
  }

  const rows = participants.map(name => {
    const pick = game.picks[name];
    const result = evaluatePick(game, pick);
    const pointsClass =
      result.points === 3 ? "score-3" :
      result.points === 2 ? "score-2" :
      result.points === 0 ? "score-0" : "pending";

    return `
      <tr>
        <td>${name}</td>
        <td>
          ${pick?.winner
            ? `<span class="pick">
                 <span class="pick-team">${normalize(pick.winner)}</span>
                 <span class="pick-margin">${normalize(pick.margin)}</span>
               </span>`
            : `<span class="pending">Sin pick</span>`}
        </td>
        <td class="points ${pointsClass}">
          ${result.points === null ? "—" : result.points}
        </td>
      </tr>`;
  }).join("");

  return `
    <article class="game-card">
      <div class="game-head">
        <div class="matchup">${game.away} vs ${game.home}</div>
        <div class="game-result">${resultText}</div>
      </div>
      <div class="pick-table-wrap">
        <table>
          <thead>
            <tr>
              <th>Participante</th>
              <th>Pick</th>
              <th class="points">Pts</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </article>`;
}

async function init() {
  const [seasonResponse, weekResponse] = await Promise.all([
    fetch("data/season.json"),
    fetch("data/week-01.json")
  ]);

  const season = await seasonResponse.json();
  const week = await weekResponse.json();
  const participants = season.participants.map(p => p.name);

  document.getElementById("current-week").textContent = week.week;
  document.getElementById("games-count").textContent = week.games.length;
  document.getElementById("max-points").textContent = week.games.length * 3;

  const finishedGames = week.games.filter(
    g => g.awayScore !== null && g.homeScore !== null
  ).length;

  document.getElementById("finished-count").textContent = finishedGames;

  if (finishedGames > 0) {
    document.getElementById("live-status").textContent =
      `${finishedGames} de ${week.games.length} con marcador`;
  }

  const weeklyRows = participants.map(name => {
    let points = 0;
    week.games.forEach(game => {
      const score = evaluatePick(game, game.picks[name]).points;
      if (score !== null) points += score;
    });
    return { name, points };
  }).sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));

  document.getElementById("ranking").innerHTML = rankingTable(weeklyRows);

  document.getElementById("games").innerHTML =
    week.games.map(game => renderGame(game, participants)).join("");

  const generalRows = season.participants.map(p => {
    const historic = p.weeklyPoints.reduce((sum, n) => sum + Number(n || 0), 0);
    const current = weeklyRows.find(r => r.name === p.name)?.points || 0;
    return { name: p.name, points: historic + current };
  }).sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));

  document.getElementById("general-ranking").innerHTML =
    rankingTable(generalRows);
}

init().catch(error => {
  console.error(error);
  document.getElementById("ranking").innerHTML =
    '<div class="empty">No se pudieron cargar los datos de la semana.</div>';
});
