import type { SlideBoard } from "./types";

export const SLIDE_SIZE = 4;
export const EMPTY_TILE = 0;

export function createSolvedBoard(): SlideBoard {
  return [...Array.from({ length: SLIDE_SIZE * SLIDE_SIZE - 1 }, (_, index) => index + 1), EMPTY_TILE];
}

export function isSolved(board: SlideBoard): boolean {
  const solved = createSolvedBoard();
  return board.every((value, index) => value === solved[index]);
}

export function getMovableTileIndexes(board: SlideBoard): number[] {
  const emptyIndex = board.indexOf(EMPTY_TILE);
  const emptyRow = Math.floor(emptyIndex / SLIDE_SIZE);
  const emptyColumn = emptyIndex % SLIDE_SIZE;

  return board
    .map((_, index) => index)
    .filter((index) => {
      const row = Math.floor(index / SLIDE_SIZE);
      const column = index % SLIDE_SIZE;
      const distance = Math.abs(row - emptyRow) + Math.abs(column - emptyColumn);
      return distance === 1;
    });
}

export function canMoveTile(board: SlideBoard, tileIndex: number): boolean {
  return getMovableTileIndexes(board).includes(tileIndex);
}

export function moveTile(board: SlideBoard, tileIndex: number): SlideBoard {
  if (!canMoveTile(board, tileIndex)) {
    return board;
  }

  const emptyIndex = board.indexOf(EMPTY_TILE);
  const nextBoard = [...board];
  [nextBoard[tileIndex], nextBoard[emptyIndex]] = [nextBoard[emptyIndex], nextBoard[tileIndex]];
  return nextBoard;
}

export function shuffleBoard(moveCount = 160): SlideBoard {
  let board = createSolvedBoard();
  let previousEmptyIndex = -1;

  for (let move = 0; move < moveCount; move += 1) {
    const emptyIndex = board.indexOf(EMPTY_TILE);
    const candidates = getMovableTileIndexes(board).filter((index) => index !== previousEmptyIndex);
    const candidate = candidates[Math.floor(Math.random() * candidates.length)];
    previousEmptyIndex = emptyIndex;
    board = moveTile(board, candidate);
  }

  if (isSolved(board)) {
    return shuffleBoard(moveCount);
  }

  return board;
}
