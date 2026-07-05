import { useEffect } from "react";
import type { Language } from "./i18n";

const textTranslations: Record<string, string> = {
  "遊び方": "How to play",
  "棚へ戻る": "Back to shelf",
  "挑戦": "Challenge",
  "スタート": "Start",
  "最初から": "Restart",
  "やり直し": "Restart",
  "リセット": "Reset",
  "記録リセット": "Reset records",
  "ベスト削除": "Clear best",
  "ベスト": "Best",
  "ベストタイム": "Best time",
  "まだ記録がありません。": "No record yet.",
  "クリア": "Cleared",
  "挑戦中": "Playing",
  "状態": "Status",
  "完成ボトル": "Completed bottles",
  "1手戻す": "Undo move",
  "待った": "Undo",
  "投了": "Resign",
  "ホーム": "Home",
  "設定": "Settings",
  "完了": "Done",
  "評価値を表示": "Show evaluation",
  "対局終了": "Game over",
  "新局面": "New position",
  "棋譜再生": "Replay moves",
  "棋譜再生を終了": "Exit replay",
  "ここから再開": "Resume from here",
  "難易度": "Difficulty",
  "初級": "Beginner",
  "中級": "Intermediate",
  "上級": "Advanced",
  "易": "Easy",
  "普通": "Normal",
  "難": "Hard",
  "スタートを押してください": "Press Start",
  "ここに入力": "Type here",
  "ローマ字入力": "Romaji input",
  "スコア": "Score",
  "時間": "Time",
  "手数": "Moves",
  "ベスト手数": "Best moves",
  "ミス": "Misses",
  "ヒント": "Hint",
  "正解": "Answer",
  "完成": "Complete",
  "ゲーム終了": "Game over",
  "勝ち": "Win",
  "負け": "Loss",
  "引き分け": "Draw",
  "もう一度": "Play again",
  "シャッフル": "Shuffle",
  "問題": "Puzzle",
  "問題選択": "Select puzzle",
  "ステージ選択": "Select stage",
  "数字": "Numbers",
  "消去": "Clear",
  "メモ": "Notes",
  "正確率": "Accuracy",
  "完了フレーズ": "Completed phrases",
  "正解文字": "Correct chars",
  "入力文字": "Typed chars",
  "ヒット": "Hits",
  "コンボ": "Combo",
  "最高コンボ": "Best combo",
  "金もぐら": "Golden moles",
  "爆弾": "Bombs",
  "空の穴": "Empty hole",
  "もぐら": "Mole",
  "ランダム将棋": "Random Shogi",
  "四枚麻雀": "Four-Tile Mahjong",
  "数独": "Sudoku",
  "マインスイーパー": "Minesweeper",
  "神経衰弱": "Memory Match",
  "15パズル": "Fifteen Puzzle",
  "ライツアウト": "Lights Out",
  "反射神経テスト": "Reaction Test",
  "タイピングゲーム": "Typing Game",
  "計算ゲーム": "Mental Math",
  "エイム練習": "Aim Trainer",
  "スネーク": "Snake",
  "ブロック崩し": "Breakout",
  "ポン": "Pong",
  "もぐらたたき": "Whack-a-Mole",
  "三目並べ": "Tic-Tac-Toe",
  "オセロ / リバーシ": "Reversi",
  "カラー判定ゲーム": "Color Judge",
  "ブラックジャック": "Blackjack",
  "タワー・オブ・ハノイ": "Tower of Hanoi",
  "コネクトフォー": "Connect Four",
  "迷路脱出": "Maze Escape",
  "さめがめ": "SameGame",
  "ペグ・ソリティア": "Peg Solitaire",
  "ポーカー": "Poker",
  "イラストロジック": "Nonogram",
  "りんご": "Apple",
  "花": "Flower",
  "旗": "Flag",
  "メガネ": "Glasses",
  "電球": "Light bulb",
  "ハート": "Heart",
  "魚": "Fish",
  "家": "House",
  "猫": "Cat",
  "星": "Star",
  "木": "Tree",
  "傘": "Umbrella",
  "車": "Car"
};

