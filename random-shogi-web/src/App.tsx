import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Home, RotateCcw, Settings, StepForward, Swords } from 'lucide-react'
import { evaluate } from './game/evaluator'
import { createRandomGame, type NewGame } from './game/positions'
import { allLegalMoves, applyMove, canPromote, hasAnyLegalMove, isKingInCheck, legalDrops, legalTargets, mustPromote } from './game/rules'
import { clonePosition, moveToFairyNotation, positionToSfen } from './game/sfen'
import { opposite, type Difficulty, type Move, type Piece, type PieceKind, type Position, type Side, type Snapshot, type Square } from './game/types'
import { DomTranslationLayer } from './domTranslations'

const VERSION = '1.6'
const labels: Record<PieceKind, string> = { K: '玉', R: '飛', B: '角', G: '金', S: '銀', N: '桂', L: '香', P: '歩' }
const promotedLabels: Partial<Record<PieceKind, string>> = { R: '龍', B: '馬', S: '全', N: '圭', L: '杏', P: 'と' }
const handOrder: PieceKind[] = ['R', 'B', 'G', 'S', 'N', 'L', 'P']
const difficultyLabels: Record<Difficulty, string> = { easy: '易', normal: '普通', hard: '難' }
const stockfishWorkerUrl = `${import.meta.env.BASE_URL}fairy-stockfish-engine.worker.js`

type View = 'home' | 'game'

function squareKey(square: Square) {
  return `${square[0]},${square[1]}`
}

