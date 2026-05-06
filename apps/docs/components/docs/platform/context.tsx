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

export const PLATFORM_DOC_BASE_PATHS: Record<Platform, string> = {
  react: "/docs",
  rn: "/docs/react-native",
  ink: "/docs/ink",
};

const STORAGE_KEY = "assistant-ui::docs:platform";
const URL_PARAM = "platform";
const DEFAULT_PLATFORM: Platform = "react";

interface PlatformContextValue {
  platform: Platform;
  setPlatform: (p: Platform) => void;
}

const PlatformContext = createContext<PlatformContextValue | null>(null);
const PlatformScopeContext = createContext<Platform | null>(null);

export function usePlatform() {
  const ctx = useContext(PlatformContext);
  if (!ctx) {
    throw new Error("usePlatform must be used within PlatformProvider");
  }
  return ctx;
}

export function usePlatformOrDefault(): Platform {
  const scopedPlatform = useContext(PlatformScopeContext);
  const globalPlatform = useContext(PlatformContext)?.platform;
  return scopedPlatform ?? globalPlatform ?? DEFAULT_PLATFORM;
}

export function PlatformScope({
  children,
  platform,
}: {
  children: ReactNode;
  platform: Platform;
}) {
  return (
    <PlatformScopeContext.Provider value={platform}>
      {children}
    </PlatformScopeContext.Provider>
  );
}

export function isPlatform(
  value: string | null | undefined,
): value is Platform {
  return value != null && (PLATFORMS as readonly string[]).includes(value);
}

const isBrowser = () => typeof window !== "undefined";

// Avoid useSearchParams so the docs layout stays statically renderable.
function readUrlPlatform(): Platform | null {
  if (!isBrowser()) return null;
  try {
    const value = new URLSearchParams(window.location.search).get(URL_PARAM);
    return isPlatform(value) ? value : null;
  } catch {
    return null;
  }
}

function readStoredPlatform(): Platform | null {
  if (!isBrowser()) return null;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return isPlatform(stored) ? stored : null;
  } catch {
    return null;
  }
}

// replaceState keeps platform selection shareable without adding noisy
// back/forward entries for every dropdown change.
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

function platformDocPathSuffix(
  pathname: string,
  platform: Extract<Platform, "rn" | "ink">,
): string | null {
  const basePath = PLATFORM_DOC_BASE_PATHS[platform];
  if (pathname === basePath) return "";
  if (!pathname.startsWith(`${basePath}/`)) return null;

  return pathname.slice(basePath.length);
}

export function getPlatformSwitchHref(
  pathname: string,
  nextPlatform: Platform,
): string | null {
  const currentPlatformSuffix =
    platformDocPathSuffix(pathname, "rn") ??
    platformDocPathSuffix(pathname, "ink");

  if (currentPlatformSuffix === null) {
    if (
      pathname === PLATFORM_DOC_BASE_PATHS.react &&
      nextPlatform !== "react"
    ) {
      return PLATFORM_DOC_BASE_PATHS[nextPlatform];
    }
    return null;
  }

  if (nextPlatform === "react") return PLATFORM_DOC_BASE_PATHS.react;

  return `${PLATFORM_DOC_BASE_PATHS[nextPlatform]}${currentPlatformSuffix}`;
}

// SSR-safe localStorage backing for useSyncExternalStore, with cross-tab sync
// via the storage event.
class PlatformStore {
  private listeners = new Set<() => void>();
  private urlPlatform: Platform | null = readUrlPlatform();
  private storedPlatform: Platform | null = readStoredPlatform();

  constructor() {
    if (isBrowser()) {
      window.addEventListener("storage", this.handleStorage);
    }
  }

  private refreshFromBrowser = () => {
    this.urlPlatform = readUrlPlatform();
    this.storedPlatform = readStoredPlatform();
  };

  private handleStorage = (e: StorageEvent) => {
    if (e.storageArea !== window.localStorage) return;
    if (e.key !== STORAGE_KEY) return;
    this.storedPlatform = readStoredPlatform();
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
    return this.urlPlatform ?? this.storedPlatform ?? DEFAULT_PLATFORM;
  };

  getServerSnapshot = (): Platform => DEFAULT_PLATFORM;

  setValue = (next: Platform) => {
    if (!isBrowser()) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
      this.storedPlatform = next;
    } catch {}
    writeUrlPlatform(next);
    this.urlPlatform = next === DEFAULT_PLATFORM ? null : next;
    this.notify();
  };

  syncUrlAndStore = () => {
    this.refreshFromBrowser();
    const next = this.getSnapshot();
    if (next === this.storedPlatform) return;
    this.setValue(next);
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

  // biome-ignore lint/correctness/useExhaustiveDependencies: pathname is the route-change trigger
  useEffect(() => {
    platformStore.syncUrlAndStore();
  }, [pathname]);

  useEffect(() => {
    window.addEventListener("popstate", platformStore.syncUrlAndStore);
    return () => {
      window.removeEventListener("popstate", platformStore.syncUrlAndStore);
    };
  }, []);

  const setPlatform = useCallback((next: Platform) => {
    platformStore.setValue(next);
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
