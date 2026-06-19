import "./style.css";

import { StockfishManager } from "./engine/stockfishManager.js";
import { Chess } from "chess.js";
import { ChessClock } from "./clock/chessClock.js";
import { ChessBoardUI } from "./board/board.js";
import { addMove, resetMoveHistory, showGameOver, showAnalysisModal, hideAnalysisModal, attachAnalysisToHistory, updateOpeningPanel, showHintPanel, clearHintPanel } from "./ui/ui.js";
import { detectOpening } from "./openings/openingDetector.js";
import { gameStore } from "./data/gameStore.js";
import { analyzeGame } from "./analysis/gameAnalyzer.js";

const game   = new Chess();
const engine = new StockfishManager();
const clock  = new ChessClock(10, 5); // 10 min + 5 sec increment

let engineThinking = false;
let gameOver       = false;
let lastMatchLen   = 0;
let hintsEnabled   = false;
let hintArrow      = []; // shapes for the hint arrow, persists across refreshBoard calls

function refreshOpening() {
  const moves = gameStore.moves;
  if (!moves.length) return;
  const opening = detectOpening(moves);
  if (opening && opening.matchLen >= lastMatchLen) {
    lastMatchLen = opening.matchLen;
    updateOpeningPanel(opening);
  }
}

function setEngineThinkingUI(thinking) {
  const dot   = document.getElementById("thinkingDot");
  const clock = document.getElementById("clockBlack");
  if (thinking) {
    dot.classList.add("active");
    clock.classList.add("engine-thinking");
  } else {
    dot.classList.remove("active");
    clock.classList.remove("engine-thinking");
  }
}

clock.onTimeout = (color) => {
  const msg = color === "w" ? "Tempo esgotado! Pretas vencem." : "Tempo esgotado! Brancas vencem.";
  endGame(msg, color === "w" ? "black" : "white");
};

function legalMoves() {
  const dests = new Map();
  const squares = [
    "a8","b8","c8","d8","e8","f8","g8","h8",
    "a7","b7","c7","d7","e7","f7","g7","h7",
    "a6","b6","c6","d6","e6","f6","g6","h6",
    "a5","b5","c5","d5","e5","f5","g5","h5",
    "a4","b4","c4","d4","e4","f4","g4","h4",
    "a3","b3","c3","d3","e3","f3","g3","h3",
    "a2","b2","c2","d2","e2","f2","g2","h2",
    "a1","b1","c1","d1","e1","f1","g1","h1",
  ];
  squares.forEach(sq => {
    const piece = game.get(sq);
    if (!piece || piece.color !== game.turn()) return;
    const moves = game.moves({ square: sq, verbose: true });
    if (moves.length) dests.set(sq, moves.map(m => m.to));
  });
  return dests;
}

function refreshBoard() {
  const dests     = gameOver ? new Map() : legalMoves();
  const turnColor = game.turn() === "w" ? "white" : "black";
  const isBasic   = document.getElementById("difficulty").value === "basic";
  const showDests = isBasic;

  const basicShapes = (isBasic && !gameOver && turnColor === "white")
    ? Array.from(dests.keys()).map(sq => ({ orig: sq, brush: "paleGreen" }))
    : [];

  board.setPosition(game.fen(), dests, turnColor, showDests, [...basicShapes, ...hintArrow]);
}

function checkGameOver() {
  if (game.isCheckmate()) {
    const winner = game.turn() === "w" ? "Pretas" : "Brancas";
    endGame(`Xeque-mate! ${winner} vencem.`, game.turn() === "w" ? "black" : "white");
    return true;
  }
  if (game.isStalemate()) {
    endGame("Empate por afogamento!", "draw");
    return true;
  }
  if (game.isInsufficientMaterial()) {
    endGame("Empate por material insuficiente!", "draw");
    return true;
  }
  if (game.isThreefoldRepetition()) {
    endGame("Empate por repetição tripla!", "draw");
    return true;
  }
  if (game.isDraw()) {
    endGame("Empate!", "draw");
    return true;
  }
  return false;
}

function endGame(message, result) {
  gameOver = true;
  clock.stop();
  gameStore.setResult(result);
  refreshBoard();
  showGameOver(message);
}

// ── Hint analysis ─────────────────────────────────────────────────────────────

const HINT_LEVELS = [
  { maxLoss: 10,  icon: "✦",  label: "Excelente!",   color: "#21C063" },
  { maxLoss: 50,  icon: "✓",  label: "Boa jogada!",  color: "#2DB582" },
  { maxLoss: 150, icon: "?!", label: "Imprecisão",   color: "#EFA010" },
  { maxLoss: 400, icon: "?",  label: "Erro!",        color: "#D84040" },
  { maxLoss: Infinity, icon: "??", label: "Grave Erro!", color: "#C0392B" },
];