function App() {
  const [view, setView] = useState<View>('home')
  const [difficulty, setDifficulty] = useState<Difficulty>(() => (localStorage.getItem('random-shogi-difficulty') as Difficulty) || 'normal')
  const [showEvaluation, setShowEvaluation] = useState(() => localStorage.getItem('random-shogi-evaluation') !== 'false')
  const [game, setGame] = useState<NewGame | null>(null)
  const [position, setPosition] = useState<Position | null>(null)
  const [selected, setSelected] = useState<Square | null>(null)
  const [selectedHand, setSelectedHand] = useState<PieceKind | null>(null)
  const [targets, setTargets] = useState<Square[]>([])
  const [lastMove, setLastMove] = useState<Square[]>([])
  const [message, setMessage] = useState('駒を選択してください。')
  const [result, setResult] = useState<string | null>(null)
  const [thinking, setThinking] = useState(false)
  const [snapshots, setSnapshots] = useState<Snapshot[]>([])
  const [undoStack, setUndoStack] = useState<Snapshot[]>([])
  const [replayIndex, setReplayIndex] = useState<number | null>(null)
  const [loading, setLoading] = useState<{ progress: number; label: string } | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [resultDialogOpen, setResultDialogOpen] = useState(false)
  const workerRef = useRef<Worker | null>(null)
  const hardWorkerRef = useRef<Worker | null>(null)

  const displayedSnapshot = replayIndex === null ? null : snapshots[replayIndex]
  const currentPosition = displayedSnapshot?.position ?? position
  const currentLastMove = displayedSnapshot?.lastMove ?? lastMove
  const currentMessage = displayedSnapshot?.message ?? message
  const isReplay = replayIndex !== null

  useEffect(() => {
    localStorage.setItem('random-shogi-difficulty', difficulty)
  }, [difficulty])
  useEffect(() => {
    localStorage.setItem('random-shogi-evaluation', String(showEvaluation))
  }, [showEvaluation])
  useEffect(() => () => {
    workerRef.current?.terminate()
    if (hardWorkerRef.current !== workerRef.current) hardWorkerRef.current?.terminate()
    workerRef.current = null
    hardWorkerRef.current = null
  }, [])
  useEffect(() => {
    if (difficulty !== 'hard' || hardWorkerRef.current) return
    const worker = new Worker(stockfishWorkerUrl)
    hardWorkerRef.current = worker
    worker.postMessage({ warmup: true })
  }, [difficulty])

  const startGame = useCallback(async () => {
    setLoading({ progress: 4, label: '局面データを読み込んでいます' })
    const next = await createRandomGame(difficulty, (progress, label) => setLoading({ progress, label }))
    setGame(next)
    setPosition(next.position)
    setView('game')
    setSelected(null)
    setSelectedHand(null)
    setTargets([])
    setLastMove([])
    setResult(null)
    setMessage('あなたの手番です。駒を選択してください。')
    const first = { position: clonePosition(next.position), lastMove: [], message: '開始局面' }
    setSnapshots([first])
    setUndoStack([])
    setReplayIndex(null)
    setLoading(null)
  }, [difficulty])

  const finish = useCallback((text: string) => {
    setResult(text)
    setResultDialogOpen(true)
    setThinking(false)
    setMessage('対局が終了しました。')
    playEndSound()
  }, [])

  const commitMove = useCallback(
    (move: Move, actor: 'player' | 'com') => {
      if (!position || !game) return
      const before: Snapshot = { position: clonePosition(position), lastMove: [...lastMove], message }
      const next = applyMove(position, move)
      const movedSquares = move.from ? [move.from, move.to] : [move.to]
      const text = `${actor === 'com' ? 'COM: ' : ''}${labels[move.kind]}${move.promote ? '成' : ''} ${9 - move.to[1]}${move.to[0] + 1}`
      setPosition(next)
      setLastMove(movedSquares)
      setMessage(text)
      setSelected(null)
      setSelectedHand(null)
      setTargets([])
      if (actor === 'player') setUndoStack((items) => [...items, before])
      setSnapshots((items) => [...items, { position: clonePosition(next), lastMove: movedSquares, message: text }])
      if (!hasAnyLegalMove(next, next.turn)) {
        finish(isKingInCheck(next, next.turn) ? `${actor === 'player' ? '詰み。あなたの勝ちです。' : '詰み。あなたの負けです。'}` : '指せる手がありません。')
      }
    },
    [position, game, lastMove, message, finish],
  )

  useEffect(() => {
    if (!position || !game || result || isReplay || position.turn === game.playerSide || thinking) return
    setThinking(true)
    if (game.difficulty !== 'hard') workerRef.current?.terminate()
    let fallbackStarted = false

    const finishThinking = (move: Move | null) => {
      setThinking(false)
      if (!move) {
        finish('COMが投了しました。あなたの勝ちです。')
        return
      }
      commitMove(move, 'com')
    }

    const runFallback = () => {
      if (fallbackStarted) return
      fallbackStarted = true
      workerRef.current?.terminate()
      const fallback = new Worker(new URL('./workers/com.worker.ts', import.meta.url), { type: 'module' })
      workerRef.current = fallback
      fallback.onmessage = (event: MessageEvent<Move | null>) => {
        finishThinking(event.data)
        fallback.terminate()
      }
      fallback.postMessage({ position, difficulty: game.difficulty })
    }

    if (game.difficulty === 'hard') {
      const worker = hardWorkerRef.current ?? new Worker(stockfishWorkerUrl)
      hardWorkerRef.current = worker
      workerRef.current = worker
      worker.onmessage = (event: MessageEvent<{ bestmove?: string; error?: string; ready?: boolean }>) => {
        if (event.data.ready) return
        if (event.data.error || !event.data.bestmove) {
          hardWorkerRef.current = null
          runFallback()
          return
        }
        const notation = event.data.bestmove.toLowerCase()
        const move = allLegalMoves(position).find(
          (candidate) => moveToFairyNotation(candidate, position.turn).toLowerCase() === notation,
        )
        if (!move) {
          runFallback()
          return
        }
        finishThinking(move)
      }
      worker.onerror = () => {
        hardWorkerRef.current = null
        runFallback()
      }
      worker.postMessage({ sfen: positionToSfen(position) })
    } else {
      runFallback()
    }

    return () => {
      if (game.difficulty !== 'hard') workerRef.current?.terminate()
    }
  }, [position, game, result, isReplay, commitMove, finish])

  const selectSquare = (square: Square) => {
    if (!position || !game || result || isReplay || thinking || position.turn !== game.playerSide) return
    const piece = position.board[square[0]][square[1]]
    if (selectedHand) {
      if (targets.some((target) => squareKey(target) === squareKey(square))) commitMove({ to: square, kind: selectedHand }, 'player')
      return
    }
    if (selected && targets.some((target) => squareKey(target) === squareKey(square))) {
      const moving = position.board[selected[0]][selected[1]]!
      let promote = mustPromote(moving, square[0])
      if (!promote && canPromote(moving, selected[0], square[0])) promote = window.confirm(`${labels[moving.kind]}を成りますか？`)
      commitMove({ from: selected, to: square, kind: moving.kind, promote, captured: piece }, 'player')
      return
    }
    if (selected && squareKey(selected) === squareKey(square)) {
      setSelected(null)
      setTargets([])
      return
    }
    if (piece?.owner === game.playerSide) {
      setSelected(square)
      setSelectedHand(null)
      setTargets(legalTargets(position, square))
    }
  }

  const selectHand = (kind: PieceKind) => {
    if (!position || !game || result || isReplay || thinking || position.turn !== game.playerSide) return
    if (selectedHand === kind) {
      setSelectedHand(null)
      setTargets([])
      return
    }
    setSelected(null)
    setSelectedHand(kind)
    setTargets(legalDrops(position, game.playerSide, kind))
  }

  const undo = () => {
    const previous = undoStack.at(-1)
    if (!previous) return
    workerRef.current?.terminate()
    workerRef.current = null
    hardWorkerRef.current = null
    setThinking(false)
    setPosition(clonePosition(previous.position))
    setLastMove(previous.lastMove)
    setMessage('待ったしました。')
    setUndoStack((items) => items.slice(0, -1))
    setSnapshots((items) => items.slice(0, Math.max(1, items.length - 2)))
    setResult(null)
  }

  const resumeReplay = () => {
    if (replayIndex === null) return
    const snapshot = snapshots[replayIndex]
    setPosition(clonePosition(snapshot.position))
    setLastMove(snapshot.lastMove)
    setMessage('棋譜再生中の局面から対局を再開しました。')
    setSnapshots((items) => items.slice(0, replayIndex + 1))
    setUndoStack([])
    setReplayIndex(null)
    setResult(null)
  }

  if (view === 'home') {
    return (
      <main className="app-shell home-screen">
        <DomTranslationLayer />
        <header className="brand-row">
          <div>
            <p className="eyebrow">BROWSER SHOGI</p>
            <h1>ランダム将棋</h1>
          </div>
          <span className="version">ver {VERSION}</span>
        </header>
        <p className="home-copy">中終盤の多様な局面から、すぐに対局を始められます。</p>
        <section className="home-controls" aria-label="対局設定">
          <h2>難易度</h2>
          <div className="segmented">
            {(['easy', 'normal', 'hard'] as Difficulty[]).map((level) => (
              <button key={level} className={difficulty === level ? 'active' : ''} onClick={() => setDifficulty(level)}>
                {difficultyLabels[level]}
              </button>
            ))}
          </div>
          <button className="primary start-button" onClick={startGame}>
            <Swords size={21} /> プレイ開始
          </button>
          <button className="secondary" onClick={() => setSettingsOpen(true)}>
            <Settings size={19} /> 設定
          </button>
        </section>
        {settingsOpen && (
          <div className="modal-backdrop" onClick={() => setSettingsOpen(false)}>
            <div className="dialog" onClick={(event) => event.stopPropagation()}>
              <h2>設定</h2>
              <label className="switch-row">
                <span>評価値を表示</span>
                <input type="checkbox" checked={showEvaluation} onChange={(event) => setShowEvaluation(event.target.checked)} />
              </label>
              <button className="primary" onClick={() => setSettingsOpen(false)}>完了</button>
            </div>
          </div>
        )}
        {loading && <LoadingOverlay {...loading} />}
      </main>
    )
  }

  if (!game || !currentPosition) return null
  const evaluation = evaluate(currentPosition, game.playerSide)
  const topSide = game.playerSide === 'sente' ? 'gote' : 'sente'
  const bottomSide = game.playerSide

  return (
    <main className="game-screen">
      <DomTranslationLayer />
      <header className="game-header">
        <div>
          <p className="eyebrow">{game.seed.category} / {game.seed.phase}</p>
          <h1>{game.seed.title}</h1>
        </div>
        <span className={`turn-indicator ${thinking ? 'thinking' : ''}`}>
          {isReplay ? `棋譜 ${replayIndex! + 1}/${snapshots.length}` : thinking ? 'COM思考中' : currentPosition.turn === game.playerSide ? 'あなたの手番' : 'COMの手番'}
        </span>
      </header>

      <div className="game-layout">
        <section className="board-column">
          <HandRow side={topSide} playerSide={game.playerSide} position={currentPosition} selected={null} onSelect={() => {}} />
          <Board
            position={currentPosition}
            playerSide={game.playerSide}
            selected={selected}
            targets={targets}
            lastMove={currentLastMove}
            onSquare={selectSquare}
          />
          <HandRow side={bottomSide} playerSide={game.playerSide} position={currentPosition} selected={selectedHand} onSelect={selectHand} />
        </section>

        <aside className="side-panel">
          {result && <div className="result-banner"><strong>対局終了</strong><span>{result}</span></div>}
          <div className="position-info">
            {showEvaluation && <p className="evaluation">評価値 <strong>{evaluation >= 0 ? '+' : ''}{evaluation}</strong></p>}
            <p>{currentMessage}</p>
            <p className="note">{game.seed.note}</p>
          </div>

          {isReplay ? (
            <div className="replay-controls">
              <button title="一手目" onClick={() => setReplayIndex(0)}><ChevronsLeft /></button>
              <button title="戻る" onClick={() => setReplayIndex(Math.max(0, replayIndex! - 1))}><ChevronLeft /></button>
              <button title="進む" onClick={() => setReplayIndex(Math.min(snapshots.length - 1, replayIndex! + 1))}><ChevronRight /></button>
              <button title="最終手" onClick={() => setReplayIndex(snapshots.length - 1)}><ChevronsRight /></button>
              <button className="wide" onClick={resumeReplay}><StepForward size={18} />ここから再開</button>
              <button className="wide" onClick={() => setReplayIndex(null)}>棋譜再生を終了</button>
            </div>
          ) : result ? (
            <div className="end-actions">
              <button className="primary" onClick={startGame}>新局面</button>
              <button className="secondary" onClick={() => setReplayIndex(snapshots.length - 1)}>棋譜再生</button>
            </div>
          ) : null}
        </aside>
      </div>

      {!isReplay && !result && (
        <nav className="bottom-actions">
          <button onClick={() => finish('投了。あなたの負けです。')}><Swords size={18} />投了</button>
          <button onClick={undo} disabled={!undoStack.length}><RotateCcw size={18} />待った</button>
          <button onClick={() => { workerRef.current?.terminate(); workerRef.current = null; hardWorkerRef.current = null; setView('home') }}><Home size={18} />ホーム</button>
        </nav>
      )}
      {result && resultDialogOpen && (
        <div className="result-dialog-backdrop">
          <div className="result-dialog">
            <strong>対局終了</strong>
            <p>{result}</p>
            <button className="primary" onClick={() => setResultDialogOpen(false)}>確認</button>
          </div>
        </div>
      )}
      {loading && <LoadingOverlay {...loading} />}
    </main>
  )
}

