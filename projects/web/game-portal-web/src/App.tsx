import { ArrowLeft, ArrowUpRight, Clock3, Gamepad2, Languages, Link2, Search, Shuffle, Star } from "lucide-react";
import { lazy, Suspense, useEffect, useMemo, useRef, useState, type ComponentType, type CSSProperties, type LazyExoticComponent, type ReactNode } from "react";
import { trackGameOpen, trackPageView } from "./analytics";
import { detectInitialLanguage, I18nContext, type Language, uiText } from "./i18n";
import { DomTranslationLayer } from "./domTranslations";
import { genreLabels, getGameText } from "./games/gameTranslations";
import { games, type Game } from "./games/gamesRegistry";
import { PwaControls } from "./PwaControls";
type GameView = LazyExoticComponent<ComponentType<{ onBack: () => void }>>;

const gameViews: Record<string, GameView> = {
  "2048": lazy(() => import("./games/puzzle2048/Puzzle2048").then((module) => ({ default: module.Puzzle2048 }))),
  sudoku: lazy(() => import("./games/sudoku/Sudoku").then((module) => ({ default: module.Sudoku }))),
  minesweeper: lazy(() => import("./games/minesweeper/Minesweeper").then((module) => ({ default: module.Minesweeper }))),
  memory: lazy(() => import("./games/memory/Memory").then((module) => ({ default: module.Memory }))),
  slide15: lazy(() => import("./games/slide15/Slide15").then((module) => ({ default: module.Slide15 }))),
  lightsOut: lazy(() => import("./games/lightsOut/LightsOut").then((module) => ({ default: module.LightsOut }))),
  reaction: lazy(() => import("./games/reaction/ReactionTest").then((module) => ({ default: module.ReactionTest }))),
  typing: lazy(() => import("./games/typing/TypingGame").then((module) => ({ default: module.TypingGame }))),
  mentalMath: lazy(() => import("./games/mentalMath/MentalMath").then((module) => ({ default: module.MentalMath }))),
  aimTrainer: lazy(() => import("./games/aimTrainer/AimTrainer").then((module) => ({ default: module.AimTrainer }))),
  snake: lazy(() => import("./games/snake/SnakeGame").then((module) => ({ default: module.SnakeGame }))),
  breakout: lazy(() => import("./games/breakout/Breakout").then((module) => ({ default: module.Breakout }))),
  pong: lazy(() => import("./games/pong/Pong").then((module) => ({ default: module.Pong }))),
  whackMole: lazy(() => import("./games/whackMole/WhackMole").then((module) => ({ default: module.WhackMole }))),
  ticTacToe: lazy(() => import("./games/ticTacToe/TicTacToe").then((module) => ({ default: module.TicTacToe }))),
  reversi: lazy(() => import("./games/reversi/Reversi").then((module) => ({ default: module.Reversi }))),
  colorJudge: lazy(() => import("./games/colorJudge/ColorJudge").then((module) => ({ default: module.ColorJudge }))),
  blackjack: lazy(() => import("./games/blackjack/Blackjack").then((module) => ({ default: module.Blackjack }))),
  hanoi: lazy(() => import("./games/hanoi/Hanoi").then((module) => ({ default: module.Hanoi }))),
  connectFour: lazy(() => import("./games/connectFour/ConnectFour").then((module) => ({ default: module.ConnectFour }))),
  mazeEscape: lazy(() => import("./games/mazeEscape/MazeEscape").then((module) => ({ default: module.MazeEscape }))),
  simonSays: lazy(() => import("./games/simonSays/SimonSays").then((module) => ({ default: module.SimonSays }))),
  nim: lazy(() => import("./games/nim/Nim").then((module) => ({ default: module.Nim }))),
  hitBlow: lazy(() => import("./games/hitBlow/HitBlow").then((module) => ({ default: module.HitBlow }))),
  floodFill: lazy(() => import("./games/floodFill/FloodFill").then((module) => ({ default: module.FloodFill }))),
  sameGame: lazy(() => import("./games/sameGame/SameGame").then((module) => ({ default: module.SameGame }))),
  pegSolitaire: lazy(() => import("./games/pegSolitaire/PegSolitaire").then((module) => ({ default: module.PegSolitaire }))),
  oneToFifty: lazy(() => import("./games/oneToFifty/OneToFifty").then((module) => ({ default: module.OneToFifty }))),
  waterSort: lazy(() => import("./games/waterSort/WaterSort").then((module) => ({ default: module.WaterSort }))),
  poker: lazy(() => import("./games/poker/Poker").then((module) => ({ default: module.Poker }))),
  yachtDice: lazy(() => import("./games/yachtDice/YachtDice").then((module) => ({ default: module.YachtDice }))),
  nonogram: lazy(() => import("./games/nonogram/Nonogram").then((module) => ({ default: module.Nonogram }))),
  wordGuess: lazy(() => import("./games/wordGuess/WordGuess").then((module) => ({ default: module.WordGuess }))),
  solitaire: lazy(() => import("./games/solitaire/Solitaire").then((module) => ({ default: module.Solitaire }))),
  colorChain: lazy(() => import("./games/colorChain/ColorChain").then((module) => ({ default: module.ColorChain }))),
  colorChainMascotTest: lazy(() => import("./games/colorChain/ColorChain").then((module) => ({ default: module.ColorChainMascotTest })))
};

