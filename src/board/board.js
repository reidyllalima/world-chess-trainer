import { Chessground } from "chessground";

import "chessground/assets/chessground.base.css";
import "chessground/assets/chessground.brown.css";
import "chessground/assets/chessground.cburnett.css";

export class ChessBoardUI {

  constructor(onMove) {

    this.onMove = onMove;

    const element = document.getElementById("board");

    this.cg = Chessground(element, {

      orientation: "white",

      movable: {
        free: false,
        color: "white",
        dests: new Map(),
        showDests: true,
        events: { after: this.onMove },
      },

      premovable: { enabled: false },
    });
  }

  setPosition(fen, dests, turnColor = "white", showDests = true, autoShapes = []) {

    this.cg.set({

      fen,
      turnColor,
      viewOnly: false,

      movable: {
        free: false,
        color: "white",
        dests,
        showDests,
        events: { after: this.onMove },
      },

      premovable: { enabled: false },

      drawable: { autoShapes },
    });
  }

  // Mostra uma posição histórica em modo somente-leitura com o lance destacado
  showHistoricalPosition(fen, from, to, bestMoveUci = null) {

    const autoShapes = bestMoveUci && bestMoveUci !== "(none)"
      ? [{ orig: bestMoveUci.slice(0, 2), dest: bestMoveUci.slice(2, 4), brush: "paleBlue" }]
      : [];

    this.cg.set({
      fen,
      viewOnly: true,
      lastMove: [from, to],
      movable: { color: "none", dests: new Map() },
      drawable: { autoShapes },
    });
  }
}