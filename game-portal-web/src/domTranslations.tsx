import { useEffect } from "react";
import type { Language } from "./i18n";

const textTranslations: Record<string, string> = {
  "遊び方": "How to play",
  "棚へ戻る": "Back to shelf",
  "挑戦": "Challenge",
  "スタート": "Start",
  "最初から": "Restart",
  "やり直し": "Restart",
  "リセット": "Reset",
  "記録リセット": "Reset records",
  "ベスト削除": "Clear best",
  "ベスト": "Best",
  "まだ記録がありません。": "No record yet.",
  "クリア": "Cleared",
  "挑戦中": "Playing",
  "状態": "Status",
  "完成ボトル": "Completed bottles",
  "1手戻す": "Undo move",
  "待った": "Undo",
  "投了": "Resign",
  "ホーム": "Home",
  "設定": "Settings",
  "完了": "Done",
  "評価値を表示": "Show evaluation",
  "対局終了": "Game over",
  "新局面": "New position",
  "棋譜再生": "Replay moves",
  "棋譜再生を終了": "Exit replay",
  "ここから再開": "Resume from here",
  "難易度": "Difficulty",
  "初級": "Beginner",
  "中級": "Intermediate",
  "上級": "Advanced",
  "易": "Easy",
  "普通": "Normal",
  "難": "Hard",
  "スタートを押してください": "Press Start",
  "ここに入力": "Type here",
  "ローマ字入力": "Romaji input",
  "スコア": "Score",
  "時間": "Time",
  "手数": "Moves",
  "ミス": "Misses",
  "ヒント": "Hint",
  "正解": "Answer",
  "完成": "Complete",
  "ゲーム終了": "Game over",
  "勝ち": "Win",
  "負け": "Loss",
  "引き分け": "Draw",
  "もう一度": "Play again",
  "シャッフル": "Shuffle",
  "問題": "Puzzle",
  "問題選択": "Select puzzle",
  "ステージ選択": "Select stage",
  "数字": "Numbers",
  "消去": "Clear",
  "メモ": "Notes",
  "正確率": "Accuracy",
  "完了フレーズ": "Completed phrases",
  "正解文字": "Correct chars",
  "入力文字": "Typed chars",
  "ヒット": "Hits",
  "コンボ": "Combo",
  "最高コンボ": "Best combo",
  "金もぐら": "Golden moles",
  "爆弾": "Bombs",
  "空の穴": "Empty hole",
  "もぐら": "Mole",
  "ランダム将棋": "Random Shogi",
  "四枚麻雀": "Four-Tile Mahjong",
  "数独": "Sudoku",
  "マインスイーパー": "Minesweeper",
  "神経衰弱": "Memory Match",
  "15パズル": "Fifteen Puzzle",
  "ライツアウト": "Lights Out",
  "反射神経テスト": "Reaction Test",
  "タイピングゲーム": "Typing Game",
  "計算ゲーム": "Mental Math",
  "エイム練習": "Aim Trainer",
  "スネーク": "Snake",
  "ブロック崩し": "Breakout",
  "ポン": "Pong",
  "もぐらたたき": "Whack-a-Mole",
  "三目並べ": "Tic-Tac-Toe",
  "オセロ / リバーシ": "Reversi",
  "カラー判定ゲーム": "Color Judge",
  "ブラックジャック": "Blackjack",
  "タワー・オブ・ハノイ": "Tower of Hanoi",
  "コネクトフォー": "Connect Four",
  "迷路脱出": "Maze Escape",
  "さめがめ": "SameGame",
  "ペグ・ソリティア": "Peg Solitaire",
  "ポーカー": "Poker",
  "イラストロジック": "Nonogram",
  "りんご": "Apple",
  "花": "Flower",
  "旗": "Flag",
  "メガネ": "Glasses",
  "電球": "Light bulb",
  "ハート": "Heart",
  "魚": "Fish",
  "家": "House",
  "猫": "Cat",
  "星": "Star",
  "木": "Tree",
  "傘": "Umbrella",
  "車": "Car"
};

const attributeTranslations: Record<string, string> = {
  ...textTranslations,
  "ゲームを検索": "Search games",
  "タイトル、ジャンル、種類で検索": "Search by title, genre, or type",
  "スタートを押してください": "Press Start",
  "ここに入力": "Type here",
  "ローマ字入力": "Romaji input"
};

const originalText = new WeakMap<Text, string>();
const originalAttributes = new WeakMap<Element, Map<string, string>>();

export function DomTranslationLayer({ language }: { language: Language }) {
  useEffect(() => {
    const translate = () => {
      if (language === "ja") {
        restoreDocument();
        return;
      }

      translateDocument();
    };

    translate();

    const observer = new MutationObserver(() => {
      window.requestAnimationFrame(translate);
    });

    observer.observe(document.body, {
      attributes: true,
      childList: true,
      subtree: true,
      characterData: true
    });

    return () => {
      observer.disconnect();
    };
  }, [language]);

  return null;
}

function translateDocument() {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];

  while (walker.nextNode()) {
    nodes.push(walker.currentNode as Text);
  }

  for (const node of nodes) {
    const parent = node.parentElement;
    if (!parent || ["SCRIPT", "STYLE", "TEXTAREA"].includes(parent.tagName)) {
      continue;
    }

    const source = originalText.get(node) ?? node.nodeValue ?? "";
    const trimmed = source.trim();
    const translated = textTranslations[trimmed];

    if (!translated) {
      continue;
    }

    if (!originalText.has(node)) {
      originalText.set(node, source);
    }

    const nextValue = source.replace(trimmed, translated);
    if (node.nodeValue !== nextValue) {
      node.nodeValue = nextValue;
    }
  }

  for (const element of Array.from(document.querySelectorAll("[placeholder], [aria-label], [title]"))) {
    for (const attribute of ["placeholder", "aria-label", "title"]) {
      const current = element.getAttribute(attribute);
      if (!current) {
        continue;
      }

      const original = originalAttributes.get(element)?.get(attribute) ?? current;
      const translated = attributeTranslations[original.trim()];

      if (!translated) {
        continue;
      }

      if (!originalAttributes.has(element)) {
        originalAttributes.set(element, new Map());
      }

      const attributes = originalAttributes.get(element);
      if (attributes && !attributes.has(attribute)) {
        attributes.set(attribute, original);
      }

      const nextValue = original.replace(original.trim(), translated);
      if (element.getAttribute(attribute) !== nextValue) {
        element.setAttribute(attribute, nextValue);
      }
    }
  }
}

function restoreDocument() {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];

  while (walker.nextNode()) {
    nodes.push(walker.currentNode as Text);
  }

  for (const node of nodes) {
    const source = originalText.get(node);
    if (source !== undefined) {
      if (node.nodeValue !== source) {
        node.nodeValue = source;
      }
    }
  }

  for (const element of Array.from(document.querySelectorAll("[placeholder], [aria-label], [title]"))) {
    const attributes = originalAttributes.get(element);
    if (!attributes) {
      continue;
    }

    for (const [attribute, value] of attributes) {
      if (element.getAttribute(attribute) !== value) {
        element.setAttribute(attribute, value);
      }
    }
  }
}
