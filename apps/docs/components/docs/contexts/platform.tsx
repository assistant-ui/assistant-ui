"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";

export const PLATFORMS = ["react", "rn", "ink"] as const;
export type Platform = (typeof PLATFORMS)[number];

export const PLATFORM_LABELS: Record<Platform, string> = {
  react: "React",
  rn: "React Native",
  ink: "React Ink",
};

const STORAGE_KEY = "assistant-ui::docs:platform";
const URL_PARAM = "platform";
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

export function usePlatformOrDefault(): Platform {
  return useContext(PlatformContext)?.platform ?? DEFAULT_PLATFORM;
}

function isPlatform(value: string | null): value is Platform {
  return value !== null && (PLATFORMS as readonly string[]).includes(value);
}

const isBrowser = () => typeof window !== "undefined";

// Avoid useSearchParams so the docs layout isn't opted out of static rendering.
function readUrlPlatform(): Platform | null {
  if (!isBrowser()) return null;
  try {
    const value = new URLSearchParams(window.location.search).get(URL_PARAM);
    return isPlatform(value) ? value : null;
  } catch {
    return null;
  }
}

// replaceState (not router.replace) so URL fixups don't pollute back/forward
// history and Next.js doesn't treat the param change as a refetch trigger.
function writeUrlPlatform(next: Platform): void {
  if (!isBrowser()) return;
  try {
    const url = new URL(window.location.href);
    if (next === DEFAULT_PLATFORM) {
      if (!url.searchParams.has(URL_PARAM)) return;
      url.searchParams.delete(URL_PARAM);
    } else {
      if (url.searchParams.get(URL_PARAM) === next) return;
      url.searchParams.set(URL_PARAM, next);
    }
    window.history.replaceState(window.history.state, "", url.toString());
  } catch {}
}

function syncUrlAndStore(): void {
  if (!isBrowser()) return;
  const fromUrl = readUrlPlatform();
  if (fromUrl) {
    if (fromUrl !== platformStore.getSnapshot()) {
      platformStore.setValue(fromUrl);
    }
    if (fromUrl === DEFAULT_PLATFORM) {
      writeUrlPlatform(DEFAULT_PLATFORM);
    }
    return;
  }
  writeUrlPlatform(platformStore.getSnapshot());
}

// SSR-safe localStorage backing for useSyncExternalStore, with cross-tab sync
// via the storage event.
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
    } catch {}
  };
}

const platformStore = new PlatformStore();

export function PlatformProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  const platform = useSyncExternalStore(
    platformStore.subscribe,
    platformStore.getSnapshot,
    platformStore.getServerSnapshot,
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: pathname is the only intended trigger
  useEffect(() => {
    syncUrlAndStore();
  }, [pathname]);

  // popstate covers search-only changes (back/forward to a different
  // ?platform=) which usePathname doesn't fire for.
  useEffect(() => {
    window.addEventListener("popstate", syncUrlAndStore);
    return () => {
      window.removeEventListener("popstate", syncUrlAndStore);
    };
  }, []);

  const setPlatform = useCallback((next: Platform) => {
    platformStore.setValue(next);
    writeUrlPlatform(next);
  }, []);

  return (
    <PlatformContext.Provider value={{ platform, setPlatform }}>
      {children}
    </PlatformContext.Provider>
  );
}

export function isVisibleForPlatform(
  platforms: readonly string[] | undefined,
  active: Platform,
): boolean {
  if (!platforms || platforms.length === 0) return true;
  return platforms.includes(active);
}
