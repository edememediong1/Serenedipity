/** Zen tiles: a 3x3 sliding puzzle. 0 is the empty space. */
export const SOLVED = [1, 2, 3, 4, 5, 6, 7, 8, 0];

export function neighbours(index: number, size = 3) {
  const r = Math.floor(index / size);
  const c = index % size;
  const out: number[] = [];
  if (r > 0) out.push(index - size);
  if (r < size - 1) out.push(index + size);
  if (c > 0) out.push(index - 1);
  if (c < size - 1) out.push(index + 1);
  return out;
}

export function canMove(board: number[], index: number) {
  return neighbours(index).includes(board.indexOf(0));
}

export function move(board: number[], index: number) {
  if (!canMove(board, index)) return board;
  const next = [...board];
  const empty = board.indexOf(0);
  [next[empty], next[index]] = [next[index], next[empty]];
  return next;
}

/** Shuffle by making random legal moves from the solved board, so every puzzle is solvable. */
export function shuffle(random: () => number, steps = 60): number[] {
  let board = [...SOLVED];
  let prev = -1;
  for (let i = 0; i < steps; i++) {
    const empty = board.indexOf(0);
    const options = neighbours(empty).filter((n) => n !== prev);
    const pick = options[Math.floor(random() * options.length)];
    prev = empty;
    board = move(board, pick);
  }
  return isSolved(board) ? shuffle(random, steps) : board;
}

export function isSolved(board: number[]) {
  return board.every((v, i) => v === SOLVED[i]);
}
