const tabs = document.querySelectorAll(".tab");
const views = document.querySelectorAll(".view");

const state = {
  season: null,
  selectedWeek: 1,
  weekData: null,
  currentWeekData: null,
  liveFilter: "all"
};

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

function canonicalTeam(abbreviation) {
  const aliases = {
    WSH: "WAS",
    JAX: "JAC"
  };
  return aliases[abbreviation] || abbreviation;
}

function logoCode(team) {
  const aliases = {
    WAS: "wsh",
    WSH: "wsh",
    JAC: "jax",
    JAX: "jax"
  };
  return aliases[team] || String(team || "").toLowerCase();
}

function teamLogoUrl(team) {
  return `https://a.espncdn.com/i/teamlogos/nfl/500/${logoCode(team)}.png`;
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

function buildWeeklyRanking(week, participants) {
  if (!week) return participants.map(name => ({ name, points: 0 }));

  return participants.map(name => {
    let points = 0;

    week.games.forEach(game => {
      const score = evaluatePick(game, game.picks?.[name]).points;
      if (score !== null) points += score;
    });

    return { name, points };
  }).sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));
}

function weekHasScoredGames(week) {
  return Boolean(
    week?.games?.some(game =>
      game.awayScore !== null && game.homeScore !== null
    )
  );
}

function currentWeekProvisionalMap() {
  const names = state.season.participants.map(p => p.name);

  if (!state.currentWeekData || !weekHasScoredGames(state.currentWeekData)) {
    return new Map();
  }

  return new Map(
    buildWeeklyRanking(state.currentWeekData, names)
      .map(row => [row.name, row.points])
  );
}

function participantWeeklyPoints(participant) {
  const totalWeeks = state.season.weeks;
  const currentWeek = state.season.currentWeek;
  const provisional = currentWeekProvisionalMap();

  const points = Array.from({ length: totalWeeks }, (_, index) => {
    const weekNumber = index + 1;

    if (weekNumber > currentWeek) return null;

    if (weekNumber === currentWeek && provisional.has(participant.name)) {
      return provisional.get(participant.name);
    }

    return Number(participant.weeklyPoints?.[index] || 0);
  });

  return points;
}

function seasonRows() {
  const currentWeek = state.season.currentWeek;

  return state.season.participants.map(participant => {
    const weekly = participantWeeklyPoints(participant);
    const played = weekly
      .slice(0, currentWeek)
      .filter(value => value !== null);

    const total = played.reduce((sum, value) => sum + Number(value || 0), 0);
    const average = played.length ? total / played.length : 0;
    const best = played.length ? Math.max(...played) : 0;
    const current = weekly[currentWeek - 1] ?? 0;

    return {
      name: participant.name,
      weekly,
      total,
      average,
      best,
      current
    };
  }).sort((a, b) =>
    b.total - a.total ||
    b.average - a.average ||
    a.name.localeCompare(b.name)
  );
}

function rankingTable(rows, compact = false) {
  if (!rows.length) {
    return `<div class="empty">Todavía no hay datos.</div>`;
  }

  return `<table class="${compact ? "ranking-table compact" : "ranking-table"}">
    <thead>
      <tr>
        <th>#</th>
        <th>Jugador</th>
        <th class="points">Puntos</th>
      </tr>
    </thead>
    <tbody>
      ${rows.map((r, i) => `
        <tr>
          <td class="position">
            <span class="rank-number ${i < 3 ? `rank-${i + 1}` : ""}">${i + 1}</span>
          </td>
          <td class="player-cell">
            <span class="player-avatar">${r.name.slice(0, 1).toUpperCase()}</span>
            <span>${r.name}</span>
          </td>
          <td class="points">${r.points}</td>
        </tr>`).join("")}
    </tbody>
  </table>`;
}

function gameStatusLabel(game) {
  if (game.status === "live") return game.liveDetail || "EN VIVO";
  if (game.status === "final") return "FINAL";
  return "PROGRAMADO";
}

