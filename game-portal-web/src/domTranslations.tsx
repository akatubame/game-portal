import { useEffect } from "react";
import type { Language } from "./i18n";

const textTranslations: Record<string, string> = {
  "Wordle風ゲーム": "Word Guess",
  "5文字の英単語を6回以内に当てましょう。緑は位置も一致、黄は文字だけ一致です。": "Guess the five-letter English word in six tries. Green means the right letter in the right place; yellow means the letter exists elsewhere.",
  "キーボードまたは画面のキーで5文字を入力して、判定しましょう。": "Enter five letters with your keyboard or the on-screen keys, then submit your guess.",
  "5文字そろえてから判定しましょう。": "Enter all five letters before submitting.",
  "候補リストにある英単語を入力してください。": "Enter an English word from the candidate list.",
  "判定しました。残り": "Guess checked. Tries left: ",
  "残念。答えは": "So close. The answer was ",
  "5文字の英単語を入力します。緑は文字と位置が一致、黄は文字は含まれるが位置が違う、黒は含まれない文字です。6回以内に答えを絞り込みましょう。": "Enter a five-letter English word. Green means correct letter and position, yellow means the letter is in the word but elsewhere, and dark means the letter is not included. Narrow down the answer within six tries.",
  "Wordle風ゲームの状態": "Word Guess status",
  "推理盤面": "Guess board",
  "文字入力": "Letter input",
  "勝利": "Wins",
  "残り": "Left",
  "連勝": "Streak",
  "1文字削除": "Delete one letter",
  "判定": "Submit",
  "推理中": "Guessing",
  "待機中": "Idle",
  "最高連勝": "Best streak",
  "単語数": "Word count",
  "新しく始める": "New game",
  "戦績リセット": "Reset record",
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

const modernTextTranslations: Record<string, string> = {
  "遊び方": "How to play",
  "棚へ戻る": "Back to shelf",
  "挑戦": "Challenge",
  "新しく始める": "New game",
  "やり直し": "Restart",
  "記録リセット": "Reset records",
  "戦績リセット": "Reset record",
  "ベスト削除": "Clear best",
  "ベスト": "Best",
  "ベスト手数": "Best moves",
  "ベストタイム": "Best time",
  "未記録": "No record",
  "まだ記録がありません。": "No record yet.",
  "まだランキング記録がありません。": "No ranking records yet.",
  "ランキング": "Ranking",
  "今回の記録": "Current result",
  "登録": "Submit",
  "登録済み": "Submitted",
  "ランキング削除": "Clear ranking",
  "名前": "Name",
  "状態": "Status",
  "現在": "Current",
  "待機中": "Idle",
  "挑戦中": "Playing",
  "プレイ中": "Playing",
  "一時停止": "Paused",
  "終了": "Finished",
  "クリア": "Cleared",
  "失敗": "Failed",
  "勝利": "Win",
  "敗北": "Loss",
  "あなたの番": "Your turn",
  "COMの番": "CPU turn",
  "難易度": "Difficulty",
  "やさしい": "Easy",
  "ふつう": "Normal",
  "本気": "Hard",
  "小さめ": "Small",
  "大きめ": "Large",
  "ヒント": "Hint",
  "正解": "Correct",
  "ミス": "Misses",
  "コンボ": "Combo",
  "最高コンボ": "Best combo",
  "連勝": "Win streak",
  "最高連勝": "Best streak",
  "命中率": "Accuracy",
  "ヒット": "Hits",
  "手数": "Moves",
  "残り": "Left",
  "山札": "Deck",
  "引き分け": "Pushes",
  "配る": "Deal",
  "スタンド": "Stand",
  "再開": "Resume",
  "停止": "Pause",
  "左": "Left",
  "右": "Right",
  "空": "Empty",
  "赤": "Red",
  "青": "Blue",
  "緑": "Green",
  "黄": "Yellow",
  "紫": "Purple",
  "桃": "Pink",
  "コーラル": "Coral",
  "ゴールド": "Gold",
  "ミント": "Mint",
  "スカイ": "Sky",
  "バイオレット": "Violet",
  "一致": "Match",
  "違う": "Different",
  "空の穴": "Empty hole",
  "爆弾": "Bomb",
  "もぐら": "Mole",
  "金もぐら": "Golden moles",
  "リンゴ": "Apples",
  "長さ": "Length",
  "方向": "Direction",
  "破壊": "Destroyed",
  "残機": "Lives",
  "完成ボトル": "Completed bottles",
  "1手戻す": "Undo move",
  "ステージ選択": "Stage select",
  "盤面サイズ": "Board size",
  "列選択": "Column select",
  "方向操作": "Direction controls",
  "パドル操作": "Paddle controls",
  "カード待ち": "Waiting for cards",
  "交換": "Exchange",
  "保持": "Keep",
  "選んだカードを交換": "Exchange selected cards",
  "塗る": "Fill",
  "×印": "Mark X",
  "問題": "Puzzle",
  "問題を選んでください。": "Choose a puzzle.",
  "現在の道具": "Current tool",
  "塗り": "Filled",
  "解答": "Answer",
  "消せる塊": "Available groups",
  "あり": "Yes",
  "なし": "None",
  "移動できます": "can move",
  "空白マス": "Empty cell",
  "ブロック崩し": "Breakout",
  "カラー判定ゲーム": "Color Judge",
  "コネクトフォー": "Connect Four",
  "ブラックジャック": "Blackjack",
  "エイム練習": "Aim Trainer",
  "スネーク": "Snake",
  "さめがめ": "SameGame",
  "15パズル": "Fifteen Puzzle",
  "もぐらたたき": "Whack-a-Mole",
  "三目並べ": "Tic-Tac-Toe",
  "水が入ったボトルを選び、注ぎ先のボトルを選びます。空のボトル、または一番上が同じ色のボトルにだけ注げます。": "Choose a bottle with water, then choose a destination bottle. You can pour only into an empty bottle or onto the same top color.",
  "すべてのボトルを単色、または空にできればクリアです。": "Clear the puzzle by making every bottle a single color or empty.",
  "左右キーまたはA/Dでパドルを動かし、ボールを落とさないように跳ね返します。すべてのブロックを壊すとクリアです。": "Move the paddle with Left/Right or A/D, keep the ball in play, and clear every brick.",
  "例: 「赤」という文字が赤色で表示されていれば「一致」、青色で表示されていれば「違う」です。": "Example: if the word 'Red' is shown in red, choose Match; if it is shown in blue, choose Different.",
  "30秒間で正答数とコンボを伸ばしましょう。": "Get as many correct answers and combos as you can in 30 seconds.",
  "列を選ぶとチップが下から積み上がります。縦・横・斜めのどれかに自分の色を4つ並べると勝ちです。": "Choose a column and your disc drops from the bottom. Connect four vertically, horizontally, or diagonally to win.",
  "中央の列は攻めにも守りにも使いやすい、ちょっとおいしい場所です。": "The center column is useful for both attack and defense.",
  "手札の合計を21に近づけます。21を超えるとバーストで負け。ディーラーは17以上になるまで引きます。": "Get your hand as close to 21 as possible. Going over 21 busts. The dealer draws until reaching 17 or more.",
  "Aは自動で1または11として計算します。": "Aces are automatically counted as 1 or 11.",
  "30秒間、出現するターゲットをクリックしてスコアを伸ばします。空振りはミスになり、連続ヒットが途切れます。": "Click targets as they appear for 30 seconds. Missed clicks count as misses and break your streak.",
  "矢印キーまたはWASDでヘビを操作します。リンゴを取ると体が伸びてスコアアップ。壁や自分の体にぶつかるとゲームオーバーです。": "Control the snake with arrow keys or WASD. Apples grow your snake and increase your score. Hitting a wall or yourself ends the game.",
  "上下左右につながった同じ色のブロックを2個以上まとめて消します。消した数が多いほど得点が伸び、": "Remove groups of two or more same-colored blocks connected vertically or horizontally. Larger groups score more,",
  "列が空くと右側の列が左へ詰まります。全消しできるとボーナスです。": "and when a column becomes empty, columns on the right shift left. Clearing everything gives a bonus.",
  "小さい塊を急いで消しすぎると孤立ブロックが残りがちです。大きな塊を育てる感じでどうぞ。": "If you rush small groups, isolated blocks remain. Try building larger groups.",
  "空白マスに隣り合う数字だけを動かせます。左上から右下へ、1から15まで順番に並べるとクリアです。": "Only tiles adjacent to the empty space can move. Arrange 1 to 15 from top-left to bottom-right to clear.",
  "30秒間、出てきたもぐらをクリックします。金もぐらは高得点、爆弾は減点。空振りするとコンボが途切れます。": "Click moles as they appear for 30 seconds. Golden moles score more, bombs deduct points, and misses break your combo.",
  "あなたはX、COMはOです。縦・横・斜めのどれかに先に3つ並べると勝ちです。": "You are X and the CPU is O. Get three in a row vertically, horizontally, or diagonally to win.",
  "「本気」はかなり堅いので、まずは「ふつう」がおすすめです。": "Hard mode is very solid, so Normal is a good place to start.",
  "中央を取る、相手のリーチを止める、角を活かす。この3つでぐっと勝ちやすくなります。": "Take the center, block threats, and use corners. Those three habits help a lot.",
  "難易度を選んで、3つ並べる勝負を始めましょう。": "Choose a difficulty and start a three-in-a-row match.",
  "赤があなた、黄がCOMです。先に4つ並べましょう。": "You are red and the CPU is yellow. Connect four first.",
  "文字の意味と文字色が一致しているか、素早く判定しましょう。": "Quickly judge whether the word meaning matches the text color.",
  "この文字は、意味と色が一致していますか？": "Does this word match its color?",
  "意味ではなく、文字色との一致を見ましょう。": "Focus on whether the text color matches, not just the word meaning.",
  "正解！": "Correct!",
  "ミス。文字の意味と色を分けて見ましょう。": "Miss. Separate the word meaning from the color.",
  "終了！ベストスコアを更新しました。": "Finished! New best score.",
  "終了！もう一度挑戦してベスト更新を狙いましょう。": "Finished! Try again and aim for a new best.",
  "カードを配って、21に近い手を目指しましょう。": "Deal the cards and aim for a hand close to 21.",
  "ヒットでカードを引くか、スタンドで勝負します。": "Hit to draw a card, or Stand to settle the round.",
  "もう1枚引くか、ここで止めるか。いい悩みどころです。": "Draw one more, or stop here? A good little dilemma.",
  "カードを配って勝負を始めましょう。": "Deal the cards to start the round.",
  "ブラックジャック！チップ +150 です。": "Blackjack! +150 chips.",
  "バースト。21を超えてしまいました。": "Bust. You went over 21.",
  "スタートを押して、30秒間のエイム練習を始めましょう。": "Press Start to begin a 30-second aim drill.",
  "丸いターゲットをクリック。空振りするとミスになります。": "Click the round targets. Missed clicks count as misses.",
  "終了です。次はもっと素早く、でも正確に狙ってみましょう。": "Time's up. Next time, aim faster but stay accurate.",
  "ヒット！次のターゲットへ。": "Hit! On to the next target.",
  "ミス。落ち着いて中心を狙いましょう。": "Miss. Stay calm and aim for the center.",
  "もう一度挑戦できます": "You can try again",
  "スタート待機中": "Waiting to start",
  "スタートを押して、ヘビを操作しましょう。矢印キーまたはWASDで移動できます。": "Press Start and control the snake. Move with arrow keys or WASD.",
  "ゲームオーバー。壁や自分にぶつからないルートを探して、もう一度挑戦しましょう。": "Game over. Find a route that avoids walls and yourself, then try again.",
  "リンゴを獲得。さらに伸ばしましょう。": "Apple collected. Keep growing.",
  "一時停止中。再開ボタンで続きから遊べます。": "Paused. Press Resume to continue.",
  "再開しました。次のリンゴを狙いましょう。": "Resumed. Aim for the next apple.",
  "リンゴを集めてヘビを伸ばしましょう。壁と自分の体には注意。": "Collect apples to grow the snake. Watch out for walls and your own body.",
  "同じ色が2個以上つながったブロックをクリックして消しましょう。": "Click groups of two or more connected blocks of the same color.",
  "大きい塊を残すように消すと高得点を狙えます。": "Leave larger groups for higher scores.",
  "1個だけのブロックは消せません。2個以上つながった塊を選びましょう。": "Single blocks cannot be removed. Choose a connected group of two or more.",
  "数字タイルを空白マスへスライドして、1から15まで順番に並べましょう。": "Slide numbered tiles into the empty space and arrange them from 1 to 15.",
  "空白マスの上下左右にあるタイルだけを動かせます。": "Only tiles above, below, left, or right of the empty space can move.",
  "クリア！きれいに並びました。": "Cleared! Everything is in order.",
  "スタートを押して、30秒間のもぐらたたきを始めましょう。": "Press Start to begin 30 seconds of Whack-a-Mole.",
  "もぐらを叩くと得点。金もぐらは高得点、爆弾は減点です。": "Hit moles to score. Golden moles are worth more; bombs deduct points.",
  "終了です。金もぐらを逃さず、爆弾を避けてベスト更新を狙いましょう。": "Time's up. Catch golden moles, avoid bombs, and aim for a new best.",
  "空振り。よく見てから叩きましょう。": "Miss. Look carefully before you strike.",
  "爆弾！減点です。次は避けましょう。": "Bomb! Points deducted. Avoid it next time.",
  "ヒット！": "Hit!",
  "あなたの番です。Xを3つ並べましょう。": "Your turn. Line up three Xs.",
  "あなたの番です。先手はXです。": "Your turn. X goes first.",
  "COMが考えています……": "CPU is thinking...",
  "勝利！読み勝ちです。もう一局いきましょう。": "Victory! You read the board well. Let's play another.",
  "COMの勝ちです。次は中央と角を意識すると戦いやすいです。": "CPU wins. Next time, focus on the center and corners.",
  "引き分け。かなり良い勝負でした。": "Draw. That was a pretty good match.",
  "勝利！赤が4つ並びました。": "Victory! Red connected four.",
  "COMの勝ちです。次はリーチを早めに止めましょう。": "CPU wins. Try blocking threats earlier next time.",
  "引き分けです。盤面ぎっしりの接戦でした。": "Draw. A full-board close game.",
  "列を選ぶと、下から赤いチップが入ります。": "Choose a column and a red disc drops in from below.",
  "その列はもういっぱいです。別の列を選びましょう。": "That column is full. Choose another one."
};

const phraseTranslations: Record<string, string> = {
  ...textTranslations,
  ...modernTextTranslations,
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
  [/^勝利！\s*(\d+)\s*対\s*(\d+)\s*でチップ \+(\d+) です。$/, (match) => `Win! ${match[1]} to ${match[2]}. +${match[3]} chips.`],
  [/^ディーラーの勝ちです。(\d+)\s*対\s*(\d+)。$/, (match) => `Dealer wins. ${match[1]} to ${match[2]}.`],
  [/^引き分けです。(\d+)\s*対\s*(\d+)。$/, (match) => `Push. ${match[1]} to ${match[2]}.`],
  [/^(\d+)連続ヒット。かなりいいリズムです。$/, (match) => `${match[1]}-hit streak. Great rhythm.`],
  [/^(\d+)個目のリンゴ！かなり伸びてきました。$/, (match) => `Apple ${match[1]}! The snake is getting long.`],
  [/^金もぐら！\s*(\d+)コンボです。$/, (match) => `Golden mole! ${match[1]} combo.`],
  [/^(\d+)コンボ！いいテンポです。$/, (match) => `${match[1]} combo! Nice tempo.`],
  [/^(\d+)コンボ！いい集中です。$/, (match) => `${match[1]} combo! Great focus.`],
  [/^(\d+)個消して(\d+)点。まだ消せる塊があります。$/, (match) => `Removed ${match[1]} blocks for ${match[2]} points. More groups remain.`],
  [/^全消しボーナス！合計(\d+)点です。$/, (match) => `Full-clear bonus! Total: ${match[1]} points.`],
  [/^手詰まりです。合計(\d+)点でした。$/, (match) => `No moves left. Total: ${match[1]} points.`],
  [/^(\d+)列目にCOMが置きました。あなたの番です。$/, (match) => `CPU placed in column ${match[1]}. Your turn.`],
  [/^破壊(\d+)個 \/ 残機(\d+)$/, (match) => `${match[1]} destroyed / ${match[2]} lives`],
  [/^リンゴ(\d+)個 \/ 長さ(\d+)$/, (match) => `${match[1]} apples / length ${match[2]}`],
  [/^正解\s*(\d+) \/ 最高\s*(\d+)コンボ$/, (match) => `${match[1]} correct / best ${match[2]} combo`],
  [/^(\d+)ヒット \/ 命中率(\d+)%$/, (match) => `${match[1]} hits / ${match[2]}% accuracy`],
  [/^(\d+)ヒット \/ 最高(\d+)コンボ$/, (match) => `${match[1]} hits / best ${match[2]} combo`],
  [/^ミス\s*(\d+)\s*回$/, (match) => `${match[1]} misses`],
  [/^連勝(\d+) \/ (.+)$/, (match) => `${match[1]}-win streak / ${translateDynamicText(match[2])}`],
  [/^残り(\d+)個$/, (match) => `${match[1]} remaining`],
  [/^残り(\d+)本 \/ (\d+)手$/, (match) => `${match[1]} pegs left / ${match[2]} moves`],
  [/^(\d+)手$/, (match) => `${match[1]} moves`],
  [/^(\d+)点$/, (match) => `${match[1]} pts`],
  [/^(\d+)枚$/, (match) => `${match[1]} chips`],
  [/^(\d+)連勝$/, (match) => `${match[1]}-win streak`],
  [/^(\d+)回$/, (match) => `${match[1]} attempts`],
  [/^(.+) \/ 勝利$/, (match) => `${translateDynamicText(match[1])} / Win`],
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
