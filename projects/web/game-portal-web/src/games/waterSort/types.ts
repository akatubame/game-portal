export type WaterColor = "red" | "blue" | "green" | "yellow" | "purple" | "orange";

export type WaterBottle = WaterColor[];

export type WaterSortStatus = "playing" | "cleared";

export type WaterSortRecord = Record<string, number>;

export type WaterSortHistory = {
  bottles: WaterBottle[];
  moves: number;
};
