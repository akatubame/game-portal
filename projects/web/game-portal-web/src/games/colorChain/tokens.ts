export const blockColors = ["coral", "gold", "mint", "sky", "violet", "rose"] as const;
export const BOMB_BLOCK = "bomb" as const;
export const VERTICAL_LASER_BLOCK = "vertical-laser" as const;
export const HORIZONTAL_LASER_BLOCK = "horizontal-laser" as const;
export const COLOR_BREAKER_BLOCK = "color-breaker" as const;

export type BlockColor = (typeof blockColors)[number];
export type SpecialBlock =
  | typeof BOMB_BLOCK
  | typeof VERTICAL_LASER_BLOCK
  | typeof HORIZONTAL_LASER_BLOCK
  | typeof COLOR_BREAKER_BLOCK;
export type BlockToken = BlockColor | SpecialBlock;
export type BoardCell = BlockToken | null;
export type Board = BoardCell[][];
