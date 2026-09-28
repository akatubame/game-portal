import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Home, RotateCcw, Settings, StepForward, Swords } from 'lucide-react'
import { evaluate } from './game/evaluator'
import { createRandomGame, type NewGame } from './game/positions'
import { applyMove, canPromote, hasAnyLegalMove, isKingInCheck, legalDrops, legalTargets, mustPromote } from './game/rules'
import { clonePosition } from './game/sfen'
import { requestCom } from './game/comRequest'
import { filterHistory, HISTORY_KEY, loadHistory, loadSession, newSessionId, readSetting, recordHistory, retryGame, saveSession, writeSetting, type Session } from './game/session'
import { opposite, type Difficulty, type Move, type Piece, type PieceKind, type Position, type Side, type Snapshot, type Square } from './game/types'
import { t, tx, useLanguage } from './i18n'

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
  const language = useLanguage()
  useEffect(() => {
    document.title = t("ランダム将棋")
    const description = document.querySelector<HTMLMetaElement>('meta[name="description"]')
    if (description) description.content = t('中終盤の多様な局面から、すぐに対局を始められます。')
  }, [language])
  const [view, setView] = useState<View>('home')
  const [difficulty, setDifficulty] = useState<Difficulty>(() => {
    const saved = readSetting('random-shogi-difficulty', 'normal')
    return ['easy', 'normal', 'hard'].includes(saved) ? saved as Difficulty : 'normal'
  })
  const [showEvaluation, setShowEvaluation] = useState(() => readSetting('random-shogi-evaluation', 'true') !== 'false')
  const [comDelay, setComDelay] = useState(() => Math.max(0, Math.min(2000, Number(readSetting('random-shogi-com-delay', '550')) || 0)))
  const [savedSession, setSavedSession] = useState(loadSession)
  const [sessionId, setSessionId] = useState('')
  const [history, setHistory] = useState(loadHistory)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [historyDifficulty, setHistoryDifficulty] = useState('all')
  const [historyOutcome, setHistoryOutcome] = useState('all')
  const [saveFailed, setSaveFailed] = useState(false)
  const [viewingHistory, setViewingHistory] = useState(false)
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
  const cancelComRef = useRef<(() => void) | null>(null)
  const generationRef = useRef(0)
  const inputLockedRef = useRef(false)

  const displayedSnapshot = replayIndex === null ? null : snapshots[replayIndex]
  const currentPosition = displayedSnapshot?.position ?? position
  const currentLastMove = displayedSnapshot?.lastMove ?? lastMove
  const currentMessage = displayedSnapshot?.message ?? message
  const isReplay = replayIndex !== null

  useEffect(() => {
    writeSetting('random-shogi-difficulty', difficulty)
  }, [difficulty])
  useEffect(() => {
    writeSetting('random-shogi-evaluation', String(showEvaluation))
  }, [showEvaluation])
  useEffect(() => { writeSetting('random-shogi-com-delay', String(comDelay)) }, [comDelay])
  useEffect(() => { inputLockedRef.current = false }, [position, result, view])
  useEffect(() => {
    if (!game || !position || !sessionId || viewingHistory || !snapshots.length) return
    const session: Session = { version: 1, id: sessionId, updatedAt: Date.now(), game, position, snapshots, undoStack, lastMove, message, result }
    setSavedSession(session)
    let saved = saveSession(session)
    if (result) {
      const recorded = recordHistory(session)
      setHistory(recorded.history)
      saved = saved && recorded.saved
    }
    setSaveFailed(!saved)
  }, [game, position, sessionId, viewingHistory, snapshots, undoStack, lastMove, message, result])
  useEffect(() => () => {
    generationRef.current++
    cancelComRef.current?.()
    workerRef.current?.terminate()
    if (hardWorkerRef.current !== workerRef.current) hardWorkerRef.current?.terminate()
    workerRef.current = null
    hardWorkerRef.current = null
  }, [])
  useEffect(() => {
    if (difficulty === 'easy' || hardWorkerRef.current) return
    try {
      const worker = new Worker(stockfishWorkerUrl)
      hardWorkerRef.current = worker
      worker.onerror = () => { if (hardWorkerRef.current === worker) hardWorkerRef.current = null; worker.terminate() }
      worker.postMessage({ warmup: true })
    } catch { /* 利用できない環境では対局時に内蔵COMへ切り替える。 */ }
  }, [difficulty])

  const installGame = useCallback((next: NewGame) => {
    cancelComRef.current?.()
    setSessionId(newSessionId())
    setViewingHistory(false)
    setGame(next)
    setPosition(clonePosition(next.position))
    setView('game')
    setThinking(false)
    setSelected(null)
    setSelectedHand(null)
    setTargets([])
    setLastMove([])
    setResult(null)
    setResultDialogOpen(false)
    setMessage(next.position.turn === next.playerSide ? 'あなたの手番です。駒を選択してください。' : 'COMの手番')
    setSnapshots([{ position: clonePosition(next.position), lastMove: [], message: '開始局面' }])
    setUndoStack([])
    setReplayIndex(null)
    setLoading(null)
    setHistoryOpen(false)
  }, [])

  const restoreSession = (session: Session, replay = false) => {
    generationRef.current++
    cancelComRef.current?.()
    setGame(session.game)
    setSessionId(session.id)
    setPosition(clonePosition(session.position))
    setSnapshots(session.snapshots)
    setUndoStack(session.undoStack)
    setLastMove(session.lastMove)
    setMessage(session.message)
    setResult(session.result)
    setReplayIndex(replay ? session.snapshots.length - 1 : null)
    setViewingHistory(replay)
    setResultDialogOpen(false)
    setSelected(null)
    setSelectedHand(null)
    setTargets([])
    setThinking(false)
    setHistoryOpen(false)
    setView('game')
  }

  const startGame = useCallback(async () => {
    const generation = ++generationRef.current
    cancelComRef.current?.()
    setThinking(false)
    setLoading({ progress: 4, label: '局面データを読み込んでいます' })
    let next: NewGame
    try {
      next = await createRandomGame(difficulty, (progress, label) => {
        if (generation === generationRef.current) setLoading({ progress, label })
      })
    } catch {
      if (generation === generationRef.current) {
        setLoading(null)
        window.alert(t('局面を生成できませんでした。もう一度お試しください。'))
      }
      return
    }
    if (generation !== generationRef.current) return
    installGame(next)
  }, [difficulty, installGame])

  const finish = useCallback((text: string) => {
    cancelComRef.current?.()
    setResult(text)
    setResultDialogOpen(true)
    setThinking(false)
    setMessage('対局が終了しました。')
    playEndSound()
  }, [])

  const commitMove = useCallback(
    (move: Move, actor: 'player' | 'com') => {
      if (!position || !game || inputLockedRef.current) return
      inputLockedRef.current = true
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
    if (view !== 'game' || !position || !game || result || isReplay || position.turn === game.playerSide) return
    setThinking(true)
    const started = performance.now()
    let delayTimer: ReturnType<typeof setTimeout> | undefined
    const cancel = requestCom({
      position,
      difficulty: game.difficulty,
      primary: () => {
        const worker = hardWorkerRef.current ?? new Worker(stockfishWorkerUrl)
        hardWorkerRef.current = worker
        return worker
      },
      fallback: () => {
        const worker = new Worker(new URL('./workers/com.worker.ts', import.meta.url), { type: 'module' })
        workerRef.current = worker
        return worker
      },
      discardPrimary: (worker) => {
        if (hardWorkerRef.current === worker) hardWorkerRef.current = null
      },
      complete: (move) => {
        delayTimer = setTimeout(() => {
          setThinking(false)
          if (move) commitMove(move, 'com')
          else finish(isKingInCheck(position, position.turn) ? '詰み。あなたの勝ちです。' : '指せる手がありません。')
        }, Math.max(0, comDelay - (performance.now() - started)))
      },
    })
    const cancelAll = () => { cancel(); clearTimeout(delayTimer) }
    cancelComRef.current = cancelAll
    return () => {
      cancelAll()
      if (cancelComRef.current === cancelAll) cancelComRef.current = null
    }
  }, [view, position, game, result, isReplay, commitMove, finish, comDelay])

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
      if (!promote && canPromote(moving, selected[0], square[0])) promote = window.confirm(t(`${labels[moving.kind]}を成りますか？`))
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
    if (inputLockedRef.current) return
    const previous = undoStack.at(-1)
    if (!previous) return
    inputLockedRef.current = true
    cancelComRef.current?.()
    workerRef.current?.terminate()
    hardWorkerRef.current?.terminate()
    workerRef.current = null
    hardWorkerRef.current = null
    setThinking(false)
    setPosition(clonePosition(previous.position))
    setLastMove(previous.lastMove)
    setMessage('待ったしました。')
    setUndoStack((items) => items.slice(0, -1))
    setSnapshots((items) => items.slice(0, Math.max(1, items.findIndex((item) => item.position.moveNumber === previous.position.moveNumber) + 1)))
    setSelected(null)
    setSelectedHand(null)
    setTargets([])
    setResultDialogOpen(false)
    setResult(null)
  }

  const resumeReplay = () => {
    if (replayIndex === null) return
    cancelComRef.current?.()
    setThinking(false)
    const snapshot = snapshots[replayIndex]
    if (!hasAnyLegalMove(snapshot.position, snapshot.position.turn)) return
    setSessionId(newSessionId())
    setViewingHistory(false)
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

        <header className="brand-row">
          <div>
            <p className="eyebrow">{tx("BROWSER SHOGI")}</p>
            <h1>{tx("ランダム将棋")}</h1>
          </div>
          <span className="version">{tx("ver ")}{tx(VERSION)}</span>
        </header>
        <p className="home-copy">{tx("中終盤の多様な局面から、すぐに対局を始められます。")}</p>
        <section className="home-controls" aria-label={t("対局設定")}>
          <h2>{tx("難易度")}</h2>
          <div className="segmented">
            {tx((['easy', 'normal', 'hard'] as Difficulty[]).map((level) => (
              <button key={level} className={difficulty === level ? 'active' : ''} onClick={() => setDifficulty(level)}>
                {tx(difficultyLabels[level])}
              </button>
            )))}
          </div>
          <button className="primary start-button" onClick={startGame}>
            <Swords size={21} />{tx(" プレイ開始 ")}</button>
          {tx(savedSession && !savedSession.result && <button className="secondary" onClick={() => restoreSession(savedSession)}>{tx("対局再開")}</button>)}
          <button className="secondary" onClick={() => setHistoryOpen(true)}>{tx("対局履歴")}</button>
          <button className="secondary" onClick={() => setSettingsOpen(true)}>
            <Settings size={19} />{tx(" 設定 ")}</button>
        </section>
        {tx(settingsOpen && (
          <div className="modal-backdrop" onClick={() => setSettingsOpen(false)}>
            <div className="dialog" onClick={(event) => event.stopPropagation()}>
              <h2>{tx("設定")}</h2>
              <label className="switch-row"><span>{tx("COMの最小待ち時間")}</span><select value={comDelay} onChange={(event) => setComDelay(Number(event.target.value))}>
                {tx([0, 300, 550, 1000, 2000].map((delay) => <option key={delay} value={delay}>{tx(delay)}{tx(" ms")}</option>))}
              </select></label>
              <label className="switch-row">
                <span>{tx("評価値を表示")}</span>
                <input type="checkbox" checked={showEvaluation} onChange={(event) => setShowEvaluation(event.target.checked)} />
              </label>
              <button className="primary" onClick={() => setSettingsOpen(false)}>{tx("完了")}</button>
            </div>
          </div>
        ))}
        {tx(loading && <LoadingOverlay {...loading} />)}
        {tx(saveFailed && <p role="alert">{tx("保存できませんでした。画面を閉じると進行が失われる可能性があります。")}</p>)}
        {tx(historyOpen && <div className="modal-backdrop"><section className="dialog history-dialog" role="dialog" aria-modal="true" aria-label={t("対局履歴")}>
          <h2>{tx("対局履歴")}</h2>
          <div className="history-filters">
            <select aria-label={t("難易度")} value={historyDifficulty} onChange={(event) => setHistoryDifficulty(event.target.value)}>
              <option value="all">{tx("すべて")}</option>{tx((['easy', 'normal', 'hard'] as Difficulty[]).map((level) => <option key={level} value={level}>{tx(difficultyLabels[level])}</option>))}
            </select>
            <select aria-label={t("結果")} value={historyOutcome} onChange={(event) => setHistoryOutcome(event.target.value)}><option value="all">{tx("すべて")}</option><option value="win">{tx("勝ち")}</option><option value="loss">{tx("負け")}</option><option value="other">{tx("その他")}</option></select>
          </div>
          {tx(filterHistory(history, historyDifficulty, historyOutcome).map((item) => <article key={item.id} className="history-item">
            <strong>{tx(item.game.seed.title)}</strong><p>{tx(new Date(item.updatedAt).toLocaleString())}{tx(" · ")}{tx(difficultyLabels[item.game.difficulty])}{tx(" · ")}{tx(item.result)}</p>
            <div className="end-actions"><button onClick={() => restoreSession(item, true)}>{tx("棋譜再生")}</button><button onClick={() => installGame(retryGame(item.game))}>{tx("同じ局面に再挑戦")}</button><button onClick={() => installGame(retryGame(item.game, true))}>{tx("先後を入れ替えて再挑戦")}</button></div>
          </article>))}
          {tx(!filterHistory(history, historyDifficulty, historyOutcome).length && <p>{tx("該当する履歴はありません。")}</p>)}
          <button onClick={() => { if (window.confirm(t('対局履歴をすべて削除しますか？'))) { const saved = writeSetting(HISTORY_KEY, '[]'); if (saved) setHistory([]); setSaveFailed(!saved) } }}>{tx("履歴をすべて削除")}</button>
          <button className="primary" onClick={() => setHistoryOpen(false)}>{tx("閉じる")}</button>
        </section></div>)}
      </main>
    )
  }

  if (!game || !currentPosition) return null
  const evaluation = evaluate(currentPosition, game.playerSide)
  const topSide = game.playerSide === 'sente' ? 'gote' : 'sente'
  const bottomSide = game.playerSide

  return (
    <main className="game-screen">

      {tx(saveFailed && <p role="alert">{tx("保存できませんでした。画面を閉じると進行が失われる可能性があります。")}</p>)}
      <header className="game-header">
        <div>
          <p className="eyebrow">{tx(game.seed.category)}{tx(" / ")}{tx(game.seed.phase)}</p>
          <h1>{tx(game.seed.title)}</h1>
        </div>
        <span className={`turn-indicator ${thinking ? 'thinking' : ''}`}>
          {tx(isReplay ? `棋譜 ${replayIndex! + 1}/${snapshots.length}` : thinking ? 'COM思考中' : currentPosition.turn === game.playerSide ? 'あなたの手番' : 'COMの手番')}
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
          {tx(result && <div className="result-banner"><strong>{tx("対局終了")}</strong><span>{tx(result)}</span></div>)}
          <div className="position-info">
            {tx(showEvaluation && <p className="evaluation">{tx("評価値 ")}<strong>{tx(evaluation >= 0 ? '+' : '')}{tx(evaluation)}</strong></p>)}
            <p>{tx(currentMessage)}</p>
            <p className="note">{tx(game.seed.note)}</p>
          </div>

          {tx(isReplay ? (
            <div className="replay-controls">
              <button title={t("一手目")} onClick={() => setReplayIndex(0)}><ChevronsLeft /></button>
              <button title={t("戻る")} onClick={() => setReplayIndex(Math.max(0, replayIndex! - 1))}><ChevronLeft /></button>
              <button title={t("進む")} onClick={() => setReplayIndex(Math.min(snapshots.length - 1, replayIndex! + 1))}><ChevronRight /></button>
              <button title={t("最終手")} onClick={() => setReplayIndex(snapshots.length - 1)}><ChevronsRight /></button>
              <button className="wide" onClick={resumeReplay}><StepForward size={18} />{tx("ここから再開")}</button>
              <button className="wide" onClick={() => { if (viewingHistory) { setView('home'); setHistoryOpen(true) } else setReplayIndex(null) }}>{tx("棋譜再生を終了")}</button>
            </div>
          ) : result ? (
            <div className="end-actions">
              <button className="primary" onClick={startGame}>{tx("新局面")}</button>
              <button className="secondary" onClick={() => setReplayIndex(snapshots.length - 1)}>{tx("棋譜再生")}</button>
              <button className="secondary" onClick={() => installGame(retryGame(game))}>{tx("同じ局面に再挑戦")}</button>
              <button className="secondary" onClick={() => installGame(retryGame(game, true))}>{tx("先後を入れ替えて再挑戦")}</button>
              <button className="secondary" onClick={() => setView('home')}>{tx("ホーム")}</button>
            </div>
          ) : null)}
        </aside>
      </div>

      {tx(!isReplay && !result && (
        <nav className="bottom-actions">
          <button onClick={() => finish('投了。あなたの負けです。')}><Swords size={18} />{tx("投了")}</button>
          <button onClick={undo} disabled={!undoStack.length}><RotateCcw size={18} />{tx("待った")}</button>
          <button onClick={() => { cancelComRef.current?.(); setThinking(false); setView('home') }}><Home size={18} />{tx("ホーム")}</button>
        </nav>
      ))}
      {tx(result && resultDialogOpen && (
        <div className="result-dialog-backdrop">
          <div className="result-dialog">
            <strong>{tx("対局終了")}</strong>
            <p>{tx(result)}</p>
            <button className="primary" onClick={() => setResultDialogOpen(false)}>{tx("確認")}</button>
          </div>
        </div>
      ))}
      {tx(loading && <LoadingOverlay {...loading} />)}
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
    <div className="board" role="grid" aria-label={t("将棋盤")}>
      {tx(squares.map(({ square, piece }) => {
        const selectedHere = selected && squareKey(selected) === squareKey(square)
        const target = targets.some((item) => squareKey(item) === squareKey(square))
        const moved = lastMove.some((item) => squareKey(item) === squareKey(square))
        return (
          <button
            key={squareKey(square)}
            className={`square ${selectedHere ? 'selected' : ''} ${target ? 'target' : ''} ${moved ? 'last-move' : ''}`}
            onClick={() => onSquare(square)}
          >
            {tx(piece && <PieceGlyph piece={piece} playerSide={playerSide} />)}
          </button>
        )
      }))}
    </div>
  )
}

