export type NonogramCell = "unknown" | "filled" | "marked";

export type NonogramStatus = "playing" | "cleared";

export type NonogramTool = "fill" | "mark";

export type NonogramPuzzle = {
  id: string;
  name: string;
  sizeLabel: string;
  difficulty: string;
  solution: boolean[][];
};

export type NonogramRecord = Record<string, number>;
