import { useEffect, useState } from "react";

const TICK_MS = 250;

/** Milliseconds since `key` was first seen; 0 and no ticking while `key` is undefined. */
export function useElapsed(key: string | undefined) {
  const [seenKey, setSeenKey] = useState(key);
  const [since, setSince] = useState(Date.now);
  const [now, setNow] = useState(since);
  if (seenKey !== key) {
    const at = Date.now();
    setSeenKey(key);
    setSince(at);
    setNow(at);
  }
  useEffect(() => {
    if (key === undefined) return;
    const timer = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(timer);
  }, [key]);
  return key === undefined ? 0 : now - since;
}
