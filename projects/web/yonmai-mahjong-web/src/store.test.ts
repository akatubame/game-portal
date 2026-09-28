import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { initialState } from "./engine/game";
import type { GameState } from "./engine/types";

const resultState = (): GameState => ({
  ...initialState(), phase: "roundResult", roundSequence: 1,
  roundResult: { winnerId: 0, loserId: 1, yaku: [], totalHan: 1, rankName: "1翻", basePoints: 1000,
    isTsumo: false, isDraw: false, winTile: null, winTiles: [], pointChanges: [1000, -1000, 0, 0] }
});
let data: Map<string, string>;
beforeEach(() => {
  vi.resetModules();
  data = new Map();
  vi.stubGlobal("localStorage", {
    getItem: vi.fn((key: string) => data.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => { data.set(key, value); }),
    removeItem: vi.fn((key: string) => { data.delete(key); })
  });
});
afterEach(() => vi.unstubAllGlobals());

describe("保存と戦績", () => {
  it("同じ結果の別対局を記録し、同じ局の再表示は二重計上しない", async () => {
    const { useAppStore } = await import("./store");
    for (let i = 0; i < 2; i++) {
      useAppStore.setState({ game: resultState() });
      useAppStore.getState().recoverGame();
      useAppStore.getState().recoverGame();
    }
    expect(useAppStore.getState().statistics.normal.hands).toBe(2);
    expect(useAppStore.getState().statistics.normal.wins).toBe(2);
    expect(data.has("yonmai.snapshot.v2")).toBe(true);
    expect(data.has("yonmai.stats")).toBe(false);
  });
  it("旧保存の集計済み結果を移行時に二重計上しない", async () => {
    const state = resultState();
    delete state.gameId;
    delete state.roundSequence;
    data.set("yonmai.game", JSON.stringify(state));
    data.set("yonmai.stats", JSON.stringify({ normal: { hands: 4 } }));
    data.set("yonmai.recorded", JSON.stringify(["r:0:0:0:0:1:1000,-1000,0,0"]));
    const { useAppStore } = await import("./store");
    useAppStore.getState().recoverGame();
    expect(useAppStore.getState().statistics.normal.hands).toBe(4);
    expect(useAppStore.getState().game.gameId).toBeTruthy();
    expect(data.has("yonmai.game")).toBe(true);
  });
  it("保存容量不足でも対局を停止せず警告状態を返す", async () => {
    const { useAppStore } = await import("./store");
    vi.mocked(localStorage.setItem).mockImplementation(() => { throw new Error("容量不足"); });
    useAppStore.setState({ game: resultState() });
    expect(() => useAppStore.getState().recoverGame()).not.toThrow();
    expect(useAppStore.getState().saveFailed).toBe(true);
    expect(useAppStore.getState().statistics.normal.hands).toBe(1);
  });
  it("結果画面からタイトルに戻って再開しても追加ツモをしない", async () => {
    const { useAppStore } = await import("./store");
    const state = resultState();
    state.players[0].hand = [{ kind: "number", suit: "man", value: 1 }];
    useAppStore.setState({ game: state });
    useAppStore.getState().backToTitle();
    useAppStore.getState().resumeGame();
    expect(useAppStore.getState().game.phase).toBe("roundResult");
    expect(useAppStore.getState().game.players[0].hand).toHaveLength(1);
    expect(useAppStore.getState().game.wall).toBe(state.wall);
  });
  it("セーブ削除後は古い保存データが復活しない", async () => {
    data.set("yonmai.game", JSON.stringify(resultState()));
    const { useAppStore } = await import("./store");
    useAppStore.getState().clearSave();
    vi.resetModules();
    const reloaded = await import("./store");
    expect(reloaded.useAppStore.getState().game.players[0].hand).toEqual([]);
    expect(reloaded.useAppStore.getState().game.phase).toBe("title");
  });
});
