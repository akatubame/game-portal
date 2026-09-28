import { describe, expect, it } from "vitest";
import { initialState, startGame } from "./engine/game";
import { isResumableGame, isSavedGameState } from "./savedGame";

describe("保存対局", () => {
  it("壊れた席番号・点数・操作情報・結果を拒否する", () => {
    const game = initialState();
    expect(isSavedGameState({ ...game, currentPlayerIdx: 4 })).toBe(false);
    expect(isSavedGameState({ ...game, dealerIdx: -1 })).toBe(false);
    expect(isSavedGameState({ ...game, pendingAction: { type: "discard" } })).toBe(false);
    expect(isSavedGameState({ ...game, roundResult: {} })).toBe(false);
    expect(isSavedGameState({ ...game, players: game.players.map((p) => ({ ...p, points: NaN })) })).toBe(false);
  });
  it("最終局の表示を維持した終局済み対局も再開不可", () => {
    const game = startGame("normal", () => 0.42);
    expect(isResumableGame({ ...game, phase: "title", roundNumber: 3, completed: true })).toBe(false);
  });
  it("進行中の対局だけを再開可能と判定する", () => {
    const game = startGame("normal", () => 0.42);
    expect(isResumableGame(game)).toBe(true);
  });

  it("東風戦終了後にタイトルへ戻った対局は再開不可と判定する", () => {
    const game = startGame("normal", () => 0.42);
    const finished = { ...game, phase: "title" as const, roundNumber: 4 };
    expect(isResumableGame(finished)).toBe(false);
  });

  it("飛び終了後にタイトルへ戻った対局は再開不可と判定する", () => {
    const game = startGame("normal", () => 0.42);
    const finished = {
      ...game,
      phase: "title" as const,
      players: game.players.map((player, index) => index === 1 ? { ...player, points: -100 } : player)
    };
    expect(isResumableGame(finished)).toBe(false);
  });

  it("必要な構造を欠く保存データを拒否する", () => {
    expect(isSavedGameState({ version: 1, phase: "playing" })).toBe(false);
    expect(isSavedGameState(initialState())).toBe(true);
  });
});
