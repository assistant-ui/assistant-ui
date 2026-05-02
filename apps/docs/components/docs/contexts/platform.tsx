"use client";

import {
  createContext,
  useCallback,
  useContext,
  useSyncExternalStore,
  type ReactNode,
} from "react";

export const PLATFORMS = ["react", "rn", "ink"] as const;
export type Platform = (typeof PLATFORMS)[number];

export const PLATFORM_LABELS: Record<Platform, string> = {
  react: "React",
  rn: "React Native",
  ink: "React Ink",
};

const STORAGE_KEY = "assistant-ui::docs:platform";
const DEFAULT_PLATFORM: Platform = "react";

interface PlatformContextValue {
  platform: Platform;
  setPlatform: (p: Platform) => void;
}

const PlatformContext = createContext<PlatformContextValue | null>(null);

export function usePlatform() {
  const ctx = useContext(PlatformContext);
  if (!ctx) {
    throw new Error("usePlatform must be used within PlatformProvider");
  }
  return ctx;
}

// Non-throwing variant for shared MDX components that may render outside a provider.
export function usePlatformOrDefault(): Platform {
  return useContext(PlatformContext)?.platform ?? DEFAULT_PLATFORM;
}

function isPlatform(value: string | null): value is Platform {
  return value !== null && (PLATFORMS as readonly string[]).includes(value);
}

const isBrowser = () => typeof window !== "undefined";

/**
 * Singleton store fronting localStorage for the platform selection. Backs
 * useSyncExternalStore so SSR renders the default deterministically, the
 * client reads localStorage synchronously on hydration (no flash), and
 * setting the value broadcasts to other tabs via the standard `storage`
 * event plus same-tab listeners.
 */
class PlatformStore {
  private listeners = new Set<() => void>();

  constructor() {
    if (isBrowser()) {
      window.addEventListener("storage", this.handleStorage);
    }
  }

  private handleStorage = (e: StorageEvent) => {
    if (e.storageArea !== window.localStorage) return;
    if (e.key !== STORAGE_KEY) return;
    this.notify();
  };

  private notify = () => {
    this.listeners.forEach((l) => {
      l();
    });
  };

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = (): Platform => {
    if (!isBrowser()) return DEFAULT_PLATFORM;
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      return isPlatform(stored) ? stored : DEFAULT_PLATFORM;
    } catch {
      return DEFAULT_PLATFORM;
    }
  };

  getServerSnapshot = (): Platform => DEFAULT_PLATFORM;

  setValue = (next: Platform) => {
    if (!isBrowser()) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
      this.notify();
    } catch {
      // ignore write errors
    }
  };
}

const platformStore = new PlatformStore();

export function PlatformProvider({ children }: { children: ReactNode }) {
  const platform = useSyncExternalStore(
    platformStore.subscribe,
    platformStore.getSnapshot,
    platformStore.getServerSnapshot,
  );

  const setPlatform = useCallback((next: Platform) => {
    platformStore.setValue(next);
  }, []);

  return (
    <PlatformContext.Provider value={{ platform, setPlatform }}>
      {children}
    </PlatformContext.Provider>
  );
}

/**
 * Returns true when an entry with optional `platforms` allowlist is visible
 * for the given platform. No allowlist (undefined or empty) means universal.
 */
export function isVisibleForPlatform(
  platforms: readonly string[] | undefined,
  active: Platform,
): boolean {
  if (!platforms || platforms.length === 0) return true;
  return platforms.includes(active);
}