const recentGameIds = ["colorChain", "solitaire", "wordGuess", "nonogram"];
const popularGameIds = ["random-shogi", "yonmai-mahjong", "colorChain", "2048", "minesweeper", "nonogram", "snake", "reversi"];
const maxPopularGames = 4;
const allGenresKey = "__all__";
const favoriteStorageKey = "game-shelf-favorites";
const recentlyPlayedStorageKey = "game-shelf-recently-played";
const maxRecentlyPlayed = 8;
const yonmaiMahjongId = "yonmai-mahjong";
const yonmaiAndroidUrl = "https://play.google.com/store/apps/details?id=com.yonmai.mahjong";
const colorChainMascotTestId = "colorChainMascotTest";
const colorChainMascotTestPath = "/test/color-chain-mascot/";
const colorChainMascotTestText = {
  ja: {
    title: "クロマのマジカルチェイン",
    description: "マスコットキャラクターと演出を検証する、マジカルチェインの公開テスト版です。"
  },
  en: {
    title: "Chroma's Magical Chain",
    description: "A publicly accessible test version of Magical Chain for mascot character and presentation experiments."
  }
} as const;

function getSelectedGameId() {
  const legacyQueryId = new URLSearchParams(window.location.search).get("game");
  if (legacyQueryId) {
    return legacyQueryId;
  }

  if (window.location.pathname === colorChainMascotTestPath) {
    return colorChainMascotTestId;
  }

  const routeMatch = window.location.pathname.match(/^\/play\/([^/]+)\/?$/);
  return routeMatch ? decodeURIComponent(routeMatch[1]) : null;
}

function readStoredIds(key: string) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function getGameById(id: string) {
  return games.find((game) => game.id === id);
}

function getGameHref(game: Game) {
  if (game.kind === "internal") {
    return `/play/${encodeURIComponent(game.id)}/`;
  }

  if (game.id === yonmaiMahjongId) {
    return `/play/${yonmaiMahjongId}/`;
  }

  return game.href;
}

function setMetaContent(selector: string, content: string) {
  const element = document.querySelector<HTMLMetaElement>(selector);
  if (element) {
    element.content = content;
  }
}

function setRobotsMetaContent(content: string) {
  let element = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
  if (!element) {
    element = document.createElement("meta");
    element.name = "robots";
    document.head.appendChild(element);
  }
  element.content = content;
}

