import { ArrowLeft, ChevronRight, Languages, SkipForward } from "lucide-react";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useI18n } from "../../i18n";
import "./stageDialogue.css";

const ASSETS = {
  background: "/backgrounds/stage-dialogue/magic-forest-v1.webp",
  walk: "/characters/chroma/chroma-map-walk-v1.webp",
  idle: "/characters/chroma/chroma-dialogue-idle-right-v2.webp",
  moko: "/characters/moko/moko-dialogue-left-v1.webp"
};
const LINES = [
  { speaker: "chroma", ja: "わあ、色のかけらでいっぱい！ モコ、苦しくない？", en: "Wow, so many color shards! Moko, are you feeling all right?" },
  { speaker: "moko", ja: "ぷるぷる……！ 色がからまって、うまく動けないよ。", en: "Wobble, wobble... The colors are all tangled. I can barely move!" },
  { speaker: "chroma", ja: "大丈夫。マジカルチェインで、からまった魔力をほどくね！", en: "Don't worry. I'll untangle that magic with a Magical Chain!" },
  { speaker: "moko", ja: "ぷるっ！ おねがい、クロマ！", en: "Boing! Please help me, Chroma!" }
] as const;

type Props = {
  effectsEnabled: boolean;
  canResume: boolean;
  onBack: () => void;
  onPlay: () => void;
};