function PieceGlyph({ piece, playerSide }: { piece: Piece; playerSide: Side }) {
  return <span className={`piece ${piece.owner !== playerSide ? 'opponent' : ''}`}>{tx(piece.promoted ? promotedLabels[piece.kind] : labels[piece.kind])}</span>
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
      <span className="hand-label">{tx(side === 'sente' ? '先手' : '後手')}</span>
      <div className="hand-pieces">
        {tx(entries.length ? entries.map((kind) => (
          <button key={kind} className={`hand-piece ${selected === kind ? 'selected' : ''}`} onClick={() => onSelect(kind)}>
            <PieceGlyph piece={{ owner: side, kind, promoted: false }} playerSide={playerSide} />
            {tx((position.hands[side][kind] ?? 0) > 1 && <small>{tx(position.hands[side][kind])}</small>)}
          </button>
        )) : <span className="empty-hand">{tx("なし")}</span>)}
      </div>
    </div>
  )
}

function LoadingOverlay({ progress, label }: { progress: number; label: string }) {
  return (
    <div className="loading-overlay">
      <div className="loading-panel">
        <strong>{tx("新局面を生成中")}</strong>
        <p>{tx(label)}</p>
        <progress max="100" value={progress} />
        <span>{tx(progress)}{tx("%")}</span>
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
