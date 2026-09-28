import { useEffect, useSyncExternalStore, type ReactNode } from 'react'
// 描画時に翻訳する。React管理下のDOMは外部から書き換えない。

const translations: Record<string, string> = {
  "点": " pts", "役:": "Yaku:",
  "保存できませんでした。この画面では続行できますが、閉じると今回の進行や記録が失われる可能性があります。": "Could not save. You can keep playing here, but closing this page may lose your latest progress and records.",
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
  "メニュー": "Menu",
  "流局": "Draw",
  "結果へ": "Results",
  "次の局へ": "Next round",
  "対局結果": "Match result",
  "位": "place",
  "翻": "han",
  "役満": "Yakuman",
  "三倍満": "Sanbaiman",
  "倍満": "Baiman",
  "跳満": "Haneman",
  "満貫": "Mangan",
  "一発": "Ippatsu",
  "門前清自摸和": "Menzen Tsumo",
  "断幺九": "Tanyao",
  "平和": "Pinfu",
  "役牌": "Value tiles",
  "嶺上開花": "Rinshan Kaihou",
  "対々和": "Toitoi",
  "一暗刻": "Iiankou",
  "混一色": "Honitsu",
  "一槓子": "One kan",
  "清一色": "Chinitsu",
  "天和": "Tenhou",
  "地和": "Chiihou",
  "人和": "Renhou",
  "字一色": "Tsuuiisou",
  "清老頭": "Chinroutou",
  "緑一色": "Ryuuiisou",
  "ダブル立直": "Double riichi",
  "海底摸月": "Haitei",
  "河底撈魚": "Houtei",
  "混全帯幺九": "Chanta",
  "純全帯幺九": "Junchan",
  "混老頭": "Honroutou",
  "裏ドラ": "Ura-dora",
  "テンパイして立直を宣言する。": "Declare riichi when in tenpai.",
  "立直後、次の自分のツモまでに和了する。": "Win before your next draw after declaring riichi.",
  "自分で和了牌を引く。": "Draw your own winning tile.",
  "一九字牌を含まない。": "Use no terminals or honor tiles.",
  "順子・役牌以外の雀頭・両面待ち。": "A sequence hand with a non-value pair and a two-sided wait.",
  "三元牌、または自風・場風の刻子を含む。": "Contains a triplet of dragons, seat wind, or round wind.",
  "暗槓後の補充牌で和了する。": "Win on the replacement tile after a closed kan.",
  "刻子と雀頭で構成する。": "Made of a triplet and a pair.",
  "暗刻を含み単騎待ちで和了する。": "Win with a concealed triplet and a single-tile wait.",
  "一種類の数牌と字牌のみ。": "Only one suit plus honor tiles.",
  "暗槓を一回行う。": "Make one closed kan.",
  "一種類の数牌のみ。": "Only one suit, no honor tiles.",
  "親の第一ツモで和了する。": "Dealer wins on the first draw.",
  "子の第一ツモで和了する。": "Non-dealer wins on the first draw.",
  "第一ツモ前にロン和了する。": "Win by ron before the first draw.",
  "字牌のみで構成する。": "Made only of honor tiles.",
  "数牌の一・九牌のみで構成する。": "Made only of terminal number tiles.",
  "索子の二・三・四・六・八と發のみで構成する。": "Made only of green sou tiles and green dragon.",
  "アガリ牌の例": "Example winning tile",
  "アガリ": "Winning tile",
  "対局数": "Games played",
  "ベストスコア": "Best score",
  "平均着順": "Average rank",
  "和了率": "Win rate",
  "放銃率": "Deal-in rate",
  "立直率": "Riichi rate",
  "最高打点": "Highest win",
  "アガリ形": "Winning shape",
  "保存した対局を削除": "Delete saved game",
  "四枚で完成する小さな麻雀": "A tiny mahjong game completed with four tiles",
  "手牌4枚にツモ牌1枚を加え、面子1組と雀頭1組を完成させると和了です。": "Add one drawn tile to your four-tile hand and complete one set plus one pair to win.",
  "対局": "Match",
  "東風戦・持ち点60,000点": "East-only match, 60,000 starting points",
  "採用": "Included rules",
  "立直、暗槓、ドラ、裏ドラ、フリテン": "Riichi, closed kan, dora, ura-dora, furiten",
  "不採用": "Not included",
  "チー、ポン、明槓": "Chi, pon, open kan",
  "操作": "Controls",
  "牌を選んで打牌。立直時は「立直」を押してから対象牌を選択。": "Choose a tile to discard. For riichi, press Riichi first, then choose the tile.",
  "あなた": "You",
  "本場": "bonus counter",
  "東": "East",
  "南": "South",
  "西": "West",
  "北": "North",
  "白": "White",
  "發": "Green",
  "中": "Red"
};

