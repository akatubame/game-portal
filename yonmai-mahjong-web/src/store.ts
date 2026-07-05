import { create } from "zustand";
import type { Difficulty, GameState, PlayerStatistics, Statistics, Tile } from "./engine/types";
import {
  autoDiscard, initialState, nextRound, playerAnkan, playerDiscard, playerRiichi, recoverPlayableState,
  playerRon, playerTsumo, ranking, skipRon, startGame
} from "./engine/game";
import { isResumableGame, isSavedGameState } from "./savedGame";

type View = "game" | "yaku" | "records" | "settings" | "rules";

const emptyStats = (): PlayerStatistics => ({
  games: 0, rankCounts: [0, 0, 0, 0], bestScore: 0, totalScore: 0,
  hands: 0, wins: 0, dealIns: 0, riichi: 0, totalWinPoints: 0,
  highestWinScore: 0, highestWinYaku: [], highestWinHandTiles: []
});
const defaultStats = (): Statistics => ({ beginner: emptyStats(), easy: emptyStats(), normal: emptyStats() });

const normalizeStats = (statistics: Partial<Statistics>): Statistics => {
  const fallback = defaultStats();
  return (["beginner", "easy", "normal"] as Difficulty[]).reduce((result, difficulty) => {
    const saved = statistics[difficulty];
    result[difficulty] = saved ? {
      ...fallback[difficulty],
      ...saved,
      rankCounts: Array.isArray(saved.rankCounts) ? saved.rankCounts : fallback[difficulty].rankCounts,
      highestWinYaku: Array.isArray(saved.highestWinYaku) ? saved.highestWinYaku : [],
      highestWinHandTiles: Array.isArray(saved.highestWinHandTiles) ? saved.highestWinHandTiles : []
    } : fallback[difficulty];
    return result;
  }, {} as Statistics);
};

const load = <T,>(key: string, fallback: T): T => {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) as T : fallback;
  } catch {
    return fallback;
  }
};

const loadedState = typeof localStorage === "undefined" ? null : load<unknown>("yonmai.game", null);
const savedState = isSavedGameState(loadedState) ? recoverPlayableState(loadedState) : null;
const savedStats = typeof localStorage === "undefined"
  ? defaultStats()
  : normalizeStats(load<Partial<Statistics>>("yonmai.stats", {}));
const savedYaku = typeof localStorage === "undefined" ? [] : load<string[]>("yonmai.yaku", []);
const recorded = typeof localStorage === "undefined" ? [] : load<string[]>("yonmai.recorded", []);

interface AppStore {
  game: GameState;
  view: View;
  statistics: Statistics;
  achievedYaku: string[];
  recordedKeys: string[];
  setView: (view: View) => void;
  newGame: (difficulty: Difficulty) => void;
  resumeGame: () => void;
  discard: (tile: Tile) => void;
  riichi: (tile: Tile) => void;
  ankan: (tile: Tile) => void;
  tsumo: () => void;
  ron: () => void;
  skipRon: () => void;
  autoDiscard: () => void;
  recoverGame: () => void;
  nextRound: () => void;
  backToTitle: () => void;
  clearSave: () => void;
}

const roundKey = (state: GameState) => {
  const result = state.roundResult;
  return result ? `r:${state.roundNumber}:${state.dealerIdx}:${state.honbaCount}:${result.winnerId}:${result.loserId}:${result.pointChanges.join(",")}` : "";
};
const gameKey = (state: GameState) => `g:${state.difficulty}:${state.players.map((p) => p.points).join(",")}`;

