"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

export type ElementMode = "runtime" | "standalone";

const STORAGE_KEY = "aui-element-mode";

const ElementModeContext = createContext<{
  mode: ElementMode;
  setMode: (mode: ElementMode) => void;
} | null>(null);

export function ElementModeProvider({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const [mode, setModeState] = useState<ElementMode>("runtime");

  useEffect(() => {
    try {
      const fromUrl = new URL(window.location.href).searchParams.get("mode");
      const stored = window.localStorage.getItem(STORAGE_KEY);
      const value = fromUrl ?? stored;
      if (value === "runtime" || value === "standalone") setModeState(value);
    } catch {
      /* storage unavailable */
    }
  }, []);

  const setMode = (next: ElementMode) => {
    setModeState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* storage unavailable */
    }
  };

  return (
    <ElementModeContext.Provider value={{ mode, setMode }}>
      <div
        data-element-mode={mode}
        className={cn("group/element-mode", className)}
      >
        {children}
      </div>
    </ElementModeContext.Provider>
  );
}

export function useElementMode() {
  const context = useContext(ElementModeContext);
  if (!context) {
    throw new Error("useElementMode must be used within ElementModeProvider");
  }
  return context;
}

const MODES: { key: ElementMode; label: string }[] = [
  { key: "runtime", label: "Runtime" },
  { key: "standalone", label: "Standalone" },
];

export function ElementModeToggle({ className }: { className?: string }) {
  const { mode, setMode } = useElementMode();

  return (
    <div
      role="group"
      aria-label="Usage mode"
      className={cn(
        "border-border/60 flex items-center gap-5 border-b",
        className,
      )}
    >
      {MODES.map((entry) => {
        const selected = entry.key === mode;
        return (
          <button
            key={entry.key}
            type="button"
            aria-pressed={selected}
            data-active={selected}
            onClick={() => setMode(entry.key)}
            className="text-muted-foreground hover:text-foreground data-[active=true]:text-foreground after:bg-foreground relative -mb-px pb-2 text-sm font-medium transition-colors after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:opacity-0 after:transition-opacity data-[active=true]:after:opacity-100"
          >
            {entry.label}
          </button>
        );
      })}
    </div>
  );
}

export function RuntimeMode({ children }: { children: ReactNode }) {
  return (
    <div
      data-slot="runtime-mode"
      className="group-data-[element-mode=standalone]/element-mode:hidden"
    >
      {children}
    </div>
  );
}

export function StandaloneMode({ children }: { children: ReactNode }) {
  return (
    <div
      data-slot="standalone-mode"
      className="hidden group-data-[element-mode=standalone]/element-mode:block"
    >
      {children}
    </div>
  );
}