function gameStatusClass(game) {
  if (game.status === "live") return "is-live";
  if (game.status === "final") return "is-final";
  return "is-scheduled";
}

function formatGameDate(game) {
  if (!game.startDate) return "";
  const date = new Date(game.startDate);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleString("es-MX", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function scoreValue(score) {
  return score === null || score === undefined ? "–" : score;
}

function renderLiveGameCard(game) {
  const statusClass = gameStatusClass(game);
  const dateText = formatGameDate(game);
  const hasScore = game.awayScore !== null && game.homeScore !== null;

  const margin = hasScore
    ? Math.abs(Number(game.awayScore) - Number(game.homeScore))
    : null;

  const marginLabel =
    margin === null ? "" :
    margin === 0 ? "Empate" :
    margin <= 7 ? "Margen 0-7" : "Margen 8+";

  return `
    <button class="score-card ${statusClass}" type="button" data-open-game="${game.id}">
      <div class="score-card-top">
        <span class="status-pill">${game.status === "live" ? "● " : ""}${gameStatusLabel(game)}</span>
        ${dateText ? `<span class="game-date">${dateText}</span>` : ""}
      </div>

      <div class="score-matchup">
        <div class="score-team">
          <img src="${teamLogoUrl(game.away)}" alt="" loading="lazy">
          <strong>${game.away}</strong>
        </div>

        <div class="score-center">
          <span class="score-number">${scoreValue(game.awayScore)}</span>
          <span class="score-separator">-</span>
          <span class="score-number">${scoreValue(game.homeScore)}</span>
        </div>

        <div class="score-team">
          <img src="${teamLogoUrl(game.home)}" alt="" loading="lazy">
          <strong>${game.home}</strong>
        </div>
      </div>

      <div class="score-card-bottom">
        <span>${marginLabel || "Ver picks del partido"}</span>
        <span class="open-picks">Picks ›</span>
      </div>
    </button>`;
}

function renderModalGame(game) {
  const participants = state.season.participants.map(p => p.name);
  const hasScore = game.awayScore !== null && game.homeScore !== null;

  document.getElementById("modal-matchup").innerHTML = `
    <p class="eyebrow">${gameStatusLabel(game)}</p>
    <div class="modal-score">
      <div class="modal-team">
        <img src="${teamLogoUrl(game.away)}" alt="">
        <span>${game.away}</span>
      </div>
      <strong>${scoreValue(game.awayScore)} - ${scoreValue(game.homeScore)}</strong>
      <div class="modal-team">
        <img src="${teamLogoUrl(game.home)}" alt="">
        <span>${game.home}</span>
      </div>
    </div>
    <h2 id="modal-title">Picks del partido</h2>
  `;

  const awayCount = participants.filter(
    name => normalize(game.picks?.[name]?.winner) === game.away
  ).length;

  const homeCount = participants.filter(
    name => normalize(game.picks?.[name]?.winner) === game.home
  ).length;

  const totalPicks = awayCount + homeCount;
  const awayPercent = totalPicks ? (awayCount / totalPicks) * 100 : 50;
  const homePercent = totalPicks ? (homeCount / totalPicks) * 100 : 50;

  document.getElementById("modal-pick-summary").innerHTML = `
    <div class="pick-summary-teams">
      <span>
        <img src="${teamLogoUrl(game.away)}" alt="">
        <strong>${game.away}</strong>
        <b>${awayCount}</b> picks
      </span>
      <span>
        <b>${homeCount}</b> picks
        <strong>${game.home}</strong>
        <img src="${teamLogoUrl(game.home)}" alt="">
      </span>
    </div>
    <div class="pick-summary-bar" aria-label="Distribución de picks">
      <span class="pick-summary-away" style="width:${awayPercent}%"></span>
      <span class="pick-summary-home" style="width:${homePercent}%"></span>
    </div>
  `;

  const evaluatedParticipants = participants.map((name, originalIndex) => {
    const pick = game.picks?.[name];
    const result = evaluatePick(game, pick);
    return { name, pick, result, originalIndex };
  });

  if (hasScore) {
    evaluatedParticipants.sort((a, b) => {
      const aPoints = a.result.points ?? -1;
      const bPoints = b.result.points ?? -1;
      return bPoints - aPoints || a.originalIndex - b.originalIndex;
    });
  }

  const rows = evaluatedParticipants.map(({ name, pick, result }) => {
    let pointLabel = "—";
    let pointClass = "pending";

    if (result.points !== null) {
      pointLabel = result.points;
      pointClass =
        result.points === 3 ? "score-3" :
        result.points === 2 ? "score-2" : "score-0";
    }

    return `
      <tr>
        <td>
          <span class="player-modal">
            <span class="player-avatar">${name.slice(0, 1).toUpperCase()}</span>
            ${name}
          </span>
        </td>
        <td>
          ${pick?.winner
            ? `<span class="modal-pick-team">
                 <img src="${teamLogoUrl(pick.winner)}" alt="">
                 <strong>${pick.winner}</strong>
                 <span class="pick-margin">${pick.margin}</span>
               </span>`
            : `<span class="pending">Sin pick</span>`
          }
        </td>
        <td class="points ${pointClass}">${pointLabel}</td>
      </tr>`;
  }).join("");

  document.getElementById("modal-picks").innerHTML = `
    <div class="modal-table-wrap">
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
    ${!hasScore ? `<p class="modal-note">Los puntos aparecerán en cuanto haya marcador.</p>` : ""}
  `;

  const modal = document.getElementById("game-modal");
  modal.hidden = false;
  document.body.classList.add("modal-open");
  document.getElementById("close-game-modal").focus();
}

function closeGameModal() {
  document.getElementById("game-modal").hidden = true;
  document.body.classList.remove("modal-open");
}

function setupLiveGameClicks() {
  document.querySelectorAll("[data-open-game]").forEach(button => {
    button.addEventListener("click", () => {
      const game = state.weekData?.games.find(g => g.id === button.dataset.openGame);
      if (game) renderModalGame(game);
    });
  });
}

function setupLiveFilters() {
  document.querySelectorAll(".live-filter").forEach(button => {
    button.addEventListener("click", () => {
      state.liveFilter = button.dataset.filter;

      document.querySelectorAll(".live-filter").forEach(item => {
        item.classList.toggle("active", item === button);
      });

      renderLiveGames();
    });
  });
}

function getWeekFromUrl(defaultWeek, maxWeeks) {
  const params = new URLSearchParams(window.location.search);
  const week = Number(params.get("week"));

  if (Number.isInteger(week) && week >= 1 && week <= maxWeeks) {
    return week;
  }

  return defaultWeek;
}

function updateWeekUrl(week) {
  const url = new URL(window.location.href);
  url.searchParams.set("week", week);
  window.history.pushState({ week }, "", url);
}

function populateWeekSelector(totalWeeks, selectedWeek) {
  const select = document.getElementById("week-select");
  select.innerHTML = "";

  for (let week = 1; week <= totalWeeks; week++) {
    const option = document.createElement("option");
    option.value = week;
    option.textContent = `Semana ${week}`;
    option.selected = week === selectedWeek;
    select.appendChild(option);
  }
}

function updateWeekNavigationState(week, totalWeeks) {
  document.getElementById("week-select").value = week;
  document.getElementById("prev-week").disabled = week <= 1;
  document.getElementById("next-week").disabled = week >= totalWeeks;
  document.getElementById("live-week-label").textContent = `SEMANA ${week}`;
}

async function loadWeekData(weekNumber) {
  const padded = String(weekNumber).padStart(2, "0");

  try {
    const response = await fetch(`data/week-${padded}.json`, { cache: "no-store" });

    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`No se pudo cargar la semana ${weekNumber}`);
    }

    return await response.json();
  } catch (error) {
    console.warn(error);
    return null;
  }
}

