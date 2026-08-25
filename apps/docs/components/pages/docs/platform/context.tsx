"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import {
  DEFAULT_PLATFORM,
  PLATFORM_LABELS,
  PLATFORMS,
  type Platform,
} from "@/lib/constants";
import {
  createPersistedPreference,
  usePersistedPreference,
} from "@/lib/persisted-preference";

export { DEFAULT_PLATFORM, PLATFORM_LABELS, PLATFORMS, type Platform };

export const PLATFORM_DOC_BASE_PATHS: Record<Platform, string> = {
  react: "/docs",
  rn: "/docs/react-native",
  ink: "/docs/ink",
};

const STORAGE_KEY = "assistant-ui::docs:platform";
const URL_PARAM = "platform";

export function isPlatform(
  value: string | null | undefined,
): value is Platform {
  return value != null && (PLATFORMS as readonly string[]).includes(value);
}

const platformPreference = createPersistedPreference<Platform>({
  key: STORAGE_KEY,
  fallback: DEFAULT_PLATFORM,
  read: (raw) => (isPlatform(raw) ? raw : null),
  url: {
    param: URL_PARAM,
    read: (raw) => (isPlatform(raw) ? raw : null),
    write: (value) => (value === DEFAULT_PLATFORM ? null : value),
  },
});

// Avoid useSearchParams so the docs layout stays statically renderable.
function readPlatformParam(): Platform | null {
  if (typeof window === "undefined") return null;
  try {
    const value = new URLSearchParams(window.location.search).get(URL_PARAM);
    return isPlatform(value) ? value : null;
  } catch {
    return null;
  }
}

// Landing on a ?platform= url is an entry point the reader should keep for the
// rest of the visit, so the parameter is promoted into storage instead of only
// being read while it stays in the address bar.
export function syncPlatformFromUrl() {
  platformPreference.resync();
  const fromUrl = readPlatformParam();
  if (fromUrl !== null) platformPreference.set(fromUrl);
}

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

export function PlatformProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const platform = usePersistedPreference(platformPreference);

  useEffect(() => {
    syncPlatformFromUrl();
  }, [pathname]);

  useEffect(() => {
    window.addEventListener("popstate", syncPlatformFromUrl);
    return () => {
      window.removeEventListener("popstate", syncPlatformFromUrl);
    };
  }, []);

  const setPlatform = useCallback((next: Platform) => {
    platformPreference.set(next);
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
