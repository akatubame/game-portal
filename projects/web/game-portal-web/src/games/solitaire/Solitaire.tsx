import { RotateCcw, Sparkles, Trophy } from "lucide-react";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useI18n } from "../../i18n";
import { RankingPanel, useRanking, type PendingRankingScore } from "../ranking";

type SolitaireProps = {
  onBack: () => void;
};

type Suit = "spades" | "hearts" | "diamonds" | "clubs";
type SourceKind = "waste" | "tableau" | "foundation";
type SolitaireStatus = "playing" | "cleared";

type Card = {
  id: string;
  suit: Suit;
  rank: number;
  faceUp: boolean;
};

type Selection = {
  source: SourceKind;
  pileIndex?: number;
  cardIndex?: number;
  cards: Card[];
};

type GameState = {
  stock: Card[];
  waste: Card[];
  foundations: Record<Suit, Card[]>;
  tableau: Card[][];
};

type SolitaireRecord = {
  bestTimeMs: number | null;
  bestMoves: number | null;
  clears: number;
};

type CardButtonStyle = CSSProperties & {
  "--solitaire-offset": string;
};

const RECORD_KEY = "game-shelf-solitaire-record";
const SUITS: Suit[] = ["spades", "hearts", "diamonds", "clubs"];
const SUIT_LABELS: Record<Suit, string> = {
  spades: "♠",
  hearts: "♥",
  diamonds: "♦",
  clubs: "♣"
};
const RANK_LABELS = ["", "A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

function emptyRecord(): SolitaireRecord {
  return { bestTimeMs: null, bestMoves: null, clears: 0 };
}

function readRecord(): SolitaireRecord {
  try {
    const stored = window.localStorage.getItem(RECORD_KEY);
    return stored ? (JSON.parse(stored) as SolitaireRecord) : emptyRecord();
  } catch {
    return emptyRecord();
  }
}

function createDeck(): Card[] {
  const deck = SUITS.flatMap((suit) =>
    Array.from({ length: 13 }, (_, index) => {
      const rank = index + 1;
      return {
        id: `${suit}-${rank}`,
        suit,
        rank,
        faceUp: false
      };
    })
  );

  for (let index = deck.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [deck[index], deck[swapIndex]] = [deck[swapIndex], deck[index]];
  }

  return deck;
}

function dealGame(): GameState {
  const deck = createDeck();
  const tableau: Card[][] = [];

  for (let pileIndex = 0; pileIndex < 7; pileIndex += 1) {
    const pile: Card[] = [];
    for (let cardIndex = 0; cardIndex <= pileIndex; cardIndex += 1) {
      const card = deck.pop();
      if (card) {
        pile.push({ ...card, faceUp: cardIndex === pileIndex });
      }
    }
    tableau.push(pile);
  }

  return {
    stock: deck,
    waste: [],
    foundations: {
      spades: [],
      hearts: [],
      diamonds: [],
      clubs: []
    },
    tableau
  };
}

function isRed(cardOrSuit: Card | Suit) {
  const suit = typeof cardOrSuit === "string" ? cardOrSuit : cardOrSuit.suit;
  return suit === "hearts" || suit === "diamonds";
}

function canPlaceOnTableau(cards: Card[], targetPile: Card[]) {
  const moving = cards[0];
  const target = targetPile[targetPile.length - 1];

  if (!moving) return false;
  if (!target) return moving.rank === 13;
  return target.faceUp && isRed(moving) !== isRed(target) && moving.rank === target.rank - 1;
}

function canPlaceOnFoundation(card: Card, foundation: Card[]) {
  const top = foundation[foundation.length - 1];

  if (!top) return card.rank === 1;
  return card.suit === top.suit && card.rank === top.rank + 1;
}

function revealTopCards(tableau: Card[][]) {
  return tableau.map((pile) => {
    if (pile.length === 0) return pile;
    const top = pile[pile.length - 1];
    if (top.faceUp) return pile;
    return [...pile.slice(0, -1), { ...top, faceUp: true }];
  });
}

function removeSelection(state: GameState, selection: Selection): GameState {
  if (selection.source === "waste") {
    return {
      ...state,
      waste: state.waste.slice(0, -1)
    };
  }

  if (selection.source === "foundation" && selection.pileIndex !== undefined) {
    const suit = SUITS[selection.pileIndex];
    return {
      ...state,
      foundations: {
        ...state.foundations,
        [suit]: state.foundations[suit].slice(0, -1)
      }
    };
  }

  if (selection.source === "tableau" && selection.pileIndex !== undefined && selection.cardIndex !== undefined) {
    const tableau = state.tableau.map((pile, pileIndex) =>
      pileIndex === selection.pileIndex ? pile.slice(0, selection.cardIndex) : pile
    );

    return {
      ...state,
      tableau: revealTopCards(tableau)
    };
  }

  return state;
}

function formatTime(ms: number | null) {
  if (ms === null) return "--:--";
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function countFoundationCards(state: GameState) {
  return SUITS.reduce((total, suit) => total + state.foundations[suit].length, 0);
}

function isCleared(state: GameState) {
  return countFoundationCards(state) === 52;
}

function cardLabel(card: Card) {
  return `${RANK_LABELS[card.rank]}${SUIT_LABELS[card.suit]}`;
}

function createSelectionFromWaste(state: GameState): Selection | null {
  const card = state.waste[state.waste.length - 1];
  return card ? { source: "waste", cards: [card] } : null;
}

function createSelectionFromFoundation(state: GameState, pileIndex: number): Selection | null {
  const suit = SUITS[pileIndex];
  const foundation = state.foundations[suit];
  const card = foundation[foundation.length - 1];
  return card ? { source: "foundation", pileIndex, cards: [card] } : null;
}

function createSelectionFromTableau(state: GameState, pileIndex: number, cardIndex: number): Selection | null {
  const card = state.tableau[pileIndex]?.[cardIndex];
  if (!card?.faceUp) return null;
  return {
    source: "tableau",
    pileIndex,
    cardIndex,
    cards: state.tableau[pileIndex].slice(cardIndex)
  };
}

function sourceKey(selection: Selection | null) {
  if (!selection) return "";
  return `${selection.source}-${selection.pileIndex ?? "w"}-${selection.cardIndex ?? "top"}`;
}

export function Solitaire({ onBack }: SolitaireProps) {
  const { language } = useI18n();
  const isEnglish = language === "en";
  const [state, setState] = useState<GameState>(() => dealGame());
  const [selection, setSelection] = useState<Selection | null>(null);
  const [moves, setMoves] = useState(0);
  const [status, setStatus] = useState<SolitaireStatus>("playing");
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const [elapsedMs, setElapsedMs] = useState(0);
  const [record, setRecord] = useState<SolitaireRecord>(() => readRecord());
  const [pendingScore, setPendingScore] = useState<PendingRankingScore | null>(null);
  const ranking = useRanking({ gameId: "solitaire-time", metricLabel: "Time", mode: "lower" });
  const selectedKey = sourceKey(selection);
  const foundationCount = useMemo(() => countFoundationCards(state), [state]);

  useEffect(() => {
    if (status === "cleared") return;

    const timer = window.setInterval(() => {
      setElapsedMs(Date.now() - startedAt);
    }, 500);

    return () => window.clearInterval(timer);
  }, [startedAt, status]);

  const finishIfCleared = (nextState: GameState, nextMoves: number) => {
    if (!isCleared(nextState)) {
      return;
    }

    const clearMs = Date.now() - startedAt;
    const nextRecord = {
      clears: record.clears + 1,
      bestTimeMs: record.bestTimeMs === null ? clearMs : Math.min(record.bestTimeMs, clearMs),
      bestMoves: record.bestMoves === null ? nextMoves : Math.min(record.bestMoves, nextMoves)
    };

    setStatus("cleared");
    setElapsedMs(clearMs);
    setRecord(nextRecord);
    setPendingScore({
      score: clearMs,
      display: formatTime(clearMs),
      meta: isEnglish ? `${nextMoves} moves` : `${nextMoves}手`
    });
    window.localStorage.setItem(RECORD_KEY, JSON.stringify(nextRecord));
  };

  const startNewGame = () => {
    setState(dealGame());
    setSelection(null);
    setMoves(0);
    setStatus("playing");
    setStartedAt(Date.now());
    setElapsedMs(0);
    setPendingScore(null);
  };

  const resetRecord = () => {
    const nextRecord = emptyRecord();
    setRecord(nextRecord);
    setPendingScore(null);
    window.localStorage.setItem(RECORD_KEY, JSON.stringify(nextRecord));
  };

  const commitMove = (nextState: GameState) => {
    const nextMoves = moves + 1;
    setState(nextState);
    setMoves(nextMoves);
    setSelection(null);
    finishIfCleared(nextState, nextMoves);
  };

  const drawFromStock = () => {
    if (status === "cleared") return;

    if (state.stock.length > 0) {
      const card = state.stock[state.stock.length - 1];
      commitMove({
        ...state,
        stock: state.stock.slice(0, -1),
        waste: [...state.waste, { ...card, faceUp: true }]
      });
      return;
    }

    if (state.waste.length > 0) {
      commitMove({
        ...state,
        stock: [...state.waste].reverse().map((card) => ({ ...card, faceUp: false })),
        waste: []
      });
    }
  };

  const selectWaste = () => {
    if (status === "cleared") return;
    setSelection(createSelectionFromWaste(state));
  };

  const selectFoundation = (pileIndex: number) => {
    if (status === "cleared") return;

    if (selection?.cards.length === 1) {
      const moving = selection.cards[0];
      const suit = SUITS[pileIndex];
      if (moving.suit === suit && canPlaceOnFoundation(moving, state.foundations[suit])) {
        const withoutSelection = removeSelection(state, selection);
        commitMove({
          ...withoutSelection,
          foundations: {
            ...withoutSelection.foundations,
            [suit]: [...withoutSelection.foundations[suit], { ...moving, faceUp: true }]
          }
        });
        return;
      }
    }

    setSelection(createSelectionFromFoundation(state, pileIndex));
  };

  const selectTableauCard = (pileIndex: number, cardIndex: number) => {
    if (status === "cleared") return;

    const pile = state.tableau[pileIndex];
    const card = pile[cardIndex];

    if (!card.faceUp) {
      if (cardIndex === pile.length - 1) {
        const tableau = state.tableau.map((item, index) =>
          index === pileIndex ? [...item.slice(0, -1), { ...card, faceUp: true }] : item
        );
        commitMove({ ...state, tableau });
      }
      return;
    }

    if (selection) {
      if (selection.source === "tableau" && selection.pileIndex === pileIndex && selection.cardIndex === cardIndex) {
        setSelection(null);
        return;
      }

      if (canPlaceOnTableau(selection.cards, pile)) {
        const withoutSelection = removeSelection(state, selection);
        commitMove({
          ...withoutSelection,
          tableau: withoutSelection.tableau.map((item, index) =>
            index === pileIndex ? [...item, ...selection.cards.map((moving) => ({ ...moving, faceUp: true }))] : item
          )
        });
        return;
      }
    }

    setSelection(createSelectionFromTableau(state, pileIndex, cardIndex));
  };

  const selectEmptyTableau = (pileIndex: number) => {
    if (status === "cleared" || !selection || !canPlaceOnTableau(selection.cards, state.tableau[pileIndex])) {
      return;
    }

    const withoutSelection = removeSelection(state, selection);
    commitMove({
      ...withoutSelection,
      tableau: withoutSelection.tableau.map((pile, index) =>
        index === pileIndex ? [...pile, ...selection.cards.map((card) => ({ ...card, faceUp: true }))] : pile
      )
    });
  };

  const autoMoveToFoundation = () => {
    if (status === "cleared") return;

    const wasteSelection = createSelectionFromWaste(state);
    if (wasteSelection) {
      const card = wasteSelection.cards[0];
      if (canPlaceOnFoundation(card, state.foundations[card.suit])) {
        const withoutSelection = removeSelection(state, wasteSelection);
        commitMove({
          ...withoutSelection,
          foundations: {
            ...withoutSelection.foundations,
            [card.suit]: [...withoutSelection.foundations[card.suit], { ...card, faceUp: true }]
          }
        });
        return;
      }
    }

    for (let pileIndex = 0; pileIndex < state.tableau.length; pileIndex += 1) {
      const pile = state.tableau[pileIndex];
      const top = pile[pile.length - 1];
      if (top?.faceUp && canPlaceOnFoundation(top, state.foundations[top.suit])) {
        const tableauSelection = createSelectionFromTableau(state, pileIndex, pile.length - 1);
        if (!tableauSelection) return;
        const withoutSelection = removeSelection(state, tableauSelection);
        commitMove({
          ...withoutSelection,
          foundations: {
            ...withoutSelection.foundations,
            [top.suit]: [...withoutSelection.foundations[top.suit], { ...top, faceUp: true }]
          }
        });
        return;
      }
    }
  };

  const renderCard = (card: Card, options: { selected?: boolean; compact?: boolean } = {}) => (
    <span
      className={`solitaire-card${card.faceUp ? "" : " is-facedown"}${isRed(card) ? " is-red" : ""}${options.selected ? " is-selected" : ""}${options.compact ? " is-compact" : ""}`}
    >
      {card.faceUp ? (
        <>
          <span>{RANK_LABELS[card.rank]}</span>
          <strong>{SUIT_LABELS[card.suit]}</strong>
        </>
      ) : (
        <span className="solitaire-card-back">◆</span>
      )}
    </span>
  );

  return (
    <section className="puzzle-shell solitaire-shell" aria-labelledby="solitaire-title">
      <div className="puzzle-hero">
        <div>
          <p className="eyebrow">CARD GAME / INTERNAL GAME</p>
          <h1 id="solitaire-title">{isEnglish ? "Solitaire" : "ソリティア"}</h1>
          <p className="lead">
            {status === "cleared"
              ? isEnglish
                ? `Clear! Finished in ${formatTime(elapsedMs)} with ${moves} moves.`
                : `クリア！ ${formatTime(elapsedMs)} / ${moves}手で完成しました。`
              : isEnglish
                ? "Build each foundation from Ace to King. Click a card or a face-up sequence, then click its destination."
                : "AからKまで同じスートで組札へ積み上げます。カードや表向きの列を選び、移動先をクリックしてください。"}
          </p>
        </div>
        <div className="score-panel solitaire-score" aria-label={isEnglish ? "Solitaire record" : "ソリティアの記録"}>
          <div>
            <span>Time</span>
            <strong>{formatTime(elapsedMs)}</strong>
          </div>
          <div>
            <span>Move</span>
            <strong>{moves}</strong>
          </div>
          <div>
            <span>Done</span>
            <strong>{foundationCount}/52</strong>
          </div>
        </div>
      </div>

      <div className="puzzle-layout solitaire-layout">
        <div className="solitaire-table">
          <div className="solitaire-top-row">
            <div className="solitaire-stock-area">
              <button className="solitaire-slot" type="button" onClick={drawFromStock} aria-label={isEnglish ? "Draw from stock" : "山札をめくる"}>
                {state.stock.length > 0 ? (
                  <span className="solitaire-card is-facedown">
                    <span className="solitaire-card-back">{state.stock.length}</span>
                  </span>
                ) : state.waste.length > 0 ? (
                  <span className="solitaire-recycle">
                    <RotateCcw aria-hidden="true" /> {isEnglish ? "Reset" : "戻す"}
                  </span>
                ) : (
                  <span className="solitaire-empty-label">Stock</span>
                )}
              </button>

              <button className="solitaire-slot" type="button" onClick={selectWaste} aria-label={isEnglish ? "Select waste card" : "捨て札を選択"}>
                {state.waste.length > 0 ? renderCard(state.waste[state.waste.length - 1], { selected: selectedKey === "waste-w-top" }) : <span className="solitaire-empty-label">Waste</span>}
              </button>
            </div>

            <div className="solitaire-foundations" aria-label={isEnglish ? "Foundations" : "組札"}>
              {SUITS.map((suit, index) => {
                const foundation = state.foundations[suit];
                const top = foundation[foundation.length - 1];
                return (
                  <button className="solitaire-slot" key={suit} type="button" onClick={() => selectFoundation(index)} aria-label={`${SUIT_LABELS[suit]} foundation`}>
                    {top ? renderCard(top, { selected: selectedKey === `foundation-${index}-top` }) : <span className={`solitaire-foundation-suit ${isRed(suit) ? "is-red" : ""}`}>{SUIT_LABELS[suit]}</span>}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="solitaire-tableau" aria-label={isEnglish ? "Tableau" : "場札"}>
            {state.tableau.map((pile, pileIndex) => (
              <div className="solitaire-pile" key={pileIndex}>
                {pile.length === 0 ? (
                  <button className="solitaire-empty-pile" type="button" onClick={() => selectEmptyTableau(pileIndex)} aria-label={isEnglish ? "Empty tableau pile" : "空の場札"}>
                    K
                  </button>
                ) : (
                  pile.map((card, cardIndex) => (
                    <button
                      className="solitaire-card-button"
                      key={card.id}
                      style={{ "--solitaire-offset": `${cardIndex * 28}px` } as CardButtonStyle}
                      type="button"
                      onClick={() => selectTableauCard(pileIndex, cardIndex)}
                      aria-label={card.faceUp ? cardLabel(card) : isEnglish ? "Face-down card" : "裏向きカード"}
                    >
                      {renderCard(card, { selected: selectedKey === `tableau-${pileIndex}-${cardIndex}`, compact: true })}
                    </button>
                  ))
                )}
              </div>
            ))}
          </div>
        </div>

        <aside className="puzzle-side solitaire-side">
          <div className="control-row">
            <button className="primary-button" type="button" onClick={startNewGame}>
              <RotateCcw aria-hidden="true" />
              {isEnglish ? "New deal" : "新規配り直し"}
            </button>
            <button className="ghost-button" type="button" onClick={autoMoveToFoundation}>
              <Sparkles aria-hidden="true" />
              {isEnglish ? "Auto" : "自動組札"}
            </button>
          </div>

          <div className="solitaire-record">
            <Trophy aria-hidden="true" />
            <div>
              <span>{isEnglish ? "Best time" : "ベストタイム"}</span>
              <strong>{formatTime(record.bestTimeMs)}</strong>
            </div>
            <div>
              <span>{isEnglish ? "Best moves" : "最少手数"}</span>
              <strong>{record.bestMoves ?? "--"}</strong>
            </div>
            <div>
              <span>{isEnglish ? "Clears" : "クリア数"}</span>
              <strong>{record.clears}</strong>
            </div>
          </div>

          <RankingPanel pendingScore={pendingScore} ranking={ranking} />

          <div className="rule-card">
            <h2>{isEnglish ? "How to Play" : "遊び方"}</h2>
            <p>
              {isEnglish
                ? "Move cards to the four foundations by suit from Ace to King. Tableau piles build downward in alternating colors. Only Kings can move to empty tableau piles."
                : "組札は同じスートでAからKへ積みます。場札は赤黒交互に数字を下げて重ねます。空の列にはKだけ置けます。"}
            </p>
          </div>

          <button className="ghost-button" type="button" onClick={resetRecord}>
            {isEnglish ? "Clear best" : "記録リセット"}
          </button>
          <button className="ghost-button" type="button" onClick={onBack}>
            ← {isEnglish ? "Back to games" : "ゲーム一覧に戻る"}
          </button>
        </aside>
      </div>
    </section>
  );
}