const regexTranslations: Array<[RegExp, (match: RegExpMatchArray) => string]> = [
  [/^([\d,.]+)\s*回$/, (match) => `${match[1]} games`],
  [/^([\d,.]+)\s*位$/, (match) => `Rank ${match[1]}`],
  [/^([\d,.]+)\s*点$/, (match) => `${match[1]} pts`],
  [/^([1-9])([萬筒索])$/, (match) => `${match[1]} ${{ 萬: 'characters', 筒: 'dots', 索: 'bamboo' }[match[2] as '萬' | '筒' | '索']}`],
  [/^東(\d+)局$/, (match) => `East ${match[1]}`],
  [/^東(\d+)局\s+(\d+)本場$/, (match) => `East ${match[1]}, bonus ${match[2]}`],
  [/^残り\s+(\d+)枚$/, (match) => `${match[1]} tiles left`],
  [/^(\d+)本場$/, (match) => `bonus ${match[1]}`],
  [/^(\d+)翻$/, (match) => `${match[1]} han`],
  [/^(.+)\s+(\d+)点$/, (match) => `${translateText(match[1])} ${match[2]} pts`],
  [/^(\d+)位\s+(.+)$/, (match) => `${ordinal(Number(match[1]))} ${translateText(match[2])}`],
  [/^役:\s*(.+)$/, (match) => `Yaku: ${translateText(match[1])}`],
  [/^(.+) が立直！$/, (match) => `${translateText(match[1])} declared riichi!`],
  [/^(.+) が暗槓！$/, (match) => `${translateText(match[1])} made a closed kan!`],
  [/^(.+) がツモ！$/, (match) => `${translateText(match[1])} ${match[1] === 'あなた' ? 'win' : 'wins'} by tsumo!`],
  [/^(.+) がロン！$/, (match) => `${translateText(match[1])} ${match[1] === 'あなた' ? 'win' : 'wins'} by ron!`],
  [/^(.+) ツモ！$/, (match) => `${translateText(match[1])} tsumo!`],
  [/^(.+) ロン！$/, (match) => `${translateText(match[1])} ron!`],
  [/^ドラ\s+(\d+)$/, (match) => `Dora ${match[1]}`],
  [/^裏ドラ\s+(\d+)$/, (match) => `Ura-dora ${match[1]}`],
  [/^自風\s+(.+)$/, (match) => `Seat wind ${translateText(match[1])}`],
  [/^場風\s+(.+)$/, (match) => `Round wind ${translateText(match[1])}`]
];


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
  const exact = translations[value];
  if (exact) return exact;

  for (const [pattern, replacer] of regexTranslations) {
    const match = value.match(pattern);
    if (match) return replacer(match);
  }

  let translated = value;
  const entries = Object.entries(translations).sort((a, b) => b[0].length - a[0].length);

  for (const [source, target] of entries) {
    if (source && translated.includes(source)) {
      translated = translated.split(source).join(target);
    }
  }

  return translated;
}

function ordinal(value: number) {
  const suffix = value === 1 ? "st" : value === 2 ? "nd" : value === 3 ? "rd" : "th";
  return `${value}${suffix}`;
}
