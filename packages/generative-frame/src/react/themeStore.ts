import {
  DEFAULT_LIGHT_TOKENS,
  readThemeTokens,
  type ThemeTokenSources,
  type ThemeTokens,
} from "../theme";

export type ThemeObserveOptions = {
  /**
   * Also re-read when `<body>`'s `style` attribute changes. Off by default,
   * because scroll-lock and dialog libraries rewrite it constantly; turn it on
   * when the app sets theme variables through body styles.
   */
  observeBodyStyle?: boolean;
};

const THEME_ATTRIBUTES = ["class", "data-theme", "data-mode"];

const sameTokens = (a: ThemeTokens, b: ThemeTokens) =>
  a.colorScheme === b.colorScheme &&
  JSON.stringify(a.variables) === JSON.stringify(b.variables);

/** Runs `callback` on the next animation frame and returns a cancel function. */
const nextFrame = (callback: () => void): (() => void) => {
  if (typeof requestAnimationFrame === "function") {
    const id = requestAnimationFrame(callback);
    return () => cancelAnimationFrame(id);
  }
  const id = setTimeout(callback, 16);
  return () => clearTimeout(id);
};

type Entry = {
  tokens: ThemeTokens | undefined;
  /** Snapshot read while nobody subscribes; valid for the current task. */
  fresh: boolean;
  listeners: Set<() => void>;
  stop: (() => void) | undefined;
};

/**
 * One reader per (element, sources, options): every subscriber shares one
 * MutationObserver and one media listener, and a burst of mutations costs one
 * `readThemeTokens` per animation frame.
 */
export function createThemeTokenStore(
  target: Element,
  sources: ThemeTokenSources,
  options: ThemeObserveOptions,
) {
  const entry: Entry = {
    tokens: undefined,
    fresh: false,
    listeners: new Set(),
    stop: undefined,
  };

  const read = () => {
    const next = readThemeTokens(target, sources);
    if (entry.tokens && sameTokens(entry.tokens, next)) return false;
    entry.tokens = next;
    return true;
  };

  const start = () => {
    let cancelFrame: (() => void) | undefined;
    const update = () => {
      cancelFrame = undefined;
      if (read()) for (const listener of entry.listeners) listener();
    };
    const schedule = () => {
      cancelFrame ??= nextFrame(update);
    };
    const doc = target.ownerDocument;
    const observer = new MutationObserver(schedule);
    observer.observe(doc.documentElement, {
      attributes: true,
      attributeFilter: [...THEME_ATTRIBUTES, "style"],
    });
    if (doc.body) {
      observer.observe(doc.body, {
        attributes: true,
        attributeFilter: options.observeBodyStyle
          ? [...THEME_ATTRIBUTES, "style"]
          : THEME_ATTRIBUTES,
      });
    }
    if (target !== doc.documentElement && target !== doc.body) {
      observer.observe(target, {
        attributes: true,
        attributeFilter: [...THEME_ATTRIBUTES, "style"],
      });
    }
    const media = doc.defaultView?.matchMedia?.("(prefers-color-scheme: dark)");
    media?.addEventListener("change", schedule);
    // Anything that changed between the last read and now.
    schedule();
    return () => {
      observer.disconnect();
      media?.removeEventListener("change", schedule);
      cancelFrame?.();
    };
  };

  return {
    subscribe(listener: () => void) {
      entry.listeners.add(listener);
      entry.stop ??= start();
      return () => {
        entry.listeners.delete(listener);
        if (entry.listeners.size === 0) {
          entry.stop?.();
          entry.stop = undefined;
          entry.fresh = false;
        }
      };
    },
    getSnapshot(): ThemeTokens {
      if (entry.stop && entry.tokens) return entry.tokens;
      if (!entry.fresh) {
        read();
        entry.fresh = true;
        queueMicrotask(() => {
          entry.fresh = false;
        });
      }
      return entry.tokens ?? DEFAULT_LIGHT_TOKENS;
    },
    get subscribers() {
      return entry.listeners.size;
    },
  };
}

export type ThemeTokenStore = ReturnType<typeof createThemeTokenStore>;

const stores = new WeakMap<Element, Map<string, ThemeTokenStore>>();

/** The shared store for this element, sources, and options. */
export function getThemeTokenStore(
  target: Element,
  sources: ThemeTokenSources = {},
  options: ThemeObserveOptions = {},
): ThemeTokenStore {
  const key = JSON.stringify([sources, options.observeBodyStyle ?? false]);
  let byKey = stores.get(target);
  if (!byKey) {
    byKey = new Map();
    stores.set(target, byKey);
  }
  let store = byKey.get(key);
  if (!store) {
    store = createThemeTokenStore(target, sources, options);
    byKey.set(key, store);
  }
  return store;
}
