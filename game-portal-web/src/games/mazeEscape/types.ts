export type MazeDifficulty = "small" | "normal" | "large";

export type MazeStatus = "idle" | "playing" | "cleared";

export type MazeCell = {
  walls: {
    top: boolean;
    right: boolean;
    bottom: boolean;
    left: boolean;
  };
  visited: boolean;
};

export type MazeBest = {
  size: number;
  moves: number;
  seconds: number;
  recordedAt: string;
};
