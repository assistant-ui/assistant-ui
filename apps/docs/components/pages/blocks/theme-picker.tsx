"use client";

import { Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type BlockTheme = {
  mode: "light" | "dark";
  color: string;
  radius: string;
  font: string;
  size: string;
};

export type BlockThemeChoice = Omit<BlockTheme, "mode">;

export const DEFAULT_THEME_CHOICE: BlockThemeChoice = {
  color: "default",
  radius: "default",
  font: "default",
  size: "default",
};

const MODES = [
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
] as const;

const COLORS = [
  { id: "default", label: "Default", value: "" },
  { id: "blue", label: "Blue", value: "oklch(0.546 0.245 262.881)" },
  { id: "violet", label: "Violet", value: "oklch(0.541 0.281 293.009)" },
  { id: "green", label: "Green", value: "oklch(0.527 0.154 150.069)" },
  { id: "orange", label: "Orange", value: "oklch(0.646 0.222 41.116)" },
  { id: "rose", label: "Rose", value: "oklch(0.586 0.253 17.585)" },
];

const RADII = [
  { id: "none", label: "0", value: "0rem" },
  { id: "small", label: "0.3", value: "0.3rem" },
  { id: "default", label: "0.625", value: "" },
  { id: "large", label: "0.75", value: "0.75rem" },
  { id: "full", label: "1", value: "1rem" },
];

const FONTS = [
  { id: "default", label: "Sans", value: "" },
  {
    id: "geist",
    label: "Geist",
    value: "var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif",
  },
  {
    id: "serif",
    label: "Serif",
    value: 'ui-serif, Georgia, Cambria, "Times New Roman", serif',
  },
  {
    id: "mono",
    label: "Mono",
    value: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
  },
];

const SIZES = [
  { id: "small", label: "Small", value: "14px" },
  { id: "default", label: "Default", value: "" },
  { id: "large", label: "Large", value: "18px" },
];

const valueOf = (
  options: readonly { id: string; value: string }[],
  id: string,
) => options.find((option) => option.id === id)?.value ?? "";

/** The CSS a block's frame applies for a theme; an empty value restores the block's own. */
export function blockThemeStyle(theme: BlockThemeChoice) {
  const color = valueOf(COLORS, theme.color);
  return {
    "--primary": color,
    "--primary-foreground": color && "oklch(0.985 0 0)",
    "--ring": color,
    "--radius": valueOf(RADII, theme.radius),
    "font-family": valueOf(FONTS, theme.font),
    "font-size": valueOf(SIZES, theme.size),
  };
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-col gap-1.5">
      <span className="text-muted-foreground text-xs">{label}</span>
      <div className="flex flex-wrap gap-1">{children}</div>
    </div>
  );
}

function Choice({
  selected,
  onSelect,
  children,
}: {
  selected: boolean;
  onSelect: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        "border-foreground/10 hover:bg-foreground/[0.04] focus-visible:outline-ring h-7 flex-1 rounded-md border px-2 text-xs transition-colors focus-visible:outline-2 motion-reduce:transition-none",
        selected
          ? "bg-foreground/[0.06] text-foreground font-medium"
          : "text-muted-foreground",
      )}
    >
      {children}
    </button>
  );
}

export function ThemePicker({
  theme,
  onChange,
  onReset,
  className,
}: {
  theme: BlockTheme;
  onChange: (change: Partial<BlockTheme>) => void;
  onReset: () => void;
  className?: string;
}) {
  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-label="Theme"
            className={className}
          />
        }
      >
        <Palette />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 gap-3.5">
        <Row label="Mode">
          {MODES.map((mode) => (
            <Choice
              key={mode.id}
              selected={theme.mode === mode.id}
              onSelect={() => onChange({ mode: mode.id })}
            >
              {mode.label}
            </Choice>
          ))}
        </Row>
        <Row label="Color">
          {COLORS.map((color) => (
            <button
              key={color.id}
              type="button"
              aria-label={color.label}
              aria-pressed={theme.color === color.id}
              onClick={() => onChange({ color: color.id })}
              className={cn(
                "focus-visible:outline-ring grid size-7 place-items-center rounded-full border transition-colors focus-visible:outline-2 motion-reduce:transition-none",
                theme.color === color.id
                  ? "border-foreground"
                  : "hover:border-foreground/25 border-transparent",
              )}
            >
              <span
                className="bg-foreground size-4 rounded-full"
                style={color.value ? { background: color.value } : undefined}
              />
            </button>
          ))}
        </Row>
        <Row label="Radius">
          {RADII.map((radius) => (
            <Choice
              key={radius.id}
              selected={theme.radius === radius.id}
              onSelect={() => onChange({ radius: radius.id })}
            >
              {radius.label}
            </Choice>
          ))}
        </Row>
        <Row label="Font">
          {FONTS.map((font) => (
            <Choice
              key={font.id}
              selected={theme.font === font.id}
              onSelect={() => onChange({ font: font.id })}
            >
              {font.label}
            </Choice>
          ))}
        </Row>
        <Row label="Text size">
          {SIZES.map((size) => (
            <Choice
              key={size.id}
              selected={theme.size === size.id}
              onSelect={() => onChange({ size: size.id })}
            >
              {size.label}
            </Choice>
          ))}
        </Row>
        <Button variant="outline" size="sm" onClick={onReset}>
          Reset
        </Button>
      </PopoverContent>
    </Popover>
  );
}
