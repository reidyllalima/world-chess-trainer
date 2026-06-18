export class StockfishManager {
  constructor() {
    this.engine = new Worker("/stockfish/stockfish-18-single.js", { type: "classic" });
    this.busy = false;
    this.engine.postMessage("uci");
    this.engine.postMessage("isready");
  }

  getDepth(level) {
    switch (level) {
      case "basic":    return 3;
      case "medium":   return 8;
      case "advanced": return 14;
      case "world":    return 20;
      default:         return 8;
    }
  }

  bestMove(fen, level) {
    return new Promise(resolve => {
      const depth = this.getDepth(level);

      const cleanup = (move) => {
        clearTimeout(timeout);
        this.engine.removeEventListener("message", handler);
        this.busy = false;
        resolve(move);
      };

      // Safety net: if Stockfish never responds, unblock after 30s
      const timeout = setTimeout(() => {
        console.warn("Stockfish timeout — unblocking board");
        cleanup("(none)");
      }, 30000);

      const handler = (event) => {
        const line = event.data;
        if (typeof line === "string" && line.startsWith("bestmove")) {
          cleanup(line.split(" ")[1]);
        }
      };

      this.busy = true;
      this.engine.addEventListener("message", handler);
      this.engine.postMessage(`position fen ${fen}`);
      this.engine.postMessage(`go depth ${depth}`);
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
