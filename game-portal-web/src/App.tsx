import { ArrowLeft, ArrowUpRight, Clock3, Gamepad2, Languages, Search, Star } from "lucide-react";
import { useEffect, useMemo, useState, type ComponentType, type CSSProperties, type ReactNode } from "react";
import { detectInitialLanguage, I18nContext, type Language, uiText } from "./i18n";
import { DomTranslationLayer } from "./domTranslations";
import { genreLabels, getGameText } from "./games/gameTranslations";
import { games, type Game } from "./games/gamesRegistry";
import { AimTrainer } from "./games/aimTrainer/AimTrainer";
import { Blackjack } from "./games/blackjack/Blackjack";
import { Breakout } from "./games/breakout/Breakout";
import { ColorJudge } from "./games/colorJudge/ColorJudge";
import { ConnectFour } from "./games/connectFour/ConnectFour";
import { FloodFill } from "./games/floodFill/FloodFill";
import { Hanoi } from "./games/hanoi/Hanoi";
import { HitBlow } from "./games/hitBlow/HitBlow";
import { LightsOut } from "./games/lightsOut/LightsOut";
import { MazeEscape } from "./games/mazeEscape/MazeEscape";
import { Memory } from "./games/memory/Memory";
import { MentalMath } from "./games/mentalMath/MentalMath";
import { Minesweeper } from "./games/minesweeper/Minesweeper";
import { Nim } from "./games/nim/Nim";
import { Nonogram } from "./games/nonogram/Nonogram";
import { OneToFifty } from "./games/oneToFifty/OneToFifty";
import { PegSolitaire } from "./games/pegSolitaire/PegSolitaire";
import { Poker } from "./games/poker/Poker";
import { Pong } from "./games/pong/Pong";
import { Puzzle2048 } from "./games/puzzle2048/Puzzle2048";
import { ReactionTest } from "./games/reaction/ReactionTest";
import { Reversi } from "./games/reversi/Reversi";
import { SameGame } from "./games/sameGame/SameGame";
import { SimonSays } from "./games/simonSays/SimonSays";
import { Slide15 } from "./games/slide15/Slide15";
import { SnakeGame } from "./games/snake/SnakeGame";
import { Sudoku } from "./games/sudoku/Sudoku";
import { TicTacToe } from "./games/ticTacToe/TicTacToe";
import { TypingGame } from "./games/typing/TypingGame";
import { WhackMole } from "./games/whackMole/WhackMole";
import { WaterSort } from "./games/waterSort/WaterSort";

const gameViews: Record<string, ComponentType<{ onBack: () => void }>> = {
  "2048": Puzzle2048,
  sudoku: Sudoku,
  minesweeper: Minesweeper,
  memory: Memory,
  slide15: Slide15,
  lightsOut: LightsOut,
  reaction: ReactionTest,
  typing: TypingGame,
  mentalMath: MentalMath,
  aimTrainer: AimTrainer,
  snake: SnakeGame,
  breakout: Breakout,
  pong: Pong,
  whackMole: WhackMole,
  ticTacToe: TicTacToe,
  reversi: Reversi,
  colorJudge: ColorJudge,
  blackjack: Blackjack,
  hanoi: Hanoi,
  connectFour: ConnectFour,
  mazeEscape: MazeEscape,
  simonSays: SimonSays,
  nim: Nim,
  hitBlow: HitBlow,
  floodFill: FloodFill,
  sameGame: SameGame,
  pegSolitaire: PegSolitaire,
  oneToFifty: OneToFifty,
  waterSort: WaterSort,
  poker: Poker,
  nonogram: Nonogram
};

const recentGameIds = ["nonogram", "poker", "waterSort", "oneToFifty"];
const allGenresKey = "__all__";
const favoriteStorageKey = "game-shelf-favorites";
const recentlyPlayedStorageKey = "game-shelf-recently-played";
const maxRecentlyPlayed = 8;

