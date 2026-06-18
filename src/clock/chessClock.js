export class ChessClock {
  constructor(minutes, increment) {
    this.white     = minutes * 60;
    this.black     = minutes * 60;
    this.increment = increment;
    this.turn      = "w";
    this.interval  = null;
    this.running   = false;
    this.onTimeout = null;
    this.render();
  }

  start() {
    if (this.interval) clearInterval(this.interval);
    this.running = true;
    this.interval = setInterval(() => {
      if (this.turn === "w") {
        this.white--;
        if (this.white <= 0) { this.white = 0; this.stop(); this.onTimeout?.("w"); }
      } else {
        this.black--;
        if (this.black <= 0) { this.black = 0; this.stop(); this.onTimeout?.("b"); }
      }
      this.render();
    }, 1000);
  }

  // Called right after a move is made by the current player
  switchTurn() {
    if (this.turn === "w") {
      this.white += this.increment;
      this.turn = "b";
    } else {
      this.black += this.increment;
      this.turn = "w";
    }
    this.render();
  }

  stop() {
    clearInterval(this.interval);
    this.interval = null;
    this.running = false;
  }

  format(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  }

  render() {
    document.getElementById("whiteTime").textContent = this.format(this.white);
    document.getElementById("blackTime").textContent = this.format(this.black);

    document.querySelector(".clock.white").classList.toggle("active", this.turn === "w" && this.running);
    document.querySelector(".clock.black").classList.toggle("active", this.turn === "b" && this.running);
  }
}
