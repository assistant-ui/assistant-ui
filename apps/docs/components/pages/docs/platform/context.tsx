"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import type * as PageTree from "fumadocs-core/page-tree";
import {
  DEFAULT_PLATFORM,
  PLATFORM_LABELS,
  PLATFORMS,
  SURFACES,
  type Platform,
  type Surface,
} from "@/lib/constants";
import {
  DOCS_PLATFORM_STORAGE_KEY,
  DOCS_PLATFORM_URL_PARAM,
  isPlatform,
  isSurface,
  isVisibleForPlatform,
  MIRRORED_SURFACE_ROOTS,
  PLATFORM_ENTRY_PATHS,
} from "@/lib/docs-platform";
import { getPagePlatforms } from "./tree";
import {
  createPersistedPreference,
  usePersistedPreference,
} from "@/lib/persisted-preference";

export {
  DEFAULT_PLATFORM,
  isPlatform,
  isSurface,
  isVisibleForPlatform,
  PLATFORM_ENTRY_PATHS,
  PLATFORM_LABELS,
  PLATFORMS,
  SURFACES,
  type Platform,
  type Surface,
};

const STORAGE_KEY = DOCS_PLATFORM_STORAGE_KEY;
const URL_PARAM = DOCS_PLATFORM_URL_PARAM;

// Only a surface is remembered: a library such as Tap is entered through its
// own pages, and the reader's surface must survive the visit.
const platformPreference = createPersistedPreference<Surface>({
  key: STORAGE_KEY,
  fallback: DEFAULT_PLATFORM,
  read: (raw) => (isSurface(raw) ? raw : null),
  url: {
    param: URL_PARAM,
    read: (raw) => (isSurface(raw) ? raw : null),
    write: (value) => (value === DEFAULT_PLATFORM ? null : value),
  },
});

const hintScript = (forced: Platform | null) => {
  const value = forced
    ? JSON.stringify(forced)
    : `new URLSearchParams(location.search).get(${JSON.stringify(URL_PARAM)})||localStorage.getItem(${JSON.stringify(STORAGE_KEY)})`;
  return `(()=>{try{var p=${value};if(p&&${JSON.stringify([...PLATFORMS])}.indexOf(p)>=0)document.documentElement.dataset.docsPlatformHint=p}catch(e){}})()`;
};

// Avoid useSearchParams so the docs layout stays statically renderable.
function readPlatformParam(): Surface | null {
  if (typeof window === "undefined") return null;
  try {
    const value = new URLSearchParams(window.location.search).get(URL_PARAM);
    return value !== null && isSurface(value) ? value : null;
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

export function useSurfaceOrDefault(): Surface {
  const platform = usePlatformOrDefault();
  return isSurface(platform) ? platform : DEFAULT_PLATFORM;
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

export function getPlatformSwitchHref(
  pathname: string,
  nextPlatform: Platform,
): string | null {
  if (PLATFORMS.some((p) => PLATFORM_ENTRY_PATHS[p] === pathname)) {
    return PLATFORM_ENTRY_PATHS[nextPlatform];
  }

  const nextRoot = isSurface(nextPlatform)
    ? MIRRORED_SURFACE_ROOTS[nextPlatform]
    : undefined;
  if (!nextRoot) return null;

  for (const root of Object.values(MIRRORED_SURFACE_ROOTS)) {
    if (pathname.startsWith(`${root}/`)) {
      return `${nextRoot}${pathname.slice(root.length)}`;
    }
  }
  return null;
}

// A page that belongs to one platform selects it, on the server as well as
// the client, so the first paint already shows that platform's tree; the
// stored surface only decides pages every surface shares. The inline script
// stamps the platform this browser will hydrate to before the sidebar is
// parsed, so a mismatched tree is hidden rather than painted.
export function PlatformProvider({
  tree,
  children,
}: {
  tree: PageTree.Root;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const stored = usePersistedPreference(platformPreference);
  const pagePlatforms = useMemo(
    () => getPagePlatforms(tree, pathname),
    [tree, pathname],
  );
  const platform = useMemo(() => {
    if (!pagePlatforms || pagePlatforms.includes(stored)) return stored;
    return pagePlatforms.find(isPlatform) ?? stored;
  }, [pagePlatforms, stored]);

  useEffect(() => {
    syncPlatformFromUrl();
  }, [pathname]);

  useEffect(() => {
    if (platform !== stored && isSurface(platform)) {
      platformPreference.set(platform);
    }
  }, [platform, stored]);

  useEffect(() => {
    document.documentElement.dataset.docsPlatformHint = platform;
  }, [platform]);

  useEffect(() => {
    window.addEventListener("popstate", syncPlatformFromUrl);
    return () => {
      window.removeEventListener("popstate", syncPlatformFromUrl);
    };
  }, []);

  const setPlatform = useCallback((next: Platform) => {
    if (isSurface(next)) platformPreference.set(next);
  }, []);

  return (
    <PlatformContext.Provider value={{ platform, setPlatform }}>
      <script
        dangerouslySetInnerHTML={{
          __html: hintScript(pagePlatforms ? platform : null),
        }}
      />
      {children}
    </PlatformContext.Provider>
  );
}
