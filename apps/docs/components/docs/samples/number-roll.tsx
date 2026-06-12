"use client";

import { useEffect, useState } from "react";
import { MinusIcon, PauseIcon, PlayIcon, PlusIcon } from "lucide-react";
import { NumberRoll } from "@/components/assistant-ui/number-roll";
import { Button } from "@/components/ui/button";
import { SampleFrame } from "@/components/docs/samples/sample-frame";

export function NumberRollSample() {
  const [value, setValue] = useState(12);

  return (
    <SampleFrame className="flex h-auto flex-col items-center justify-center gap-6 p-10">
      <NumberRoll
        value={value}
        locales="en-US"
        className="text-5xl font-semibold"
      />
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          aria-label="Decrement"
          onClick={() => setValue((v) => v - 1)}
        >
          <MinusIcon />
        </Button>
        <Button
          variant="outline"
          size="icon"
          aria-label="Increment"
          onClick={() => setValue((v) => v + 1)}
        >
          <PlusIcon />
        </Button>
        <Button
          variant="outline"
          onClick={() => setValue(Math.floor(Math.random() * 9000) + 100)}
        >
          Random
        </Button>
      </div>
    </SampleFrame>
  );
}

export function NumberRollCompactSample() {
  const [value, setValue] = useState(700);

  return (
    <SampleFrame className="flex h-auto flex-col items-center justify-center gap-6 p-10">
      <NumberRoll
        value={value}
        locales="en-US"
        format={{ notation: "compact" }}
        className="text-5xl font-semibold"
      />
      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={() => setValue((v) => v - 400)}>
          -400
        </Button>
        <Button variant="outline" onClick={() => setValue((v) => v + 400)}>
          +400
        </Button>
      </div>
      <span className="text-muted-foreground font-mono text-xs tabular-nums">
        value = {value}
      </span>
    </SampleFrame>
  );
}

export function NumberRollFormatSample() {
  const [index, setIndex] = useState(0);
  const values = [1234.56, 98765.43, 412.07];
  const value = values[index % values.length]!;

  return (
    <SampleFrame className="flex h-auto flex-col items-center gap-6 p-10">
      <div className="grid grid-cols-[auto_1fr] items-baseline gap-x-8 gap-y-3 text-xl">
        <span className="text-muted-foreground text-xs">Currency</span>
        <NumberRoll
          value={value}
          locales="en-US"
          format={{ style: "currency", currency: "USD" }}
        />
        <span className="text-muted-foreground text-xs">Percent</span>
        <NumberRoll
          value={value / 100000}
          locales="en-US"
          format={{ style: "percent" }}
        />
        <span className="text-muted-foreground text-xs">zh-CN compact</span>
        <NumberRoll
          value={value * 100}
          locales="zh-CN"
          format={{ notation: "compact" }}
        />
        <span className="text-muted-foreground text-xs">Suffix</span>
        <NumberRoll value={value} locales="en-US" suffix=" tokens" />
      </div>
      <Button variant="outline" onClick={() => setIndex((i) => i + 1)}>
        Shuffle
      </Button>
    </SampleFrame>
  );
}

export function NumberRollLiveSample() {
  const [running, setRunning] = useState(false);
  const [tokens, setTokens] = useState(0);

  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => {
      setTokens((t) => t + Math.floor(Math.random() * 120) + 20);
    }, 400);
    return () => clearInterval(interval);
  }, [running]);

  return (
    <SampleFrame className="flex h-auto flex-col items-center justify-center gap-6 p-10">
      <div className="text-muted-foreground flex items-baseline gap-2 text-sm">
        <NumberRoll
          value={tokens}
          locales="en-US"
          format={{ notation: "compact", maximumFractionDigits: 1 }}
          className="text-foreground text-3xl font-semibold"
        />
        tokens
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          aria-label={running ? "Pause" : "Play"}
          onClick={() => setRunning((r) => !r)}
        >
          {running ? <PauseIcon /> : <PlayIcon />}
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            setRunning(false);
            setTokens(0);
          }}
        >
          Reset
        </Button>
      </div>
    </SampleFrame>
  );
}
