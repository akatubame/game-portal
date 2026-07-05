export type PongStatus = "idle" | "playing" | "paused" | "finished";

export type PongDifficulty = "easy" | "normal" | "hard";

export type PongBall = {
  x: number;
  y: number;
  vx: number;
  vy: number;
};

export type PongResult = {
  playerScore: number;
  cpuScore: number;
  winner: "player" | "cpu";
  difficulty?: PongDifficulty;
  recordedAt: string;
};
