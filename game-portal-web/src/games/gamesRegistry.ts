export type Game = {
  id: string;
  title: string;
  englishTitle: string;
  description: string;
  genre: string;
  screenshot: string;
  accent: string;
  kind: "external" | "embedded" | "internal";
  href: string;
  status?: "available" | "coming-soon";
};

export const games: Game[] = [
  {
    id: "random-shogi",
    title: "ランダム将棋",
    englishTitle: "RANDOM SHOGI",
    description: "中終盤の多彩な局面から、すぐに対局を始められる将棋ゲーム。同じ公開サイト内で遊べます。",
    genre: "BOARD GAME",
    href: "/games/random-shogi/",
    screenshot: "/screenshots/random-shogi.png",
    accent: "#d9a84e",
    kind: "embedded",
    status: "available"
  },
  {
    id: "yonmai-mahjong",
    title: "四枚麻雀",
    englishTitle: "YONMAI MAHJONG",
    description: "少ない手牌でテンポよく役作りを楽しめる四枚麻雀ゲーム。同じ公開サイト内で遊べます。",
    genre: "TABLE GAME",
    href: "/games/yonmai-mahjong/",
    screenshot: "/screenshots/yonmai-mahjong.png",
    accent: "#51a98d",
    kind: "embedded",
    status: "available"
  },
  {
    id: "2048",
    title: "2048",
    englishTitle: "TWENTY FORTY-EIGHT",
    description: "数字タイルをスライドして合体させ、2048タイルを目指す定番パズル。",
    genre: "PUZZLE",
    href: "?game=2048",
    screenshot: "/screenshots/2048.png",
    accent: "#f2b66d",
    kind: "internal",
    status: "available"
  },
  {
    id: "sudoku",
    title: "数独",
    englishTitle: "SUDOKU",
    description: "9x9の盤面を数字で埋める定番ロジックパズル。初級から上級まで遊べます。",
    genre: "PUZZLE",
    href: "?game=sudoku",
    screenshot: "/screenshots/sudoku.svg",
    accent: "#8fb7ff",
    kind: "internal",
    status: "available"
  },
  {
    id: "minesweeper",
    title: "マインスイーパー",
    englishTitle: "MINESWEEPER",
    description: "数字を手がかりに地雷を避けて、安全なマスをすべて開く定番パズル。",
    genre: "PUZZLE",
    href: "?game=minesweeper",
    screenshot: "/screenshots/minesweeper.svg",
    accent: "#ff7d7d",
    kind: "internal",
    status: "available"
  },
  {
    id: "memory",
    title: "神経衰弱",
    englishTitle: "MEMORY MATCH",
    description: "裏向きのカードをめくって同じ絵柄のペアを探す、短時間で遊べる記憶パズル。",
    genre: "PUZZLE",
    href: "?game=memory",
    screenshot: "/screenshots/memory.svg",
    accent: "#c99cff",
    kind: "internal",
    status: "available"
  },
  {
    id: "slide15",
    title: "15パズル",
    englishTitle: "FIFTEEN PUZZLE",
    description: "空白マスへ数字タイルを滑らせて、1から15まで順番に並べるスライドパズル。",
    genre: "PUZZLE",
    href: "?game=slide15",
    screenshot: "/screenshots/slide15.svg",
    accent: "#73d4ff",
    kind: "internal",
    status: "available"
  },
  {
    id: "lightsOut",
    title: "ライツアウト",
    englishTitle: "LIGHTS OUT",
    description: "押したマスと上下左右のライトが反転。すべて消灯させる盤面パズル。",
    genre: "PUZZLE",
    href: "?game=lightsOut",
    screenshot: "/screenshots/lights-out.svg",
    accent: "#f4e66a",
    kind: "internal",
    status: "available"
  },
  {
    id: "reaction",
    title: "反射神経テスト",
    englishTitle: "REACTION TEST",
    description: "合図が出た瞬間にクリック。反応速度をミリ秒で測る短時間スコアゲーム。",
    genre: "SCORE ATTACK",
    href: "?game=reaction",
    screenshot: "/screenshots/reaction.svg",
    accent: "#ff8ac7",
    kind: "internal",
    status: "available"
  },
  {
    id: "typing",
    title: "タイピングゲーム",
    englishTitle: "TYPING GAME",
    description: "表示された日本語フレーズをローマ字で入力。60秒でスコアを競うタイピング練習。",
    genre: "SCORE ATTACK",
    href: "?game=typing",
    screenshot: "/screenshots/typing.svg",
    accent: "#9df08a",
    kind: "internal",
    status: "available"
  },
  {
    id: "mentalMath",
    title: "計算ゲーム",
    englishTitle: "MENTAL MATH",
    description: "足し算・引き算・掛け算を60秒でどれだけ解けるか競う暗算スコアアタック。",
    genre: "SCORE ATTACK",
    href: "?game=mentalMath",
    screenshot: "/screenshots/mental-math.svg",
    accent: "#ffcf6d",
    kind: "internal",
    status: "available"
  },
  {
    id: "aimTrainer",
    title: "エイム練習",
    englishTitle: "AIM TRAINER",
    description: "30秒間で出現するターゲットを素早くクリック。命中率と連続ヒットでスコアを伸ばす練習ゲーム。",
    genre: "SCORE ATTACK",
    href: "?game=aimTrainer",
    screenshot: "/screenshots/aim-trainer.svg",
    accent: "#72efff",
    kind: "internal",
    status: "available"
  },
  {
    id: "snake",
    title: "スネーク",
    englishTitle: "SNAKE",
    description: "リンゴを集めてヘビを伸ばす定番アーケード。壁や自分の体に当たらないように進み続けよう。",
    genre: "ARCADE",
    href: "?game=snake",
    screenshot: "/screenshots/snake.svg",
    accent: "#8cff72",
    kind: "internal",
    status: "available"
  },
  {
    id: "breakout",
    title: "ブロック崩し",
    englishTitle: "BREAKOUT",
    description: "パドルでボールを打ち返し、カラフルなブロックをすべて壊す定番アーケードゲーム。",
    genre: "ARCADE",
    href: "?game=breakout",
    screenshot: "/screenshots/breakout.svg",
    accent: "#c99cff",
    kind: "internal",
    status: "available"
  },
  {
    id: "pong",
    title: "ポン",
    englishTitle: "PONG",
    description: "上下に動くパドルでボールを打ち返し、CPUと先に5点を競うクラシック対戦ゲーム。",
    genre: "ARCADE",
    href: "?game=pong",
    screenshot: "/screenshots/pong.svg",
    accent: "#72efff",
    kind: "internal",
    status: "available"
  },
  {
    id: "whackMole",
    title: "もぐらたたき",
    englishTitle: "WHACK-A-MOLE",
    description: "30秒間でもぐらを叩いてスコアを競う反応ゲーム。金もぐらは高得点、爆弾は減点。",
    genre: "SCORE ATTACK",
    href: "?game=whackMole",
    screenshot: "/screenshots/whack-mole.svg",
    accent: "#ffcf6d",
    kind: "internal",
    status: "available"
  },
  {
    id: "ticTacToe",
    title: "三目並べ",
    englishTitle: "TIC-TAC-TOE",
    description: "XとOを交互に置き、縦・横・斜めに3つ並べる定番対戦ゲーム。COMの難易度を選んで遊べます。",
    genre: "BOARD GAME",
    href: "?game=ticTacToe",
    screenshot: "/screenshots/tic-tac-toe.svg",
    accent: "#9df08a",
    kind: "internal",
    status: "available"
  },
  {
    id: "reversi",
    title: "オセロ / リバーシ",
    englishTitle: "REVERSI",
    description: "黒石で白石をはさんで返す定番ボードゲーム。COMの難易度を選び、盤面の制圧を目指します。",
    genre: "BOARD GAME",
    href: "?game=reversi",
    screenshot: "/screenshots/reversi.svg",
    accent: "#51a98d",
    kind: "internal",
    status: "available"
  },
  {
    id: "colorJudge",
    title: "カラー判定ゲーム",
    englishTitle: "COLOR JUDGE",
    description: "文字の意味と文字色が一致しているかを瞬時に判定する脳トレ系スコアアタック。",
    genre: "BRAIN TRAINING",
    href: "?game=colorJudge",
    screenshot: "/screenshots/color-judge.svg",
    accent: "#ff8ac7",
    kind: "internal",
    status: "available"
  },
  {
    id: "blackjack",
    title: "ブラックジャック",
    englishTitle: "BLACKJACK",
    description: "21に近い手を目指してディーラーと勝負する定番カードゲーム。ヒットとスタンドで駆け引きします。",
    genre: "CARD GAME",
    href: "?game=blackjack",
    screenshot: "/screenshots/blackjack.svg",
    accent: "#d9a84e",
    kind: "internal",
    status: "available"
  },
  {
    id: "hanoi",
    title: "タワー・オブ・ハノイ",
    englishTitle: "TOWER OF HANOI",
    description: "大きい円盤を小さい円盤の上に置かないよう、3本の柱で円盤を移す定番ロジックパズル。",
    genre: "PUZZLE",
    href: "?game=hanoi",
    screenshot: "/screenshots/hanoi.svg",
    accent: "#73d4ff",
    kind: "internal",
    status: "available"
  },
  {
    id: "connectFour",
    title: "コネクトフォー",
    englishTitle: "CONNECT FOUR",
    description: "7列の盤面にチップを落として、縦・横・斜めに4つ並べる定番対戦ボードゲーム。",
    genre: "BOARD GAME",
    href: "?game=connectFour",
    screenshot: "/screenshots/connect-four.svg",
    accent: "#ffcf6d",
    kind: "internal",
    status: "available"
  },
  {
    id: "mazeEscape",
    title: "迷路脱出",
    englishTitle: "MAZE ESCAPE",
    description: "ランダム生成された迷路を上下左右に進み、手数とタイムのベストを狙う探索パズル。",
    genre: "PUZZLE",
    href: "?game=mazeEscape",
    screenshot: "/screenshots/maze-escape.svg",
    accent: "#8fb7ff",
    kind: "internal",
    status: "available"
  },
  {
    id: "simonSays",
    title: "Simon Says",
    englishTitle: "SIMON SAYS",
    description: "4色の光る順番を覚えて同じ順に押す、集中力と記憶力を試す定番メモリーゲーム。",
    genre: "MEMORY",
    href: "?game=simonSays",
    screenshot: "/screenshots/simon-says.svg",
    accent: "#9df08a",
    kind: "internal",
    status: "available"
  },
  {
    id: "nim",
    title: "Nim",
    englishTitle: "NIM",
    description: "山から石を取り合い、最後の石を取った方が勝つ、読み合いが楽しい定番ストラテジーゲーム。",
    genre: "STRATEGY",
    href: "?game=nim",
    screenshot: "/screenshots/nim.svg",
    accent: "#d9a84e",
    kind: "internal",
    status: "available"
  },
  {
    id: "hitBlow",
    title: "Hit & Blow",
    englishTitle: "HIT AND BLOW",
    description: "4桁の重複なし数字を、HitとBlowの手がかりから絞り込む定番ロジックゲーム。",
    genre: "LOGIC",
    href: "?game=hitBlow",
    screenshot: "/screenshots/hit-blow.svg",
    accent: "#72efff",
    kind: "internal",
    status: "available"
  },
  {
    id: "floodFill",
    title: "Flood Fill",
    englishTitle: "FLOOD FILL",
    description: "左上から色を広げて、制限手数内に盤面全体を1色へ染める定番カラーパズル。",
    genre: "PUZZLE",
    href: "?game=floodFill",
    screenshot: "/screenshots/flood-fill.svg",
    accent: "#c99cff",
    kind: "internal",
    status: "available"
  },
  {
    id: "sameGame",
    title: "さめがめ",
    englishTitle: "SAMEGAME",
    description: "同じ色でつながったブロックをまとめて消し、大きな塊と全消しを狙う定番パズル。",
    genre: "PUZZLE",
    href: "?game=sameGame",
    screenshot: "/screenshots/same-game.svg",
    accent: "#9df08a",
    kind: "internal",
    status: "available"
  },
  {
    id: "pegSolitaire",
    title: "ペグ・ソリティア",
    englishTitle: "PEG SOLITAIRE",
    description: "ペグを飛び越えて取り除き、最後の1本を目指す一人用の定番ロジックパズル。",
    genre: "PUZZLE",
    href: "?game=pegSolitaire",
    screenshot: "/screenshots/peg-solitaire.svg",
    accent: "#d9a84e",
    kind: "internal",
    status: "available"
  },
  {
    id: "oneToFifty",
    title: "1to50",
    englishTitle: "ONE TO FIFTY",
    description: "1から50までの数字を順番にタッチして、反応速度と視線移動の速さを競う定番スピードパズル。",
    genre: "SPEED PUZZLE",
    href: "?game=oneToFifty",
    screenshot: "/screenshots/one-to-fifty.svg",
    accent: "#72efff",
    kind: "internal",
    status: "available"
  },
  {
    id: "waterSort",
    title: "Water Sort Puzzle",
    englishTitle: "WATER SORT PUZZLE",
    description: "色水をボトルへ注ぎ分け、同じ色だけで満たされたボトルを作っていく定番ソートパズル。",
    genre: "SORT PUZZLE",
    href: "?game=waterSort",
    screenshot: "/screenshots/water-sort.svg",
    accent: "#72efff",
    kind: "internal",
    status: "available"
  },
  {
    id: "poker",
    title: "ポーカー",
    englishTitle: "POKER",
    description: "5枚の手札から交換するカードを選び、ワンペアからロイヤルフラッシュまでの役作りを狙う定番カードゲーム。",
    genre: "CARD GAME",
    href: "?game=poker",
    screenshot: "/screenshots/poker.svg",
    accent: "#d9a84e",
    kind: "internal",
    status: "available"
  }
,
  {
    id: "nonogram",
    title: "イラストロジック",
    englishTitle: "NONOGRAM",
    description: "行と列の数字ヒントを読み、塗るマスを推理して絵柄を完成させる定番ロジックパズル。",
    genre: "PICTURE LOGIC",
    href: "?game=nonogram",
    screenshot: "/screenshots/nonogram.svg",
    accent: "#9df08a",
    kind: "internal",
    status: "available"
  }
];