const phraseTranslations: Record<string, string> = {
  ...textTranslations,
  "スタートを押して、パドルでボールを打ち返しましょう。": "Press Start and bounce the ball back with the paddle.",
  "左右キーまたはA/Dでパドルを動かし、ボールを打ち返しましょう。": "Move the paddle with Left/Right or A/D and bounce the ball back.",
  "左右キーまたはA/Dでパドルを動かし、ボールを落とさないように跳ね返します。すべてのブロックを壊すとクリアです。": "Move the paddle with Left/Right or A/D, keep the ball in play, and clear all bricks.",
  "ゲームオーバー。角度をつけて打ち返すと崩しやすくなります。": "Game over. Try returning the ball at an angle to break blocks more easily.",
  "ボールを落としました。再開ボタンで続きから遊べます。": "You dropped the ball. Press Resume to continue.",
  "ブロック破壊！ボールを落とさずに続けましょう。": "Brick destroyed! Keep the ball in play.",
  "全ブロック破壊！お見事です。": "All bricks cleared! Nicely done.",
  "一時停止中。スペースキーまたは再開ボタンで続けられます。": "Paused. Press Space or Resume to continue.",
  "一時停止中。再開ボタンで続けられます。": "Paused. Press Resume to continue.",
  "再開しました。ボールの角度をよく見ましょう。": "Resumed. Watch the ball angle carefully.",
  "ブロック崩しの状態": "Breakout status",
  "ブロック崩し盤面": "Breakout board",
  "パドル操作": "Paddle controls",
  "破壊": "Destroyed",
  "残機": "Lives",
  "再開": "Resume",
  "停止": "Pause",
  "左": "Left",
  "右": "Right",
  "上": "Up",
  "下": "Down",
  "プレイ中": "Playing",
  "一時停止": "Paused",
  "終了": "Finished",
  "待機中": "Idle",
  "待機前": "Not ready",
  "合図中": "Signal shown",
  "あなたの番": "Your turn",
  "COMの番": "CPU turn",
  "勝負終了": "Round over",
  "探索中": "Exploring",
  "脱出成功": "Escaped",
  "カード待ち": "Waiting for cards",
  "カードを配って、21に近い手を目指しましょう。": "Deal the cards and try to get as close to 21 as possible.",
  "カードを配って勝負を始めましょう。": "Deal the cards to start the round.",
  "ヒットでカードを引くか、スタンドで勝負します。": "Hit to draw a card, or Stand to settle the round.",
  "もう1枚引くか、ここで止めるか。いい悩みどころです。": "Draw one more, or stop here? A delicious little dilemma.",
  "ブラックジャック！チップ +150 です。": "Blackjack! +150 chips.",
  "バースト。21を超えてしまいました。": "Bust. You went over 21.",
  "ブラックジャックの戦績": "Blackjack record",
  "ブラックジャックテーブル": "Blackjack table",
  "手札の合計を21に近づけます。21を超えるとバーストで負け。ディーラーは17以上になるまで引きます。": "Get your hand as close to 21 as possible. Going over 21 is a bust. The dealer draws until reaching 17 or more.",
  "Aは自動で1または11として計算します。": "Aces are automatically counted as 1 or 11.",
  "引き分け": "Pushes",
  "山札": "Deck",
  "配る": "Deal",
  "ヒット": "Hit",
  "スタンド": "Stand",
  "戦績リセット": "Reset record",
  "スタートを押して、30秒間のエイム練習を始めましょう。": "Press Start to begin a 30-second aim drill.",
  "丸いターゲットをクリック。空振りするとミスになります。": "Click the round targets. Missed clicks count as misses.",
  "終了です。次はもっと素早く、でも正確に狙ってみましょう。": "Time's up. Next time, aim faster—but stay accurate.",
  "ヒット！次のターゲットへ。": "Hit! On to the next target.",
  "ミス。落ち着いて中心を狙いましょう。": "Miss. Stay calm and aim for the center.",
  "エイム練習の状態": "Aim Trainer status",
  "エイム練習エリア": "Aim Trainer area",
  "30秒間で出現するターゲットをクリックします。連続ヒットでボーナス、空振りはミスになります。": "Click targets as they appear for 30 seconds. Streaks give bonuses; missed clicks count as misses.",
  "命中率": "Accuracy",
  "表示時間": "Time visible",
  "スタートを押して、画面が光ったらできるだけ早くクリックしてください。": "Press Start, then click as fast as you can when the screen lights up.",
  "まだです……画面が光るまで待ってください。": "Not yet... wait until the screen lights up.",
  "今です！クリック！": "Now! Click!",
  "早すぎました。合図が出てからクリックしましょう。": "Too early. Click after the signal appears.",
  "反射神経テストの状態": "Reaction Test status",
  "反射神経テストの操作エリア": "Reaction Test action area",
  "スタート後、合図が出るまではクリックしないでください。画面が光った瞬間にクリックすると反応速度を測定します。": "After starting, do not click until the signal appears. Click the moment the screen lights up to measure your reaction time.",
  "待て": "Wait",
  "早い！": "Too early!",
  "平均": "Average",
  "記録数": "Records",
  "最近の記録": "Recent records",
  "未記録": "No record",
  "スタートを押して、CPUとのポン対戦を始めましょう。": "Press Start to play Pong against the CPU.",
  "上下キーまたはW/Sでパドルを操作。先に5点を取ると勝利です。": "Move the paddle with Up/Down or W/S. First to 5 points wins.",
  "上下キーまたはW/Sで左のパドルを動かし、CPUとラリーします。先に5点を取った側の勝利です。": "Move the left paddle with Up/Down or W/S and rally against the CPU. First to 5 points wins.",
  "勝利！ラリーを制しました。もう一度遊べます。": "Victory! You won the rally. You can play again.",
  "得点！CPU側から再開します。": "Point scored! CPU serves next.",
  "CPUの勝利。次は早めに中央へ戻ると守りやすいです。": "CPU wins. Try returning to the center earlier next time.",
  "失点。落ち着いて次のサーブを返しましょう。": "Point lost. Stay calm and return the next serve.",
  "再開しました。パドルの中央で返すと角度を抑えられます。": "Resumed. Hitting near the paddle center keeps the angle under control.",
  "ポンの状態": "Pong status",
  "ポン盤面": "Pong board",
  "難易度選択": "Difficulty selection",
  "あなた": "You",
  "勝利条件": "Win target",
  "やさしい": "Easy",
  "ふつう": "Normal",
  "むずかしい": "Hard",
  "スタートを押して、30秒間のもぐらたたきを始めましょう。": "Press Start to begin 30 seconds of Whack-a-Mole.",
  "もぐらを叩くと得点。金もぐらは高得点、爆弾は減点です。": "Hit moles to score. Golden moles are worth more; bombs deduct points.",
  "終了です。金もぐらを逃さず、爆弾を避けてベスト更新を狙いましょう。": "Time's up. Catch golden moles, avoid bombs, and aim for a new best.",
  "空振り。よく見てから叩きましょう。": "Miss. Look carefully before you strike.",
  "爆弾！減点です。次は避けましょう。": "Bomb! Points deducted. Avoid it next time.",
  "ヒット！": "Hit!",
  "もぐらたたきの状態": "Whack-a-Mole status",
  "もぐらたたき盤面": "Whack-a-Mole board",
  "30秒間、出てきたもぐらをクリックします。金もぐらは高得点、爆弾は減点。空振りするとコンボが途切れます。": "Click moles as they appear for 30 seconds. Golden moles give bonus points, bombs deduct points, and misses break your combo.",
  "金もぐら": "Golden moles",
  "最高": "Best",
  "点": "pts",
  "個": "blocks",
  "回": "times",
  "勝利": "Win",
  "勝ち": "Wins",
  "負け": "Losses",
  "現在": "Current",
  "新しく始める": "New game",
  "1から順に50まで数字をタッチします。25まで押すと残りの数字に切り替わります。": "Tap numbers from 1 to 50 in order. After 25, the remaining numbers appear.",
  "ターゲット": "Target",
  "次の数字": "Next number",
  "数字を順番に押して、50まで到達しましょう。": "Press the numbers in order and reach 50.",
  "ランダム迷路を進んで、右下のゴールを目指しましょう。": "Navigate the random maze and reach the goal in the lower-right corner.",
  "矢印キー、または画面ボタンで移動できます。": "Move with the arrow keys or on-screen buttons.",
  "そちらには壁があります。別の道を探しましょう。": "There's a wall that way. Find another route.",
  "いい感じです。ゴールまで進みましょう。": "Nice. Keep heading for the goal.",
  "迷路脱出の状態": "Maze Escape status",
  "迷路盤面": "Maze board",
  "移動ボタン": "Movement buttons",
  "左上からスタートし、右下のゴールを目指します。壁のない方向へだけ進めます。": "Start in the upper-left and aim for the goal in the lower-right. You can only move where there is no wall.",
  "矢印キーでも画面ボタンでも操作できます。": "You can use either the arrow keys or the on-screen buttons.",
  "迷路サイズ": "Maze size",
  "小さめ": "Small",
  "大きめ": "Large",
  "まだ記録なし": "No record yet",
  "5枚のカードを配り、交換したいカードを選んで役を作りましょう。": "Deal five cards, choose which cards to exchange, and try to make the best hand.",
  "交換したいカードを選んでください。もう一度カードを押すと選択解除できます。": "Choose cards to exchange. Press a card again to deselect it.",
  "DEALを押してカードを配ります": "Press DEAL to draw cards",
  "FIVE CARD DRAW": "FIVE CARD DRAW",
  "5枚の手札から交換したいカードを選び、「選んだカードを交換」を押します。交換は1回だけです。": "Choose cards from your five-card hand, then press Exchange selected cards. You can exchange only once.",
  "交換後に役が確定し、最高役が保存されます。": "After exchanging, your hand is scored and your best hand is saved.",
  "選んだカードを交換": "Exchange selected cards",
  "交換": "Exchange",
  "保持": "Keep",
  "交換予定": "selected for exchange",
  "ポーカーの記録": "Poker record",
  "ポーカーの手札": "Poker hand",
  "ロイヤルフラッシュ": "Royal Flush",
  "ストレートフラッシュ": "Straight Flush",
  "フォーカード": "Four of a Kind",
  "フルハウス": "Full House",
  "フラッシュ": "Flush",
  "ストレート": "Straight",
  "スリーカード": "Three of a Kind",
  "ツーペア": "Two Pair",
  "ワンペア": "One Pair",
  "ハイカード": "High Card",
  "未判定": "Not judged",
  "なし": "None",
  "あなたは黒石、COMは白石です。相手の石をはさめる場所に置くと、その間の石を自分の色にできます。": "You play black; the CPU plays white. Place a disc where you can sandwich the opponent's discs to flip them.",
  "置ける場所は盤面上で薄く光ります。": "Legal moves glow faintly on the board.",
  "あなたの番です。薄く光るマスに黒石を置けます。": "Your turn. Place a black disc on a highlighted square.",
  "そこには置けません。光っているマスを選びましょう。": "You can't place there. Choose a highlighted square.",
  "COMが考えています": "CPU is thinking",
  "オセロの石数": "Reversi disc count",
  "オセロ盤面": "Reversi board",
  "黒石": "black disc",
  "白石": "white disc",
  "置けるマス": "legal square",
  "空きマス": "empty square",
  "カード": "Cards",
  "スコア表": "Score sheet",
  "役": "Hand",
  "合計": "Total",
  "ラウンド": "Round",
  "サイコロ": "Dice",
  "振る": "Roll",
  "決定": "Score",
  "選択": "Select",
  "未選択": "Unselected",
  "塗る": "Fill",
  "×印": "Mark X",
  "問題を選んでください。": "Choose a puzzle.",
  "行": "row",
  "列": "column",
  "青": "Blue",
  "赤": "Red",
  "緑": "Green",
  "黄": "Yellow",
  "紫": "Purple",
  "黒": "Black",
  "白": "White",
  "一致": "Match",
  "不一致": "Mismatch",
  "同じ": "Same",
  "違う": "Different",
  "正しい": "Correct",
  "間違い": "Wrong",
  "あなたの勝ち": "You win",
  "COMの勝ち": "CPU wins",
  "引き分けです": "It's a draw",
  "バースト": "Bust",
  "ディーラー": "Dealer",
  "プレイヤー": "Player"
};