export function App() {
  const [selectedGameId, setSelectedGameId] = useState(() => getSelectedGameId());
  const [language, setLanguageState] = useState<Language>(() => detectInitialLanguage());
  const [query, setQuery] = useState("");
  const [selectedGenre, setSelectedGenre] = useState(allGenresKey);
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => readStoredIds(favoriteStorageKey));
  const [recentlyPlayedIds, setRecentlyPlayedIds] = useState<string[]>(() => readStoredIds(recentlyPlayedStorageKey));
  const [copyNotice, setCopyNotice] = useState("");
  const didSendInitialPageView = useRef(false);
  const SelectedGame = selectedGameId ? gameViews[selectedGameId] : undefined;
  const selectedEmbeddedGame = selectedGameId && !SelectedGame
    ? games.find((game) => game.id === selectedGameId && game.kind === "embedded")
    : undefined;
  const t = uiText[language];

  const availableGames = useMemo(
    () => games.filter((game) => game.status !== "coming-soon"),
    []
  );

  const recentGames = useMemo(
    () => recentGameIds
      .map((id) => games.find((game) => game.id === id))
      .filter((game): game is Game => Boolean(game)),
    []
  );

  const popularGames = useMemo(
    () => popularGameIds
      .map((id) => games.find((game) => game.id === id))
      .filter((game): game is Game => game !== undefined && game.status !== "coming-soon")
      .slice(0, maxPopularGames),
    []
  );

  const favoriteGames = useMemo(
    () => favoriteIds
      .map(getGameById)
      .filter((game): game is Game => game !== undefined && game.status !== "coming-soon"),
    [favoriteIds]
  );

  const recentlyPlayedGames = useMemo(
    () => recentlyPlayedIds
      .map(getGameById)
      .filter((game): game is Game => game !== undefined && game.status !== "coming-soon"),
    [recentlyPlayedIds]
  );

  const genres = useMemo(
    () => [
      allGenresKey,
      ...Array.from(new Set(availableGames.map((game) => game.genre))).sort()
    ],
    [availableGames]
  );

  const filteredGames = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return games.filter((game) => {
      const translatedGame = getGameText(game, language);
      const matchesGenre = selectedGenre === allGenresKey || game.genre === selectedGenre;
      const matchesQuery = !normalizedQuery || [
        game.title,
        game.englishTitle,
        game.description,
        game.genre,
        game.kind,
        translatedGame.title,
        translatedGame.description,
        translatedGame.genre,
        translatedGame.alternateTitle
      ].some((value) => value.toLowerCase().includes(normalizedQuery));

      return matchesGenre && matchesQuery;
    });
  }, [language, query, selectedGenre]);

  const playableFilteredGames = useMemo(
    () => filteredGames.filter((game) => game.status !== "coming-soon"),
    [filteredGames]
  );

  const setLanguage = (nextLanguage: Language) => {
    setLanguageState(nextLanguage);
    localStorage.setItem("game-shelf-language", nextLanguage);
  };

  const rememberPlayedGame = (gameId: string) => {
    if (!getGameById(gameId)) {
      return;
    }

    setRecentlyPlayedIds((current) => {
      const next = [gameId, ...current.filter((id) => id !== gameId)].slice(0, maxRecentlyPlayed);
      localStorage.setItem(recentlyPlayedStorageKey, JSON.stringify(next));
      return next;
    });
  };

  const toggleFavorite = (gameId: string) => {
    setFavoriteIds((current) => {
      const exists = current.includes(gameId);
      const next = exists ? current.filter((id) => id !== gameId) : [gameId, ...current];
      localStorage.setItem(favoriteStorageKey, JSON.stringify(next));
      return next;
    });
  };

  const openGame = (game: Game) => {
    if (game.status === "coming-soon") {
      return;
    }

    const opensInPortal = game.kind === "internal" || game.id === yonmaiMahjongId;
    const href = getGameHref(game);
    const gameText = getGameText(game, language);
    rememberPlayedGame(game.id);
    trackGameOpen(game.id, gameText.title, game.kind);

    if (opensInPortal) {
      window.history.pushState({}, "", href);
      setSelectedGameId(game.id);
      return;
    }

    window.location.href = href;
  };

  const openRandomGame = () => {
    if (!playableFilteredGames.length) {
      return;
    }

    const nextGame = playableFilteredGames[Math.floor(Math.random() * playableFilteredGames.length)];
    openGame(nextGame);
  };

  const copyGameLink = async (game: Game) => {
    const href = getGameHref(game);
    const url = new URL(href, window.location.origin).href;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = url;
        textarea.setAttribute("readonly", "");
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }

      const gameText = getGameText(game, language);
      setCopyNotice(`${t.linkCopied}: ${gameText.title}`);
      window.setTimeout(() => setCopyNotice(""), 2200);
    } catch {
      setCopyNotice(t.linkCopyFailed);
      window.setTimeout(() => setCopyNotice(""), 2600);
    }
  };

  useEffect(() => {
    const handleNavigation = () => {
      const nextGameId = getSelectedGameId();
      setSelectedGameId(nextGameId);
      if (nextGameId) {
        rememberPlayedGame(nextGameId);
      }
    };

    window.addEventListener("popstate", handleNavigation);

    return () => {
      window.removeEventListener("popstate", handleNavigation);
    };
  }, []);

  useEffect(() => {
    if (selectedGameId) {
      rememberPlayedGame(selectedGameId);
    }
  }, [selectedGameId]);

  useEffect(() => {
    if (!didSendInitialPageView.current) {
      didSendInitialPageView.current = true;
      return;
    }

    const selectedGame = selectedGameId ? getGameById(selectedGameId) : undefined;
    const pageTitle = selectedGameId === colorChainMascotTestId
      ? `Game Shelf | ${colorChainMascotTestText[language].title}`
      : selectedGame
      ? `Game Shelf | ${getGameText(selectedGame, language).title}`
      : "Game Shelf";
    trackPageView(pageTitle);
  }, [language, selectedGameId]);

  useEffect(() => {
    document.documentElement.lang = language;
    const selectedGame = selectedGameId ? getGameById(selectedGameId) : undefined;
    const isColorChainMascotTest = selectedGameId === colorChainMascotTestId;
    const selectedGameText = isColorChainMascotTest
      ? colorChainMascotTestText[language]
      : selectedGame ? getGameText(selectedGame, language) : undefined;
    document.title = selectedGameText
      ? `Game Shelf | ${selectedGameText.title}`
      : language === "ja" ? "Game Shelf | ブラウザゲーム集" : "Game Shelf | Browser Games";

    const description = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (description) {
      description.content = selectedGameText?.description ?? t.metaDescription;
    }

    setRobotsMetaContent(isColorChainMascotTest ? "noindex,nofollow" : "index,follow");

    const canonicalPath = isColorChainMascotTest
      ? colorChainMascotTestPath
      : selectedGame
      ? selectedGame.kind === "internal" || selectedGame.id === yonmaiMahjongId
        ? getGameHref(selectedGame)
        : selectedGame.href
      : "/";
    const canonicalUrl = new URL(canonicalPath, window.location.origin).href;
    const socialTitle = selectedGameText ? `${selectedGameText.title} | Game Shelf` : "Game Shelf";
    const socialDescription = selectedGameText?.description ?? t.metaDescription;
    const socialImage = new URL(
      isColorChainMascotTest ? "/screenshots/color-chain.svg" : selectedGame?.screenshot ?? "/screenshots/random-shogi.png",
      window.location.origin
    ).href;

    const canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (canonical) {
      canonical.href = canonicalUrl;
    }

    setMetaContent('meta[property="og:title"]', socialTitle);
    setMetaContent('meta[property="og:description"]', socialDescription);
    setMetaContent('meta[property="og:url"]', canonicalUrl);
    setMetaContent('meta[property="og:image"]', socialImage);
    setMetaContent('meta[name="twitter:title"]', socialTitle);
    setMetaContent('meta[name="twitter:description"]', socialDescription);
    setMetaContent('meta[name="twitter:image"]', socialImage);
  }, [language, selectedGameId, t.metaDescription]);

  const returnToShelf = () => {
    window.history.pushState({}, "", "/");
    setSelectedGameId(null);
  };

  if (SelectedGame || selectedEmbeddedGame) {
    return (
      <I18nContext.Provider value={{ language, setLanguage }}>
        <main className={`game-screen${selectedGameId === colorChainMascotTestId ? " is-color-chain-test" : ""}`}>
          <DomTranslationLayer language={language} />
          <PwaControls language={language} showInstall={false} />
          <div className="game-topbar">
            <button className="back-button" type="button" onClick={returnToShelf}>
              <ArrowLeft aria-hidden="true" />
              {t.backToShelf}
            </button>
            <LanguageSwitcher language={language} setLanguage={setLanguage} />
          </div>
          {SelectedGame ? (
            <Suspense fallback={<div className="game-loading" role="status">{language === "ja" ? "ゲームを読み込んでいます…" : "Loading game..."}</div>}>
              <SelectedGame onBack={returnToShelf} />
            </Suspense>
          ) : selectedEmbeddedGame ? (
            <EmbeddedGameLanding game={selectedEmbeddedGame} language={language} onBack={returnToShelf} />
          ) : null}
        </main>
      </I18nContext.Provider>
    );
  }

  return (
    <I18nContext.Provider value={{ language, setLanguage }}>
    <main>
      <DomTranslationLayer language={language} />
      {copyNotice && (
        <div className="copy-toast" role="status" aria-live="polite">
          {copyNotice}
        </div>
      )}
      <header className="hero">
        <div className="brand-mark" aria-hidden="true">
          <Gamepad2 />
        </div>
        <div>
          <p className="eyebrow">{t.brandEyebrow}</p>
          <h1>Game Shelf</h1>
          <p className="lead">{t.lead}</p>
          <div className="hero-actions">
            <button className="random-game-button" type="button" onClick={openRandomGame} disabled={!playableFilteredGames.length}>
              <Shuffle aria-hidden="true" />
              {t.randomGame}
            </button>
            <span>{t.randomGameHint}</span>
            <PwaControls language={language} />
          </div>
        </div>
        <LanguageSwitcher language={language} setLanguage={setLanguage} />
      </header>

      <section className="quick-shelf" aria-labelledby="popular-games-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">{t.popularEyebrow}</p>
            <h2 id="popular-games-title">{t.popularGames}</h2>
          </div>
          <span>{popularGames.length} {t.picks}</span>
        </div>
        <div className="quick-grid">
          {popularGames.map((game, index) => (
            <GameCard
              compact
              favorite={favoriteIds.includes(game.id)}
              game={game}
              index={index}
              key={game.id}
              language={language}
              onFavoriteToggle={toggleFavorite}
              onOpen={openGame}
            />
          ))}
        </div>
      </section>

      <section className="quick-shelf" aria-labelledby="recent-games-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">{t.recentlyAdded}</p>
            <h2 id="recent-games-title">{t.newOnShelf}</h2>
          </div>
          <span>{recentGames.length} {t.picks}</span>
        </div>
        <div className="quick-grid">
          {recentGames.map((game, index) => (
            <GameCard
              compact
              favorite={favoriteIds.includes(game.id)}
              game={game}
              index={index}
              key={game.id}
              language={language}
              onFavoriteToggle={toggleFavorite}
              onOpen={openGame}
            />
          ))}
        </div>
      </section>

      <ShelfStrip
        emptyText={t.favoritesEmpty}
        games={favoriteGames}
        icon={<Star aria-hidden="true" />}
        language={language}
        onOpen={openGame}
        title={t.favoritesTitle}
        eyebrow={t.favoritesEyebrow}
      />

      <ShelfStrip
        emptyText={t.recentlyPlayedEmpty}
        games={recentlyPlayedGames}
        icon={<Clock3 aria-hidden="true" />}
        language={language}
        onOpen={openGame}
        title={t.recentlyPlayedTitle}
        eyebrow={t.recentlyPlayedEyebrow}
      />

      <section className="shelf-tools" aria-label={t.shelfControls}>
        <label className="search-box">
          <Search aria-hidden="true" />
          <span className="sr-only">{t.searchGames}</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t.searchPlaceholder}
          />
        </label>
        <label className="genre-filter">
          <span>{t.genre}</span>
          <select value={selectedGenre} onChange={(event) => setSelectedGenre(event.target.value)}>
            {genres.map((genre) => (
              <option key={genre} value={genre}>
                {genre === allGenresKey ? t.allGenres : getLocalizedGenre(genre, language)}
              </option>
            ))}
          </select>
        </label>
        <div className="shelf-count" aria-live="polite">
          <strong>{filteredGames.length}</strong>
          <span>{t.shown}</span>
        </div>
      </section>

      <section className="game-grid" aria-label={t.gameList}>
        {filteredGames.map((game, index) => (
          <GameCard
            favorite={favoriteIds.includes(game.id)}
            game={game}
            index={index}
            key={game.id}
            language={language}
            onFavoriteToggle={toggleFavorite}
            onOpen={openGame}
          />
        ))}
      </section>

      {filteredGames.length === 0 && (
        <p className="empty-state">{t.emptyState}</p>
      )}

      <footer>
        <span>{t.edition}</span>
        <a href="/privacy.html">{t.privacy}</a>
        <span>{availableGames.length} {t.gamesAvailable}</span>
      </footer>
    </main>
    </I18nContext.Provider>
  );
}

