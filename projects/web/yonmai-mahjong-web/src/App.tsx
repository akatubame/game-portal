import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft, BarChart3, BookOpen, Check, ChevronRight, CircleHelp, Home,
  RotateCcw, Settings, Sparkles, Trophy, X
} from "lucide-react";
import type { Difficulty, PlayerState, Tile } from "./engine/types";
import { nextDora, DRAGON_LABEL, SUIT_LABEL, tileEqual, tileId, tileImagePath, WIND_LABEL } from "./engine/tiles";
import { ranking, validRiichiDiscards, windName } from "./engine/game";
import { useAppStore } from "./store";
import { autoDiscardTriggerKey } from "./autoDiscard";
import { isRiichiSelectionActive } from "./riichiSelection";
import { isResumableGame } from "./savedGame";
import { canAcceptTileInput } from "./tileInputGuard";
import { DomTranslationLayer } from "./domTranslations";

const difficultyLabel: Record<Difficulty, string> = { beginner: "易", easy: "普通", normal: "難" };

const tileText = (tile: Tile) => tile.kind === "number" ? `${tile.value}${SUIT_LABEL[tile.suit]}` :
  tile.kind === "wind" ? WIND_LABEL[tile.wind] : DRAGON_LABEL[tile.dragon];

function TileView({ tile, onClick, selected = false, muted = false, small = false, sideways = false }:
  { tile: Tile; onClick?: () => void; selected?: boolean; muted?: boolean; small?: boolean; sideways?: boolean }) {
  return (
    <button
      className={`tile ${small ? "tile-small" : ""} ${selected ? "tile-selected" : ""} ${muted ? "tile-muted" : ""} ${sideways ? "tile-sideways" : ""}`}
      onClick={onClick}
      disabled={!onClick}
      aria-label={tileText(tile)}
      data-tile={tileId(tile)}
    >
      <img src={tileImagePath(tile)} alt="" draggable={false} />
      <span className="tile-fallback" aria-hidden="true">{tileText(tile)}</span>
    </button>
  );
}

const WindBadge = ({ player }: { player: PlayerState }) => (
  <span className="wind-badge">{WIND_LABEL[player.seatWind]}</span>
);