const regexTranslations: Array<[RegExp, (match: RegExpMatchArray) => string]> = [
  [/^勝利！\s*(\d+)\s*対\s*(\d+)\s*でチップ \+(\d+) です。$/, (match) => `Win! ${match[1]} to ${match[2]}. +${match[3]} chips.`],
  [/^ディーラーの勝ちです。(\d+)\s*対\s*(\d+)。$/, (match) => `Dealer wins. ${match[1]} to ${match[2]}.`],
  [/^引き分けです。(\d+)\s*対\s*(\d+)。$/, (match) => `Push. ${match[1]} to ${match[2]}.`],
  [/^(\d+)連続ヒット。かなりいいリズムです。$/, (match) => `${match[1]}-hit streak. Great rhythm.`],
  [/^金もぐら！\s*(\d+)コンボです。$/, (match) => `Golden mole! ${match[1]} combo.`],
  [/^(\d+)コンボ！いいテンポです。$/, (match) => `${match[1]} combo! Nice tempo.`],
  [/^(\d+)ms。もう一回いきますか？$/, (match) => `${match[1]} ms. Try again?`],
  [/^脱出成功！(\d+)手 \/ (.+) でベスト更新です。$/, (match) => `Escaped! New best: ${match[1]} moves / ${match[2]}.`],
  [/^脱出成功！(\d+)手 \/ (.+) でした。$/, (match) => `Escaped in ${match[1]} moves / ${match[2]}.`],
  [/^(\d+)枚返されました。あなたの番です。$/, (match) => `${match[1]} discs were flipped. Your turn.`],
  [/^(\d+)枚返しました。COMが考えています……$/, (match) => `You flipped ${match[1]} discs. CPU is thinking...`],
  [/^勝利！\s*(\d+)\s*対\s*(\d+)\s*で黒の勝ちです。$/, (match) => `Victory! Black wins ${match[1]} to ${match[2]}.`],
  [/^COMの勝ちです。\s*(\d+)\s*対\s*(\d+)。角を取らせないのが大事です。$/, (match) => `CPU wins ${match[1]} to ${match[2]}. Try not to give up the corners.`],
  [/^引き分けです。\s*(\d+)\s*対\s*(\d+)\s*の接戦でした。$/, (match) => `Draw. A close ${match[1]} to ${match[2]} game.`],
  [/^交換なしで勝負。役は「(.+)」です。$/, (match) => `No exchange. Your hand is ${translateDynamicText(match[1])}.`],
  [/^(\d+)枚交換しました。役は「(.+)」です。$/, (match) => `Exchanged ${match[1]} cards. Your hand is ${translateDynamicText(match[2])}.`],
  [/^(.+)でプレイします。スタートを押して開始してください。$/, (match) => `Playing on ${translateDynamicText(match[1])}. Press Start to begin.`],
  [/^(.+)点 \/ (.+)$/, (match) => `${match[1]} pts / ${translateDynamicText(match[2])}`],
  [/^(.+):\s*(.+)$/, (match) => `${translateDynamicText(match[1])}: ${translateDynamicText(match[2])}`],
  [/^(\d+)枚$/, (match) => `${match[1]} tiles`],
  [/^(\d+)点$/, (match) => `${match[1]} pts`],
  [/^(\d+)手$/, (match) => `${match[1]} moves`]
];