function Board({
  position,
  playerSide,
  selected,
  targets,
  lastMove,
  onSquare,
}: {
  position: Position
  playerSide: Side
  selected: Square | null
  targets: Square[]
  lastMove: Square[]
  onSquare: (square: Square) => void
}) {
  const squares = useMemo(() => {
    const output: { square: Square; piece: Piece | null }[] = []
    for (let displayRow = 0; displayRow < 9; displayRow += 1) {
      for (let displayCol = 0; displayCol < 9; displayCol += 1) {
        const row = playerSide === 'gote' ? 8 - displayRow : displayRow
        const col = playerSide === 'gote' ? 8 - displayCol : displayCol
        output.push({ square: [row, col], piece: position.board[row][col] })
      }
    }
    return output
  }, [position, playerSide])
  return (
    <div className="board" role="grid" aria-label="将棋盤">
      {squares.map(({ square, piece }) => {
        const selectedHere = selected && squareKey(selected) === squareKey(square)
        const target = targets.some((item) => squareKey(item) === squareKey(square))
        const moved = lastMove.some((item) => squareKey(item) === squareKey(square))
        return (
          <button
            key={squareKey(square)}
            className={`square ${selectedHere ? 'selected' : ''} ${target ? 'target' : ''} ${moved ? 'last-move' : ''}`}
            onClick={() => onSquare(square)}
          >
            {piece && <PieceGlyph piece={piece} playerSide={playerSide} />}
          </button>
        )
      })}
    </div>
  )
}

