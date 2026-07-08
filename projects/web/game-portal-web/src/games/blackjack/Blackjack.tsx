import { Club, RotateCcw, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { useI18n } from "../../i18n";
import { RankingPanel, useRanking } from "../ranking";
import type { BlackjackCard, BlackjackOutcome, BlackjackRecord, BlackjackStatus, BlackjackSuit } from "./types";

type BlackjackProps = {
  onBack: () => void;
};

const RECORD_KEY = "game-shelf-blackjack-record";
const SUITS: BlackjackSuit[] = ["♠", "♥", "♦", "♣"];
const RANKS: BlackjackCard["rank"][] = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

function readRecord(): BlackjackRecord {
  const stored = window.localStorage.getItem(RECORD_KEY);
  return stored ? (JSON.parse(stored) as BlackjackRecord) : { wins: 0, losses: 0, pushes: 0, chips: 1000 };
}

function createDeck(): BlackjackCard[] {
  const deck = SUITS.flatMap((suit) => RANKS.map((rank) => ({ suit, rank })));

  for (let index = deck.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [deck[index], deck[swapIndex]] = [deck[swapIndex], deck[index]];
  }

  return deck;
}

function draw(deck: BlackjackCard[]) {
  const [card, ...nextDeck] = deck;
  return { card, nextDeck };
}

function handValue(hand: BlackjackCard[]) {
  let total = 0;
  let aces = 0;

  hand.forEach((card) => {
    if (card.rank === "A") {
      total += 11;
      aces += 1;
    } else if (["J", "Q", "K"].includes(card.rank)) {
      total += 10;
    } else {
      total += Number(card.rank);
    }
  });

  while (total > 21 && aces > 0) {
    total -= 10;
    aces -= 1;
  }

  return total;
}

function isBlackjack(hand: BlackjackCard[]) {
  return hand.length === 2 && handValue(hand) === 21;
}

function decideOutcome(playerHand: BlackjackCard[], dealerHand: BlackjackCard[]): BlackjackOutcome {
  const player = handValue(playerHand);
  const dealer = handValue(dealerHand);

  if (player > 21) return "lose";
  if (dealer > 21) return "win";
  if (isBlackjack(playerHand) && !isBlackjack(dealerHand)) return "blackjack";
  if (!isBlackjack(playerHand) && isBlackjack(dealerHand)) return "lose";
  if (player > dealer) return "win";
  if (player < dealer) return "lose";
  return "push";
}

function updateRecord(record: BlackjackRecord, outcome: BlackjackOutcome): BlackjackRecord {
  if (outcome === "blackjack") {
    return { ...record, wins: record.wins + 1, chips: record.chips + 150 };
  }

  if (outcome === "win") {
    return { ...record, wins: record.wins + 1, chips: record.chips + 100 };
  }

  if (outcome === "lose") {
    return { ...record, losses: record.losses + 1, chips: Math.max(0, record.chips - 100) };
  }

  if (outcome === "push") {
    return { ...record, pushes: record.pushes + 1 };
  }

  return record;
}

function outcomeMessage(outcome: BlackjackOutcome, playerHand: BlackjackCard[], dealerHand: BlackjackCard[]) {
  const player = handValue(playerHand);
  const dealer = handValue(dealerHand);

  if (outcome === "blackjack") return "ブラックジャック！チップ +150 です。";
  if (outcome === "win") return `勝利！ ${player} 対 ${dealer} でチップ +100 です。`;
  if (outcome === "lose") return player > 21 ? "バースト。21を超えてしまいました。" : `ディーラーの勝ちです。${player} 対 ${dealer}。`;
  if (outcome === "push") return `引き分けです。${player} 対 ${dealer}。`;
  return "カードを配って勝負を始めましょう。";
}

export function Blackjack({ onBack }: BlackjackProps) {
  const { language } = useI18n();
  const isEnglish = language === "en";
  const [deck, setDeck] = useState<BlackjackCard[]>(() => createDeck());
  const [playerHand, setPlayerHand] = useState<BlackjackCard[]>([]);
  const [dealerHand, setDealerHand] = useState<BlackjackCard[]>([]);
  const [status, setStatus] = useState<BlackjackStatus>("idle");
  const [record, setRecord] = useState<BlackjackRecord>(() => readRecord());
  const [message, setMessage] = useState("カードを配って、21に近い手を目指しましょう。");
  const [outcome, setOutcome] = useState<BlackjackOutcome>(null);

  const playerTotal = useMemo(() => handValue(playerHand), [playerHand]);
  const dealerTotal = useMemo(() => handValue(dealerHand), [dealerHand]);
  const ranking = useRanking({ gameId: "blackjack-chips", metricLabel: "Chips", mode: "higher" });
  const visibleDealerTotal = status === "playing" && dealerHand.length > 1 ? handValue([dealerHand[0]]) : dealerTotal;
  const visibleMessage = isEnglish
    ? status === "idle"
      ? "Deal the cards and try to get as close to 21 as possible."
      : status === "playing"
        ? "Hit to draw a card, or Stand to settle the round."
        : message
    : message;

  const finishRound = (nextPlayerHand: BlackjackCard[], nextDealerHand: BlackjackCard[]) => {
    const nextOutcome = decideOutcome(nextPlayerHand, nextDealerHand);
    const nextRecord = updateRecord(record, nextOutcome);
    setOutcome(nextOutcome);
    setRecord(nextRecord);
    window.localStorage.setItem(RECORD_KEY, JSON.stringify(nextRecord));
    setStatus("finished");
    setMessage(outcomeMessage(nextOutcome, nextPlayerHand, nextDealerHand));
  };

  const deal = () => {
    let nextDeck = createDeck();
    const firstPlayer = draw(nextDeck);
    nextDeck = firstPlayer.nextDeck;
    const firstDealer = draw(nextDeck);
    nextDeck = firstDealer.nextDeck;
    const secondPlayer = draw(nextDeck);
    nextDeck = secondPlayer.nextDeck;
    const secondDealer = draw(nextDeck);
    nextDeck = secondDealer.nextDeck;

    const nextPlayerHand = [firstPlayer.card, secondPlayer.card];
    const nextDealerHand = [firstDealer.card, secondDealer.card];

    setDeck(nextDeck);
    setPlayerHand(nextPlayerHand);
    setDealerHand(nextDealerHand);
    setOutcome(null);

    if (isBlackjack(nextPlayerHand) || isBlackjack(nextDealerHand)) {
      finishRound(nextPlayerHand, nextDealerHand);
    } else {
      setStatus("playing");
      setMessage("ヒットでカードを引くか、スタンドで勝負します。");
    }
  };

  const hit = () => {
    if (status !== "playing") {
      return;
    }

    const drawn = draw(deck);
    const nextPlayerHand = [...playerHand, drawn.card];
    setDeck(drawn.nextDeck);
    setPlayerHand(nextPlayerHand);

    if (handValue(nextPlayerHand) > 21) {
      finishRound(nextPlayerHand, dealerHand);
    } else {
      setMessage("もう1枚引くか、ここで止めるか。いい悩みどころです。");
    }
  };

  const stand = () => {
    if (status !== "playing") {
      return;
    }

    let nextDeck = deck;
    let nextDealerHand = [...dealerHand];

    while (handValue(nextDealerHand) < 17) {
      const drawn = draw(nextDeck);
      nextDeck = drawn.nextDeck;
      nextDealerHand = [...nextDealerHand, drawn.card];
    }

    setDeck(nextDeck);
    setDealerHand(nextDealerHand);
    finishRound(playerHand, nextDealerHand);
  };

  const resetRecord = () => {
    const emptyRecord = { wins: 0, losses: 0, pushes: 0, chips: 1000 };
    setRecord(emptyRecord);
    window.localStorage.setItem(RECORD_KEY, JSON.stringify(emptyRecord));
  };

  const renderCard = (card: BlackjackCard, index: number, hidden = false) => (
    <span className={`blackjack-card ${hidden ? "is-hidden" : card.suit === "♥" || card.suit === "♦" ? "is-red" : ""}`} key={`${card.suit}-${card.rank}-${index}`}>
      {hidden ? (
        <span>?</span>
      ) : (
        <>
          <span>{card.rank}</span>
          <strong>{card.suit}</strong>
        </>
      )}
    </span>
  );

  return (
    <section className="puzzle-shell blackjack-shell" aria-labelledby="blackjack-title">
      <div className="puzzle-hero">
        <div>
          <p className="eyebrow">CARD GAME / INTERNAL GAME</p>
          <h1 id="blackjack-title">{isEnglish ? "Blackjack" : "ブラックジャック"}</h1>
          <p className="lead">{visibleMessage}</p>
        </div>
        <div className="score-panel blackjack-score" aria-label={isEnglish ? "Blackjack record" : "ブラックジャックの戦績"}>
          <div>
            <span>Win</span>
            <strong>{record.wins}</strong>
          </div>
          <div>
            <span>Lose</span>
            <strong>{record.losses}</strong>
          </div>
          <div>
            <span>Chips</span>
            <strong>{record.chips}</strong>
          </div>
        </div>
      </div>

      <div className="puzzle-layout blackjack-layout">
        <div className="blackjack-table" aria-label={isEnglish ? "Blackjack table" : "ブラックジャックテーブル"}>
          <div className="blackjack-hand">
            <div>
              <span className="blackjack-label">Dealer</span>
              <strong>{visibleDealerTotal}</strong>
            </div>
            <div className="blackjack-cards">
              {dealerHand.length === 0 ? <span className="blackjack-empty">{isEnglish ? "Waiting for cards" : "カード待ち"}</span> : dealerHand.map((card, index) => renderCard(card, index, status === "playing" && index === 1))}
            </div>
          </div>

          <div className="blackjack-result" aria-live="polite">
            {outcome ? outcome.toUpperCase() : "BLACKJACK"}
          </div>

          <div className="blackjack-hand">
            <div>
              <span className="blackjack-label">You</span>
              <strong>{playerTotal}</strong>
            </div>
            <div className="blackjack-cards">
              {playerHand.length === 0 ? <span className="blackjack-empty">{isEnglish ? "Waiting for cards" : "カード待ち"}</span> : playerHand.map((card, index) => renderCard(card, index))}
            </div>
          </div>
        </div>

        <aside className="puzzle-side blackjack-side">
          <div className="rule-card">
            <h2>{isEnglish ? "How to play" : "遊び方"}</h2>
            <p>
              {isEnglish
                ? "Get your hand as close to 21 as possible. Going over 21 is a bust. The dealer draws until reaching 17 or more. Aces are automatically counted as 1 or 11."
                : "手札の合計を21に近づけます。21を超えるとバーストで負け。ディーラーは17以上になるまで引きます。Aは自動で1または11として計算します。"}
            </p>
          </div>

          <div className="blackjack-stats">
            <span>{isEnglish ? "Pushes" : "引き分け"}: {record.pushes}</span>
            <span>{isEnglish ? "Deck" : "山札"}: {deck.length}{isEnglish ? " cards" : "枚"}</span>
            <span>{isEnglish ? "Status" : "状態"}: {status === "playing" ? (isEnglish ? "Your turn" : "あなたの番") : status === "finished" ? (isEnglish ? "Round over" : "勝負終了") : (isEnglish ? "Idle" : "待機中")}</span>
          </div>

          <RankingPanel
            ranking={ranking}
            pendingScore={status === "finished" ? { score: record.chips, display: isEnglish ? `${record.chips} chips` : `${record.chips}枚`, meta: outcome ? outcome.toUpperCase() : "ROUND END" } : null}
          />

          <div className="control-row">
            <button className="primary-button" type="button" onClick={deal}>
              <Sparkles aria-hidden="true" />
              {isEnglish ? "Deal" : "配る"}
            </button>
            <button className="ghost-button" type="button" onClick={hit} disabled={status !== "playing"}>
              <Club aria-hidden="true" />
              {isEnglish ? "Hit" : "ヒット"}
            </button>
            <button className="ghost-button" type="button" onClick={stand} disabled={status !== "playing"}>
              {isEnglish ? "Stand" : "スタンド"}
            </button>
          </div>

          <button className="ghost-button" type="button" onClick={resetRecord}>
            <RotateCcw aria-hidden="true" />
            {isEnglish ? "Reset record" : "戦績リセット"}
          </button>

          <button className="ghost-button shelf-button" type="button" onClick={onBack}>
            {isEnglish ? "Back to shelf" : "棚へ戻る"}
          </button>
        </aside>
      </div>
    </section>
  );
}