type GameCardProps = {
  game: Game;
  index: number;
  language: Language;
  compact?: boolean;
  favorite?: boolean;
  onFavoriteToggle?: (gameId: string) => void;
  onLinkCopy?: (game: Game) => void;
  onOpen: (game: Game) => void;
};

function GameCard({
  game,
  index,
  language,
  compact = false,
  favorite = false,
  onFavoriteToggle,
  onLinkCopy,
  onOpen
}: GameCardProps) {
  const isComingSoon = game.status === "coming-soon";
  const cardHref = getGameHref(game);
  const t = uiText[language];
  const gameText = getGameText(game, language);
  const kindLabel = game.kind === "embedded" ? t.included : game.kind === "internal" ? t.internal : t.external;
  const appBadgeText = language === "ja" ? "Android版あり" : "Android app";

  return (
    <article
      className={`game-card${isComingSoon ? " is-coming-soon" : ""}${compact ? " is-compact" : ""}`}
      style={{ "--accent": game.accent, "--delay": `${index * 90}ms` } as CSSProperties}
    >
      {!isComingSoon && (
        <a
          className="game-card-hit-area"
          href={cardHref}
          aria-label={`${t.openGame} ${gameText.title}`}
          onClick={(event) => {
            event.preventDefault();
            onOpen(game);
          }}
        />
      )}
      <div className="screenshot-frame">
        <img
          src={game.screenshot}
          alt={`${gameText.title} game screen`}
          loading={compact ? "eager" : "lazy"}
          decoding="async"
        />
        {(onFavoriteToggle || onLinkCopy) && (
          <div className="card-action-row">
            {onFavoriteToggle && (
              <button
                className={`favorite-button${favorite ? " is-active" : ""}`}
                type="button"
                aria-label={`${favorite ? t.removeFavorite : t.addFavorite}: ${gameText.title}`}
                title={favorite ? t.removeFavorite : t.addFavorite}
                onClick={(event) => {
                  event.stopPropagation();
                  onFavoriteToggle(game.id);
                }}
              >
                <Star aria-hidden="true" />
              </button>
            )}
            {onLinkCopy && (
              <button
                className="share-link-button"
                type="button"
                aria-label={`${t.copyLink}: ${gameText.title}`}
                title={t.copyLink}
                onClick={(event) => {
                  event.stopPropagation();
                  onLinkCopy(game);
                }}
              >
                <Link2 aria-hidden="true" />
              </button>
            )}
          </div>
        )}
        <span className="play-label">
          {isComingSoon ? t.soon : t.play} {!isComingSoon && <ArrowUpRight />}
        </span>
      </div>
      <div className="card-body">
        <div className="card-heading">
          <div>
            <span className="genre">{gameText.genre}</span>
            <h2>{gameText.title}</h2>
          </div>
          {!isComingSoon && <ArrowUpRight className="card-arrow" aria-hidden="true" />}
        </div>
        <p>{gameText.description}</p>
        <div className="card-meta">
          <span className="english-title">{gameText.alternateTitle}</span>
          <span className={`kind-badge is-${game.kind}`}>{kindLabel}</span>
          {game.id === yonmaiMahjongId && <span className="app-badge">{appBadgeText}</span>}
        </div>
      </div>
    </article>
  );
}

