import { useCallback, useEffect, useRef, useState } from "react";

// 非表示中も実経過時間を含め、終了操作の瞬間に記録を確定する。
export function useStopwatch() {
  const [seconds, setSeconds] = useState(0);
  const clock = useRef({ startedAt: null as number | null, frozen: 0 });
  const read = useCallback(() => clock.current.startedAt === null
    ? clock.current.frozen : Math.max(0, Math.floor((Date.now() - clock.current.startedAt) / 1000)), []);
  const startTimer = useCallback(() => {
    if (clock.current.startedAt === null) clock.current.startedAt = Date.now() - clock.current.frozen * 1000;
  }, []);
  const resetTimer = useCallback((running = false) => {
    clock.current = { startedAt: running ? Date.now() : null, frozen: 0 };
    setSeconds(0);
  }, []);
  const stopTimer = useCallback((minimum = 0) => {
    const result = Math.max(minimum, read());
    clock.current = { startedAt: null, frozen: result };
    setSeconds(result);
    return result;
  }, [read]);
  useEffect(() => {
    const update = () => { if (clock.current.startedAt !== null) setSeconds(read()); };
    const timer = window.setInterval(update, 250);
    document.addEventListener("visibilitychange", update);
    window.addEventListener("focus", update);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", update);
      window.removeEventListener("focus", update);
    };
  }, [read]);
  return { seconds, startTimer, resetTimer, stopTimer };
}
