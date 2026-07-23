import { Droplets, RotateCw, Swords, X } from "lucide-react";
import { useEffect, useState } from "react";

type BattleShellSupportProps = {
  language: "ja" | "en";
};

export type OpponentImpact = "light" | "medium" | "heavy" | null;
export type OpponentInterferencePhase = "charging" | "forecast" | "casting" | "armed" | "triggered";
type MokoVisualState = "idle" | "attack" | Exclude<OpponentImpact, null> | "purified";

const mokoAssets: Record<MokoVisualState, string> = {
  idle: "/characters/moko/moko-idle",
  attack: "/characters/moko/moko-attack",
  light: "/characters/moko/moko-hit-light",
  medium: "/characters/moko/moko-hit-medium",
  heavy: "/characters/moko/moko-hit-heavy",
  purified: "/characters/moko/moko-purified"
};

type ColorChainOpponentProps = BattleShellSupportProps & {
  attackCharge: number;
  disturbance: number;
  eventKey: string | null;
  impact: OpponentImpact;
  interferencePhase: OpponentInterferencePhase;
  status: "idle" | "playing" | "paused" | "resolving" | "gameover";
};

const battleCopy = {
  ja: {
    opponentEyebrow: "STAGE 1 / MAGIC FOREST",
    opponentTitle: "モコスライム",
    disturbance: "乱れゲージ",
    idle: "色の乱れをまとって、ぷるぷる様子を見ています。",
    paused: "モコスライムもひと休みしています。",
    lightHit: "ぴょこん！ 少し色の乱れがほどけました。",
    mediumHit: "ぷるぷる！ 鎖の魔法がしっかり届いています。",
    heavyHit: "大きくぐらり！ 結晶の乱れが一気にほどけました。",
    victory: "モコスライムは得意げに跳ねています。",
    cleansed: "浄化完了！ スコアアタックはそのまま続けられます。",
    casting: "ぷるんと膨らみ、ぬめり魔法を放ちます！",
    armed: "ぬめりが付着中。次の着地で周囲が横へ滑ります。",
    triggered: "ぬめりが弾け、ブロックが横へ滑りました！",
    forecast: "妨害予告",
    chargingDetail: (charge: number) => `ぬめりブロックを準備中（${charge}%）`,
    forecastDetail: (charge: number) => `まもなくぬめりブロック発動（${charge}%）`,
    castingDetail: "ぬめりブロック発動！",
    armedDetail: "光るぬめり付きブロックに注意",
    triggeredDetail: "妨害終了。次の魔法を充填中",
    orientationTitle: "横向きがおすすめです",
    orientationDetail: "端末を横向きにすると、盤面・クロマ・対戦相手を一画面で見渡せます。縦向きのままでもプレイできます。",
    orientationDismiss: "案内を閉じる"
  },
  en: {
    opponentEyebrow: "STAGE 1 / MAGIC FOREST",
    opponentTitle: "Moko Slime",
    disturbance: "Disorder gauge",
    idle: "It jiggles while wrapped in unstable color magic.",
    paused: "Moko Slime is taking a short break too.",
    lightHit: "Boing! A little disorder has unraveled.",
    mediumHit: "Wobble! The chain magic landed cleanly.",
    heavyHit: "Big wobble! The crystal disorder unraveled at once.",
    victory: "Moko Slime is bouncing proudly.",
    cleansed: "Purified! You can keep playing for a higher score.",
    casting: "It swells up and casts a slippery spell!",
    armed: "Slime attached. A nearby block will slide after the next landing.",
    triggered: "The slime popped and a block slid sideways!",
    forecast: "Interference preview",
    chargingDetail: (charge: number) => `Charging Slippery Block (${charge}%)`,
    forecastDetail: (charge: number) => `Slippery Block incoming (${charge}%)`,
    castingDetail: "Casting Slippery Block!",
    armedDetail: "Watch the glowing slime-coated block",
    triggeredDetail: "Interference ended. Charging the next spell",
    orientationTitle: "Landscape recommended",
    orientationDetail: "Rotate your device to see the board, Chroma, and the opponent together. You can still play in portrait mode.",
    orientationDismiss: "Dismiss notice"
  }
} as const;