export function ColorChainStageDialogue({ effectsEnabled, canResume, onBack, onPlay }: Props) {
  const { language, setLanguage } = useI18n();
  const ja = language === "ja";
  const [assets, setAssets] = useState<Record<keyof typeof ASSETS, boolean> | null>(null);
  const [arrived, setArrived] = useState(false);
  const [lineIndex, setLineIndex] = useState(0);
  const [progress, setProgress] = useState({ key: "", count: 0 });
  const [reducedMotion, setReducedMotion] = useState(() => matchMedia("(prefers-reduced-motion: reduce)").matches);
  const [suspended, setSuspended] = useState(document.hidden);
  const rootRef = useRef<HTMLElement>(null);
  const advancingRef = useRef(false);
  const animated = effectsEnabled && !reducedMotion;
  const line = LINES[lineIndex];
  const lineKey = language + ":" + lineIndex;
  const letters = Array.from(line[language]);
  const visibleCount = animated ? (progress.key === lineKey ? progress.count : 0) : letters.length;
  const typing = arrived && visibleCount < letters.length;
  const lastLine = lineIndex === LINES.length - 1;
  const speakerName = line.speaker === "chroma" ? (ja ? "クロマ" : "Chroma") : (ja ? "モコスライム" : "Moko Slime");

  useEffect(() => {
    let alive = true;
    rootRef.current?.focus({ preventScroll: true });
    const load = (src: string) => new Promise<boolean>(resolve => {
      const image = new Image();
      image.onload = () => resolve(true);
      image.onerror = () => resolve(false);
      image.src = src;
    });
    void Promise.all([load(ASSETS.background), load(ASSETS.walk), load(ASSETS.idle), load(ASSETS.moko)]).then(([background, walk, idle, moko]) => {
      if (alive) setAssets({ background, walk, idle, moko });
    });
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotion = () => setReducedMotion(media.matches);
    let hostPaused = false;
    const updateVisibility = () => setSuspended(document.hidden || hostPaused);
    const updateHost = (event: Event) => { hostPaused = Boolean((event as CustomEvent<boolean>).detail); updateVisibility(); };
    media.addEventListener("change", updateMotion);
    document.addEventListener("visibilitychange", updateVisibility);
    window.addEventListener("puzzle-host-pause", updateHost);
    return () => {
      alive = false;
      media.removeEventListener("change", updateMotion);
      document.removeEventListener("visibilitychange", updateVisibility);
      window.removeEventListener("puzzle-host-pause", updateHost);
    };
  }, []);

  useEffect(() => {
    if (assets && !animated) setArrived(true);
  }, [assets, animated]);

  useEffect(() => {
    if (!arrived || !animated || suspended || !typing) return;
    const timer = setInterval(() => setProgress(previous => ({ key: lineKey,
      count: Math.min(letters.length, (previous.key === lineKey ? previous.count : 0) + 1) })), 28);
    return () => clearInterval(timer);
  }, [arrived, animated, suspended, lineKey, letters.length, typing]);

  const advance = () => {
    if (!arrived || suspended || advancingRef.current) return;
    if (typing) { setProgress({ key: lineKey, count: letters.length }); return; }
    if (lastLine) { advancingRef.current = true; onPlay(); }
    else setLineIndex(index => Math.min(index + 1, LINES.length - 1));
  };

  const handleKey = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "Escape") { event.preventDefault(); onBack(); return; }
    if ((event.key === "Enter" || event.key === " ") && !(event.target as HTMLElement).closest("button")) {
      event.preventDefault(); if (!event.repeat) advance();
    }
    if (event.key === "Tab") {
      const buttons = Array.from(rootRef.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)") ?? []);
      const first = buttons[0], last = buttons[buttons.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === rootRef.current)) {
        event.preventDefault(); last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
  };

  return <section className={"chroma-stage-dialogue" + (assets && !arrived ? " is-entering" : "")
    + (!animated ? " is-still" : "") + (suspended ? " is-suspended" : "")}
    role="dialog" aria-modal="true" aria-labelledby="chroma-stage-dialogue-title" data-native-i18n
    tabIndex={-1} ref={rootRef} onKeyDown={handleKey}>
    {assets?.background && <img className="chroma-stage-dialogue-background" src={ASSETS.background} alt="" draggable={false} />}
    <header className="chroma-stage-dialogue-header">
      <div><small>{ja ? "ステージ1" : "STAGE 1"}</small><h2 id="chroma-stage-dialogue-title">{ja ? "魔法の森" : "Magic Forest"}</h2></div>
      <nav aria-label={ja ? "会話の操作" : "Dialogue controls"}>
        <button type="button" onClick={() => setLanguage(ja ? "en" : "ja")}><Languages aria-hidden="true" />{ja ? "English" : "日本語"}</button>
        <button type="button" onClick={onBack}><ArrowLeft aria-hidden="true" />{ja ? "マップへ戻る" : "Back to Map"}</button>
        <button type="button" onClick={onPlay}><SkipForward aria-hidden="true" />{ja ? "会話をスキップ" : "Skip Dialogue"}</button>
      </nav>
    </header>
    {assets && <>
      <div className={"chroma-stage-dialogue-chroma" + (arrived && line.speaker === "chroma" ? " is-speaking" : "")}
        data-facing="right" data-pose={arrived ? "idle" : "walk"} aria-hidden="true"
        onAnimationEnd={event => { if (event.animationName === "chroma-dialogue-enter") setArrived(true); }}>
        <i className="chroma-stage-dialogue-shadow" />
        {arrived && assets.idle ? <img className="chroma-stage-dialogue-idle" src={ASSETS.idle} alt="" draggable={false} />
          : assets.walk ? <span className="chroma-world-map-walk-sprite chroma-stage-dialogue-walk" />
          : <img className="chroma-stage-dialogue-fallback" src="/characters/chroma/chroma-idle.webp" alt="" />}
      </div>
      <div className={"chroma-stage-dialogue-moko" + (arrived && line.speaker === "moko" ? " is-speaking" : "")}
        data-facing="left" aria-hidden="true">
        <i className="chroma-stage-dialogue-shadow" />
        <img src={assets.moko ? ASSETS.moko : "/characters/moko/moko-idle.webp"} alt="" draggable={false} />
      </div>
    </>}
    <footer className="chroma-stage-dialogue-box">
      <button type="button" className="chroma-stage-dialogue-copy" onClick={advance} disabled={!arrived || suspended}
        aria-label={typing ? (ja ? "台詞を全文表示" : "Show full line") : (ja ? "次の台詞" : "Next line")}>
        <span className="chroma-stage-dialogue-speaker">{arrived ? speakerName : (ja ? "魔法の森" : "Magic Forest")}</span>
        <span className="chroma-stage-dialogue-text" aria-hidden="true">{arrived ? letters.slice(0, visibleCount).join("")
          : (assets ? (ja ? "クロマがやってきました……" : "Chroma is arriving...") : (ja ? "ステージに入っています……" : "Entering the stage..."))}</span>
      </button>
      <span className="chroma-stage-dialogue-sr-only" role="status" aria-live="polite" aria-atomic="true">{arrived ? speakerName + "：" + line[language] : ""}</span>
      <div className="chroma-stage-dialogue-next">
        <span>{arrived ? (lineIndex + 1) + " / " + LINES.length : ""}</span>
        <button type="button" disabled={!arrived || suspended} onClick={advance}>
          {typing ? (ja ? "全文表示" : "Show All") : lastLine ? (canResume ? (ja ? "パズルを再開" : "Resume Puzzle") : (ja ? "パズルへ進む" : "Start Puzzle")) : (ja ? "次へ" : "Next")}<ChevronRight aria-hidden="true" />
        </button>
        <small>{ja ? "タップで全文表示・次へ" : "Tap to reveal or continue"}</small>
      </div>
    </footer>
  </section>;
}
