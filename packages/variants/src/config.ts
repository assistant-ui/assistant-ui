import type { VariantsSelection } from "./prompt";

export type VariantsShortcut = {
  /** `KeyboardEvent.code`, so the shortcut works on every layout (Alt+V types √ on macOS). */
  code: string;
  alt?: boolean | undefined;
  ctrl?: boolean | undefined;
  meta?: boolean | undefined;
  shift?: boolean | undefined;
};

export type VariantsConfig = {
  /** Replaces the text the Copy buttons put on the clipboard. */
  prompt?: ((selection: VariantsSelection) => string) | undefined;
  /** Shortcut that focuses the switcher; `false` turns it off. Defaults to Alt+V. */
  shortcut?: VariantsShortcut | false | undefined;
};

export const DEFAULT_SHORTCUT: VariantsShortcut = { code: "KeyV", alt: true };

let config: VariantsConfig = {};
const listeners = new Set<() => void>();

/** Customizes the copied prompt and the switcher shortcut. Each call replaces the previous configuration. */
export function configureVariants(next: VariantsConfig): void {
  config = { ...next };
  for (const listener of listeners) listener();
}

export const getConfig = (): VariantsConfig => config;

export const onConfigChange = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const isApplePlatform = () =>
  typeof navigator !== "undefined" &&
  /Mac|iPhone|iPad|iPod/.test(navigator.platform);

/** The visible label, or the `aria-keyshortcuts` value when `aria` is set. */
export const shortcutLabel = (shortcut: VariantsShortcut, aria = false) => {
  const key = shortcut.code.replace(/^Key|^Digit/, "");
  if (!aria && isApplePlatform()) {
    return [
      shortcut.ctrl ? "⌃" : "",
      shortcut.alt ? "⌥" : "",
      shortcut.shift ? "⇧" : "",
      shortcut.meta ? "⌘" : "",
      key,
    ].join("");
  }
  return [
    shortcut.ctrl ? (aria ? "Control" : "Ctrl") : "",
    shortcut.meta ? (aria ? "Meta" : "Cmd") : "",
    shortcut.alt ? "Alt" : "",
    shortcut.shift ? "Shift" : "",
    key,
  ]
    .filter(Boolean)
    .join("+");
};

export const matchesShortcut = (
  event: KeyboardEvent,
  shortcut: VariantsShortcut,
) =>
  event.code === shortcut.code &&
  event.altKey === Boolean(shortcut.alt) &&
  event.ctrlKey === Boolean(shortcut.ctrl) &&
  event.metaKey === Boolean(shortcut.meta) &&
  event.shiftKey === Boolean(shortcut.shift);
