import { describe, expect, it, vi } from "vitest";
import { initialState, nextRound, advanceUntilHuman, playerAnkan, playerDiscard, playerRiichi, playerRon, playerTsumo, startGame, startRound, validRiichiDiscards } from "./game";
import { bestDiscard } from "./hand";
import type { Difficulty } from "./types";

const seeded = (seed: number) => () => {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed / 4294967296;
};
describe("全開始席・全難易度の対局進行", () => {
  it("開始親の抽選が全4席を選べる", () => {
    for (let seat = 0; seat < 4; seat++) {
      let first = true;
      const random = seeded(15);
      const game = startGame("beginner", () => {
        if (first) { first = false; return (seat + 0.1) / 4; }
        return random();
      });
      expect(game.dealerIdx).toBe(seat);
      expect(game.players[seat].seatWind).toBe("east");
    }
  });
  for (const difficulty of ["beginner", "easy", "normal"] as Difficulty[]) {
    for (let dealer = 0; dealer < 4; dealer++) {
      it(`${difficulty}・開始親${dealer}から終局まで進められる`, () => {
        const random = seeded(20260928 + dealer);
        const spy = vi.spyOn(Math, "random").mockImplementation(random);
        try {
          let game = advanceUntilHuman(startRound({ ...initialState(difficulty), dealerIdx: dealer }, random));
          for (let step = 0; step < 3000 && game.phase !== "gameResult"; step++) {
            const previous = game;
            if (game.phase === "roundResult") game = nextRound(game);
            else if (game.pendingAction?.type === "ronCheck") game = playerRon(game);
            else if (game.pendingAction?.canTsumo) game = playerTsumo(game);
            else if (game.pendingAction?.canAnkan) game = playerAnkan(game, game.pendingAction.ankanTiles[0]);
            else if (game.pendingAction?.canRiichi) game = playerRiichi(game, validRiichiDiscards(game)[0]);
            else game = playerDiscard(game, game.players[0].isRiichi ? game.drawnTile! : bestDiscard(game.players[0].hand, game.players[0].ankan));
            expect(game).not.toBe(previous);
            expect(game.players.reduce((sum, p) => sum + p.points, game.riichiSticks * 1000)).toBe(240000);
          }
          expect(game.phase).toBe("gameResult");
          expect(nextRound(game)).toBe(game);
        } finally { spy.mockRestore(); }
      });
    }
  }
});
