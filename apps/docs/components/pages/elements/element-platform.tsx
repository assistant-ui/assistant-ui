"use client";

import { useTheme } from "next-themes";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { useHydrated } from "@/hooks/use-hydrated";
import { DOCS_PLATFORM_STORAGE_KEY } from "@/lib/docs-platform";
import { cn } from "@/lib/utils";
import { NATIVE_SHOWCASE_URL } from "./native-elements";

export type ElementPlatform = "react" | "rn";

const STORAGE_KEY = "aui-element-platform";

const subscribeToNothing = () => () => {};

const asPlatform = (value: string | null): ElementPlatform | null =>
  value === "react" || value === "rn" ? value : null;

const readStoredPlatform = (): ElementPlatform | null => {
  try {
    const fromUrl = new URL(window.location.href).searchParams.get("platform");
    return (
      asPlatform(fromUrl) ??
      asPlatform(window.localStorage.getItem(STORAGE_KEY)) ??
      asPlatform(window.localStorage.getItem(DOCS_PLATFORM_STORAGE_KEY))
    );
  } catch {
    return null;
  }
};

const noStoredPlatform = () => null;

// Runs while the document is still parsing; it reads its inputs from the
// script element's own data attributes so no code is built from values.
const HINT_SCRIPT =
  '(()=>{try{var d=document.currentScript.dataset;var q=new URLSearchParams(location.search).get("platform");var v=localStorage.getItem(d.key);var w=localStorage.getItem(d.docsKey);var p=q==="rn"||q==="react"?q:v==="rn"||v==="react"?v:w==="rn"||w==="react"?w:null;if(p)document.documentElement.dataset.elementPlatformHint=p}catch(e){}})()';

const HINT_STYLE =
  'html[data-element-platform-hint="rn"] [data-slot="react-lane"],html[data-element-platform-hint="rn"] [data-slot="runtime-mode"]{display:none}html[data-element-platform-hint="rn"] [data-slot="native-lane"],html[data-element-platform-hint="rn"] [data-slot="standalone-mode"]{display:block}';

const ElementPlatformContext = createContext<{
  platform: ElementPlatform;
  setPlatform: (platform: ElementPlatform) => void;
} | null>(null);

export function ElementPlatformProvider({
  native,
  children,
}: {
  native: boolean;
  children: ReactNode;
}) {
  const storedPlatform = useSyncExternalStore(
    subscribeToNothing,
    readStoredPlatform,
    noStoredPlatform,
  );
  const [chosenPlatform, setChosenPlatform] = useState<ElementPlatform | null>(
    null,
  );
  const platform = native
    ? (chosenPlatform ?? storedPlatform ?? "react")
    : "react";

  useEffect(() => {
    delete document.documentElement.dataset.elementPlatformHint;
  }, []);

  const setPlatform = (next: ElementPlatform) => {
    setChosenPlatform(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* storage unavailable */
    }
  };

  return (
    <ElementPlatformContext.Provider value={{ platform, setPlatform }}>
      {native && (
        <>
          <script
            data-key={STORAGE_KEY}
            data-docs-key={DOCS_PLATFORM_STORAGE_KEY}
            dangerouslySetInnerHTML={{ __html: HINT_SCRIPT }}
          />
          <style>{HINT_STYLE}</style>
        </>
      )}
      <div data-element-platform={platform} className="group/element-platform">
        {children}
      </div>
    </ElementPlatformContext.Provider>
  );
}

export function useElementPlatformOrDefault(): ElementPlatform {
  return useContext(ElementPlatformContext)?.platform ?? "react";
}

export function useElementPlatform() {
  const context = useContext(ElementPlatformContext);
  if (!context) {
    throw new Error(
      "useElementPlatform must be used within ElementPlatformProvider",
    );
  }
  return context;
}

const PLATFORMS: { key: ElementPlatform; label: string }[] = [
  { key: "react", label: "React" },
  { key: "rn", label: "React Native" },
];

export function ElementPlatformToggle({ className }: { className?: string }) {
  const { platform, setPlatform } = useElementPlatform();

  return (
    <div
      role="group"
      aria-label="Platform"
      className={cn(
        "border-border/60 bg-foreground/[0.03] flex items-center gap-0.5 rounded-full border p-0.5",
        className,
      )}
    >
      {PLATFORMS.map((entry) => {
        const selected = entry.key === platform;
        return (
          <button
            key={entry.key}
            type="button"
            aria-pressed={selected}
            data-active={selected}
            onClick={() => setPlatform(entry.key)}
            className="text-muted-foreground hover:text-foreground data-[active=true]:bg-background data-[active=true]:text-foreground rounded-full px-2.5 py-1 text-xs font-medium transition-colors data-[active=true]:shadow-xs"
          >
            {entry.label}
          </button>
        );
      })}
    </div>
  );
}

export function ReactLane({ children }: { children: ReactNode }) {
  return (
    <div
      data-slot="react-lane"
      className="group-data-[element-platform=rn]/element-platform:hidden"
    >
      {children}
    </div>
  );
}

export function NativeLane({ children }: { children: ReactNode }) {
  return (
    <div
      data-slot="native-lane"
      className="hidden group-data-[element-platform=rn]/element-platform:block"
    >
      {children}
    </div>
  );
}

export function NativePreview({ slug }: { slug: string }) {
  const { platform } = useElementPlatform();
  const { resolvedTheme } = useTheme();
  const hydrated = useHydrated();
  const src =
    platform === "rn" && hydrated
      ? `${NATIVE_SHOWCASE_URL}/${slug}?theme=${resolvedTheme ?? "light"}`
      : null;

  return (
    <div className="border-foreground/15 bg-foreground/[0.03] mx-auto w-[300px] max-w-full rounded-[2.25rem] border p-2">
      <div className="border-foreground/10 bg-background aspect-[9/17.5] w-full overflow-hidden rounded-[1.75rem] border">
        {src ? (
          <iframe
            src={src}
            title={`${slug} rendered by the Expo example`}
            className="h-full w-full border-0"
          />
        ) : null}
      </div>
    </div>
  );
}
