import { createContext, useContext } from "react";

export type Language = "ja" | "en";

export type I18nContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
};

export const defaultLanguage: Language = "en";

export const I18nContext = createContext<I18nContextValue>({
  language: defaultLanguage,
  setLanguage: () => undefined
});

export function useI18n() {
  return useContext(I18nContext);
}

export function detectInitialLanguage(): Language {
  const saved = localStorage.getItem("game-shelf-language");

  if (saved === "ja" || saved === "en") {
    return saved;
  }

  return navigator.language.toLowerCase().startsWith("ja") ? "ja" : "en";
}

export const uiText = {
  ja: {
    allGenres: "すべてのジャンル",
    backToShelf: "ゲーム一覧へ戻る",
    brandEyebrow: "ブラウザゲーム集",
    lead: "小さなブラウザゲームを集めたゲーム棚です。検索・ジャンル絞り込みから、すぐに遊べます。",
    randomGame: "おまかせで遊ぶ",
    randomGameHint: "現在の検索・ジャンル条件からランダムに選びます",
    recentlyAdded: "最近追加",
    newOnShelf: "新着ゲーム",
    popularEyebrow: "人気ピックアップ",
    popularGames: "人気ゲーム",
    favoritesEyebrow: "お気に入り",
    favoritesTitle: "お気に入り",
    favoritesEmpty: "星ボタンでお気に入りに追加できます。",
    recentlyPlayedEyebrow: "最近遊んだ",
    recentlyPlayedTitle: "最近遊んだゲーム",
    recentlyPlayedEmpty: "ゲームを開くとここに表示されます。",
    addFavorite: "お気に入りに追加",
    removeFavorite: "お気に入りから削除",
    copyLink: "リンクをコピー",
    linkCopied: "リンクをコピーしました",
    linkCopyFailed: "リンクのコピーに失敗しました",
    picks: "件",
    shelfControls: "ゲーム一覧の操作",
    searchGames: "ゲームを検索",
    searchPlaceholder: "タイトル、ジャンル、種類で検索",
    genre: "ジャンル",
    shown: "表示中",
    gameList: "ゲーム一覧",
    emptyState: "条件に合うゲームがありません。",
    edition: "公開版",
    gamesAvailable: "本のゲームが遊べます",
    play: "プレイ",
    soon: "準備中",
    openGame: "を開く",
    comingSoon: "は準備中です",
    included: "内包",
    internal: "内蔵",
    external: "外部",
    language: "言語",
    japanese: "日本語",
    english: "English",
    metaDescription: "ブラウザで遊べる小さなゲームを集めたポータルサイト"
  },
  en: {
    allGenres: "ALL GENRES",
    backToShelf: "Back to Game Shelf",
    brandEyebrow: "BROWSER GAME COLLECTION",
    lead: "A growing shelf of small browser games. Search, filter by genre, and jump into a quick game whenever you like.",
    randomGame: "Play random",
    randomGameHint: "Chooses from the current search and genre filters",
    recentlyAdded: "RECENTLY ADDED",
    newOnShelf: "New on the shelf",
    popularEyebrow: "POPULAR PICKS",
    popularGames: "Popular games",
    favoritesEyebrow: "FAVORITES",
    favoritesTitle: "Favorites",
    favoritesEmpty: "Use the star button to save games here.",
    recentlyPlayedEyebrow: "RECENTLY PLAYED",
    recentlyPlayedTitle: "Recently played",
    recentlyPlayedEmpty: "Games you open will appear here.",
    addFavorite: "Add to favorites",
    removeFavorite: "Remove from favorites",
    copyLink: "Copy link",
    linkCopied: "Link copied",
    linkCopyFailed: "Could not copy the link",
    picks: "PICKS",
    shelfControls: "Game shelf controls",
    searchGames: "Search games",
    searchPlaceholder: "Search by title, genre, or type",
    genre: "Genre",
    shown: "shown",
    gameList: "Game list",
    emptyState: "No games match this filter.",
    edition: "PUBLIC EDITION",
    gamesAvailable: "GAMES AVAILABLE",
    play: "PLAY",
    soon: "SOON",
    openGame: "Open",
    comingSoon: "is coming soon",
    included: "included",
    internal: "internal",
    external: "external",
    language: "Language",
    japanese: "日本語",
    english: "English",
    metaDescription: "A portal site collecting small browser games you can play instantly"
  }
} as const;
