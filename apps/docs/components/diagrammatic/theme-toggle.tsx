"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { MoonIcon, SunIcon } from "lucide-react";

export function AtlasThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  return (
    <button
      type="button"
      aria-label="Toggle theme"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      className="-m-2 p-2 text-(--da-ink)/45 transition-colors hover:text-(--da-red)"
    >
      {mounted && resolvedTheme === "dark" ? (
        <SunIcon className="size-4" strokeWidth={1.5} />
      ) : (
        <MoonIcon className="size-4" strokeWidth={1.5} />
      )}
    </button>
  );
}