function getSelectedGameId() {
  return new URLSearchParams(window.location.search).get("game");
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

export function App() {
  const [selectedGameId, setSelectedGameId] = useState(() => getSelectedGameId());
  const [language, setLanguageState] = useState<Language>(() => detectInitialLanguage());
  const [query, setQuery] = useState("");
  const [selectedGenre, setSelectedGenre] = useState(allGenresKey);
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => readStoredIds(favoriteStorageKey));
  const [recentlyPlayedIds, setRecentlyPlayedIds] = useState<string[]>(() => readStoredIds(recentlyPlayedStorageKey));
  const SelectedGame = selectedGameId ? gameViews[selectedGameId] : undefined;
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
    document.documentElement.lang = language;
    document.title = language === "ja" ? "Game Shelf | ブラウザゲーム集" : "Game Shelf | Browser Games";

    const description = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (description) {
      description.content = t.metaDescription;
    }
  }, [language, t.metaDescription]);

  const returnToShelf = () => {
    window.history.pushState({}, "", window.location.pathname);
    setSelectedGameId(null);
  };

  if (SelectedGame) {
    return (
      <I18nContext.Provider value={{ language, setLanguage }}>
        <main className="game-screen">
          <DomTranslationLayer language={language} />
          <div className="game-topbar">
            <button className="back-button" type="button" onClick={returnToShelf}>
              <ArrowLeft aria-hidden="true" />
              {t.backToShelf}
            </button>
            <LanguageSwitcher language={language} setLanguage={setLanguage} />
          </div>
          <SelectedGame onBack={returnToShelf} />
        </main>
      </I18nContext.Provider>
    );
  }

  return (
    <I18nContext.Provider value={{ language, setLanguage }}>
    <main>
      <DomTranslationLayer language={language} />
      <header className="hero">
        <div className="brand-mark" aria-hidden="true">
          <Gamepad2 />
        </div>
        <div>
          <p className="eyebrow">{t.brandEyebrow}</p>
          <h1>Game Shelf</h1>
          <p className="lead">{t.lead}</p>
        </div>
        <LanguageSwitcher language={language} setLanguage={setLanguage} />
      </header>

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
              onPlayed={rememberPlayedGame}
              onSelect={setSelectedGameId}
            />
          ))}
        </div>
      </section>

      <ShelfStrip
        emptyText={t.favoritesEmpty}
        games={favoriteGames}
        icon={<Star aria-hidden="true" />}
        language={language}
        onPlayed={rememberPlayedGame}
        onSelect={setSelectedGameId}
        title={t.favoritesTitle}
        eyebrow={t.favoritesEyebrow}
      />

      <ShelfStrip
        emptyText={t.recentlyPlayedEmpty}
        games={recentlyPlayedGames}
        icon={<Clock3 aria-hidden="true" />}
        language={language}
        onPlayed={rememberPlayedGame}
        onSelect={setSelectedGameId}
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
            onPlayed={rememberPlayedGame}
            onSelect={setSelectedGameId}
          />
        ))}
      </section>

      {filteredGames.length === 0 && (
        <p className="empty-state">{t.emptyState}</p>
      )}

      <footer>
        <span>{t.edition}</span>
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
  onPlayed?: (gameId: string) => void;
  onSelect: (gameId: string) => void;
};

function GameCard({
  game,
  index,
  language,
  compact = false,
  favorite = false,
  onFavoriteToggle,
  onPlayed,
  onSelect
}: GameCardProps) {
  const isComingSoon = game.status === "coming-soon";
  const href = game.kind === "internal" ? `?game=${game.id}` : game.href;
  const t = uiText[language];
  const gameText = getGameText(game, language);
  const kindLabel = game.kind === "embedded" ? t.included : game.kind === "internal" ? t.internal : t.external;

  return (
    <a
      className={`game-card${isComingSoon ? " is-coming-soon" : ""}${compact ? " is-compact" : ""}`}
      href={href}
      style={{ "--accent": game.accent, "--delay": `${index * 90}ms` } as CSSProperties}
      aria-label={isComingSoon ? `${gameText.title} ${t.comingSoon}` : `${t.openGame} ${gameText.title}`}
      onClick={(event) => {
        if (isComingSoon) {
          event.preventDefault();
          return;
        }

        if (game.kind === "internal") {
          event.preventDefault();
          window.history.pushState({}, "", href);
          onPlayed?.(game.id);
          onSelect(game.id);
          return;
        }

        onPlayed?.(game.id);
      }}
    >
      <div className="screenshot-frame">
        <img src={game.screenshot} alt={`${gameText.title} game screen`} />
        {onFavoriteToggle && (
          <button
            className={`favorite-button${favorite ? " is-active" : ""}`}
            type="button"
            aria-label={`${favorite ? t.removeFavorite : t.addFavorite}: ${gameText.title}`}
            title={favorite ? t.removeFavorite : t.addFavorite}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onFavoriteToggle(game.id);
            }}
          >
            <Star aria-hidden="true" />
          </button>
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
        </div>
      </div>
    </a>
  );
}

function ShelfStrip({
  emptyText,
  eyebrow,
  games: shelfGames,
  icon,
  language,
  onPlayed,
  onSelect,
  title
}: {
  emptyText: string;
  eyebrow: string;
  games: Game[];
  icon: ReactNode;
  language: Language;
  onPlayed: (gameId: string) => void;
  onSelect: (gameId: string) => void;
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
            const href = game.kind === "internal" ? `?game=${game.id}` : game.href;

            return (
              <a
                className="saved-game-chip"
                href={href}
                key={game.id}
                style={{ "--accent": game.accent } as CSSProperties}
                onClick={(event) => {
                  if (game.kind === "internal") {
                    event.preventDefault();
                    window.history.pushState({}, "", href);
                    onPlayed(game.id);
                    onSelect(game.id);
                    return;
                  }

                  onPlayed(game.id);
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
