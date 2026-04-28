"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export const PLATFORMS = ["react", "rn", "ink"] as const;
export type Platform = (typeof PLATFORMS)[number];

export const PLATFORM_LABELS: Record<Platform, string> = {
  react: "React",
  rn: "React Native",
  ink: "React Ink",
};

const STORAGE_KEY = "aui-docs-platform";
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

function isPlatform(value: string | null): value is Platform {
  return value !== null && (PLATFORMS as readonly string[]).includes(value);
}

export function PlatformProvider({ children }: { children: ReactNode }) {
  const [platform, setPlatformState] = useState<Platform>(DEFAULT_PLATFORM);

  // Hydrate from localStorage after mount to keep SSR markup deterministic.
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (isPlatform(stored)) setPlatformState(stored);
    } catch {
      // ignore (private mode, blocked storage)
    }
  }, []);

  const setPlatform = useCallback((next: Platform) => {
    setPlatformState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore
    }
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
