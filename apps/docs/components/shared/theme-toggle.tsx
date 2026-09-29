"use client";

import { useTheme } from "next-themes";
import { type ReactNode } from "react";
import { useHydrated } from "@/hooks/use-hydrated";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

export function ThemeToggle({
  className,
  children,
}: {
  className?: string;
  children?: ReactNode;
}) {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useHydrated();

  const toggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={cn(
        "text-muted-foreground hover:text-foreground flex size-7 items-center justify-center transition-colors",
        className,
      )}
      aria-label="Toggle theme"
    >
      {children ??
        (mounted ? (
          resolvedTheme === "dark" ? (
            <Moon className="size-4" />
          ) : (
            <Sun className="size-4" />
          )
        ) : (
          <div className="size-4" />
        ))}
    </button>
  );
}
