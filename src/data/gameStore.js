export const gameStore = {
  // Each entry: { san, from, to, fenBefore, color }
  moves: [],
  result: null,

  addMove(data) {
    this.moves.push(data);
  },

  setResult(result) {
    this.result = result;
  },

  reset() {
    this.moves = [];
    this.result = null;
  },
};
