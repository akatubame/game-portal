import { useEffect, useMemo, useState } from "react";

export type RankingMode = "higher" | "lower";

export type RankingEntry = {
  id: string;
  name: string;
  score: number;
  display: string;
  meta?: string;
  recordedAt: string;
};

export type PendingRankingScore = {
  score: number;
  display: string;
  meta?: string;
};

type RankingConfig = {
  gameId: string;
  metricLabel: string;
  mode: RankingMode;
  limit?: number;
};

const anonymousName = "NO NAME";

function storageKey(gameId: string) {
  return `game-shelf-ranking-${gameId}`;
}

function readEntries(gameId: string): RankingEntry[] {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(storageKey(gameId)) ?? "[]");
    return Array.isArray(parsed)
      ? parsed.filter((entry): entry is RankingEntry =>
          entry &&
          typeof entry.id === "string" &&
          typeof entry.name === "string" &&
          typeof entry.score === "number" &&
          typeof entry.display === "string" &&
          typeof entry.recordedAt === "string"
        )
      : [];
  } catch {
    return [];
  }
}

function sortEntries(entries: RankingEntry[], mode: RankingMode) {
  return [...entries].sort((a, b) => (
    mode === "higher"
      ? b.score - a.score || a.recordedAt.localeCompare(b.recordedAt)
      : a.score - b.score || a.recordedAt.localeCompare(b.recordedAt)
  ));
}

export function useRanking({ gameId, metricLabel, mode, limit = 10 }: RankingConfig) {
  const [entries, setEntries] = useState<RankingEntry[]>(() => sortEntries(readEntries(gameId), mode).slice(0, limit));

  useEffect(() => {
    setEntries(sortEntries(readEntries(gameId), mode).slice(0, limit));
  }, [gameId, limit, mode]);

  const ranking = useMemo(() => ({
    entries,
    gameId,
    limit,
    metricLabel,
    mode,
    submit(name: string, pending: PendingRankingScore) {
      const cleanName = name.trim().slice(0, 18) || anonymousName;
      const nextEntry: RankingEntry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        name: cleanName,
        score: pending.score,
        display: pending.display,
        meta: pending.meta,
        recordedAt: new Date().toISOString()
      };
      const nextEntries = sortEntries([...entries, nextEntry], mode).slice(0, limit);
      setEntries(nextEntries);
      window.localStorage.setItem(storageKey(gameId), JSON.stringify(nextEntries));
    },
    clear() {
      setEntries([]);
      window.localStorage.removeItem(storageKey(gameId));
    }
  }), [entries, gameId, limit, metricLabel, mode]);

  return ranking;
}

export type RankingHandle = ReturnType<typeof useRanking>;

export function RankingPanel({
  pendingScore,
  ranking
}: {
  pendingScore?: PendingRankingScore | null;
  ranking: RankingHandle;
}) {
  const [name, setName] = useState("");
  const [registeredKey, setRegisteredKey] = useState("");
  const pendingKey = pendingScore ? `${pendingScore.score}:${pendingScore.display}:${pendingScore.meta ?? ""}` : "";
  const alreadyRegistered = pendingKey !== "" && pendingKey === registeredKey;

  useEffect(() => {
    setRegisteredKey("");
  }, [pendingKey]);

  return (
    <div className="ranking-card">
      <div className="ranking-heading">
        <div>
          <p className="eyebrow">RANKING</p>
          <h2>ランキング</h2>
        </div>
        <span>{ranking.metricLabel}</span>
      </div>

      {pendingScore && (
        <div className="ranking-submit">
          <p>
            今回の記録: <strong>{pendingScore.display}</strong>
            {pendingScore.meta && <small>{pendingScore.meta}</small>}
          </p>
          <div>
            <input
              type="text"
              value={name}
              maxLength={18}
              onChange={(event) => setName(event.target.value)}
              placeholder="名前"
              aria-label="ランキングに残す名前"
            />
            <button
              className="primary-button"
              type="button"
              disabled={alreadyRegistered}
              onClick={() => {
                ranking.submit(name, pendingScore);
                setRegisteredKey(pendingKey);
              }}
            >
              {alreadyRegistered ? "登録済み" : "登録"}
            </button>
          </div>
        </div>
      )}

      {ranking.entries.length > 0 ? (
        <ol className="ranking-list">
          {ranking.entries.map((entry, index) => (
            <li key={entry.id}>
              <span>{index + 1}</span>
              <strong>{entry.name}</strong>
              <em>{entry.display}</em>
              {entry.meta && <small>{entry.meta}</small>}
            </li>
          ))}
        </ol>
      ) : (
        <p className="ranking-empty">まだランキング記録がありません。</p>
      )}

      {ranking.entries.length > 0 && (
        <button className="ghost-button ranking-clear" type="button" onClick={ranking.clear}>
          ランキング削除
        </button>
      )}
    </div>
  );
}
