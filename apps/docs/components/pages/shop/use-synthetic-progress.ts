import { useEffect, useState } from "react";

const CEILING = 0.9;
const TAU_MS = 30_000;
const TICK_MS = 250;
const COMPLETE_MS = 600;

export function useSyntheticProgress({
  active,
  stepKey,
}: {
  active: boolean;
  stepKey: string;
}) {
  const [value, setValue] = useState(0);
  const [seenKey, setSeenKey] = useState(stepKey);
  const [complete, setComplete] = useState(false);
  if (seenKey !== stepKey) {
    setSeenKey(stepKey);
    setValue(1);
    setComplete(true);
  }
  useEffect(() => {
    if (!complete) return;
    const timer = setTimeout(() => {
      setValue(0);
      setComplete(false);
    }, COMPLETE_MS);
    return () => clearTimeout(timer);
  }, [complete, seenKey]);
  useEffect(() => {
    if (!active || complete) return;
    let last = Date.now();
    const timer = setInterval(() => {
      const now = Date.now();
      const decay = Math.exp(-(now - last) / TAU_MS);
      last = now;
      setValue((current) => CEILING - (CEILING - current) * decay);
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [active, complete]);
  return { value, complete };
}