function EmbeddedGameLanding({
  game,
  language,
  onBack
}: {
  game: Game;
  language: Language;
  onBack: () => void;
}) {
  const gameText = getGameText(game, language);
  const isYonmai = game.id === yonmaiMahjongId;
  const androidUrl = `${yonmaiAndroidUrl}&hl=${language === "ja" ? "ja" : "en"}`;
  const copy = language === "ja"
    ? {
        eyebrow: "TABLE GAME / EMBEDDED GAME",
        webTitle: "Web版で遊ぶ",
        webDescription: "ブラウザ版の四枚麻雀をこのサイト内で開きます。PCでもスマホでもすぐに遊べます。",
        appEyebrow: "ANDROID APP",
        appTitle: "Android版 四枚麻雀",
        appDescription: "スマホで遊ぶならAndroidアプリ版も公開中です。ホーム画面からすぐ起動したい場合はこちらが便利です。",
        appButton: "Google Playで見る",
        webButton: "Web版を開く",
        backButton: "ゲーム一覧へ戻る",
        lead: "少ない手牌でテンポよく役作りを楽しめる四枚麻雀です。ブラウザ版で遊ぶか、Androidアプリ版を確認できます。"
      }
    : {
        eyebrow: "TABLE GAME / EMBEDDED GAME",
        webTitle: "Play the web version",
        webDescription: "Open the browser version of Four-Tile Mahjong inside this site. It works on both PC and mobile browsers.",
        appEyebrow: "ANDROID APP",
        appTitle: "Four-Tile Mahjong for Android",
        appDescription: "The Android app is also available on Google Play if you prefer launching it directly from your phone.",
        appButton: "View on Google Play",
        webButton: "Open web version",
        backButton: "Back to game list",
        lead: "A quick mahjong-style game built around small hands and fast rounds. Play the web version or check out the Android app."
      };

  if (!isYonmai) {
    window.location.href = game.href;
    return null;
  }

  return (
    <section className="embedded-landing" aria-labelledby="embedded-landing-title">
      <div className="embedded-landing-hero">
        <div className="embedded-landing-copy">
          <p className="eyebrow">{copy.eyebrow}</p>
          <h1 id="embedded-landing-title">{gameText.title}</h1>
          <p className="lead">{copy.lead}</p>
          <div className="embedded-landing-actions">
            <a className="primary-button" href={game.href}>
              <Gamepad2 aria-hidden="true" />
              {copy.webButton}
            </a>
            <a className="ghost-button" href={androidUrl} target="_blank" rel="noreferrer">
              <ArrowUpRight aria-hidden="true" />
              {copy.appButton}
            </a>
          </div>
        </div>
        <div className="embedded-landing-preview">
          <img src={game.screenshot} alt={`${gameText.title} game screen`} decoding="async" />
        </div>
      </div>

      <div className="embedded-promo-grid">
        <article className="embedded-promo-card">
          <span className="promo-kicker">{gameText.alternateTitle}</span>
          <h2>{copy.webTitle}</h2>
          <p>{copy.webDescription}</p>
          <a className="text-link" href={game.href}>
            {copy.webButton}
            <ArrowUpRight aria-hidden="true" />
          </a>
        </article>

        <article className="embedded-promo-card is-app">
          <span className="promo-kicker">{copy.appEyebrow}</span>
          <h2>{copy.appTitle}</h2>
          <p>{copy.appDescription}</p>
          <a className="text-link" href={androidUrl} target="_blank" rel="noreferrer">
            {copy.appButton}
            <ArrowUpRight aria-hidden="true" />
          </a>
        </article>
      </div>

      <button className="ghost-button shelf-button" type="button" onClick={onBack}>
        {copy.backButton}
      </button>
    </section>
  );
}

