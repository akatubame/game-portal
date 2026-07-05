import { ArrowLeft, ArrowUpRight, Gamepad2, Search } from "lucide-react";
import { useEffect, useMemo, useState, type ComponentType, type CSSProperties } from "react";
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
const allGenresLabel = "ALL GENRES";

function getSelectedGameId() {
  return new URLSearchParams(window.location.search).get("game");
}

export function App() {
  const [selectedGameId, setSelectedGameId] = useState(() => getSelectedGameId());
  const [query, setQuery] = useState("");
  const [selectedGenre, setSelectedGenre] = useState(allGenresLabel);
  const SelectedGame = selectedGameId ? gameViews[selectedGameId] : undefined;

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

  const genres = useMemo(
    () => [
      allGenresLabel,
      ...Array.from(new Set(availableGames.map((game) => game.genre))).sort()
    ],
    [availableGames]
  );

  const filteredGames = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return games.filter((game) => {
      const matchesGenre = selectedGenre === allGenresLabel || game.genre === selectedGenre;
      const matchesQuery = !normalizedQuery || [
        game.title,
        game.englishTitle,
        game.description,
        game.genre,
        game.kind
      ].some((value) => value.toLowerCase().includes(normalizedQuery));

      return matchesGenre && matchesQuery;
    });
  }, [query, selectedGenre]);

  useEffect(() => {
    const handleNavigation = () => {
      setSelectedGameId(getSelectedGameId());
    };

    window.addEventListener("popstate", handleNavigation);

    return () => {
      window.removeEventListener("popstate", handleNavigation);
    };
  }, []);

  const returnToShelf = () => {
    window.history.pushState({}, "", window.location.pathname);
    setSelectedGameId(null);
  };

  if (SelectedGame) {
    return (
      <main className="game-screen">
        <button className="back-button" type="button" onClick={returnToShelf}>
          <ArrowLeft aria-hidden="true" />
          Back to Game Shelf
        </button>
        <SelectedGame onBack={returnToShelf} />
      </main>
    );
  }

  return (
    <main>
      <header className="hero">
        <div className="brand-mark" aria-hidden="true">
          <Gamepad2 />
        </div>
        <div>
          <p className="eyebrow">LOCAL BROWSER GAMES</p>
          <h1>Game Shelf</h1>
          <p className="lead">
            Pick a small browser game from this local shelf. Search, filter, or jump straight into the newest additions.
          </p>
        </div>
      </header>

      <section className="quick-shelf" aria-labelledby="recent-games-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">RECENTLY ADDED</p>
            <h2 id="recent-games-title">New on the shelf</h2>
          </div>
          <span>{recentGames.length} PICKS</span>
        </div>
        <div className="quick-grid">
          {recentGames.map((game, index) => (
            <GameCard game={game} index={index} key={game.id} onSelect={setSelectedGameId} compact />
          ))}
        </div>
      </section>

      <section className="shelf-tools" aria-label="Game shelf controls">
        <label className="search-box">
          <Search aria-hidden="true" />
          <span className="sr-only">Search games</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by title, genre, or type"
          />
        </label>
        <label className="genre-filter">
          <span>Genre</span>
          <select value={selectedGenre} onChange={(event) => setSelectedGenre(event.target.value)}>
            {genres.map((genre) => (
              <option key={genre} value={genre}>{genre}</option>
            ))}
          </select>
        </label>
        <div className="shelf-count" aria-live="polite">
          <strong>{filteredGames.length}</strong>
          <span>shown</span>
        </div>
      </section>

      <section className="game-grid" aria-label="Game list">
        {filteredGames.map((game, index) => (
          <GameCard game={game} index={index} key={game.id} onSelect={setSelectedGameId} />
        ))}
      </section>

      {filteredGames.length === 0 && (
        <p className="empty-state">No games match this filter.</p>
      )}

      <footer>
        <span>LOCAL EDITION</span>
        <span>{availableGames.length} GAMES AVAILABLE</span>
      </footer>
    </main>
  );
}

type GameCardProps = {
  game: Game;
  index: number;
  compact?: boolean;
  onSelect: (gameId: string) => void;
};

function GameCard({ game, index, compact = false, onSelect }: GameCardProps) {
  const isComingSoon = game.status === "coming-soon";
  const href = game.kind === "internal" ? `?game=${game.id}` : game.href;

  return (
    <a
      className={`game-card${isComingSoon ? " is-coming-soon" : ""}${compact ? " is-compact" : ""}`}
      href={href}
      style={{ "--accent": game.accent, "--delay": `${index * 90}ms` } as CSSProperties}
      aria-label={isComingSoon ? `${game.title} is coming soon` : `Open ${game.title}`}
      onClick={(event) => {
        if (isComingSoon) {
          event.preventDefault();
          return;
        }

        if (game.kind === "internal") {
          event.preventDefault();
          window.history.pushState({}, "", href);
          onSelect(game.id);
        }
      }}
    >
      <div className="screenshot-frame">
        <img src={game.screenshot} alt={`${game.title} game screen`} />
        <span className="play-label">
          {isComingSoon ? "SOON" : "PLAY"} {!isComingSoon && <ArrowUpRight />}
        </span>
      </div>
      <div className="card-body">
        <div className="card-heading">
          <div>
            <span className="genre">{game.genre}</span>
            <h2>{game.title}</h2>
          </div>
          {!isComingSoon && <ArrowUpRight className="card-arrow" aria-hidden="true" />}
        </div>
        <p>{game.description}</p>
        <div className="card-meta">
          <span className="english-title">{game.englishTitle}</span>
          <span className={`kind-badge is-${game.kind}`}>
            {game.kind === "embedded" ? "included" : game.kind}
          </span>
        </div>
      </div>
    </a>
  );
}
