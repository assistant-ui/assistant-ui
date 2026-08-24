"use client";

import { useEffect, useState } from "react";
import { ReadAloud } from "@/components/elements/read-aloud";

const TEXT =
  "The converter dropped parts with no text, so the guard now keeps them and the suite passes again.";
const WORDS = TEXT.split(" ");
const RATES = [1, 1.25, 1.5, 2] as const;

export function ReadAloudDemo() {
  const [spokenIndex, setSpokenIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [rateIndex, setRateIndex] = useState(0);
  const rate = RATES[rateIndex] ?? 1;

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setSpokenIndex((current) => (current >= WORDS.length ? 0 : current + 1));
    }, 260 / rate);
    return () => clearInterval(id);
  }, [playing, rate]);

  const totalSeconds = Math.round((WORDS.length * 260) / rate / 1000);
  const elapsedSeconds = Math.round((spokenIndex * 260) / rate / 1000);

  return (
    <ReadAloud
      words={WORDS}
      spokenIndex={spokenIndex}
      playing={playing}
      rate={rate}
      elapsed={`0:${String(elapsedSeconds).padStart(2, "0")}`}
      duration={`0:${String(totalSeconds).padStart(2, "0")}`}
      onToggle={() => setPlaying((current) => !current)}
      onRateChange={() => setRateIndex((i) => (i + 1) % RATES.length)}
    />
  );
}
