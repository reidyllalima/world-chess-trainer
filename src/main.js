import "./style.css";

import { StockfishManager } from "./engine/stockfishManager.js";
import { Chess } from "chess.js";
import { ChessClock } from "./clock/chessClock.js";
import { ChessBoardUI } from "./board/board.js";
import { addMove, showGameOver, showAnalysisModal, hideAnalysisModal, attachAnalysisToHistory, updateOpeningPanel, showHintPanel, clearHintPanel } from "./ui/ui.js";
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
  const dot     = document.getElementById("thinkingDot");
  const clockEl = document.getElementById("clockBlack");
  if (thinking) {
    dot.classList.add("active");
    clockEl.classList.add("engine-thinking");
  } else {
    dot.classList.remove("active");
    clockEl.classList.remove("engine-thinking");
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

// ── Hints: live suggestion (before your move) + evaluation (after) ─────────────

const HINT_DEPTH    = 12;
const HINT_MOVETIME = 1200;

let suggestion    = null; // { fen, bestMove, bestScore } for the current player turn
let suggestionSeq = 0;    // guards against stale async suggestions

function uciToSan(fen, uci) {
  if (!uci || uci === "(none)") return uci;
  try {
    const tmp = new Chess(fen);
    const m = tmp.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] || "q" });
    return m ? m.san : uci;
  } catch {
    return uci;
  }
}

function moveReason(san) {
  if (san.includes("#"))                 return "dá xeque-mate!";
  if (san.includes("+"))                 return "dá xeque e ganha tempo";
  if (san.includes("="))                 return "promove o peão";
  if (san === "O-O" || san === "O-O-O")  return "coloca o rei em segurança";
  if (san.includes("x"))                 return "captura material";
  if (/^[NB]/.test(san))                 return "desenvolve uma peça ativa";
  if (/^[a-h][45]$/.test(san))           return "ocupa o centro";
  if (/^[KQR]/.test(san))                return "melhora a peça e a posição";
  return "melhora a sua posição";
}

// Analyze the current position and show an arrow + label suggesting a good move
// the player can play right now. Bails out if the position changes meanwhile.
async function showSuggestion() {
  if (!hintsEnabled || gameOver || engineThinking || game.turn() !== "w") return;

  const fen = game.fen();
  const seq = ++suggestionSeq;

  let res;
  try {
    res = await engine.analyzePosition(fen, HINT_DEPTH, HINT_MOVETIME);
  } catch {
    return;
  }

  // Discard if anything moved on while we were thinking.
  if (seq !== suggestionSeq || !hintsEnabled || gameOver || game.fen() !== fen) return;

  const { bestMove, score } = res;
  if (!bestMove || bestMove === "(none)") return;

  suggestion = { fen, bestMove, bestScore: score };
  hintArrow  = [{ orig: bestMove.slice(0, 2), dest: bestMove.slice(2, 4), brush: "green" }];

  const san = uciToSan(fen, bestMove);
  showHintPanel({ icon: "💡", label: `Sugestão: ${san}`, detail: moveReason(san), color: "#21C063" });
  refreshBoard();
}

function classifyLoss(loss) {
  if (loss <= 30)  return { icon: "✦",  label: "Excelente!",   color: "#21C063", nag: false };
  if (loss <= 90)  return { icon: "✓",  label: "Boa jogada!",  color: "#2DB582", nag: false };
  if (loss <= 200) return { icon: "?!", label: "Imprecisão",   color: "#EFA010", nag: true  };
  if (loss <= 450) return { icon: "?",  label: "Erro!",        color: "#D84040", nag: true  };
  return             { icon: "??", label: "Grave Erro!", color: "#C0392B", nag: true  };
}

// Evaluate the move the player just made (game already advanced past it).
async function evaluatePlayerMove(fenBefore, playerMove) {
  try {
    // Reuse the suggestion's analysis when it matches this position.
    let bestMove, bestScore;
    if (suggestion && suggestion.fen === fenBefore) {
      ({ bestMove, bestScore } = suggestion);
    } else {
      const r = await engine.analyzePosition(fenBefore, HINT_DEPTH, HINT_MOVETIME);
      bestMove = r.bestMove;
      bestScore = r.score;
    }

    const playerUci = playerMove.from + playerMove.to;
    const followed  = bestMove && bestMove !== "(none)" && playerUci === bestMove.slice(0, 4);
    if (followed) {
      showHintPanel({ icon: "✦", label: "Excelente!", detail: "Você seguiu a sugestão!", color: "#21C063" });
      return;
    }

    const { score: scoreFromBlack } = await engine.analyzePosition(game.fen(), HINT_DEPTH, HINT_MOVETIME);
    const loss = Math.max(0, bestScore - (-scoreFromBlack)); // both in white's perspective

    const v = classifyLoss(loss);
    let detail = "Lance sólido.";
    if (v.nag && bestMove && bestMove !== "(none)") {
      const bestSan = uciToSan(fenBefore, bestMove);
      detail = `Melhor era ${bestSan} — ${moveReason(bestSan)}`;
    }
    showHintPanel({ icon: v.icon, label: v.label, detail, color: v.color });
  } catch (e) {
    console.warn("Hint evaluation failed:", e);
  }
}

// ── Engine move ───────────────────────────────────────────────────────────────

async function makeEngineMove() {
  try {
    if (gameOver) return;

    const fenBefore = game.fen();
    const level     = document.getElementById("difficulty").value;
    let uci         = await engine.bestMove(fenBefore, level);

    // Safety net: if the engine returns nothing but the game isn't actually over,
    // play any legal move so the board can never soft-lock on the engine's turn.
    if (!uci || uci === "(none)") {
      if (checkGameOver()) return;
      const legal = game.moves({ verbose: true });
      if (!legal.length) { checkGameOver(); return; }
      const pick = legal[Math.floor(Math.random() * legal.length)];
      uci = pick.from + pick.to + (pick.promotion ?? "");
    }

    let move;
    try {
      move = game.move({
        from:      uci.slice(0, 2),
        to:        uci.slice(2, 4),
        promotion: uci[4] || "q",
      });
    } catch {
      return;
    }

    if (move) {
      gameStore.addMove({ san: move.san, from: move.from, to: move.to, fenBefore, color: "b" });
      addMove(move.san, "b");
      hintArrow = []; // engine has replied — drop the now-stale hint arrow
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
  // The player committed a move: drop the suggestion arrow/panel and cancel any
  // suggestion analysis still in flight for the previous position.
  hintArrow = [];
  clearHintPanel();
  suggestionSeq++;

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
      await evaluatePlayerMove(fenBefore, move);
    }

    await makeEngineMove();

    // Engine has replied — suggest a move for the new white turn.
    if (hintsEnabled) showSuggestion();
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
  if (hintsEnabled) {
    showSuggestion();           // suggest right away if it is the player's turn
  } else {
    suggestionSeq++;            // cancel any pending suggestion
    suggestion = null;
    hintArrow  = [];
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
