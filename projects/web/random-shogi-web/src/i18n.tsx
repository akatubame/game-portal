import { useEffect, useSyncExternalStore, type ReactNode } from 'react'
// 描画時に翻訳する。React管理下のDOMは外部から書き換えない。

const translations: Record<string, string> = {
  '局面データを検証しています': 'Validating positions',
  '局面を生成できませんでした。もう一度お試しください。': 'Could not create a position. Please try again.',
  '対局再開': 'Resume game', '対局履歴': 'Game history', 'COMの最小待ち時間': 'Minimum CPU wait',
  '結果': 'Result', 'すべて': 'All', '勝ち': 'Win', '負け': 'Loss', 'その他': 'Other', '閉じる': 'Close',
  '同じ局面に再挑戦': 'Retry this position', '先後を入れ替えて再挑戦': 'Retry as the other side',
  '履歴をすべて削除': 'Clear history', '対局履歴をすべて削除しますか？': 'Delete all game history?',
  '該当する履歴はありません。': 'No matching games.',
  '保存できませんでした。画面を閉じると進行が失われる可能性があります。': 'Could not save. Closing this page may lose your progress.',
  '投了。あなたの負けです。': 'You resigned. You lose.', '一手目': 'First position', '戻る': 'Previous', '進む': 'Next', '最終手': 'Last move', '確認': 'OK',
  '将棋盤': 'Shogi board', '対局設定': 'Game settings', '既存局面': 'Original positions',
  '玉頭の寄せ合い': 'A race to attack the kings', '飛車切り後の速度勝負': 'A race after sacrificing a rook',
  '竜を作った寄せ': 'A dragon-led attack', '角を据えた終盤入口': 'Entering the endgame with a bishop outpost',
  '馬で迫る勝負所': 'A critical horse attack', '後手の詰めろ攻勢': 'Gote threatens mate',
  '飛車の横利きで受ける': 'Defending with the rook along a rank', '後手番の反撃含み': 'Gote has counterplay',
  '馬が急所にいる局面': 'A horse on a key square', '一手争いの最終盤': 'A one-move race',
  '後手の受けが利く終盤': 'Gote has a solid defense', '馬と飛車の挟撃': 'A horse and rook pincer attack',
  '平手から生成したCOM対局棋譜。Fairy-Stockfishによる参考評価。': 'A CPU self-play game from the standard starting position, with a reference evaluation by Fairy-Stockfish.',
  '先手は竜と馬を軸に迫れます。受けるなら玉頭の厚みを意識します。': 'Sente can attack with the dragon and horse. When defending, reinforce the area in front of the king.',
  '後手の持ち駒が豊富です。先手は詰めろ逃れと反撃の両立が必要です。': 'Gote has many pieces in hand. Sente must escape mate threats while creating counterplay.',
  '先手が攻めやすい局面です。王手の連続より包む寄せが有効です。': 'Sente has a promising attack. Encircling the king may work better than repeated checks.',
  '互いに薄い玉です。攻め合いに出るか一手受けるかが分岐点です。': 'Both kings are exposed. Choose between a race and taking a move to defend.',
  '先手優勢ですが決め損ねると反撃があります。駒を渡す順番に注意します。': 'Sente is ahead, but Gote has counterplay. Consider the order in which captured pieces become available.',
  '先手は受けに回りたい局面です。攻め駒を責める手も候補になります。': 'Sente needs to defend. Attacking the attacking pieces is also an option.',
  '先手は飛車の守備力を残しながら寄せを狙います。': 'Sente should attack while retaining the defensive reach of the rook.',
  '形勢はほぼ互角です。後手の反撃を読みつつ速度を見極めます。': 'The position is close. Assess the pace of the attack and Gote’s counterplay.',
  '馬の利きが急所です。自玉の退路を消さない寄せが求められます。': 'The horse controls key squares. Attack without closing your own king’s escape routes.',
  '先手優勢ですが後手にも厳しい王手があります。詰めろの確認が重要です。': 'Sente is ahead, but Gote has strong checks. Keep track of mate threats.',
  '先手は少し苦しい局面です。無理攻めより受けながら駒を補充します。': 'Sente is slightly worse. Defend and gain material rather than forcing an attack.',
  '先手の攻め駒が十分です。後手番でも受け一辺倒にしない判断が必要です。': 'Sente has ample attacking pieces. Gote should look for counterplay rather than only defending.',
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


export function getLanguage(): 'ja' | 'en' {
  try {
    const saved = localStorage.getItem('game-shelf-language')
    if (saved === 'ja' || saved === 'en') return saved
  } catch { /* ストレージが使えない場合も表示する。 */ }
  return typeof navigator !== 'undefined' && navigator.language.toLowerCase().startsWith('ja') ? 'ja' : 'en'
}
export function useLanguage() {
  const subscribe = (notify: () => void) => {
    window.addEventListener('storage', notify)
    window.addEventListener('languagechange', notify)
    return () => { window.removeEventListener('storage', notify); window.removeEventListener('languagechange', notify) }
  }
  const language = useSyncExternalStore(subscribe, getLanguage, () => 'ja' as const)
  useEffect(() => { document.documentElement.lang = language }, [language])
  return language
}
export function t(value: string): string {
  return getLanguage() === 'ja' ? value : value.replace(value.trim(), translateText(value.trim()))
}
export function tx(value: ReactNode): ReactNode {
  if (typeof value === 'string') return t(value)
  if (Array.isArray(value)) return value.map(tx)
  return value
}

export function translateText(value: string): string {
  if (translations[value]) return translations[value]
  const replay = value.match(/^棋譜 (\d+)\/(\d+)$/)
  if (replay) return `Replay ${replay[1]}/${replay[2]}`
  const move = value.match(/^(COM: )?([玉飛角金銀桂香歩])(成)? (\d+)$/)
  if (move) return `${move[1] ? 'CPU: ' : ''}${({ 玉: 'King', 飛: 'Rook', 角: 'Bishop', 金: 'Gold', 銀: 'Silver', 桂: 'Knight', 香: 'Lance', 歩: 'Pawn' } as Record<string, string>)[move[2]]}${move[3] ? ' promoted' : ''} ${move[4]}`
  const promotion = value.match(/^([玉飛角金銀桂香歩])を成りますか？$/)
  if (promotion) return 'Promote this piece?'
  const styles: Record<string, string> = { '矢倉系': 'Yagura', '雁木系': 'Gangi', '右玉系': 'Right King', '居飛車穴熊系': 'Static Rook Anaguma', '舟囲い系': 'Boat Castle', '四間飛車美濃系': 'Fourth-file Rook Mino', '四間飛車穴熊系': 'Fourth-file Rook Anaguma', '三間飛車美濃系': 'Third-file Rook Mino', '三間飛車穴熊系': 'Third-file Rook Anaguma', '中飛車美濃系': 'Central Rook Mino', '中飛車穴熊系': 'Central Rook Anaguma', '向かい飛車美濃系': 'Opposing Rook Mino' }
  const sides = value.split('対')
  if (sides.length === 2 && styles[sides[0]] && styles[sides[1]]) return `${styles[sides[0]]} vs ${styles[sides[1]]}`
  if (value.includes(' / ')) return value.split(' / ').map((part) => translations[part] ?? part).join(' / ')
  return value
}