function ShelfStrip({
  emptyText,
  eyebrow,
  games: shelfGames,
  icon,
  language,
  onOpen,
  title
}: {
  emptyText: string;
  eyebrow: string;
  games: Game[];
  icon: ReactNode;
  language: Language;
  onOpen: (game: Game) => void;
  title: string;
}) {
  return (
    <section className="saved-shelf" aria-label={title}>
      <div className="saved-shelf-heading">
        <div className="saved-shelf-icon">{icon}</div>
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2>{title}</h2>
        </div>
        <span>{shelfGames.length}</span>
      </div>
      {shelfGames.length > 0 ? (
        <div className="saved-game-list">
          {shelfGames.map((game) => {
            const gameText = getGameText(game, language);
            const href = getGameHref(game);

            return (
              <a
                className="saved-game-chip"
                href={href}
                key={game.id}
                style={{ "--accent": game.accent } as CSSProperties}
                onClick={(event) => {
                  event.preventDefault();
                  onOpen(game);
                }}
              >
                <span>{gameText.title}</span>
                <small>{gameText.genre}</small>
              </a>
            );
          })}
        </div>
      ) : (
        <p className="saved-shelf-empty">{emptyText}</p>
      )}
    </section>
  );
}

function LanguageSwitcher({
  language,
  setLanguage
}: {
  language: Language;
  setLanguage: (language: Language) => void;
}) {
  const t = uiText[language];

  return (
    <label className="language-switcher">
      <Languages aria-hidden="true" />
      <span>{t.language}</span>
      <select value={language} onChange={(event) => setLanguage(event.target.value as Language)}>
        <option value="en">{t.english}</option>
        <option value="ja">{t.japanese}</option>
      </select>
    </label>
  );
}

function getLocalizedGenre(genre: string, language: Language) {
  return genreLabels[language][genre] ?? genre;
}
