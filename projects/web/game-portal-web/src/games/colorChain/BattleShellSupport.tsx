import { RotateCw, Sparkles, Swords, X } from "lucide-react";
import { useState } from "react";

type BattleShellSupportProps = {
  language: "ja" | "en";
};

const battleCopy = {
  ja: {
    opponentEyebrow: "BATTLE SLOT",
    opponentTitle: "対戦相手",
    opponentPending: "対戦準備中",
    opponentDetail: "横長UIの確認後、最初の対戦相手としてモコスライムを接続します。",
    orientationTitle: "横向きがおすすめです",
    orientationDetail: "端末を横向きにすると、盤面・クロマ・対戦相手を一画面で見渡せます。縦向きのままでもプレイできます。",
    orientationDismiss: "案内を閉じる"
  },
  en: {
    opponentEyebrow: "BATTLE SLOT",
    opponentTitle: "Opponent",
    opponentPending: "Preparing battle",
    opponentDetail: "Moko Slime will join as the first opponent after the landscape UI is verified.",
    orientationTitle: "Landscape recommended",
    orientationDetail: "Rotate your device to see the board, Chroma, and the opponent together. You can still play in portrait mode.",
    orientationDismiss: "Dismiss notice"
  }
} as const;

export function ColorChainOpponentPlaceholder({ language }: BattleShellSupportProps) {
  const t = battleCopy[language];

  return (
    <section className="color-chain-opponent-panel" aria-label={t.opponentTitle}>
      <div className="color-chain-opponent-heading">
        <div>
          <span>{t.opponentEyebrow}</span>
          <strong>{t.opponentTitle}</strong>
        </div>
        <Swords aria-hidden="true" />
      </div>
      <div className="color-chain-opponent-stage" aria-hidden="true">
        <i className="color-chain-opponent-orbit" />
        <span><Sparkles /></span>
      </div>
      <div className="color-chain-opponent-copy">
        <strong>{t.opponentPending}</strong>
        <p>{t.opponentDetail}</p>
      </div>
    </section>
  );
}

export function ColorChainLandscapeNotice({ language }: BattleShellSupportProps) {
  const [visible, setVisible] = useState(true);
  const t = battleCopy[language];

  if (!visible) return null;

  return (
    <aside className="color-chain-landscape-notice" role="note">
      <RotateCw aria-hidden="true" />
      <div>
        <strong>{t.orientationTitle}</strong>
        <p>{t.orientationDetail}</p>
      </div>
      <button type="button" onClick={() => setVisible(false)} aria-label={t.orientationDismiss}>
        <X aria-hidden="true" />
      </button>
    </aside>
  );
}
