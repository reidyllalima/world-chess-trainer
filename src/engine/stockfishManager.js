// Wrapper around the Stockfish WASM worker.
//
// Every request is pushed through a single serialized queue so the messages of
// two searches can never interleave on the shared worker. Each difficulty level
// maps to a Skill Level + a time/depth budget, so the engine always answers in a
// predictable, bounded amount of time (no soft-locks waiting on a deep search).

const LEVELS = {
  basic:    { skill: 0,  depth: 6,  movetime: 400  },
  medium:   { skill: 7,  depth: 12, movetime: 1000 },
  advanced: { skill: 14, depth: 18, movetime: 2200 },
  world:    { skill: 20, depth: 24, movetime: 4000 },
};

// Hard ceiling: if the worker ever goes silent we stop waiting after this long.
const WATCHDOG_MS = 20000;

export class StockfishManager {
  constructor() {
    this.engine = new Worker("/stockfish/stockfish-18-single.js", { type: "classic" });
    this.engine.postMessage("uci");
    this.engine.postMessage("isready");
    // Tail of the promise chain that serializes every engine request.
    this.queue = Promise.resolve();
    this.currentSkill = null;
  }

  // Chain a task so only one search talks to the worker at a time.
  _enqueue(task) {
    const result = this.queue.then(task, task);
    this.queue = result.catch(() => {});
    return result;
  }

  _setSkill(skill) {
    if (skill === this.currentSkill) return;
    this.currentSkill = skill;
    this.engine.postMessage(`setoption name Skill Level value ${skill}`);
  }

  // Runs one search and resolves with { bestMove, score } (score in centipawns
  // from the perspective of the side to move).
  _search(fen, { depth, movetime, skill }) {
    return this._enqueue(() => new Promise(resolve => {
      let score    = 0;
      let bestMove = "(none)";
      let settled  = false;

      const finish = (move) => {
        if (settled) return;
        settled = true;
        clearTimeout(watchdog);
        clearTimeout(killTimer);
        this.engine.removeEventListener("message", handler);
        resolve({ bestMove: move, score });
      };

      // If the search runs long, ask the engine to stop and let the handler pick
      // up the resulting bestmove. Only force-resolve if even that never arrives.
      let killTimer;
      const watchdog = setTimeout(() => {
        console.warn("Stockfish watchdog fired — stopping search");
        this.engine.postMessage("stop");
        killTimer = setTimeout(() => finish(bestMove), 1500);
      }, WATCHDOG_MS);

      const handler = (event) => {
        const line = event.data;
        if (typeof line !== "string") return;

        if (line.startsWith("info")) {
          const mate = line.match(/score mate (-?\d+)/);
          const cp   = line.match(/score cp (-?\d+)/);
          if (mate)    score = parseInt(mate[1], 10) > 0 ? 9999 : -9999;
          else if (cp) score = parseInt(cp[1], 10);
        } else if (line.startsWith("bestmove")) {
          finish(line.split(" ")[1] || "(none)");
        }
      };

      this.engine.addEventListener("message", handler);
      this._setSkill(skill);
      this.engine.postMessage(`position fen ${fen}`);
      this.engine.postMessage(`go depth ${depth} movetime ${movetime}`);
    }));
  }

  // Best move for the engine to play, weakened/strengthened per difficulty.
  async bestMove(fen, level) {
    const cfg = LEVELS[level] ?? LEVELS.medium;
    const { bestMove } = await this._search(fen, cfg);
    return bestMove;
  }

  // Full-strength evaluation, used for hints and post-game analysis.
  analyzePosition(fen, depth = 12, movetime = 1500) {
    return this._search(fen, { depth, movetime, skill: 20 });
  }
}
