import type { Language } from "../i18n";
import type { Game } from "./gamesRegistry";

type GameTranslation = {
  title: string;
  description: string;
};

export const genreLabels: Record<Language, Record<string, string>> = {
  ja: {
    ARCADE: "アーケード",
    "BOARD GAME": "ボードゲーム",
    "BRAIN TRAINING": "脳トレ",
    "CARD GAME": "カードゲーム",
    LOGIC: "ロジック",
    MEMORY: "記憶ゲーム",
    "PICTURE LOGIC": "イラストロジック",
    PUZZLE: "パズル",
    "SCORE ATTACK": "スコアアタック",
    "SORT PUZZLE": "ソートパズル",
    "SPEED PUZZLE": "スピードパズル",
    STRATEGY: "ストラテジー",
    "TABLE GAME": "テーブルゲーム",
    "WORD GAME": "単語ゲーム"
  },
  en: {
    "WORD GAME": "Word Game"
  }
};

export const gameTranslations: Record<string, Record<Language, GameTranslation>> = {
  "random-shogi": {
    ja: {
      title: "ランダム将棋",
      description: "中終盤の多彩な局面から、すぐに対局を始められる将棋ゲーム。同じ公開サイト内で遊べます。"
    },
    en: {
      title: "Random Shogi",
      description: "Start a shogi match instantly from varied middle- and endgame positions. Included in this site."
    }
  },
  "yonmai-mahjong": {
    ja: {
      title: "四枚麻雀",
      description: "少ない手牌でテンポよく役作りを楽しめる四枚麻雀ゲーム。同じ公開サイト内で遊べます。"
    },
    en: {
      title: "Four-Tile Mahjong",
      description: "A compact solo mahjong game built around quick hands and fast scoring. Included in this site."
    }
  },
  "2048": {
    ja: { title: "2048", description: "数字タイルをスライドして合体させ、2048タイルを目指す定番パズル。" },
    en: { title: "2048", description: "Slide and merge numbered tiles as you work your way up to the 2048 tile." }
  },
  sudoku: {
    ja: { title: "数独", description: "9x9の盤面を数字で埋める定番ロジックパズル。初級から上級まで遊べます。" },
    en: { title: "Sudoku", description: "Fill a 9x9 grid with numbers in this classic logic puzzle, with beginner to advanced boards." }
  },
  minesweeper: {
    ja: { title: "マインスイーパー", description: "数字を手がかりに地雷を避けて、安全なマスをすべて開く定番パズル。" },
    en: { title: "Minesweeper", description: "Use number clues to avoid hidden mines and reveal every safe square." }
  },
  memory: {
    ja: { title: "神経衰弱", description: "裏向きのカードをめくって同じ絵柄のペアを探す、短時間で遊べる記憶パズル。" },
    en: { title: "Memory Match", description: "Flip cards, remember their symbols, and find every matching pair." }
  },
  slide15: {
    ja: { title: "15パズル", description: "空白マスへ数字タイルを滑らせて、1から15まで順番に並べるスライドパズル。" },
    en: { title: "Fifteen Puzzle", description: "Slide numbered tiles into the empty space and arrange them from 1 to 15." }
  },
  lightsOut: {
    ja: { title: "ライツアウト", description: "押したマスと上下左右のライトが反転。すべて消灯させる盤面パズル。" },
    en: { title: "Lights Out", description: "Toggle a cell and its neighbors until every light on the board is off." }
  },
  reaction: {
    ja: { title: "反射神経テスト", description: "合図が出た瞬間にクリック。反応速度をミリ秒で測る短時間スコアゲーム。" },
    en: { title: "Reaction Test", description: "Click the instant the signal appears and measure your reaction time in milliseconds." }
  },
  typing: {
    ja: { title: "タイピングゲーム", description: "表示された日本語フレーズをローマ字で入力。60秒でスコアを競うタイピング練習。" },
    en: { title: "Typing Game", description: "Type the displayed Japanese phrases in romaji and chase a high score in 60 seconds." }
  },
  mentalMath: {
    ja: { title: "計算ゲーム", description: "足し算・引き算・掛け算を60秒でどれだけ解けるか競う暗算スコアアタック。" },
    en: { title: "Mental Math", description: "Solve addition, subtraction, and multiplication problems as fast as you can in 60 seconds." }
  },
  aimTrainer: {
    ja: { title: "エイム練習", description: "30秒間で出現するターゲットを素早くクリック。命中率と連続ヒットでスコアを伸ばす練習ゲーム。" },
    en: { title: "Aim Trainer", description: "Click targets quickly for 30 seconds and build score through accuracy and streaks." }
  },
  snake: {
    ja: { title: "スネーク", description: "リンゴを集めてヘビを伸ばす定番アーケード。壁や自分の体に当たらないように進み続けよう。" },
    en: { title: "Snake", description: "Collect apples, grow longer, and avoid crashing into walls or your own body." }
  },
  breakout: {
    ja: { title: "ブロック崩し", description: "パドルでボールを打ち返し、カラフルなブロックをすべて壊す定番アーケードゲーム。" },
    en: { title: "Breakout", description: "Bounce the ball with your paddle and clear every colorful block." }
  },
  pong: {
    ja: { title: "ポン", description: "上下に動くパドルでボールを打ち返し、CPUと先に5点を競うクラシック対戦ゲーム。" },
    en: { title: "Pong", description: "Move your paddle, return the ball, and race the CPU to five points." }
  },
  whackMole: {
    ja: { title: "もぐらたたき", description: "30秒間でもぐらを叩いてスコアを競う反応ゲーム。金もぐらは高得点、爆弾は減点。" },
    en: { title: "Whack-a-Mole", description: "Whack moles for 30 seconds. Golden moles are worth more, bombs cost points." }
  },
  ticTacToe: {
    ja: { title: "三目並べ", description: "XとOを交互に置き、縦・横・斜めに3つ並べる定番対戦ゲーム。COMの難易度を選んで遊べます。" },
    en: { title: "Tic-Tac-Toe", description: "Place Xs and Os, line up three in a row, and choose a CPU difficulty." }
  },
  reversi: {
    ja: { title: "オセロ / リバーシ", description: "黒石で白石をはさんで返す定番ボードゲーム。COMの難易度を選び、盤面の制圧を目指します。" },
    en: { title: "Reversi", description: "Trap and flip your opponent's discs in this classic board game with CPU difficulty options." }
  },
  colorJudge: {
    ja: { title: "カラー判定ゲーム", description: "文字の意味と文字色が一致しているかを瞬時に判定する脳トレ系スコアアタック。" },
    en: { title: "Color Judge", description: "Judge whether the word meaning and text color match in this quick brain-training challenge." }
  },
  blackjack: {
    ja: { title: "ブラックジャック", description: "21に近い手を目指してディーラーと勝負する定番カードゲーム。ヒットとスタンドで駆け引きします。" },
    en: { title: "Blackjack", description: "Play against the dealer, hit or stand, and get as close to 21 as you can." }
  },
  hanoi: {
    ja: { title: "タワー・オブ・ハノイ", description: "大きい円盤を小さい円盤の上に置かないよう、3本の柱で円盤を移す定番ロジックパズル。" },
    en: { title: "Tower of Hanoi", description: "Move every disk between three pegs without placing a larger disk on a smaller one." }
  },
  connectFour: {
    ja: { title: "コネクトフォー", description: "7列の盤面にチップを落として、縦・横・斜めに4つ並べる定番対戦ボードゲーム。" },
    en: { title: "Connect Four", description: "Drop discs into a seven-column board and connect four vertically, horizontally, or diagonally." }
  },
  mazeEscape: {
    ja: { title: "迷路脱出", description: "ランダム生成された迷路を上下左右に進み、手数とタイムのベストを狙う探索パズル。" },
    en: { title: "Maze Escape", description: "Navigate a random maze and chase your best time and move count." }
  },
  simonSays: {
    ja: { title: "Simon Says", description: "4色の光る順番を覚えて同じ順に押す、集中力と記憶力を試す定番メモリーゲーム。" },
    en: { title: "Simon Says", description: "Memorize the flashing color sequence and repeat it in order." }
  },
  nim: {
    ja: { title: "Nim", description: "山から石を取り合い、最後の石を取った方が勝つ、読み合いが楽しい定番ストラテジーゲーム。" },
    en: { title: "Nim", description: "Take stones from piles and plan ahead so you take the last stone." }
  },
  hitBlow: {
    ja: { title: "Hit & Blow", description: "4桁の重複なし数字を、HitとBlowの手がかりから絞り込む定番ロジックゲーム。" },
    en: { title: "Hit & Blow", description: "Guess a four-digit code using Hit and Blow clues to narrow down the answer." }
  },
  yachtDice: {
    ja: { title: "ヨットダイス", description: "5つのサイコロを振り直しながら役を作り、スコア表を埋めて高得点を狙うダイスゲーム。" },
    en: { title: "Yacht Dice", description: "Reroll five dice, choose scoring categories, and build the best total you can." }
  },
  floodFill: {
    ja: { title: "Flood Fill", description: "左上から色を広げて、制限手数内に盤面全体を1色へ染める定番カラーパズル。" },
    en: { title: "Flood Fill", description: "Spread color from the top-left corner and fill the board within the move limit." }
  },
  sameGame: {
    ja: { title: "さめがめ", description: "同じ色でつながったブロックをまとめて消し、大きな塊と全消しを狙う定番パズル。" },
    en: { title: "SameGame", description: "Clear connected groups of same-colored blocks and aim for big chains and a full clear." }
  },
  pegSolitaire: {
    ja: { title: "ペグ・ソリティア", description: "ペグを飛び越えて取り除き、最後の1本を目指す一人用の定番ロジックパズル。" },
    en: { title: "Peg Solitaire", description: "Jump pegs over one another, remove them, and try to finish with a single peg." }
  },
  oneToFifty: {
    ja: { title: "1to50", description: "1から50までの数字を順番にタッチして、反応速度と視線移動の速さを競う定番スピードパズル。" },
    en: { title: "1 to 50", description: "Tap numbers from 1 to 50 in order and test your visual scanning speed." }
  },
  waterSort: {
    ja: { title: "Water Sort Puzzle", description: "色水をボトルへ注ぎ分け、同じ色だけで満たされたボトルを作っていく定番ソートパズル。" },
    en: { title: "Water Sort Puzzle", description: "Pour colored water between bottles until each bottle contains only one color." }
  },
  poker: {
    ja: { title: "ポーカー", description: "5枚の手札から交換するカードを選び、ワンペアからロイヤルフラッシュまでの役作りを狙う定番カードゲーム。" },
    en: { title: "Poker", description: "Choose cards to hold or exchange and aim for the best five-card poker hand." }
  },
  nonogram: {
    ja: { title: "イラストロジック", description: "行と列の数字ヒントを読み、塗るマスを推理して絵柄を完成させる定番ロジックパズル。" },
    en: { title: "Nonogram", description: "Use row and column number clues to deduce filled cells and reveal a hidden picture." }
  },
  wordGuess: {
    ja: { title: "Wordle風ゲーム", description: "5文字の英単語を6回以内に当てる、色ヒント付きの単語推理ゲーム。" },
    en: { title: "Word Guess", description: "Guess a five-letter English word in six tries using color clues." }
  }
  ,
  solitaire: {
    ja: { title: "ソリティア", description: "山札と場札を整理し、4つの組札へAからKまで積み上げる定番の一人用カードゲーム。" },
    en: { title: "Solitaire", description: "Play classic Klondike solitaire: build foundations from Ace to King while arranging tableau cards in alternating colors." }
  },
  colorChain: {
    ja: { title: "カラーチェイン", description: "2個1組の色ブロックを落とし、縦・横・斜めの4個消しと連鎖でハイスコアを狙う落ちものパズル。" },
    en: { title: "Color Chain Drop", description: "Drop connected color pairs, match four vertically, horizontally, or diagonally, and build chain reactions for a high score." }
  }
};

export function getGameText(game: Game, language: Language) {
  const translated = gameTranslations[game.id]?.[language];

  return {
    title: translated?.title ?? (language === "en" ? game.englishTitle : game.title),
    description: translated?.description ?? game.description,
    genre: genreLabels[language][game.genre] ?? game.genre,
    alternateTitle: language === "en" ? game.title : game.englishTitle
  };
}
