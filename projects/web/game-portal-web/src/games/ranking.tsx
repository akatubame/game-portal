import { safeStorage } from "../safeStorage";
import { useI18n } from "../i18n";
import { translateDynamicText } from "../domTranslations";
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

function fallbackDisplay(score: number, metricLabel: string) {
  if (metricLabel.toLowerCase().includes("score")) {
    return `${score}点`;
  }

  return String(score);
}

function readEntries(gameId: string, metricLabel: string): RankingEntry[] {
  try {
    const parsed = JSON.parse(safeStorage.getItem(storageKey(gameId)) ?? "[]");
    return Array.isArray(parsed)
      ? parsed.filter((entry): entry is RankingEntry =>
          entry &&
          typeof entry.id === "string" &&
          typeof entry.name === "string" &&
          typeof entry.score === "number" &&
          typeof entry.recordedAt === "string"
        ).map((entry) => ({
          ...entry,
          display: typeof entry.display === "string" && entry.display.trim() ? entry.display : fallbackDisplay(entry.score, metricLabel)
        }))
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
  const [entries, setEntries] = useState<RankingEntry[]>(() => sortEntries(readEntries(gameId, metricLabel), mode).slice(0, limit));

  useEffect(() => {
    setEntries(sortEntries(readEntries(gameId, metricLabel), mode).slice(0, limit));
  }, [gameId, limit, metricLabel, mode]);

  const ranking = useMemo(() => ({
    entries,
    gameId,
    limit,
    metricLabel,
    mode,
    submit(name: string, pending: PendingRankingScore) {
      if (!Number.isFinite(pending.score)) return;
      const cleanName = name.trim().slice(0, 18) || anonymousName;
      const nextEntry: RankingEntry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        name: cleanName,
        score: pending.score,
        display: pending.display.trim() || fallbackDisplay(pending.score, metricLabel),
        meta: pending.meta,
        recordedAt: new Date().toISOString()
      };
      const nextEntries = sortEntries([...readEntries(gameId, metricLabel), nextEntry], mode).slice(0, limit);
      setEntries(nextEntries);
      safeStorage.setItem(storageKey(gameId), JSON.stringify(nextEntries));
    },
    clear() {
      setEntries([]);
      safeStorage.removeItem(storageKey(gameId));
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
  const { language } = useI18n();
  const en = language === "en";
  const localize = (value: string) => en ? translateDynamicText(value) : value;
  const [confirmClear, setConfirmClear] = useState(false);
  useEffect(() => setConfirmClear(false), [ranking.gameId]);
  const [registeredKey, setRegisteredKey] = useState("");
  const pendingKey = pendingScore ? `${ranking.gameId}:${pendingScore.score}` : "";
  const alreadyRegistered = pendingKey !== "" && pendingKey === registeredKey;

  useEffect(() => {
    setRegisteredKey("");
  }, [pendingKey]);

  return (
    <div className="ranking-card" data-native-i18n>
      <div className="ranking-heading">
        <div>
          <p className="eyebrow">RANKING</p>
          <h2>{en ? "Ranking" : "ランキング"}</h2>
        </div>
        <span>{ranking.metricLabel}</span>
      </div>

      {pendingScore && (
        <div className="ranking-submit">
          <p>
            {en ? "This result: " : "今回の記録: "}<strong>{localize(pendingScore.display.trim() || fallbackDisplay(pendingScore.score, ranking.metricLabel))}</strong>
            {pendingScore.meta && <small>{localize(pendingScore.meta)}</small>}
          </p>
          <div>
            <input
              type="text"
              value={name}
              maxLength={18}
              onChange={(event) => setName(event.target.value)}
              placeholder={en ? "Name" : "名前"}
              aria-label={en ? "Name for the ranking" : "ランキングに残す名前"}
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
              {alreadyRegistered ? (en ? "Registered" : "登録済み") : (en ? "Register" : "登録")}
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
              <em>{localize(entry.display)}</em>
              {entry.meta && <small>{localize(entry.meta)}</small>}
            </li>
          ))}
        </ol>
      ) : (
        <p className="ranking-empty">{en ? "No ranking records yet." : "まだランキング記録がありません。"}</p>
      )}

      {ranking.entries.length > 0 && (
        confirmClear ? (
          <div className="ranking-clear-confirm" role="group" aria-label={en ? "Confirm deletion" : "削除確認"}>
            <p>{en ? "Delete this ranking on this browser? This cannot be undone." : "このブラウザのこのランキングを削除しますか？元に戻せません。"}</p>
            <button className="ghost-button" type="button" onClick={() => { ranking.clear(); setConfirmClear(false); }}>
              {en ? "Delete" : "削除する"}
            </button>
            <button className="ghost-button" type="button" onClick={() => setConfirmClear(false)}>
              {en ? "Cancel" : "キャンセル"}
            </button>
          </div>
        ) : (
          <button className="ghost-button ranking-clear" type="button" onClick={() => setConfirmClear(true)}>
            {en ? "Clear ranking" : "ランキング削除"}
          </button>
        )
      )}
    </div>
  );
}