const attributeTranslations: Record<string, string> = {
  ...phraseTranslations,
  "ゲームを検索": "Search games",
  "タイトル、ジャンル、種類で検索": "Search by title, genre, or type",
  "スタートを押してください": "Press Start",
  "ここに入力": "Type here",
  "ローマ字入力": "Romaji input"
};

const originalText = new WeakMap<Text, string>();
const originalAttributes = new WeakMap<Element, Map<string, string>>();

export function DomTranslationLayer({ language }: { language: Language }) {
  useEffect(() => {
    const translate = () => {
      if (language === "ja") {
        restoreDocument();
        return;
      }

      translateDocument();
    };

    translate();

    const observer = new MutationObserver(() => {
      window.requestAnimationFrame(translate);
    });

    observer.observe(document.body, {
      attributes: true,
      childList: true,
      subtree: true,
      characterData: true
    });

    return () => {
      observer.disconnect();
    };
  }, [language]);

  return null;
}

function translateDocument() {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];

  while (walker.nextNode()) {
    nodes.push(walker.currentNode as Text);
  }

  for (const node of nodes) {
    const parent = node.parentElement;
    if (!parent || ["SCRIPT", "STYLE", "TEXTAREA"].includes(parent.tagName)) {
      continue;
    }

    const source = originalText.get(node) ?? node.nodeValue ?? "";
    const trimmed = source.trim();
    const translated = translateDynamicText(trimmed);

    if (translated === trimmed) {
      continue;
    }

    if (!originalText.has(node)) {
      originalText.set(node, source);
    }

    const nextValue = source.replace(trimmed, translated);
    if (node.nodeValue !== nextValue) {
      node.nodeValue = nextValue;
    }
  }

  for (const element of Array.from(document.querySelectorAll("[placeholder], [aria-label], [title]"))) {
    for (const attribute of ["placeholder", "aria-label", "title"]) {
      const current = element.getAttribute(attribute);
      if (!current) {
        continue;
      }

      const original = originalAttributes.get(element)?.get(attribute) ?? current;
      const translated = translateDynamicAttribute(original.trim());

      if (translated === original.trim()) {
        continue;
      }

      if (!originalAttributes.has(element)) {
        originalAttributes.set(element, new Map());
      }

      const attributes = originalAttributes.get(element);
      if (attributes && !attributes.has(attribute)) {
        attributes.set(attribute, original);
      }

      const nextValue = original.replace(original.trim(), translated);
      if (element.getAttribute(attribute) !== nextValue) {
        element.setAttribute(attribute, nextValue);
      }
    }
  }
}

