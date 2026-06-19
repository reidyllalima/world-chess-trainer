export class StockfishManager {
  constructor() {
    this.engine = new Worker("/stockfish/stockfish-18-single.js", { type: "classic" });
    this.busy = false;
    this.engine.postMessage("uci");
    this.engine.postMessage("isready");
  }

  getLimits(level) {
    switch (level) {
      case "basic":    return { depth: 3,  movetime: 300  };
      case "medium":   return { depth: 8,  movetime: 1000 };
      case "advanced": return { depth: 14, movetime: 2500 };
      case "world":    return { depth: 20, movetime: 5000 };
      default:         return { depth: 8,  movetime: 1000 };
    }
  }

  bestMove(fen, level) {
    return new Promise(resolve => {
      const { depth, movetime } = this.getLimits(level);

      const cleanup = (move) => {
        clearTimeout(timeout);
        this.engine.removeEventListener("message", handler);
        this.busy = false;
        resolve(move);
      };

      const timeout = setTimeout(() => {
        console.warn("Stockfish timeout — unblocking board");
        cleanup("(none)");
      }, movetime + 5000);

      const handler = (event) => {
        const line = event.data;
        if (typeof line === "string" && line.startsWith("bestmove")) {
          cleanup(line.split(" ")[1]);
        }
      };

      this.busy = true;
      this.engine.addEventListener("message", handler);
      this.engine.postMessage(`position fen ${fen}`);
      this.engine.postMessage(`go depth ${depth} movetime ${movetime}`);
    });
  }

  // Returns { bestMove: "e2e4", score: <centipawns from mover's perspective> }
  analyzePosition(fen, depth = 12) {
    return new Promise(resolve => {
      let lastScore = 0;

      const handler = (event) => {
        const line = event.data;
        if (typeof line !== "string") return;

        if (line.includes("score")) {
          const mateMatch = line.match(/score mate (-?\d+)/);
          const cpMatch   = line.match(/score cp (-?\d+)/);
          if (mateMatch) {
            lastScore = parseInt(mateMatch[1]) > 0 ? 9999 : -9999;
          } else if (cpMatch) {
            lastScore = parseInt(cpMatch[1]);
          }
        }

        if (line.startsWith("bestmove")) {
          const move = line.split(" ")[1];
          this.engine.removeEventListener("message", handler);
          this.busy = false;
          resolve({ bestMove: move, score: lastScore });
        }
      };

      this.busy = true;
      this.engine.addEventListener("message", handler);
      this.engine.postMessage(`position fen ${fen}`);
      this.engine.postMessage(`go depth ${depth}`);
    });
  }
}
