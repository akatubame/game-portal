import { ArrowLeft, ArrowRight, Compass, Languages, MapPin, Play } from "lucide-react";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useI18n } from "../../i18n";
import { mapDistance, mapFacingAt, mapPositionAt, WORLD_REGIONS, worldMapRoute, type MapFacing, type MapPoint } from "./worldMap";
import "./worldMap.css";

const LOCATION_KEY = "chroma-world-map-location-v1";
const WALK_SHEET = "/characters/chroma/chroma-map-walk-v1.webp";
const CHEER_IMAGE = "/characters/chroma/chroma-chain.webp";
const WALK_ROWS: Record<MapFacing, number> = { down: 0, up: 1, left: 2, right: 3 };
function readLocation() {
  try {
    const id = localStorage.getItem(LOCATION_KEY);
    const index = WORLD_REGIONS.findIndex((region) => region.id === id);
    return index < 0 ? 0 : index;
  } catch { return 0; }
}

type Props = {
  onClose: () => void;
  onPlay: () => void;
  canResume: boolean;
  effectsEnabled: boolean;
  onSelectSound: () => void;
  onEnterFirstStage: () => void;
};

export function ColorChainWorldMap({ onClose, onPlay, canResume, effectsEnabled, onSelectSound, onEnterFirstStage }: Props) {
  const { language, setLanguage } = useI18n();
  const ja = language === "ja";
  const [current, setCurrent] = useState(readLocation);
  const [destination, setDestination] = useState(current);
  const [position, setPosition] = useState<MapPoint>(WORLD_REGIONS[current].point);
  const [moving, setMoving] = useState(false);
  const [facing, setFacing] = useState<MapFacing>("down");
  const [spriteReady, setSpriteReady] = useState(false);
  const [cheerReady, setCheerReady] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  const [route, setRoute] = useState<MapPoint[]>([]);
  const [imageFailed, setImageFailed] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(() => matchMedia("(prefers-reduced-motion: reduce)").matches);
  const frameRef = useRef(0);
  const movingRef = useRef(false);
  const celebratingRef = useRef(false);
  const celebrationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const surfaceRef = useRef<HTMLElement>(null);
  const backRef = useRef<HTMLButtonElement>(null);
  const active = WORLD_REGIONS[destination];
  const activeText = active[language];

  useEffect(() => {
    backRef.current?.focus({ preventScroll: true });
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    media.addEventListener("change", update);
    return () => {
      cancelAnimationFrame(frameRef.current);
      if (celebrationTimerRef.current !== null) clearTimeout(celebrationTimerRef.current);
      media.removeEventListener("change", update);
    };
  }, []);

  // 魔法の森の出発演出後は会話へ。他の舞台は選択演出を確認できる。
  const activateCurrent = () => {
    if (movingRef.current || celebratingRef.current) return;
    celebratingRef.current = true;
    setFacing("down");
    setCelebrating(true);
    surfaceRef.current?.focus({ preventScroll: true });
    onSelectSound();
    celebrationTimerRef.current = setTimeout(() => {
      celebratingRef.current = false;
      celebrationTimerRef.current = null;
      setCelebrating(false);
      if (current === 0) onEnterFirstStage();
    }, 1200);
  };

  const travel = (index: number) => {
    if (movingRef.current || celebratingRef.current || !WORLD_REGIONS[index]) return;
    if (index === current) { activateCurrent(); return; }
    const points = worldMapRoute(current, index);
    setDestination(index);
    setRoute(points);
    setFacing(mapFacingAt(points, 0));
    surfaceRef.current?.focus({ preventScroll: true });
    const arrive = () => {
      movingRef.current = false;
      setPosition(WORLD_REGIONS[index].point);
      setFacing("down");
      setCurrent(index);
      setMoving(false);
      setRoute([]);
      try { localStorage.setItem(LOCATION_KEY, WORLD_REGIONS[index].id); } catch { /* 移動は保存不可でも続ける */ }
    };
    if (!effectsEnabled || reducedMotion) { arrive(); return; }
    movingRef.current = true;
    setMoving(true);
    const distance = points.slice(1).reduce((sum, point, i) => sum + mapDistance(points[i], point), 0);
    const duration = Math.min(4500, Math.max(900, distance * 21));
    const start = performance.now();
    let lastPaint = 0;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      if (progress >= 1) { arrive(); return; }
      // 小さなキャラだけを約30fpsで動かし、背景全体にはアニメーションを掛けない。
      if (now - lastPaint >= 32) {
        setPosition(mapPositionAt(points, progress));
        setFacing(mapFacingAt(points, progress));
        lastPaint = now;
      }
      frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
  };

  const handleKey = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "Escape") { event.preventDefault(); onClose(); return; }
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      travel(current + (event.key === "ArrowRight" ? 1 : -1));
    }
    if (event.key === "Tab") {
      const buttons = Array.from(surfaceRef.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)") ?? []);
      const first = buttons[0], last = buttons[buttons.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === surfaceRef.current)) {
        event.preventDefault(); last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first?.focus();
      }
    }
  };

  return (
    <section className={`chroma-world-map${moving ? " is-traveling" : ""}${celebrating ? " is-activating" : ""}${!effectsEnabled || reducedMotion ? " is-still" : ""}`}
      role="dialog" aria-modal="true" aria-labelledby="chroma-world-map-title" tabIndex={-1} data-native-i18n
      ref={surfaceRef} onKeyDown={handleKey}>
      <img className="chroma-world-map-art" src="/backgrounds/chroma-world-map-v1.webp"
        alt={ja ? "魔法の森、月夜の洞窟、氷結の庭園、古書塔、胞子の温室、黒鏡の塔を描いた彩鎖界の地図" : "Catenaria: a magic forest, moonlit cave, frozen garden, library, greenhouse and mirror tower"}
        onError={() => setImageFailed(true)} draggable={false} />
      <header className="chroma-world-map-header">
        <div>
          <p><Compass aria-hidden="true" /> {ja ? "マップモード" : "WORLD MAP"}</p>
          <h2 id="chroma-world-map-title">{ja ? "彩鎖界カテナリア" : "Catenaria, Realm of Color Chains"}</h2>
          <span>{ja ? "行き先へ移動。到着した場所をもう一度タップして選択！" : "Tap to travel. Tap your current location again to select it!"}</span>
        </div>
        <nav aria-label={ja ? "マップの操作" : "Map controls"}>
          <button type="button" onClick={() => setLanguage(ja ? "en" : "ja")}><Languages aria-hidden="true" />{ja ? "English" : "日本語"}</button>
          <button type="button" onClick={onClose} ref={backRef}><ArrowLeft aria-hidden="true" />{ja ? "パズルへ戻る" : "Back to Puzzle"}</button>
        </nav>
      </header>

      {celebrating && <div className="chroma-world-map-activation-flash" aria-hidden="true" />}

      {imageFailed && <p className="chroma-world-map-error" role="status">{ja ? "地図画像を読み込めませんでした。各地点への移動は利用できます。" : "The map image could not load. You can still visit each destination."}</p>}
      <svg className="chroma-world-map-trail" viewBox="0 0 1000 562.5" preserveAspectRatio="none" aria-hidden="true">
        {route.length > 1 && <polyline points={route.map((point) => `${point.x * 10},${point.y * 5.625}`).join(" ")} />}
      </svg>
      <div className="chroma-world-map-destinations" role="group" aria-label={ja ? "6つの舞台" : "Six destinations"}>
        {WORLD_REGIONS.map((region, index) => (
          <button key={region.id} type="button" className={`chroma-world-map-node${current === index && !moving ? " is-current" : ""}${destination === index ? " is-selected" : ""}`}
            style={{ left: `${region.point.x}%`, top: `${region.point.y}%` }}
            disabled={moving || celebrating} onClick={() => travel(index)} aria-pressed={destination === index}
            aria-label={`${index + 1}. ${region[language].name} / ${region[language].resident}`}>
            <i aria-hidden="true">{index + 1}</i>
            <span>{region[language].name}<small>{region[language].resident}</small></span>
          </button>
        ))}
      </div>
      <img className="chroma-world-map-sprite-preload" src={WALK_SHEET} alt="" aria-hidden="true"
        onLoad={() => setSpriteReady(true)} onError={() => setSpriteReady(false)} />
      <img className="chroma-world-map-sprite-preload" src={CHEER_IMAGE} alt="" aria-hidden="true"
        onLoad={() => setCheerReady(true)} onError={() => setCheerReady(false)} />
      <div className="chroma-world-map-chroma" data-facing={facing} data-pose={celebrating ? "cheer" : moving ? "walk" : "idle"}
        style={{ left: `${position.x}%`, top: `${position.y}%` }} aria-hidden="true">
        <i />
        {celebrating && <div className="chroma-world-map-activation-effects">
          <b className="chroma-world-map-magic-ring" />
          {[0, 1, 2, 3, 4, 5].map(index => <b className="chroma-world-map-spark" key={index}>✦</b>)}
        </div>}
        {celebrating && cheerReady
          ? <img className="chroma-world-map-cheer" src={CHEER_IMAGE} alt="" draggable={false} />
          : spriteReady
          ? <span className="chroma-world-map-walk-sprite" style={{ backgroundPositionY: `${WALK_ROWS[facing] * 100 / 3}%` }} />
          : <img className="chroma-world-map-sprite-fallback" src="/characters/chroma/chroma-idle.webp" alt="" draggable={false} />}
      </div>

      <footer className="chroma-world-map-card">
        <div className="chroma-world-map-location" aria-live="polite" aria-atomic="true">
          <p><MapPin aria-hidden="true" />{celebrating ? (ja ? "いくよ！" : "LET’S GO!") : moving ? (ja ? "移動中" : "TRAVELING") : (ja ? "現在地" : "YOU ARE HERE")} · {String(destination + 1).padStart(2, "0")}</p>
          <h3>{activeText.name}<span>{activeText.resident}</span></h3>
          <p>{activeText.description}</p>
          <small>{destination === 0
            ? (ja ? "もう一度タップすると、クロマとモコスライムの会話から始まります。" : "Tap again to meet Moko Slime before the puzzle begins.")
            : (ja ? "この舞台のバトルは準備中です。今は地図の散策を楽しめます。" : "This battle is coming later. For now, enjoy exploring the map.")}</small>
        </div>
        <div className="chroma-world-map-card-actions">
          <div>
            <button type="button" disabled={moving || celebrating || current === 0} onClick={() => travel(current - 1)} aria-label={ja ? "前の舞台へ移動" : "Visit previous destination"}><ArrowLeft aria-hidden="true" />{ja ? "前の舞台" : "Previous"}</button>
            <button type="button" disabled={moving || celebrating || current === WORLD_REGIONS.length - 1} onClick={() => travel(current + 1)} aria-label={ja ? "次の舞台へ移動" : "Visit next destination"}>{ja ? "次の舞台" : "Next"}<ArrowRight aria-hidden="true" /></button>
          </div>
          {destination === 0 && <button type="button" className="chroma-world-map-play" disabled={moving || celebrating} onClick={canResume ? onPlay : activateCurrent}><Play aria-hidden="true" />{canResume ? (ja ? "パズルを再開" : "Resume Puzzle") : (ja ? "モコスライムと遊ぶ" : "Play Moko Slime")}</button>}
        </div>
      </footer>
    </section>
  );
}