function translateDynamicAttribute(value: string) {
  return attributeTranslations[value] ?? translateDynamicText(value);
}

function translateDynamicText(value: string): string {
  const exact = phraseTranslations[value];
  if (exact) {
    return exact;
  }

  for (const [pattern, replacer] of regexTranslations) {
    const match = value.match(pattern);
    if (match) {
      return replacer(match);
    }
  }

  let translated = value;
  const entries = Object.entries(phraseTranslations).sort((a, b) => b[0].length - a[0].length);

  for (const [source, target] of entries) {
    if (source && translated.includes(source)) {
      translated = translated.split(source).join(target);
    }
  }

  return translated;
}

function restoreDocument() {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];

  while (walker.nextNode()) {
    nodes.push(walker.currentNode as Text);
  }

  for (const node of nodes) {
    const source = originalText.get(node);
    if (source !== undefined) {
      if (node.nodeValue !== source) {
        node.nodeValue = source;
      }
    }
  }

  for (const element of Array.from(document.querySelectorAll("[placeholder], [aria-label], [title]"))) {
    const attributes = originalAttributes.get(element);
    if (!attributes) {
      continue;
    }

    for (const [attribute, value] of attributes) {
      if (element.getAttribute(attribute) !== value) {
        element.setAttribute(attribute, value);
      }
    }
  }
}
