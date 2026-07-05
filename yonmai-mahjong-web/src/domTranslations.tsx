import { useEffect } from "react";

type Language = "ja" | "en";

const translations: Record<string, string> = {
  "四枚麻雀": "Four-Tile Mahjong",
  "YONMAI MAHJONG": "YONMAI MAHJONG",
  "COMの強さ": "CPU strength",
  "易": "Easy",
  "普通": "Normal",
  "難": "Hard",
  "対局開始": "Start game",
  "対局再開": "Resume game",
  "保存を削除": "Delete save",
  "ルール": "Rules",
  "過去の成績": "Records",
  "役一覧": "Yaku list",
  "設定": "Settings",
  "保存された対局があります": "A saved game exists",
  "途中の対局が保存されています。": "A game in progress has been saved.",
  "キャンセル": "Cancel",
  "最初から始める": "Start over",
  "タイトルへ": "To title",
  "残り": "Remaining",
  "枚": "tiles",
  "ドラ": "Dora",
  "ツモ": "Tsumo",
  "ロン": "Ron",
  "見逃す": "Skip",
  "取消": "Cancel",
  "立直": "Riichi",
  "暗槓": "Closed kan",
  "対局を保存": "Save game",
  "現在の対局を保存してタイトル画面に戻ります。": "Save the current game and return to the title screen.",
  "保存して戻る": "Save and return",
  "戻る": "Back",
  "ホーム": "Home",
  "スコア": "Score",
  "ベスト": "Best",
  "リセット": "Reset",
  "閉じる": "Close",
  "東": "East",
  "南": "South",
  "西": "West",
  "北": "North",
  "白": "White",
  "發": "Green",
  "中": "Red"
};

const originalText = new WeakMap<Text, string>();
const originalAttributes = new WeakMap<Element, Map<string, string>>();

export function DomTranslationLayer() {
  useEffect(() => {
    const language = getLanguage();
    const translate = () => {
      if (language === "ja") return;
      translateDocument();
    };

    translate();
    const observer = new MutationObserver(() => window.requestAnimationFrame(translate));
    observer.observe(document.body, { attributes: true, childList: true, subtree: true, characterData: true });

    return () => observer.disconnect();
  }, []);

  return null;
}

function getLanguage(): Language {
  const saved = localStorage.getItem("game-shelf-language");
  if (saved === "ja" || saved === "en") return saved;
  return navigator.language.toLowerCase().startsWith("ja") ? "ja" : "en";
}

function translateDocument() {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  while (walker.nextNode()) nodes.push(walker.currentNode as Text);

  for (const node of nodes) {
    const source = originalText.get(node) ?? node.nodeValue ?? "";
    const trimmed = source.trim();
    const translated = translations[trimmed];
    if (!translated) continue;
    if (!originalText.has(node)) originalText.set(node, source);
    const nextValue = source.replace(trimmed, translated);
    if (node.nodeValue !== nextValue) node.nodeValue = nextValue;
  }

  for (const element of Array.from(document.querySelectorAll("[title], [aria-label]"))) {
    for (const attribute of ["title", "aria-label"]) {
      const current = element.getAttribute(attribute);
      if (!current) continue;
      const original = originalAttributes.get(element)?.get(attribute) ?? current;
      const translated = translations[original.trim()];
      if (!translated) continue;
      if (!originalAttributes.has(element)) originalAttributes.set(element, new Map());
      const attributes = originalAttributes.get(element);
      if (attributes && !attributes.has(attribute)) attributes.set(attribute, original);
      const nextValue = original.replace(original.trim(), translated);
      if (element.getAttribute(attribute) !== nextValue) element.setAttribute(attribute, nextValue);
    }
  }
}
