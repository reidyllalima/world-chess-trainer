import { Chess } from "chess.js";

export const CLASSIFICATIONS = {
  excellent:  { label: "Excelente",  emoji: "✨", color: "#00c853" },
  good:       { label: "Boa",        emoji: "👍", color: "#64dd17" },
  inaccuracy: { label: "Inexatidão", emoji: "⚠️", color: "#ffd600" },
  mistake:    { label: "Erro",       emoji: "❌", color: "#ff6d00" },
  blunder:    { label: "Grave Erro", emoji: "💥", color: "#d50000" },
};

// evalLoss = how many centipawns the mover lost vs best play
function classify(evalLoss) {
  if (evalLoss >= -15)  return "excellent";
  if (evalLoss >= -40)  return "good";
  if (evalLoss >= -100) return "inaccuracy";
  if (evalLoss >= -250) return "mistake";
  return "blunder";
}

function moveDescription(san) {
  if (san.includes("#")) return "xeque-mate";
  if (san.includes("+")) return "xeque";
  if (san.includes("x")) return "captura";
  if (san === "O-O")     return "roque curto";
  if (san === "O-O-O")   return "roque longo";
  if (san.includes("=")) return "promoção";
  return "jogada";
}

function bestMoveReason(san) {
  if (san.includes("#")) return "dava xeque-mate";
  if (san.includes("+")) return "criava xeque perigoso";
  if (san.includes("x")) return "capturava material valioso";
  if (san === "O-O" || san === "O-O-O") return "colocava o rei em segurança";
  if (san.includes("=")) return "promovia o peão";
  return "mantinha a melhor posição";
}

function buildCommentary(classification, isSameMove, playedSan, bestSan, evalLoss, color) {
  const side = color === "w" ? "Brancas" : "Pretas";
  const playedDesc = moveDescription(playedSan);

  if (isSameMove) {
    if (classification === "excellent") {
      return `${side}: Jogada perfeita! ${playedSan} é a melhor opção nesta posição.`;
    }
    return `${side}: Boa jogada! ${playedSan} está na direção certa.`;
  }

  const reason = bestMoveReason(bestSan);
  const lossText = Math.abs(evalLoss) > 50
    ? ` (perdeu cerca de ${(Math.abs(evalLoss) / 100).toFixed(1)} peões de vantagem)`
    : "";

  switch (classification) {
    case "good":
      return `${side}: ${playedSan} é boa, mas ${bestSan} era ligeiramente superior — ${reason}.`;
    case "inaccuracy":
      return `${side}: Pequena inexatidão${lossText}. Prefira ${bestSan}, que ${reason}.`;
    case "mistake":
      return `${side}: Erro${lossText}! O correto era ${bestSan}, pois ${reason}. Evite jogadas que cedem iniciativa sem compensação.`;
    case "blunder":
      return `${side}: Grave erro${lossText}! Esta ${playedDesc} cede vantagem decisiva. A jogada certa era ${bestSan}, que ${reason}. Marque esta posição para estudar!`;
    default:
      return `${side}: A melhor jogada era ${bestSan} (${reason}).`;
  }
}

// Converts UCI move to SAN in a given position
function uciToSan(fen, uciMove) {
  if (!uciMove || uciMove === "(none)") return uciMove;
  try {
    const tmp = new Chess(fen);
    const result = tmp.move({
      from: uciMove.slice(0, 2),
      to:   uciMove.slice(2, 4),
      promotion: uciMove[4] || "q",
    });
    return result ? result.san : uciMove;
  } catch {
    return uciMove;
  }
}

export async function analyzeGame(moves, engine, onProgress) {
  const results = [];

  for (let i = 0; i < moves.length; i++) {
    onProgress?.(i + 1, moves.length);

    const { san, from, to, fenBefore, color } = moves[i];

    // Score for the position before the move (mover's perspective)
    const { bestMove, score: scoreBefore } = await engine.analyzePosition(fenBefore, 12);

    // Build the FEN after the played move
    const tempAfter = new Chess(fenBefore);
    tempAfter.move({ from, to, promotion: "q" });
    const fenAfter = tempAfter.fen();

    // Score after the played move (opponent's perspective → negate for mover)
    const { score: scoreOpponent } = await engine.analyzePosition(fenAfter, 12);
    const scoreAfterMover = -scoreOpponent;

    // evalLoss: 0 means best move was played; negative means lost centipawns
    const evalLoss = scoreAfterMover - scoreBefore;

    const uciPlayed = `${from}${to}`;
    const isSameMove = bestMove === uciPlayed || bestMove === `${uciPlayed}q`;

    const classification = isSameMove ? "excellent" : classify(evalLoss);
    const bestSan        = uciToSan(fenBefore, bestMove);

    results.push({
      moveNumber: Math.floor(i / 2) + 1,
      color,
      san,
      from,
      to,
      fenAfter,
      bestSan,
      bestMove,
      isSameMove,
      evalLoss,
      classification,
      commentary: buildCommentary(classification, isSameMove, san, bestSan, evalLoss, color),
    });
  }

  return results;
}

export function computeAccuracy(results) {
  if (!results.length) return 0;
  const scores = { excellent: 100, good: 80, inaccuracy: 55, mistake: 25, blunder: 0 };
  const total = results.reduce((sum, r) => sum + (scores[r.classification] ?? 50), 0);
  return Math.round(total / results.length);
}
