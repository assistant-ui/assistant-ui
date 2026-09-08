"use client";

import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { DemoStageContext } from "@/components/demo/elements/demo-stage";

/** Cycles 0..length-1 on a fixed interval. Pass a stable length. */
export function useCycle(length: number, ms: number): number {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % length), ms);
    return () => clearInterval(id);
  }, [length, ms]);
  return index;
}

/**
 * Steps through phases with per-phase durations in ms, looping forever.
 * Pass a module-level constant so the array identity is stable.
 */
export function usePhases(durations: readonly number[]): number {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    let index = 0;
    let id: ReturnType<typeof setTimeout>;
    const next = () => {
      id = setTimeout(() => {
        index = (index + 1) % durations.length;
        setPhase(index);
        next();
      }, durations[index]);
    };
    next();
    return () => clearTimeout(id);
  }, [durations]);
  return phase;
}

export interface StoryPhases {
  phase: number;
  running: boolean;
  takeOver: () => void;
  replay: () => void;
}

/**
 * Play-once phases for animated demos: advances through the phases a single
 * time and stops on the final one, which is the resting state. The user can
 * stop the script early (`takeOver`); `replay` restarts it from the top.
 * Demos are replayed wholesale by remounting, so `replay` mostly serves
 * in-component takeover flows.
 */
export function useStoryPhases(durations: readonly number[]): StoryPhases {
  const stage = useContext(DemoStageContext);
  const [phase, setPhase] = useState(0);
  const [isRunning, setRunning] = useState(true);
  const [epoch, setEpoch] = useState(0);
  const running = isRunning && durations.length > 1;

  const [syncedStopped, setSyncedStopped] = useState<{
    stopped: boolean | undefined;
  } | null>(null);

  if (syncedStopped?.stopped !== stage?.stopped) {
    setSyncedStopped({ stopped: stage?.stopped });
    if (stage?.stopped) setRunning(false);
  }

  useEffect(() => {
    stage?.setPlaying(running);
  }, [stage, running]);

  const [syncedRun, setSyncedRun] = useState({ running, epoch });

  if (syncedRun.running !== running || syncedRun.epoch !== epoch) {
    setSyncedRun({ running, epoch });
    if (running) setPhase(0);
  }

  useEffect(() => {
    if (!running) return;
    let index = 0;
    let id: ReturnType<typeof setTimeout>;
    const next = () => {
      id = setTimeout(() => {
        index += 1;
        setPhase(index);
        if (index >= durations.length - 1) {
          setRunning(false);
          return;
        }
        next();
      }, durations[index]);
    };
    next();
    return () => clearTimeout(id);
  }, [durations, running, epoch]);

  const takeOver = useCallback(() => setRunning(false), []);
  const replay = useCallback(() => {
    setRunning(true);
    setEpoch((e) => e + 1);
  }, []);

  return { phase, running, takeOver, replay };
}

/** Elapsed tenths of a second while `running`, reset on each rising edge. */
export function useElapsed(running: boolean): number {
  const [tenths, setTenths] = useState(0);
  const [syncedRunning, setSyncedRunning] = useState(running);

  if (syncedRunning !== running) {
    setSyncedRunning(running);
    if (running) setTenths(0);
  }

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setTenths((t) => t + 1), 100);
    return () => clearInterval(id);
  }, [running]);
  return tenths;
}

export interface WordStream {
  words: string[];
  /** Number of words currently revealed. */
  count: number;
  streaming: boolean;
}

/**
 * Reveals `text` word by word and stops when finished (replay happens by
 * remounting the demo). Word delays are jittered deterministically so the
 * rhythm reads as generation rather than a metronome.
 */
export function useWordStream(
  text: string,
  {
    interval = 70,
    startDelay = 600,
  }: { interval?: number; startDelay?: number } = {},
): WordStream {
  const stage = useContext(DemoStageContext);
  const stopped = stage?.stopped ?? false;
  const words = useMemo(() => text.split(" "), [text]);
  const [count, setCount] = useState(0);
  const countRef = useRef(0);

  useEffect(() => {
    stage?.setPlaying(!stopped && count < words.length);
  }, [stage, stopped, count, words.length]);

  useEffect(() => {
    if (stopped) return;
    let id: ReturnType<typeof setTimeout>;
    const tick = () => {
      const current = countRef.current;
      if (current >= words.length) {
        return;
      }
      const jitter = ((current * 7919) % 5) / 4;
      id = setTimeout(
        () => {
          countRef.current = current + 1;
          setCount(current + 1);
          tick();
        },
        interval * (0.6 + jitter),
      );
    };
    id = setTimeout(tick, startDelay);
    return () => clearTimeout(id);
  }, [words, interval, startDelay, stopped]);

  return { words, count, streaming: !stopped && count < words.length };
}

/** Types `text` character by character, clears, and restarts. */
export function useTypedText(
  text: string,
  {
    interval = 38,
    holdDelay = 1800,
    startDelay = 800,
  }: { interval?: number; holdDelay?: number; startDelay?: number } = {},
): { typed: string; done: boolean } {
  const [length, setLength] = useState(0);
  const lengthRef = useRef(0);

  useEffect(() => {
    let id: ReturnType<typeof setTimeout>;
    const tick = () => {
      const current = lengthRef.current;
      if (current >= text.length) {
        id = setTimeout(() => {
          lengthRef.current = 0;
          setLength(0);
          id = setTimeout(tick, startDelay);
        }, holdDelay);
        return;
      }
      id = setTimeout(() => {
        lengthRef.current = current + 1;
        setLength(current + 1);
        tick();
      }, interval);
    };
    id = setTimeout(tick, startDelay);
    return () => clearTimeout(id);
  }, [text, interval, holdDelay, startDelay]);

  return { typed: text.slice(0, length), done: length >= text.length };
}

export function formatSeconds(tenths: number): string {
  return `${Math.floor(tenths / 10)}s`;
}