export function ColorChainOpponentPanel({
  attackCharge,
  disturbance,
  eventKey,
  impact,
  interferencePhase,
  language,
  status
}: ColorChainOpponentProps) {
  const t = battleCopy[language];
  const [reaction, setReaction] = useState<Exclude<OpponentImpact, null> | "idle">("idle");
  const purified = disturbance <= 0;
  const visualState: MokoVisualState = purified
    ? "purified"
    : reaction !== "idle"
      ? reaction
      : interferencePhase === "casting"
        ? "attack"
        : "idle";

  useEffect(() => {
    if (!eventKey || !impact || purified) return;
    setReaction(impact);
    const timeout = window.setTimeout(
      () => setReaction("idle"),
      impact === "heavy" ? 1250 : impact === "medium" ? 900 : 650
    );
    return () => window.clearTimeout(timeout);
  }, [eventKey, impact, purified]);

  useEffect(() => {
    if (status === "idle") setReaction("idle");
  }, [status]);

  const message = purified
    ? t.cleansed
    : status === "gameover"
      ? t.victory
      : status === "paused"
        ? t.paused
        : reaction === "heavy"
          ? t.heavyHit
          : reaction === "medium"
            ? t.mediumHit
          : reaction === "light"
            ? t.lightHit
            : interferencePhase === "casting"
              ? t.casting
              : interferencePhase === "armed"
                ? t.armed
                : interferencePhase === "triggered"
                  ? t.triggered
                  : t.idle;
  const forecastDetail = interferencePhase === "casting"
    ? t.castingDetail
    : interferencePhase === "armed"
      ? t.armedDetail
      : interferencePhase === "triggered"
        ? t.triggeredDetail
        : interferencePhase === "forecast"
          ? t.forecastDetail(Math.round(attackCharge))
          : t.chargingDetail(Math.round(attackCharge));

  return (
    <section
      className={`color-chain-opponent-panel is-${reaction} is-interference-${interferencePhase}${purified ? " is-purified" : ""}`}
      aria-label={t.opponentTitle}
    >
      <div className="color-chain-opponent-heading">
        <div>
          <span>{t.opponentEyebrow}</span>
          <strong>{t.opponentTitle}</strong>
        </div>
        <Swords aria-hidden="true" />
      </div>
      <div className="color-chain-opponent-stage" aria-hidden="true">
        <i className="color-chain-opponent-orbit" />
        {(Object.keys(mokoAssets) as MokoVisualState[]).map((assetState) => (
          <picture
            aria-hidden={assetState !== visualState}
            className={`color-chain-moko-slime is-${assetState}${assetState === visualState ? " is-active" : ""}`}
            key={assetState}
          >
            <source srcSet={`${mokoAssets[assetState]}.webp`} type="image/webp" />
            <img
              alt=""
              draggable="false"
              height="1254"
              src={`${mokoAssets[assetState]}.png`}
              width="1254"
            />
          </picture>
        ))}
      </div>
      <div className="color-chain-opponent-gauge-wrap">
        <span><Droplets aria-hidden="true" />{t.disturbance}</span>
        <strong>{Math.round(disturbance)}%</strong>
        <div
          aria-label={t.disturbance}
          aria-valuemax={100}
          aria-valuemin={0}
          aria-valuenow={Math.round(disturbance)}
          className="color-chain-opponent-gauge"
          role="progressbar"
        >
          <i style={{ width: `${disturbance}%` }} />
        </div>
      </div>
      <div className="color-chain-opponent-copy">
        <strong aria-live="polite">{message}</strong>
        {!purified && (
          <p>
            <span>{t.forecast}</span>
            {forecastDetail}
          </p>
        )}
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