function PieceGlyph({ piece, playerSide }: { piece: Piece; playerSide: Side }) {
  return <span className={`piece ${piece.owner !== playerSide ? 'opponent' : ''}`}>{piece.promoted ? promotedLabels[piece.kind] : labels[piece.kind]}</span>
}

function HandRow({
  side,
  playerSide,
  position,
  selected,
  onSelect,
}: {
  side: Side
  playerSide: Side
  position: Position
  selected: PieceKind | null
  onSelect: (kind: PieceKind) => void
}) {
  const entries = handOrder.filter((kind) => (position.hands[side][kind] ?? 0) > 0)
  return (
    <div className="hand-row">
      <span className="hand-label">{side === 'sente' ? '先手' : '後手'}</span>
      <div className="hand-pieces">
        {entries.length ? entries.map((kind) => (
          <button key={kind} className={`hand-piece ${selected === kind ? 'selected' : ''}`} onClick={() => onSelect(kind)}>
            <PieceGlyph piece={{ owner: side, kind, promoted: false }} playerSide={playerSide} />
            {(position.hands[side][kind] ?? 0) > 1 && <small>{position.hands[side][kind]}</small>}
          </button>
        )) : <span className="empty-hand">なし</span>}
      </div>
    </div>
  )
}

function LoadingOverlay({ progress, label }: { progress: number; label: string }) {
  return (
    <div className="loading-overlay">
      <div className="loading-panel">
        <strong>新局面を生成中</strong>
        <p>{label}</p>
        <progress max="100" value={progress} />
        <span>{progress}%</span>
      </div>
    </div>
  )
}

function playEndSound() {
  try {
    const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const context = new AudioContextClass()
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    oscillator.frequency.setValueAtTime(523, context.currentTime)
    oscillator.frequency.setValueAtTime(392, context.currentTime + 0.16)
    gain.gain.setValueAtTime(0.12, context.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.42)
    oscillator.connect(gain).connect(context.destination)
    oscillator.start()
    oscillator.stop(context.currentTime + 0.42)
  } catch {
    // 音声API非対応環境では表示だけで終了を通知する。
  }
}

export default App
