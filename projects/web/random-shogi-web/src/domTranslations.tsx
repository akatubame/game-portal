import { useEffect } from 'react'

type Language = 'ja' | 'en'

const translations: Record<string, string> = {
  'BROWSER SHOGI': 'BROWSER SHOGI',
  'ランダム将棋': 'Random Shogi',
  '中終盤の多様な局面から、すぐに対局を始められます。': 'Start playing instantly from a wide range of middle- and endgame shogi positions.',
  '難易度': 'Difficulty',
  '易': 'Easy',
  '普通': 'Normal',
  '難': 'Hard',
  'プレイ開始': 'Start game',
  '設定': 'Settings',
  '評価値を表示': 'Show evaluation',
  '完了': 'Done',
  '駒を選択してください。': 'Select a piece.',
  'あなたの手番です。駒を選択してください。': 'Your turn. Select a piece.',
  '開始局面': 'Starting position',
  '対局が終了しました。': 'The game is over.',
  '対局終了': 'Game over',
  'COM思考中': 'CPU thinking',
  'COMの手番': 'CPU turn',
  'あなたの手番': 'Your turn',
  '投了': 'Resign',
  '待った': 'Undo',
  'ホーム': 'Home',
  '新局面': 'New position',
  '棋譜再生': 'Replay',
  '棋譜再生を終了': 'Exit replay',
  'ここから再開': 'Resume from here',
  '新局面を生成中': 'Generating a new position',
  '局面データを読み込んでいます': 'Loading position data',
  '対局を準備しています': 'Preparing the game',
  '指せる手がありません。': 'There are no legal moves.',
  'COMが投了しました。あなたの勝ちです。': 'The CPU resigned. You win.',
  '詰み。あなたの勝ちです。': 'Checkmate. You win.',
  '詰み。あなたの負けです。': 'Checkmate. You lose.',
  '棋譜再生中の局面から対局を再開しました。': 'Resumed the game from the replay position.',
  '待ったしました。': 'Undid the previous move.',
  '先手': 'Sente',
  '後手': 'Gote',
  'なし': 'None',
  '評価値': 'Evaluation',
  '相居飛車': 'Double Static Rook',
  '対抗形': 'Static Rook vs Ranging Rook',
  '振り飛車': 'Ranging Rook',
  '相振り飛車': 'Double Ranging Rook',
  '囲い持久戦': 'Castling / Slow Game',
  '奇襲力戦': 'Surprise / Unorthodox',
  '攻め筋': 'Attacking Theme',
  '終盤': 'Endgame',
  '最終盤': 'Final endgame'
}

const originalText = new WeakMap<Text, string>()

export function DomTranslationLayer() {
  useEffect(() => {
    const language = getLanguage()
    document.documentElement.lang = language
    document.title = language === 'en' ? 'Random Shogi' : 'ランダム将棋'
    const description = document.querySelector<HTMLMetaElement>('meta[name="description"]')
    if (description) {
      description.content = language === 'en'
        ? 'Start playing shogi instantly from varied middle- and endgame positions.'
        : '中終盤の多彩な局面から、すぐに対局を始められるランダム将棋。'
    }
    const translate = () => {
      if (language === 'ja') return
      translateDocument()
    }

    translate()
    const observer = new MutationObserver(() => window.requestAnimationFrame(translate))
    observer.observe(document.body, { childList: true, subtree: true, characterData: true })

    return () => observer.disconnect()
  }, [])

  return null
}

function getLanguage(): Language {
  const saved = localStorage.getItem('game-shelf-language')
  if (saved === 'ja' || saved === 'en') return saved
  return navigator.language.toLowerCase().startsWith('ja') ? 'ja' : 'en'
}

function translateDocument() {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
  const nodes: Text[] = []
  while (walker.nextNode()) nodes.push(walker.currentNode as Text)

  for (const node of nodes) {
    const source = originalText.get(node) ?? node.nodeValue ?? ''
    const trimmed = source.trim()
    const translated = translations[trimmed]
    if (!translated) continue
    if (!originalText.has(node)) originalText.set(node, source)
    const nextValue = source.replace(trimmed, translated)
    if (node.nodeValue !== nextValue) node.nodeValue = nextValue
  }
}