function TitleScreen() {
  const { game, newGame, resumeGame, setView, clearSave } = useAppStore();
  const [difficulty, setDifficulty] = useState<Difficulty>(game.difficulty);
  const [showSavedGameDialog, setShowSavedGameDialog] = useState(false);
  const hasSave = isResumableGame(game);

  const handleStart = () => {
    if (hasSave) {
      setShowSavedGameDialog(true);
      return;
    }
    newGame(difficulty);
  };

  const handleNewGame = () => {
    setShowSavedGameDialog(false);
    newGame(difficulty);
  };

  return (
    <>
      <main className="title-screen">
        <section className="title-main">
          <h1>四枚麻雀</h1>
          <p className="roman-title">YONMAI MAHJONG</p>
          <div className="difficulty">
            <span>COMの強さ</span>
            <div className="segmented">
              {(Object.keys(difficultyLabel) as Difficulty[]).map((item) => (
                <button key={item} className={difficulty === item ? "active" : ""} onClick={() => setDifficulty(item)}>
                  {difficultyLabel[item]}
                </button>
              ))}
            </div>
          </div>
          <button className="primary-action" onClick={handleStart}>対局開始</button>
          {hasSave && (
            <div className="resume-row">
              <button className="secondary-action" onClick={resumeGame}>
                対局再開
              </button>
              <button className="icon-action danger" title="保存を削除" onClick={clearSave}>
                <RotateCcw size={20} />
              </button>
            </div>
          )}
          <button className="title-rules-action" onClick={() => setView("rules")}>
            <CircleHelp size={18} />
            ルール
          </button>
        </section>
        <nav className="bottom-nav" aria-label="メニュー">
          <button onClick={() => setView("records")}><BarChart3 /><span>過去の成績</span></button>
          <button onClick={() => setView("yaku")}><BookOpen /><span>役一覧</span></button>
          <button onClick={() => setView("settings")}><Settings /><span>設定</span></button>
        </nav>
      </main>

      {showSavedGameDialog && (
        <Modal title="保存された対局があります">
          <p>途中の対局が保存されています。</p>
          <div className="modal-actions">
            <button className="secondary-action" onClick={() => setShowSavedGameDialog(false)}>
              キャンセル
            </button>
            <button className="primary-action compact" onClick={handleNewGame}>
              最初から始める
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

function PlayerInfo({ player, vertical = false }: { player: PlayerState; vertical?: boolean }) {
  return (
    <div className={`player-info ${vertical ? "vertical" : ""}`}>
      <WindBadge player={player} />
      <span className="player-name">{player.name}</span>
      <strong>{player.points.toLocaleString()}</strong>
      {player.isRiichi && <span className="riichi-badge">立直</span>}
    </div>
  );
}

function Discards({ player, direction }: { player: PlayerState; direction: "top" | "left" | "right" | "bottom" }) {
  return (
    <div className={`discards discards-${direction}`}>
      {player.discards.map((tile, index) => (
        <TileView key={`${index}-${tileId(tile)}`} tile={tile} small sideways={index === player.riichiDiscardIndex} />
      ))}
    </div>
  );
}

function GameBoard() {
  const { game, discard, riichi, ankan, tsumo, ron, skipRon, autoDiscard, recoverGame, backToTitle, nextRound } = useAppStore();
  const [riichiMode, setRiichiMode] = useState(false);
  const [exitOpen, setExitOpen] = useState(false);
  const lastTileInputAt = useRef<number | null>(null);
  const player = game.players[0];
  const riichiTiles = useMemo(() => validRiichiDiscards(game), [game]);
  const autoDiscardKey = autoDiscardTriggerKey(game);
  const riichiSelectionActive = isRiichiSelectionActive(
    riichiMode,
    game.pendingAction?.canRiichi === true
  );
  const stalledHumanTurn =
    game.players[0].hand.length === 5 &&
    (game.phase === "playing" || (game.phase === "waiting" && !game.pendingAction));

  const handleTileInput = (action: () => void) => {
    const currentAt = performance.now();
    if (!canAcceptTileInput(lastTileInputAt.current, currentAt)) return;
    lastTileInputAt.current = currentAt;
    action();
  };

  useEffect(() => {
    if (stalledHumanTurn) {
      recoverGame();
    }
  }, [stalledHumanTurn, game.turnCount, recoverGame]);

  useEffect(() => {
    setRiichiMode(false);
  }, [game.roundNumber, game.turnCount, game.pendingAction?.type]);

  useEffect(() => {
    if (autoDiscardKey) {
      const timer = window.setTimeout(autoDiscard, 650);
      return () => window.clearTimeout(timer);
    }
  }, [autoDiscardKey, autoDiscard]);

  return (
    <main
      className="game-screen"
      data-game-phase={game.phase}
      data-current-player={game.currentPlayerIdx}
      data-pending-action={game.pendingAction?.type ?? "none"}
      data-human-hand-size={game.players[0].hand.length}
      data-turn-count={game.turnCount}
    >
      <header className="game-header">
        <button className="icon-action" onClick={() => setExitOpen(true)} title="タイトルへ"><ArrowLeft /></button>
        <div><strong>東{game.roundNumber + 1}局</strong>{game.honbaCount > 0 && <span>{game.honbaCount}本場</span>}</div>
        <span>残り {game.wall.liveTiles.length}枚</span>
        <div className="dora"><span>ドラ</span>{game.wall.doraIndicators.map((tile, i) => <TileView key={i} tile={nextDora(tile)} small />)}</div>
      </header>

      <section className="table">
        <PlayerInfo player={game.players[2]} />
        <div className="side-player side-left"><PlayerInfo player={game.players[1]} vertical /></div>
        <div className="side-player side-right"><PlayerInfo player={game.players[3]} vertical /></div>
        <Discards player={game.players[2]} direction="top" />
        <Discards player={game.players[1]} direction="left" />
        <Discards player={game.players[3]} direction="right" />
        <Discards player={game.players[0]} direction="bottom" />
        <div className="round-medallion"><b>東</b><span>{game.roundNumber + 1}局</span></div>
      </section>

      <section className="human-area">
        <PlayerInfo player={player} />
        <div className="hand-row">
          {player.ankan.map((tile, index) => (
            <div className="ankan-set" key={`${tileId(tile)}-${index}`}>
              <span className="tile-back" /><TileView tile={tile} small /><TileView tile={tile} small /><span className="tile-back" />
            </div>
          ))}
          <div className="hand-tiles">
            {player.hand.map((tile, index) => {
              const drawn = game.drawnTile && index === player.hand.length - 1;
              const allowed = !riichiSelectionActive || riichiTiles.some((candidate) => tileEqual(candidate, tile));
              return (
                <div className={drawn ? "drawn-tile" : ""} key={`${tileId(tile)}-${index}`}>
                  <TileView
                    tile={tile}
                    muted={!allowed}
                    onClick={!player.isRiichi && allowed && game.phase === "waiting" && game.pendingAction?.type !== "ronCheck"
                      ? () => handleTileInput(() => {
                          if (riichiSelectionActive) {
                            setRiichiMode(false);
                            riichi(tile);
                          } else {
                            discard(tile);
                          }
                        })
                      : undefined}
                  />
                </div>
              );
            })}
          </div>
        </div>
        <div className="actions">
          {game.pendingAction?.canTsumo && <button className="action win" onClick={tsumo}>ツモ</button>}
          {game.pendingAction?.type === "ronCheck" && <>
            <button className="action ron" onClick={ron}>ロン</button>
            <button className="action neutral" onClick={skipRon}>見逃す</button>
          </>}
          {game.pendingAction?.canRiichi && (
            <button className={`action riichi ${riichiSelectionActive ? "active" : ""}`} onClick={() => setRiichiMode(!riichiSelectionActive)}>
              {riichiSelectionActive ? "取消" : "立直"}
            </button>
          )}
          {game.pendingAction?.canAnkan && game.pendingAction.ankanTiles.map((tile) => (
            <button key={tileId(tile)} className="action kan" onClick={() => ankan(tile)}>暗槓</button>
          ))}
        </div>
        <div className="game-log">{game.gameLog.slice(-2).map((line, i) => <span key={i}>{line}</span>)}</div>
      </section>

      {exitOpen && <Modal title="対局を保存">
        <p>現在の対局を保存してタイトル画面に戻ります。</p>
        <div className="modal-actions">
          <button className="secondary-action" onClick={() => setExitOpen(false)}>キャンセル</button>
          <button className="primary-action compact" onClick={() => { setExitOpen(false); backToTitle(); }}>保存して戻る</button>
        </div>
      </Modal>}
      {game.phase === "roundResult" && game.roundResult && <ResultModal onNext={nextRound} />}
      {game.phase === "gameResult" && <GameResult onHome={backToTitle} />}
    </main>
  );
}

function ResultModal({ onNext }: { onNext: () => void }) {
  const result = useAppStore((s) => s.game.roundResult)!;
  const game = useAppStore((s) => s.game);
  return <Modal title={result.isDraw ? "流局" : `${game.players[result.winnerId!].name} ${result.isTsumo ? "ツモ" : "ロン"}！`}>
    {!result.isDraw && <>
      <div className="result-hand">{result.winTiles.map((tile, i) => <TileView tile={tile} small key={i} />)}</div>
      <div className="yaku-result">{result.yaku.map((item) => <div key={item.id}><span>{item.name}</span><b>{item.han}翻</b></div>)}</div>
      <strong className="result-score">{result.rankName} {result.basePoints.toLocaleString()}点</strong>
    </>}
    <div className="point-changes">{result.pointChanges.map((change, i) => change !== 0 && <span className={change > 0 ? "plus" : "minus"} key={i}>{game.players[i].name} {change > 0 ? "+" : ""}{change}</span>)}</div>
    <button className="primary-action compact" onClick={onNext}>{game.roundNumber >= 3 ? "結果へ" : "次の局へ"}</button>
  </Modal>;
}

function GameResult({ onHome }: { onHome: () => void }) {
  const game = useAppStore((s) => s.game);
  return <Modal title="対局結果">
    <div className="ranking">{ranking(game).map((player, index) => <div key={player.id}><span>{index + 1}位 {player.name}</span><b>{player.points.toLocaleString()}点</b></div>)}</div>
    <button className="primary-action compact" onClick={onHome}><Home size={18} />タイトルへ</button>
  </Modal>;
}

function Modal({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="modal-backdrop"><section className="modal"><h2>{title}</h2>{children}</section></div>;
}

interface YakuCatalogItem {
  id: string;
  name: string;
  han: string;
  condition: string;
  hand: Tile[];
  winTile: Tile;
  ankan?: Tile;
}

const numberTile = (suit: "man" | "pin" | "sou", value: number): Tile =>
  ({ kind: "number", suit, value });
const windTile = (wind: "east" | "south" | "west" | "north"): Tile =>
  ({ kind: "wind", wind });
const dragonTile = (dragon: "haku" | "hatsu" | "chun"): Tile =>
  ({ kind: "dragon", dragon });

const standardExample = {
  hand: [numberTile("sou", 2), numberTile("sou", 3), numberTile("man", 1), numberTile("man", 1)],
  winTile: numberTile("sou", 4)
};

const yakuCatalog: YakuCatalogItem[] = [
  { id: "riichi", name: "立直", han: "1翻", condition: "テンパイして立直を宣言する。", ...standardExample },
  { id: "ippatsu", name: "一発", han: "1翻", condition: "立直後、次の自分のツモまでに和了する。", ...standardExample },
  { id: "tsumo", name: "門前清自摸和", han: "1翻", condition: "自分で和了牌を引く。", ...standardExample },
  {
    id: "tanyao", name: "断幺九", han: "1翻", condition: "一九字牌を含まない。",
    hand: [numberTile("man", 2), numberTile("man", 3), numberTile("man", 4), numberTile("pin", 5)],
    winTile: numberTile("pin", 5)
  },
  {
    id: "pinfu", name: "平和", han: "1翻", condition: "順子・役牌以外の雀頭・両面待ち。",
    hand: [numberTile("sou", 2), numberTile("sou", 3), numberTile("man", 1), numberTile("man", 1)],
    winTile: numberTile("sou", 4)
  },
  {
    id: "yakuhai_haku", name: "役牌", han: "1翻", condition: "三元牌、または自風・場風の刻子を含む。",
    hand: [dragonTile("haku"), dragonTile("haku"), numberTile("pin", 2), numberTile("pin", 2)],
    winTile: dragonTile("haku")
  },
  {
    id: "rinshan", name: "嶺上開花", han: "1翻", condition: "暗槓後の補充牌で和了する。",
    hand: [numberTile("sou", 8)],
    winTile: numberTile("sou", 8),
    ankan: numberTile("man", 1)
  },
  {
    id: "toitoi", name: "対々和", han: "2翻", condition: "刻子と雀頭で構成する。",
    hand: [numberTile("man", 7), numberTile("man", 7), numberTile("sou", 1), numberTile("sou", 1)],
    winTile: numberTile("man", 7)
  },
  {
    id: "iiankou", name: "一暗刻", han: "2翻", condition: "暗刻を含み単騎待ちで和了する。",
    hand: [numberTile("man", 2), numberTile("man", 2), numberTile("man", 2), numberTile("pin", 1)],
    winTile: numberTile("pin", 1)
  },
  {
    id: "honitsu", name: "混一色", han: "3翻", condition: "一種類の数牌と字牌のみ。",
    hand: [numberTile("man", 2), numberTile("man", 3), dragonTile("hatsu"), dragonTile("hatsu")],
    winTile: numberTile("man", 4)
  },
  {
    id: "ikkantsu", name: "一槓子", han: "4翻", condition: "暗槓を一回行う。",
    hand: [numberTile("sou", 8)],
    winTile: numberTile("sou", 8),
    ankan: numberTile("man", 1)
  },
  {
    id: "chinitsu", name: "清一色", han: "6翻", condition: "一種類の数牌のみ。",
    hand: [numberTile("pin", 2), numberTile("pin", 3), numberTile("pin", 7), numberTile("pin", 7)],
    winTile: numberTile("pin", 4)
  },
  { id: "tenhou", name: "天和", han: "役満", condition: "親の第一ツモで和了する。", ...standardExample },
  { id: "chiihou", name: "地和", han: "役満", condition: "子の第一ツモで和了する。", ...standardExample },
  { id: "renhou", name: "人和", han: "役満", condition: "第一ツモ前にロン和了する。", ...standardExample },
  {
    id: "tsuiisou", name: "字一色", han: "役満", condition: "字牌のみで構成する。",
    hand: [windTile("east"), windTile("east"), dragonTile("haku"), dragonTile("haku")],
    winTile: windTile("east")
  },
  {
    id: "chinroutou", name: "清老頭", han: "役満", condition: "数牌の一・九牌のみで構成する。",
    hand: [numberTile("man", 1), numberTile("man", 1), numberTile("pin", 9), numberTile("pin", 9)],
    winTile: numberTile("man", 1)
  },
  {
    id: "ryuuiisou", name: "緑一色", han: "役満", condition: "索子の二・三・四・六・八と發のみで構成する。",
    hand: [numberTile("sou", 2), numberTile("sou", 3), dragonTile("hatsu"), dragonTile("hatsu")],
    winTile: numberTile("sou", 4)
  }
];

function YakuHandExample({ hand, winTile, ankan }: Pick<YakuCatalogItem, "hand" | "winTile" | "ankan">) {
  return (
    <div className="yaku-example" aria-label="アガリ牌の例">
      {ankan && (
        <div className="yaku-ankan" aria-label="暗槓">
          <span className="tile-back" />
          <TileView tile={ankan} small />
          <TileView tile={ankan} small />
          <span className="tile-back" />
        </div>
      )}
      <div className="yaku-hand">
        {hand.map((tile, index) => <TileView key={`${tileId(tile)}-${index}`} tile={tile} small />)}
      </div>
      <div className="yaku-win-tile">
        <span>アガリ</span>
        <TileView tile={winTile} small />
      </div>
    </div>
  );
}

function SubPage({ title, children }: { title: string; children: React.ReactNode }) {
  const setView = useAppStore((s) => s.setView);
  return <main className="sub-page"><header><button className="icon-action" onClick={() => setView("game")}><ArrowLeft /></button><h1>{title}</h1></header>{children}</main>;
}

function YakuScreen() {
  const achieved = useAppStore((s) => s.achievedYaku);
  return <SubPage title="役一覧"><div className="catalog">{yakuCatalog.map((yaku) =>
    <article key={yaku.id}>
      <div><h2>{yaku.name}</h2><b>{yaku.han}</b></div>
      <p>{yaku.condition}</p>
      <YakuHandExample hand={yaku.hand} winTile={yaku.winTile} ankan={yaku.ankan} />
      {achieved.includes(yaku.id) && <Check className="achieved" />}
    </article>)}</div></SubPage>;
}

function RecordsScreen() {
  const statistics = useAppStore((s) => s.statistics);
  const [difficulty, setDifficulty] = useState<Difficulty>("beginner");
  const s = statistics[difficulty];
  const averageRank = s.games ? s.rankCounts.reduce((sum, count, index) => sum + count * (index + 1), 0) / s.games : 0;
  return <SubPage title="過去の成績">
    <div className="segmented records-tabs">{(Object.keys(difficultyLabel) as Difficulty[]).map((item) => <button className={difficulty === item ? "active" : ""} onClick={() => setDifficulty(item)} key={item}>{difficultyLabel[item]}</button>)}</div>
    <div className="stats-grid">
      <Stat label="対局数" value={`${s.games} 回`} icon={<Trophy />} />
      <Stat label="ベストスコア" value={`${s.bestScore.toLocaleString()} 点`} icon={<Sparkles />} />
      <Stat label="平均着順" value={s.games ? `${averageRank.toFixed(2)} 位` : "-"} icon={<BarChart3 />} />
      <Stat label="和了率" value={s.hands ? `${(s.wins / s.hands * 100).toFixed(1)} %` : "-"} icon={<Trophy />} />
      <Stat label="放銃率" value={s.hands ? `${(s.dealIns / s.hands * 100).toFixed(1)} %` : "-"} icon={<X />} />
      <Stat label="立直率" value={s.hands ? `${(s.riichi / s.hands * 100).toFixed(1)} %` : "-"} icon={<Sparkles />} />
      <article className="stat highest-win">
        <span><Trophy />最高打点</span>
        {s.highestWinScore > 0 ? <>
          <strong>{s.highestWinScore.toLocaleString()} 点</strong>
          {s.highestWinYaku.length > 0 && (
            <p className="highest-win-yaku">役: {s.highestWinYaku.join(" | ")}</p>
          )}
          {s.highestWinHandTiles.length > 0 && (
            <div className="highest-win-shape">
              <span>アガリ形</span>
              <div>{s.highestWinHandTiles.map((tile, index) =>
                <TileView tile={tile} small key={`${tileId(tile)}-${index}`} />)}
              </div>
            </div>
          )}
        </> : <strong>-</strong>}
      </article>
    </div>
  </SubPage>;
}

function Stat({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return <article className="stat"><span>{icon}{label}</span><strong>{value}</strong></article>;
}

function SettingsScreen() {
  const setView = useAppStore((s) => s.setView);
  const clearSave = useAppStore((s) => s.clearSave);
  return <SubPage title="設定"><div className="settings-list">
    <button onClick={() => setView("records")}><BarChart3 /><span>過去の成績</span><ChevronRight /></button>
    <button onClick={() => setView("rules")}><CircleHelp /><span>ルール</span><ChevronRight /></button>
    <button onClick={clearSave}><RotateCcw /><span>保存した対局を削除</span><ChevronRight /></button>
  </div><p className="version">四枚麻雀 Web Version 1.0.0</p></SubPage>;
}

function RulesScreen() {
  return <SubPage title="ルール"><article className="rules">
    <h2>四枚で完成する小さな麻雀</h2>
    <p>手牌4枚にツモ牌1枚を加え、面子1組と雀頭1組を完成させると和了です。</p>
    <dl>
      <div><dt>対局</dt><dd>東風戦・持ち点60,000点</dd></div>
      <div><dt>採用</dt><dd>立直、暗槓、ドラ、裏ドラ、フリテン</dd></div>
      <div><dt>不採用</dt><dd>チー、ポン、明槓</dd></div>
      <div><dt>操作</dt><dd>牌を選んで打牌。立直時は「立直」を押してから対象牌を選択。</dd></div>
    </dl>
  </article></SubPage>;
}

export function App() {
  const { view, game } = useAppStore();
  return (
    <>
      <DomTranslationLayer />
      {view === "yaku" ? <YakuScreen />
        : view === "records" ? <RecordsScreen />
        : view === "settings" ? <SettingsScreen />
        : view === "rules" ? <RulesScreen />
        : game.phase === "title" ? <TitleScreen /> : <GameBoard />}
    </>
  );
}