const updateRecords = (state: GameState, statistics: Statistics, achieved: string[], keys: string[]) => {
  let nextStats = statistics;
  let nextYaku = achieved;
  let nextKeys = keys;
  if (state.phase === "roundResult" && state.roundResult) {
    const key = roundKey(state);
    if (!keys.includes(key)) {
      const old = statistics[state.difficulty];
      const result = state.roundResult;
      const human = state.players[0];
      const win = result.winnerId === 0;
      const dealIn = result.loserId === 0;
      const winPoints = win ? result.pointChanges[0] : 0;
      const isHighestWin = winPoints > old.highestWinScore;
      const current = {
        ...old,
        hands: old.hands + 1,
        wins: old.wins + (win ? 1 : 0),
        dealIns: old.dealIns + (dealIn ? 1 : 0),
        riichi: old.riichi + (human.isRiichi ? 1 : 0),
        totalWinPoints: old.totalWinPoints + winPoints,
        highestWinScore: isHighestWin ? winPoints : old.highestWinScore,
        highestWinYaku: isHighestWin ? result.yaku.map((item) => item.name) : old.highestWinYaku,
        highestWinHandTiles: isHighestWin ? result.winTiles : old.highestWinHandTiles
      };
      nextStats = { ...statistics, [state.difficulty]: current };
      if (win) nextYaku = [...new Set([...achieved, ...result.yaku.map((item) => item.id)])];
      nextKeys = [...keys, key].slice(-100);
    }
  }
  if (state.phase === "gameResult") {
    const key = gameKey(state);
    if (!nextKeys.includes(key)) {
      const old = nextStats[state.difficulty];
      const ordered = ranking(state);
      const rank = ordered.findIndex((player) => player.id === 0);
      const score = state.players[0].points;
      const rankCounts = [...old.rankCounts];
      rankCounts[rank]++;
      nextStats = {
        ...nextStats,
        [state.difficulty]: {
          ...old, games: old.games + 1, rankCounts, bestScore: Math.max(old.bestScore, score), totalScore: old.totalScore + score
        }
      };
      nextKeys = [...nextKeys, key].slice(-100);
    }
  }
  return { statistics: nextStats, achievedYaku: nextYaku, recordedKeys: nextKeys };
};

const persist = (game: GameState, statistics: Statistics, achievedYaku: string[], recordedKeys: string[]) => {
  localStorage.setItem("yonmai.game", JSON.stringify(game));
  localStorage.setItem("yonmai.stats", JSON.stringify(statistics));
  localStorage.setItem("yonmai.yaku", JSON.stringify(achievedYaku));
  localStorage.setItem("yonmai.recorded", JSON.stringify(recordedKeys));
};

export const useAppStore = create<AppStore>((set, get) => {
  const apply = (game: GameState) => set((store) => {
    const playableGame = recoverPlayableState(game);
    const records = updateRecords(playableGame, store.statistics, store.achievedYaku, store.recordedKeys);
    persist(playableGame, records.statistics, records.achievedYaku, records.recordedKeys);
    return { game: playableGame, ...records };
  });
  return {
    game: savedState ?? initialState(),
    view: "game",
    statistics: savedStats,
    achievedYaku: savedYaku,
    recordedKeys: recorded,
    setView: (view) => set({ view }),
    newGame: (difficulty) => apply(startGame(difficulty)),
    resumeGame: () => {
      const game = get().game;
      if (!isResumableGame(game)) {
        localStorage.removeItem("yonmai.game");
        set({ game: initialState(game.difficulty), view: "game" });
        return;
      }
      apply({
        ...game,
        phase: game.pendingAction ? "waiting" : "playing"
      });
      set({ view: "game" });
    },
    discard: (tile) => apply(playerDiscard(get().game, tile)),
    riichi: (tile) => apply(playerRiichi(get().game, tile)),
    ankan: (tile) => apply(playerAnkan(get().game, tile)),
    tsumo: () => apply(playerTsumo(get().game)),
    ron: () => apply(playerRon(get().game)),
    skipRon: () => apply(skipRon(get().game)),
    autoDiscard: () => apply(autoDiscard(get().game)),
    recoverGame: () => apply(get().game),
    nextRound: () => apply(nextRound(get().game)),
    backToTitle: () => apply({ ...get().game, phase: "title" }),
    clearSave: () => {
      const game = initialState(get().game.difficulty);
      localStorage.removeItem("yonmai.game");
      set({ game, view: "game" });
    }
  };
});
