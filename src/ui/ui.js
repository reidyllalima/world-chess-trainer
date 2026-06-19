import { CLASSIFICATIONS, computeAccuracy } from "../analysis/gameAnalyzer.js";
import { getOpeningAdvice } from "../openings/openingAdvice.js";

let moveCount = 0;

export function addMove(san, color) {
  const container = document.getElementById("moves");

  if (color === "w") {
    moveCount++;
    const row = document.createElement("div");
    row.className = "move-row";
    row.id = `move-row-${moveCount}`;

    const num = document.createElement("span");
    num.className = "move-num";
    num.textContent = `${moveCount}.`;

    const white = document.createElement("span");
    white.className = "move-san white-move";
    white.id = `move-w-${moveCount}`;
    white.textContent = san;

    const black = document.createElement("span");
    black.className = "move-san black-move";
    black.id = `move-b-${moveCount}`;
    black.textContent = "...";

    row.append(num, white, black);
    container.appendChild(row);
  } else {
    const black = document.getElementById(`move-b-${moveCount}`);
    if (black) black.textContent = san;
  }

  container.scrollTop = container.scrollHeight;
}

export function updateOpeningPanel(opening) {
  const nameEl = document.getElementById("opening-name");
  const ecoEl  = document.getElementById("opening-eco");
  const tipEl  = document.getElementById("opening-tip");

  if (!opening) return;

  const advice = getOpeningAdvice(opening.eco);
  nameEl.textContent = opening.name;
  ecoEl.textContent  = opening.eco;
  tipEl.textContent  = advice.tip;
}

export function resetMoveHistory() {
  moveCount = 0;
  document.getElementById("moves").innerHTML = "";
}

export function showGameOver(message) {
  const overlay = document.getElementById("gameOverOverlay");
  document.getElementById("gameOverMessage").textContent = message;
  overlay.classList.remove("hidden");
}

export function showAnalysisModal(analysisResults) {
  const modal     = document.getElementById("analysisModal");
  const container = document.getElementById("analysisContent");
  container.innerHTML = "";

  const playerResults = analysisResults.filter(r => r.color === "w");
  const accuracy = computeAccuracy(playerResults);
  const counts   = { excellent: 0, good: 0, inaccuracy: 0, mistake: 0, blunder: 0 };
  playerResults.forEach(r => counts[r.classification]++);

  // Summary card
  const summary = document.createElement("div");
  summary.className = "analysis-summary";
  summary.innerHTML = `
    <div class="accuracy-circle">
      <span class="accuracy-value">${accuracy}%</span>
      <span class="accuracy-label">Precisão</span>
    </div>
    <div class="summary-stats">
      <div class="stat excellent">${counts.excellent} Excelentes</div>
      <div class="stat good">${counts.good} Boas</div>
      <div class="stat inaccuracy">${counts.inaccuracy} Inexatidões</div>
      <div class="stat mistake">${counts.mistake} Erros</div>
      <div class="stat blunder">${counts.blunder} Graves Erros</div>
    </div>
  `;
  container.appendChild(summary);

  // Move-by-move
  const title = document.createElement("h3");
  title.className = "analysis-moves-title";
  title.textContent = "Análise Lance por Lance";
  container.appendChild(title);

  let currentRow = null;

  analysisResults.forEach((r) => {
    const info  = CLASSIFICATIONS[r.classification];

    if (r.color === "w") {
      currentRow = document.createElement("div");
      currentRow.className = "analysis-move-row";
      container.appendChild(currentRow);

      const numEl = document.createElement("span");
      numEl.className = "analysis-num";
      numEl.textContent = `${r.moveNumber}.`;
      currentRow.appendChild(numEl);
    }

    const entry = document.createElement("div");
    entry.className = `analysis-entry ${r.color === "w" ? "white" : "black"}`;

    const badge = document.createElement("span");
    badge.className = "analysis-badge";
    badge.style.background = info.color;
    badge.textContent = `${info.emoji} ${info.label}`;

    const san = document.createElement("span");
    san.className = "analysis-san";
    san.textContent = r.san;

    const comment = document.createElement("p");
    comment.className = "analysis-comment";
    comment.textContent = r.commentary;

    entry.append(badge, san, comment);
    currentRow?.appendChild(entry);
  });

  modal.classList.remove("hidden");
}

export function hideAnalysisModal() {
  document.getElementById("analysisModal").classList.add("hidden");
}

export function attachAnalysisToHistory(analysisResults, onShowPosition) {
  let activeEl = null;

  analysisResults.forEach(r => {
    const id = r.color === "w" ? `move-w-${r.moveNumber}` : `move-b-${r.moveNumber}`;
    const el = document.getElementById(id);
    if (!el) return;

    el.classList.add("analyzed", `cls-${r.classification}`);

    el.addEventListener("click", () => {
      if (activeEl) activeEl.classList.remove("move-active");
      el.classList.add("move-active");
      activeEl = el;
      onShowPosition?.(r.fenAfter, r.from, r.to, r.isSameMove ? null : r.bestMove);
      renderMoveDetail(r);
    });
  });
}

function renderMoveDetail(r) {
  const info   = CLASSIFICATIONS[r.classification];
  const detail = document.getElementById("move-detail");
  const prefix = r.color === "w" ? `${r.moveNumber}.` : `${r.moveNumber}...`;

  detail.innerHTML = `
    <div class="move-detail-header">
      <span class="move-detail-num">${prefix}</span>
      <span class="move-detail-san">${r.san}</span>
      <span class="analysis-badge" style="background:${info.color}">${info.emoji} ${info.label}</span>
    </div>
    ${!r.isSameMove ? `<div class="move-detail-best">Melhor jogada: <strong>${r.bestSan}</strong></div>` : ""}
    <p class="move-detail-comment">${r.commentary}</p>
  `;
  detail.classList.add("visible");
}
