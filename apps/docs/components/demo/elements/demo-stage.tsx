"use client";

import { createContext, useCallback, useMemo, useState } from "react";
import { PauseIcon, RotateCcwIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ghostButton,
  iconSwap,
  iconSwapIn,
  iconSwapOut,
} from "@/components/assistant-ui/elements/surfaces";

export interface DemoStageControls {
  stopped: boolean;
  setPlaying: (playing: boolean) => void;
}

export const DemoStageContext = createContext<DemoStageControls | null>(null);

export function DemoStage({
  replay = true,
  children,
}: {
  replay?: boolean;
  children: React.ReactNode;
}) {
  const [epoch, setEpoch] = useState(0);
  const [stopped, setStopped] = useState(false);
  const [playing, setPlaying] = useState(true);

  const report = useCallback((next: boolean) => setPlaying(next), []);
  const controls = useMemo(
    () => ({ stopped, setPlaying: report }),
    [stopped, report],
  );

  if (!replay) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        {children}
      </div>
    );
  }

  const showPause = playing && !stopped;

  return (
    <div className="relative flex h-full w-full items-center justify-center">
      <DemoStageContext.Provider value={controls}>
        <div
          key={epoch}
          className="flex h-full w-full items-center justify-center"
        >
          {children}
        </div>
      </DemoStageContext.Provider>
      <button
        type="button"
        aria-label={showPause ? "Pause animation" : "Replay animation"}
        onClick={() => {
          if (showPause) {
            setStopped(true);
          } else {
            setEpoch((e) => e + 1);
            setStopped(false);
            setPlaying(true);
          }
        }}
        className={cn(
          ghostButton,
          "absolute -end-2 -top-2 grid size-7 place-items-center md:-end-3 md:-top-3",
        )}
      >
        <PauseIcon
          className={cn(
            iconSwap,
            "size-3.5",
            showPause ? iconSwapIn : iconSwapOut,
          )}
        />
        <RotateCcwIcon
          className={cn(
            iconSwap,
            "size-3.5",
            showPause ? iconSwapOut : iconSwapIn,
          )}
        />
      </button>
    </div>
  );
}