function renderLiveGames() {
  const week = state.weekData;
  if (!week) return;

  const games = week.games.filter(game => {
    if (state.liveFilter === "all") return true;
    return game.status === state.liveFilter;
  });

  const target = document.getElementById("live-games");
  const empty = document.getElementById("live-empty");

  if (!games.length) {
    target.innerHTML = "";
    empty.hidden = false;
    empty.textContent = "No hay partidos en esta categoría.";
    return;
  }

  empty.hidden = true;
  target.innerHTML = games.map(renderLiveGameCard).join("");
  setupLiveGameClicks();
}

function renderGeneral() {
  const rows = seasonRows();
  const leaderTotal = rows[0]?.total || 0;
  const currentWeek = state.season.currentWeek;

  document.getElementById("general-current-week").textContent =
    `Semana actual: ${currentWeek}`;

  const podium = rows.slice(0, 3);

  document.getElementById("general-podium").innerHTML = podium.map((row, index) => `
    <article class="podium-card podium-${index + 1}">
      <div class="podium-medal">${["🥇", "🥈", "🥉"][index]}</div>
      <div class="podium-avatar">${row.name.slice(0, 1).toUpperCase()}</div>
      <span class="podium-place">${index + 1}° lugar</span>
      <h3>${row.name}</h3>
      <strong>${row.total} pts</strong>
      <small>${row.average.toFixed(1)} pts/semana</small>
    </article>
  `).join("");

  document.getElementById("general-ranking").innerHTML = `
    <div class="general-table-wrap">
      <table class="general-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Jugador</th>
            <th class="points">Total</th>
            <th class="points">Prom.</th>
            <th class="points">S${currentWeek}</th>
            <th class="points">Mejor</th>
            <th class="points">Dif.</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map((row, index) => {
            const gap = leaderTotal - row.total;
            return `
              <tr>
                <td>
                  <span class="rank-number ${index < 3 ? `rank-${index + 1}` : ""}">
                    ${index + 1}
                  </span>
                </td>
                <td>
                  <span class="player-cell">
                    <span class="player-avatar">${row.name.slice(0, 1).toUpperCase()}</span>
                    <strong>${row.name}</strong>
                  </span>
                </td>
                <td class="points total-points">${row.total}</td>
                <td class="points">${row.average.toFixed(1)}</td>
                <td class="points">${row.current}</td>
                <td class="points">${row.best}</td>
                <td class="points gap-points">${index === 0 ? "Líder" : `-${gap}`}</td>
              </tr>`;
          }).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderStats() {
  const rows = seasonRows();
  const totalWeeks = state.season.weeks;
  const currentWeek = state.season.currentWeek;

  const headers = Array.from(
    { length: totalWeeks },
    (_, index) => `<th class="${index + 1 === currentWeek ? "current-week-col" : ""}">S${index + 1}</th>`
  ).join("");

  const weeklyCells = row =>
    row.weekly.map((value, index) => `
      <td class="points ${index + 1 === currentWeek ? "current-week-col" : ""}">
        ${value === null ? "—" : value}
      </td>
    `).join("");

  document.getElementById("weekly-stats-table").innerHTML = `
    <table class="weekly-stats">
      <thead>
        <tr>
          <th class="sticky-rank">#</th>
          <th class="sticky-player">Jugador</th>
          ${headers}
          <th class="points stats-total">Total</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map((row, index) => `
          <tr>
            <td class="sticky-rank">
              <span class="rank-number ${index < 3 ? `rank-${index + 1}` : ""}">
                ${index + 1}
              </span>
            </td>
            <td class="sticky-player">
              <span class="player-cell">
                <span class="player-avatar">${row.name.slice(0, 1).toUpperCase()}</span>
                <strong>${row.name}</strong>
              </span>
            </td>
            ${weeklyCells(row)}
            <td class="points stats-total"><strong>${row.total}</strong></td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;

  const leader = rows[0];
  let bestWeek = null;

  rows.forEach(row => {
    row.weekly.forEach((points, index) => {
      if (points === null) return;

      if (!bestWeek || points > bestWeek.points) {
        bestWeek = {
          name: row.name,
          week: index + 1,
          points
        };
      }
    });
  });

  const completedWeeks = Math.max(0, currentWeek - (weekHasScoredGames(state.currentWeekData) ? 0 : 1));
  const seasonAverage = rows.length
    ? rows.reduce((sum, row) => sum + row.average, 0) / rows.length
    : 0;

  document.getElementById("season-summary").innerHTML = `
    <div class="summary-head">
      <span aria-hidden="true">📊</span>
      <div>
        <span class="ranking-kicker">RESUMEN</span>
        <h3>Temporada</h3>
      </div>
    </div>

    <article class="summary-feature">
      <span class="summary-icon">🔥</span>
      <div>
        <small>Líder general</small>
        <strong>${leader?.name || "Pendiente"}</strong>
        <span>${leader ? `${leader.total} pts` : "Sin datos"}</span>
      </div>
    </article>

    <article class="summary-item">
      <span class="summary-icon">📈</span>
      <div>
        <small>Mejor semana</small>
        <strong>${bestWeek && bestWeek.points > 0 ? `${bestWeek.points} pts` : "Pendiente"}</strong>
        <span>${bestWeek && bestWeek.points > 0 ? `${bestWeek.name} · S${bestWeek.week}` : "Aún sin resultados"}</span>
      </div>
    </article>

    <article class="summary-item">
      <span class="summary-icon">🎯</span>
      <div>
        <small>Promedio general</small>
        <strong>${seasonAverage.toFixed(1)} pts</strong>
        <span>Por participante</span>
      </div>
    </article>

    <article class="summary-item">
      <span class="summary-icon">🗓️</span>
      <div>
        <small>Progreso de temporada</small>
        <strong>${completedWeeks} / ${totalWeeks}</strong>
        <span>Semanas con resultados</span>
      </div>
    </article>

    <article class="summary-item">
      <span class="summary-icon">👥</span>
      <div>
        <small>Participantes</small>
        <strong>${rows.length}</strong>
        <span>En la quiniela</span>
      </div>
    </article>
  `;
}

function renderSeasonViews() {
  renderGeneral();
  renderStats();
}

function renderEmptyWeek(weekNumber) {
  document.getElementById("games-count").textContent = "0";
  document.getElementById("finished-count").textContent = "0";
  document.getElementById("max-points").textContent = "0";
  document.getElementById("progress-percent").textContent = "0%";
  document.getElementById("progress-bar").style.width = "0%";
  document.getElementById("live-status").textContent = "Próximamente";

  [
    "filter-all-count",
    "filter-final-count",
    "filter-live-count",
    "filter-scheduled-count"
  ].forEach(id => {
    document.getElementById(id).textContent = "0";
  });

  document.getElementById("refresh-scores").disabled = true;
  document.getElementById("ranking").innerHTML =
    `<div class="empty">Semana ${weekNumber} aún sin datos</div>`;

  document.getElementById("live-games").innerHTML = "";

  const liveEmpty = document.getElementById("live-empty");
  liveEmpty.hidden = false;
  liveEmpty.textContent = `Semana ${weekNumber} aún sin datos`;

  document.getElementById("last-updated").textContent =
    "No hay partidos cargados para actualizar.";
}

function renderLoadedWeek() {
  const week = state.weekData;
  const participants = state.season.participants.map(p => p.name);

  document.getElementById("refresh-scores").disabled = false;

  const totalGames = week.games.length;
  const finishedGames = week.games.filter(g => g.status === "final").length;
  const liveGames = week.games.filter(g => g.status === "live").length;
  const scheduledGames = week.games.filter(
    g => g.status !== "final" && g.status !== "live"
  ).length;

  const completion = totalGames
    ? Math.round((finishedGames / totalGames) * 100)
    : 0;

  document.getElementById("games-count").textContent = totalGames;
  document.getElementById("finished-count").textContent = finishedGames;
  document.getElementById("max-points").textContent = totalGames * 3;
  document.getElementById("progress-percent").textContent = `${completion}%`;
  document.getElementById("progress-bar").style.width = `${completion}%`;

  document.getElementById("filter-all-count").textContent = totalGames;
  document.getElementById("filter-final-count").textContent = finishedGames;
  document.getElementById("filter-live-count").textContent = liveGames;
  document.getElementById("filter-scheduled-count").textContent = scheduledGames;

  if (liveGames > 0) {
    document.getElementById("live-status").textContent =
      `${liveGames} en vivo · ${finishedGames} finalizados`;
  } else if (finishedGames === totalGames && totalGames > 0) {
    document.getElementById("live-status").textContent = "Semana finalizada";
  } else if (finishedGames > 0) {
    document.getElementById("live-status").textContent =
      `${finishedGames} de ${totalGames} finalizados`;
  } else {
    document.getElementById("live-status").textContent =
      "Sin resultados capturados";
  }

  const weeklyRows = buildWeeklyRanking(week, participants);

  document.getElementById("ranking").innerHTML =
    rankingTable(weeklyRows, true);

  renderLiveGames();
}

async function renderWeek(weekNumber) {
  updateWeekNavigationState(weekNumber, state.season.weeks);

  state.selectedWeek = weekNumber;
  state.weekData = await loadWeekData(weekNumber);
  state.liveFilter = "all";

  document.querySelectorAll(".live-filter").forEach(button => {
    button.classList.toggle("active", button.dataset.filter === "all");
  });

  document.getElementById("last-updated").textContent =
    "Resultados aún no actualizados desde la web.";

  if (!state.weekData) {
    renderEmptyWeek(weekNumber);
    return;
  }

  renderLoadedWeek();
}

function parseEspnGames(payload) {
  const events = Array.isArray(payload?.events) ? payload.events : [];

  return events.map(event => {
    const competition = event.competitions?.[0];
    const competitors = competition?.competitors || [];
    const away = competitors.find(c => c.homeAway === "away");
    const home = competitors.find(c => c.homeAway === "home");
    const statusType = event.status?.type || competition?.status?.type || {};
    const stateValue = statusType.state;

    if (!away || !home) return null;

    let status = "scheduled";

    if (statusType.completed || stateValue === "post") {
      status = "final";
    } else if (stateValue === "in") {
      status = "live";
    }

    const useScore = status === "live" || status === "final";

    return {
      away: canonicalTeam(away.team?.abbreviation),
      home: canonicalTeam(home.team?.abbreviation),
      awayScore: useScore ? Number(away.score) : null,
      homeScore: useScore ? Number(home.score) : null,
      status,
      liveDetail:
        status === "live"
          ? (statusType.shortDetail || statusType.detail || "")
          : "",
      startDate: event.date || competition?.date || null,
      venue: competition?.venue?.fullName || ""
    };
  }).filter(Boolean);
}

function mergeWebScores(localWeek, webGames) {
  let matched = 0;

  localWeek.games.forEach(game => {
    const webGame = webGames.find(candidate =>
      canonicalTeam(candidate.away) === canonicalTeam(game.away) &&
      canonicalTeam(candidate.home) === canonicalTeam(game.home)
    );

    if (!webGame) return;

    matched += 1;
    game.awayScore = webGame.awayScore;
    game.homeScore = webGame.homeScore;
    game.status = webGame.status;
    game.liveDetail = webGame.liveDetail;
    game.startDate = webGame.startDate;
    game.venue = webGame.venue;
  });

  return matched;
}

async function refreshScores() {
  if (!state.weekData) return;

  const button = document.getElementById("refresh-scores");
  const label = document.getElementById("refresh-label");
  const lastUpdated = document.getElementById("last-updated");

  button.disabled = true;
  button.classList.add("is-loading");
  label.textContent = "Actualizando...";
  lastUpdated.textContent = "Consultando resultados NFL...";

  try {
    const season = state.season.season;
    const week = state.selectedWeek;

    const endpoint =
      `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard` +
      `?dates=${encodeURIComponent(season)}&seasontype=2&week=${encodeURIComponent(week)}`;

    const response = await fetch(endpoint, { cache: "no-store" });

    if (!response.ok) {
      throw new Error(`Respuesta HTTP ${response.status}`);
    }

    const payload = await response.json();
    const webGames = parseEspnGames(payload);
    const matched = mergeWebScores(state.weekData, webGames);

    if (matched === 0) {
      throw new Error(
        "No se pudieron relacionar los partidos de la semana con la fuente de resultados."
      );
    }

    if (week === state.season.currentWeek) {
      state.currentWeekData = state.weekData;
      renderSeasonViews();
    }

    renderLoadedWeek();

    const time = new Date().toLocaleTimeString("es-MX", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });

    lastUpdated.textContent =
      `Actualizado ${time} · ${matched} partido${matched === 1 ? "" : "s"} encontrado${matched === 1 ? "" : "s"}.`;
  } catch (error) {
    console.error(error);
    lastUpdated.textContent =
      "No se pudieron actualizar los resultados. Intenta nuevamente.";
  } finally {
    button.disabled = false;
    button.classList.remove("is-loading");
    label.textContent = "Actualizar";
  }
}

async function init() {
  const seasonResponse = await fetch("data/season.json", { cache: "no-store" });
  state.season = await seasonResponse.json();

  state.currentWeekData = await loadWeekData(state.season.currentWeek);

  const initialWeek = getWeekFromUrl(
    state.season.currentWeek,
    state.season.weeks
  );

  populateWeekSelector(state.season.weeks, initialWeek);
  renderSeasonViews();

  async function goToWeek(week, pushState = true) {
    if (week < 1 || week > state.season.weeks) return;

    if (pushState) {
      updateWeekUrl(week);
    }

    await renderWeek(week);

    // General y Estadísticas son de temporada y NO dependen de la semana elegida.
    // Sólo En vivo cambia con el selector.
  }

  document.getElementById("week-select").addEventListener("change", event => {
    goToWeek(Number(event.target.value));
  });

  document.getElementById("prev-week").addEventListener("click", () => {
    goToWeek(state.selectedWeek - 1);
  });

  document.getElementById("next-week").addEventListener("click", () => {
    goToWeek(state.selectedWeek + 1);
  });

  document.getElementById("refresh-scores").addEventListener(
    "click",
    refreshScores
  );

  document.getElementById("close-game-modal").addEventListener(
    "click",
    closeGameModal
  );

  document.querySelector("[data-close-modal]").addEventListener(
    "click",
    closeGameModal
  );

  document.addEventListener("keydown", event => {
    if (
      event.key === "Escape" &&
      !document.getElementById("game-modal").hidden
    ) {
      closeGameModal();
    }
  });

  setupLiveFilters();

  window.addEventListener("popstate", () => {
    const week = getWeekFromUrl(
      state.season.currentWeek,
      state.season.weeks
    );
    goToWeek(week, false);
  });

  await renderWeek(initialWeek);
}

init().catch(error => {
  console.error(error);

  document.getElementById("ranking").innerHTML =
    '<div class="empty">No se pudieron cargar los datos de la temporada.</div>';
});