async function analyzePlayerMove(fenBefore, playerMove) {
  try {
    const { bestMove, score: bestScore } = await engine.analyzePosition(fenBefore, 10);
    const { score: scoreFromBlack }      = await engine.analyzePosition(game.fen(), 8);

    const playerScore = -scoreFromBlack; // convert to white's perspective
    const scoreLoss   = Math.max(0, bestScore - playerScore);

    const playerUci  = playerMove.from + playerMove.to;
    const isBestMove = bestMove && playerUci === bestMove.slice(0, 4);

    const level = isBestMove
      ? HINT_LEVELS[0]
      : HINT_LEVELS.find(l => scoreLoss <= l.maxLoss) ?? HINT_LEVELS.at(-1);

    let detail = isBestMove ? "Melhor jogada possível!" : "";

    if (!isBestMove && bestMove && bestMove !== "(none)") {
      try {
        const tmp = new Chess(fenBefore);
        const bm  = tmp.move({ from: bestMove.slice(0, 2), to: bestMove.slice(2, 4), promotion: bestMove[4] || "q" });
        detail = `Melhor era ${bm.san}`;
      } catch {
        detail = `Melhor era ${bestMove}`;
      }
      hintArrow = [{ orig: bestMove.slice(0, 2), dest: bestMove.slice(2, 4), brush: "green" }];
      refreshBoard();
    }

    showHintPanel({ icon: level.icon, label: level.label, detail, color: level.color });
  } catch (e) {
    console.warn("Hint analysis failed:", e);
  }
}

// ── Engine move ───────────────────────────────────────────────────────────────

async function makeEngineMove() {
  try {
    if (gameOver) return;

    const fenBefore = game.fen();
    const level     = document.getElementById("difficulty").value;
    const bestMove  = await engine.bestMove(fenBefore, level);

    if (!bestMove || bestMove === "(none)") {
      checkGameOver();
      return;
    }

    let move;
    try {
      move = game.move({
        from:      bestMove.slice(0, 2),
        to:        bestMove.slice(2, 4),
        promotion: bestMove[4] || "q",
      });
    } catch {
      return;
    }

    if (move) {
      gameStore.addMove({ san: move.san, from: move.from, to: move.to, fenBefore, color: "b" });
      addMove(move.san, "b");
      clock.switchTurn();
      refreshOpening();
      checkGameOver();
    }
  } catch (err) {
    console.error("Engine error:", err);
  } finally {
    engineThinking = false;
    setEngineThinkingUI(false);
    refreshBoard();
  }
}

// ── Player move ───────────────────────────────────────────────────────────────

async function onMove(from, to) {
  // Clear hint from previous move
  hintArrow = [];
  clearHintPanel();

  if (gameOver || engineThinking) {
    refreshBoard();
    return;
  }
  if (game.turn() !== "w") {
    refreshBoard();
    return;
  }

  const fenBefore = game.fen();

  try {
    const move = game.move({ from, to, promotion: "q" });
    if (!move) { refreshBoard(); return; }

    if (!clock.running) clock.start();

    gameStore.addMove({ san: move.san, from: move.from, to: move.to, fenBefore, color: "w" });
    addMove(move.san, "w");
    clock.switchTurn();
    refreshBoard();
    refreshOpening();

    if (checkGameOver()) return;

    engineThinking = true;
    setEngineThinkingUI(true);

    if (hintsEnabled) {
      await analyzePlayerMove(fenBefore, move);
    }

    await makeEngineMove();
  } catch {
    refreshBoard();
  }
}

// ── Init ──────────────────────────────────────────────────────────────────────

const board = new ChessBoardUI(onMove);
refreshBoard();

document.getElementById("difficulty").addEventListener("change", () => {
  refreshBoard();
});

document.getElementById("hintsToggle").addEventListener("click", () => {
  hintsEnabled = !hintsEnabled;
  const btn = document.getElementById("hintsToggle");
  btn.classList.toggle("active", hintsEnabled);
  btn.textContent = hintsEnabled ? "💡 Dicas: ON" : "💡 Dicas";
  if (!hintsEnabled) {
    hintArrow = [];
    clearHintPanel();
    refreshBoard();
  }
});

document.getElementById("newGame").addEventListener("click", () => {
  location.reload();
});

document.getElementById("newGameOverlay").addEventListener("click", () => {
  location.reload();
});

document.getElementById("analyzeBtn").addEventListener("click", async () => {
  const btn     = document.getElementById("analyzeBtn");
  const overlay = document.getElementById("gameOverOverlay");
  overlay.classList.add("hidden");

  btn.disabled    = true;
  btn.textContent = "Analisando…";

  const modal      = document.getElementById("analysisModal");
  const progressEl = document.getElementById("analysisProgress");
  modal.classList.remove("hidden");
  progressEl.classList.remove("hidden");
  progressEl.textContent = `Preparando análise de ${gameStore.moves.length} lances…`;

  const results = await analyzeGame(gameStore.moves, engine, (current, total) => {
    progressEl.textContent = `Analisando lance ${current} de ${total}…`;
  });

  progressEl.classList.add("hidden");
  btn.disabled    = false;
  btn.textContent = "Ver Análise";

  attachAnalysisToHistory(results, (fen, from, to, bestMove) => {
    board.showHistoricalPosition(fen, from, to, bestMove);
  });
  showAnalysisModal(results);
});

document.getElementById("closeAnalysis").addEventListener("click", () => {
  hideAnalysisModal();
});
