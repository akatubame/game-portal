import { ArrowLeft, Grid3X3, RotateCw, ShieldCheck } from "lucide-react";
import { useMemo } from "react";
import { useI18n } from "../../i18n";
import {
  ROTATION_COLUMNS,
  ROTATION_ROWS,
  createPlayableRotationBoard,
  enumerateProductiveRotations
} from "./rotationLogic";

type ColorChainRotationTestProps = {
  onBack: () => void;
};

const copy = {
  ja: {
    eyebrow: "ROTATION PROTOTYPE / PHASE R1",
    title: "クロマのマジカルチェイン 回転式試作",
    description:
      "8×8盤面の生成、2×2回転、4個一致、消去・落下・補充・連鎖、成立手保証までを独立エンジンとして実装しました。",
    next:
      "この画面はロジック確認用の初期版です。タップ・スワイプによる実操作は次のPhase R2で接続します。",
    boardLabel: "成立手が保証された8×8の試作盤面",
    colors: "4色",
    candidates: "回転候補98通り",
    availableMoves: "現在の成立手",
    back: "ゲーム一覧へ戻る"
  },
  en: {
    eyebrow: "ROTATION PROTOTYPE / PHASE R1",
    title: "Chroma's Magical Chain: Rotation Prototype",
    description:
      "The independent 8×8 engine now supports 2×2 rotation, four-in-a-row detection, clearing, gravity, refills, chains, and guaranteed playable boards.",
    next:
      "This first build is a logic preview. Tap and swipe controls will be connected in Phase R2.",
    boardLabel: "An 8×8 prototype board with at least one valid move",
    colors: "4 colors",
    candidates: "98 candidate rotations",
    availableMoves: "Valid moves now",
    back: "Back to Game Shelf"
  }
} as const;

export function ColorChainRotationTest({ onBack }: ColorChainRotationTestProps) {
  const { language } = useI18n();
  const t = copy[language];
  const board = useMemo(
    () => createPlayableRotationBoard({ colorCount: 4 }),
    []
  );
  const availableMoves = useMemo(
    () => enumerateProductiveRotations(board).length,
    [board]
  );

  return (
    <section className="puzzle-shell color-chain-shell is-mascot-test color-chain-rotation-prototype">
      <header className="color-chain-rotation-header">
        <div>
          <p className="eyebrow">{t.eyebrow}</p>
          <h1>{t.title}</h1>
          <p>{t.description}</p>
        </div>
        <div className="color-chain-rotation-badges" aria-label="Prototype settings">
          <span><Grid3X3 aria-hidden="true" />{ROTATION_COLUMNS}×{ROTATION_ROWS}</span>
          <span><RotateCw aria-hidden="true" />{t.colors}</span>
          <span><ShieldCheck aria-hidden="true" />{t.candidates}</span>
        </div>
      </header>

      <div className="color-chain-rotation-preview">
        <div
          aria-label={t.boardLabel}
          className="color-chain-rotation-board"
          role="img"
        >
          {board.flatMap((row, rowIndex) =>
            row.map((token, columnIndex) => (
              <span
                className={`color-chain-cell${token ? ` is-${token}` : ""}`}
                data-symbol=""
                key={`${rowIndex}:${columnIndex}`}
              />
            ))
          )}
        </div>

        <aside className="color-chain-rotation-status">
          <strong>{t.availableMoves}</strong>
          <b>{availableMoves}</b>
          <p>{t.next}</p>
        </aside>
      </div>

      <button className="secondary-button" onClick={onBack} type="button">
        <ArrowLeft aria-hidden="true" />
        {t.back}
      </button>
    </section>
  );
}
