import { useEffect, useRef, useState } from "react";

// 通知回数ではなく開始時の締切から残り時間を計算する。
export function useCountdown(active: boolean, durationSeconds: number) {
  const [timeLeft, setTimeLeft] = useState(durationSeconds);
  const deadline = useRef<number | null>(null);

  const resetCountdown = () => {
    deadline.current = Date.now() + durationSeconds * 1000;
    setTimeLeft(durationSeconds);
  };
  const hasExpired = () => {
    const expired = deadline.current !== null && Date.now() >= deadline.current;
    if (expired) setTimeLeft(0);
    return expired;
  };

  useEffect(() => {
    if (!active) return;
    if (deadline.current === null) deadline.current = Date.now() + durationSeconds * 1000;
    const update = () => setTimeLeft(Math.max(0, Math.ceil(((deadline.current ?? Date.now()) - Date.now()) / 1000)));
    update();
    const timer = window.setInterval(update, 100);
    document.addEventListener("visibilitychange", update);
    window.addEventListener("focus", update);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", update);
      window.removeEventListener("focus", update);
    };
  }, [active, durationSeconds]);

  return { timeLeft, resetCountdown, hasExpired };
}
