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
/* What the block offers: its templates, and the settings of a picture        */
/* -------------------------------------------------------------------------- */

export type Template = (typeof data.templates)[number];

/** The model a visit starts on, as `provider/id`; the route knows only this provider. */
export const PROVIDER = "openai";
export const MODEL = `${PROVIDER}/${data.model}`;
export const TEMPLATES: readonly Template[] = data.templates;

/** Where a template's tile picture is served from. */
export const tileSrc = (id: string) => `/blocks/images/${id}.webp`;

export type Choice = {
  value: string;
  label: string;
  note?: string;
  /** The outline drawn beside an orientation. */
  shape?: string;
};

export type SettingKey =
  | "orientation"
  | "size"
  | "quality"
  | "complexity"
  | "count"
  | "format"
  | "background"
  | "moderation"
  | "partials";

export type Setting = {
  key: SettingKey;
  label: string;
  choices: readonly Choice[];
};

export type Settings = Record<SettingKey, string>;

export const ORIENTATIONS: readonly Choice[] = [
  { value: "auto", label: "Auto", shape: "1 / 1" },
  { value: "1:1", label: "Square", note: "1:1", shape: "1 / 1" },
  { value: "2:3", label: "Portrait", note: "2:3", shape: "2 / 3" },
  { value: "3:2", label: "Landscape", note: "3:2", shape: "3 / 2" },
  { value: "16:9", label: "Wide", note: "16:9", shape: "16 / 9" },
  { value: "9:16", label: "Tall", note: "9:16", shape: "9 / 16" },
];

/* What the plus menu sets, in its order. */
export const SETTINGS: readonly Setting[] = [
  { key: "orientation", label: "Orientation", choices: ORIENTATIONS },
  {
    key: "size",
    label: "Size",
    choices: [
      { value: "standard", label: "Standard", note: "Up to 1536 px" },
      { value: "large", label: "Large", note: "Up to 2560 px" },
    ],
  },
  {
    key: "quality",
    label: "Quality",
    choices: [
      { value: "low", label: "Low", note: "Fastest" },
      { value: "medium", label: "Medium", note: "Balanced" },
      { value: "high", label: "High", note: "Most detail" },
    ],
  },
  {
    key: "complexity",
    label: "Complexity",
    choices: [
      { value: "auto", label: "Auto" },
      { value: "low", label: "Low" },
      { value: "medium", label: "Medium" },
      { value: "high", label: "High" },
    ],
  },
  {
    key: "count",
    label: "Images",
    choices: [
      { value: "1", label: "1" },
      { value: "2", label: "2" },
      { value: "3", label: "3" },
      { value: "4", label: "4" },
    ],
  },
  {
    key: "format",
    label: "Output",
    choices: [
      { value: "webp", label: "WebP" },
      { value: "png", label: "PNG" },
      { value: "jpeg", label: "JPEG" },
    ],
  },
  {
    key: "background",
    label: "Background",
    choices: [
      { value: "auto", label: "Auto" },
      { value: "opaque", label: "Opaque" },
      { value: "transparent", label: "Transparent" },
    ],
  },
  {
    key: "moderation",
    label: "Moderation",
    choices: [
      { value: "auto", label: "Auto" },
      { value: "low", label: "Low", note: "Less strict" },
    ],
  },
  {
    key: "partials",
    label: "Partial images",
    choices: [
      { value: "0", label: "Off" },
      { value: "1", label: "1" },
      { value: "2", label: "2" },
      { value: "3", label: "3" },
    ],
  },
];

export const DEFAULTS: Settings = {
  orientation: "auto",
  size: "standard",
  quality: "medium",
  complexity: "auto",
  count: "1",
  format: "webp",
  background: "auto",
  moderation: "auto",
  partials: "0",
};

export const shapeOf = (orientation: string) =>
  ORIENTATIONS.find((entry) => entry.value === orientation)?.shape ?? "1 / 1";

/* -------------------------------------------------------------------------- */
/* The choices the next picture is made with                                  */
/* -------------------------------------------------------------------------- */

type Options = {
  model: string;
  setModel: (model: string) => void;
  settings: Settings;
  setSetting: (key: SettingKey, value: string) => void;
  resetSettings: () => void;
  /** What rides along with a request as its run config, for the route to read. */
  runConfig: { custom: Settings & { model: string } };
  /** The message box, which a chosen prompt hands the focus to. */
  inputRef: RefObject<HTMLTextAreaElement | null>;
};

const OptionsContext = createContext<Options | null>(null);

export function OptionsProvider({ children }: { children: ReactNode }) {
  const [model, setModel] = useState(MODEL);
  const [settings, setSettings] = useState(DEFAULTS);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const options = useMemo<Options>(
    () => ({
      model,
      setModel,
      settings,
      setSetting: (key, value) =>
        setSettings((previous) => {
          const next = { ...previous, [key]: value };
          // A JPEG has no transparency to keep.
          if (next.format === "jpeg" && next.background === "transparent")
            next.background = "auto";
          return next;
        }),
      resetSettings: () => setSettings(DEFAULTS),
      runConfig: { custom: { ...settings, model } },
      inputRef,
    }),
    [model, settings],
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
