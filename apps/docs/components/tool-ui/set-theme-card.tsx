"use client";

import type { ToolCallMessagePartComponent } from "@assistant-ui/react";
import { useTheme } from "next-themes";
import { TraceLine } from "@/components/shared/trace-line";
import { Button } from "@/components/ui/button";

type Theme = "light" | "dark" | "system";

type SetThemeArgs = {
  theme: Theme;
};

type SetThemeResult =
  | {
      approved: true;
      theme: Theme;
      previousTheme: Theme;
    }
  | {
      approved: false;
      theme: Theme;
    };

const isTheme = (value: string | undefined): value is Theme =>
  value === "light" || value === "dark" || value === "system";

export const SetThemeToolUI: ToolCallMessagePartComponent<
  SetThemeArgs,
  SetThemeResult
> = ({ args, result, status, addResult }) => {
  const { theme: currentTheme, setTheme } = useTheme();

  if (result) {
    if (!result.approved) {
      return <TraceLine live={false} label="theme change declined" />;
    }

    return (
      <div className="flex items-baseline gap-3">
        <TraceLine
          live={false}
          label="changed the theme to"
          detail={result.theme}
        />
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground decoration-foreground/20 hover:decoration-foreground/60 font-mono text-[12px] underline underline-offset-[3px] transition-colors"
          onClick={() => setTheme(result.previousTheme)}
        >
          undo
        </button>
      </div>
    );
  }

  if (status.type !== "requires-action") return null;

  const previousTheme = isTheme(currentTheme) ? currentTheme : "system";
  const title =
    args.theme === "system"
      ? "Use the system theme"
      : `Switch to ${args.theme} mode`;

  return (
    <div className="border-foreground/10 rounded-surface my-3 max-w-md border p-4">
      <p className="text-sm font-medium">{title}</p>
      <p className="text-muted-foreground mt-0.5 text-sm">
        The assistant wants to change this page&apos;s theme.
      </p>
      <div className="mt-4 flex justify-end gap-1.5">
        <Button
          type="button"
          variant="ghost"
          onClick={() => addResult({ approved: false, theme: args.theme })}
        >
          Deny
        </Button>
        <Button
          type="button"
          autoFocus
          onClick={() => {
            setTheme(args.theme);
            addResult({
              approved: true,
              theme: args.theme,
              previousTheme,
            });
          }}
        >
          Allow
        </Button>
      </div>
    </div>
  );
};
