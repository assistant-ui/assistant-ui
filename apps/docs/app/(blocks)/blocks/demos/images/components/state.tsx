"use client";

import {
  createContext,
  useContext,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
  type RefObject,
} from "react";
import data from "../data.json";

/* -------------------------------------------------------------------------- */
/* What the block offers: its templates, sizes and levels of detail           */
/* -------------------------------------------------------------------------- */

export type Template = (typeof data.templates)[number];

export const MODEL = data.model;
export const TEMPLATES: readonly Template[] = data.templates;
export const TRENDING = data.trending;

/** Where a template's tile picture is served from. */
export const tileSrc = (id: string) => `/blocks/images/${id}.webp`;

export const RATIOS = [
  { value: "auto", label: "Auto", shape: "1 / 1" },
  { value: "1:1", label: "1:1", shape: "1 / 1" },
  { value: "2:3", label: "2:3", shape: "2 / 3" },
  { value: "3:2", label: "3:2", shape: "3 / 2" },
  { value: "16:9", label: "16:9", shape: "16 / 9" },
  { value: "9:16", label: "9:16", shape: "9 / 16" },
] as const;

export const QUALITIES = [
  { value: "low", label: "Low", note: "Fastest" },
  { value: "medium", label: "Medium", note: "Balanced" },
  { value: "high", label: "High", note: "Most detail" },
] as const;

export const shapeOf = (ratio: string) =>
  RATIOS.find((entry) => entry.value === ratio)?.shape ?? "1 / 1";

/* -------------------------------------------------------------------------- */
/* The choices the next picture is made with                                  */
/* -------------------------------------------------------------------------- */

type Options = {
  ratio: string;
  setRatio: (ratio: string) => void;
  quality: string;
  setQuality: (quality: string) => void;
  /** The message box, which a chosen prompt hands the focus to. */
  inputRef: RefObject<HTMLTextAreaElement | null>;
};

const OptionsContext = createContext<Options | null>(null);

export function OptionsProvider({ children }: { children: ReactNode }) {
  const [ratio, setRatio] = useState<string>("auto");
  const [quality, setQuality] = useState<string>("medium");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const options = useMemo<Options>(
    () => ({
      ratio,
      setRatio,
      quality,
      setQuality,
      inputRef,
    }),
    [ratio, quality],
  );

  return (
    <OptionsContext.Provider value={options}>
      {children}
    </OptionsContext.Provider>
  );
}

export function useOptions() {
  const options = useContext(OptionsContext);
  if (!options)
    throw new Error("useOptions must be used within <OptionsProvider>.");
  return options;
}

/* -------------------------------------------------------------------------- */
/* The pictures made on this visit, across every chat. Nothing is saved.      */
/* -------------------------------------------------------------------------- */

export type Made = {
  /** The id of the reply the picture came in. */
  id: string;
  src: string;
  prompt: string;
  /** The image tokens the model reported for it. */
  tokens: number;
};

let made: readonly Made[] = [];
const listeners = new Set<() => void>();

const emit = () => {
  for (const listener of listeners) listener();
};

export function addMade(entry: Made) {
  if (made.some((item) => item.id === entry.id)) return;
  made = [entry, ...made];
  emit();
}

export function clearMade() {
  made = [];
  emit();
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const none: readonly Made[] = [];

export function useMade() {
  return useSyncExternalStore(
    subscribe,
    () => made,
    () => none,
  );
}
