"use client";

import { useSyncExternalStore } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { useTheme } from "next-themes";
import { ChevronDownIcon, CopyIcon, RotateCcwIcon, XIcon } from "lucide-react";
import {
  CODE_THEMES,
  LIBRARY_COLORS,
  LIBRARY_FONTS,
  LIBRARY_PRESETS,
  LIBRARY_RADII,
  LIBRARY_TYPE,
  RADIUS_FULL,
  baseOf,
  colorCss,
  fontCss,
  libraryThemeCss,
  LIBRARY_TYPE_VERSION,
  parseLibraryTheme,
  presetOf,
  radiusCss,
  type CodeThemeId,
  type LibraryColor,
  type LibraryMode,
  type LibraryMonoId,
  type LibrarySansId,
  type LibraryThemeValues,
} from "@/lib/library/themes";
import { cn } from "@/lib/utils";
import type { LibraryLayout } from "./library-sidebar";
import { copyWithLibraryToast } from "./library-toast";
import { LibraryIconButton } from "./library-icon-button";
import {
  Menu,
  MenuContent,
  MenuRadioGroup,
  MenuRadioItem,
  MenuTrigger,
} from "./menu";

const STORAGE_KEY = "aui-library-theme";
const listeners = new Set<() => void>();

const readStored = (): string | null => {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
};

const remember = (values: LibraryThemeValues) => {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...values, typeVersion: LIBRARY_TYPE_VERSION }),
    );
  } catch {}
  for (const listener of listeners) listener();
};

/** The library's theme, as the person last set it; the site's own until they do. */
const useLibraryTheme = (): LibraryThemeValues => {
  const stored = useSyncExternalStore(subscribe, readStored, () => null);
  // An earlier version stored a preset's id, not its values.
  const preset = LIBRARY_PRESETS.find((entry) => entry.id === stored);
  return preset ? preset.values : parseLibraryTheme(stored);
};

/**
 * The theme's CSS. The library's layout mounts it, so it is gone on every other
 * route. `families` is the CSS font-family of each typeface a theme can pick.
 */
export function LibraryThemeStyle({
  families,
}: {
  families: Parameters<typeof libraryThemeCss>[1];
}) {
  return (
    <style data-library-theme>
      {libraryThemeCss(useLibraryTheme(), families)}
    </style>
  );
}

const sectionTitle = "text-[13px] font-medium";

/** Two or three choices in one track, the picked one raised. */
function Segmented<T extends string>({
  name,
  options,
  value,
  onChange,
}: {
  name: string;
  options: readonly { id: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div
      role="group"
      aria-label={name}
      className="bg-foreground/[0.05] flex rounded-(--library-control) p-0.5"
    >
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          aria-pressed={option.id === value}
          onClick={() => onChange(option.id)}
          className={cn(
            "focus-visible:ring-ring h-7 min-w-0 flex-1 cursor-pointer truncate rounded-(--library-control) px-2.5 text-[13px] transition-colors outline-none focus-visible:ring-2",
            option.id === value
              ? "bg-background text-foreground shadow-[0_1px_2px_oklch(0_0_0/8%)]"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

/** A preset as a card: a button and a card drawn with its own corners and font, and its name. */
function PresetCard({
  preset,
  selected,
  onSelect,
}: {
  preset: (typeof LIBRARY_PRESETS)[number];
  selected: boolean;
  onSelect: () => void;
}) {
  const { values } = preset;
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        "focus-visible:ring-ring flex min-w-0 flex-1 cursor-pointer flex-col gap-2 rounded-(--library-thumb) p-1.5 text-left ring-1 transition-shadow outline-none focus-visible:ring-2",
        selected
          ? "ring-foreground/70"
          : "ring-foreground/10 hover:ring-foreground/25",
      )}
    >
      <span
        aria-hidden
        style={{ borderRadius: radiusCss(Math.min(values.card, 14)) }}
        className="bg-foreground/[0.05] flex h-[4.5rem] flex-col justify-between p-2"
      >
        <span
          style={{ borderRadius: radiusCss(Math.min(values.thumb, 6)) }}
          className="bg-foreground/15 h-2 w-10"
        />
        <span
          style={{
            borderRadius: radiusCss(values.control),
            fontFamily: fontCss(values.sans, "var(--font-public-sans)"),
          }}
          className="bg-foreground text-background grid h-6 w-fit place-items-center px-2.5 text-[11px] font-medium"
        >
          Button
        </span>
      </span>
      <span className="truncate px-0.5 text-[13px]">{preset.label}</span>
    </button>
  );
}

/** Puts one setting back to its preset's value; it shows only once the setting has changed. */
function Reset({
  name,
  changed,
  onReset,
}: {
  name: string;
  changed: boolean;
  onReset: () => void;
}) {
  return (
    <LibraryIconButton
      tooltip={`Reset ${name}`}
      onClick={onReset}
      disabled={!changed}
      className="size-6 disabled:opacity-0"
    >
      <RotateCcwIcon aria-hidden className="size-3" />
    </LibraryIconButton>
  );
}

const settingRow =
  "grid h-8 grid-cols-[5.5rem_minmax(0,1fr)_2.75rem_1.5rem] items-center gap-2";

/** One setting on one line: its name, a slim slider, its value, and its reset. */
function Range({
  name,
  resetName = name,
  value,
  base,
  min = 0,
  max,
  step = 1,
  display,
  track,
  onChange,
}: {
  name: string;
  /** What the reset button calls the setting, when its name alone is not enough. */
  resetName?: string;
  value: number;
  /** The value its preset gives it, which the reset returns to. */
  base: number;
  min?: number;
  max: number;
  step?: number;
  display: string;
  /** A background for the whole track, for a slider that shows what it picks. */
  track?: string;
  onChange: (value: number) => void;
}) {
  return (
    <div className={settingRow}>
      <span className="text-muted-foreground truncate text-[13px]">{name}</span>
      <input
        type="range"
        aria-label={resetName}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        style={
          track
            ? { backgroundImage: track }
            : { backgroundSize: `${((value - min) / (max - min)) * 100}% 100%` }
        }
        className={cn(
          "focus-visible:ring-ring bg-foreground/15 h-1 w-full cursor-pointer appearance-none rounded-full outline-none focus-visible:ring-2 focus-visible:ring-offset-4",
          !track &&
            "bg-[linear-gradient(var(--foreground),var(--foreground))] bg-no-repeat",
          "[&::-webkit-slider-thumb]:bg-background [&::-webkit-slider-thumb]:ring-foreground/25 [&::-webkit-slider-thumb]:size-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-[0_1px_3px_oklch(0_0_0/30%)] [&::-webkit-slider-thumb]:ring-1",
          "[&::-moz-range-thumb]:bg-background [&::-moz-range-thumb]:size-3.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:shadow-[0_1px_3px_oklch(0_0_0/30%)]",
        )}
      />
      <span className="text-right text-xs tabular-nums">{display}</span>
      <Reset
        name={resetName}
        changed={value !== base}
        onReset={() => onChange(base)}
      />
    </div>
  );
}

/** A setting picked from a short list: its name, and a button that opens the list. */
function Pick<T extends string>({
  name,
  resetName = name,
  options,
  value,
  base,
  onChange,
}: {
  name: string;
  resetName?: string;
  options: readonly { id: T; label: string }[];
  value: T;
  /** The value its preset gives it, which the reset returns to. */
  base: T;
  onChange: (value: T) => void;
}) {
  const current = options.find((option) => option.id === value);
  return (
    <div className="grid h-8 grid-cols-[5.5rem_minmax(0,1fr)_1.5rem] items-center gap-2">
      <span className="text-muted-foreground truncate text-[13px]">{name}</span>
      <Menu>
        <MenuTrigger
          aria-label={`${resetName}: ${current?.label ?? value}`}
          className="bg-foreground/[0.05] hover:bg-foreground/[0.08] data-popup-open:bg-foreground/[0.08] h-7 w-full justify-between rounded-(--library-control) px-2.5 text-[13px]"
        >
          <span className="truncate">{current?.label ?? value}</span>
          <ChevronDownIcon aria-hidden className="text-muted-foreground" />
        </MenuTrigger>
        <MenuContent align="end">
          <MenuRadioGroup
            value={value}
            onValueChange={(next: T) => onChange(next)}
          >
            {options.map((option) => (
              <MenuRadioItem key={option.id} value={option.id} closeOnClick>
                {option.label}
              </MenuRadioItem>
            ))}
          </MenuRadioGroup>
        </MenuContent>
      </Menu>
      <Reset
        name={resetName}
        changed={value !== base}
        onReset={() => onChange(base)}
      />
    </div>
  );
}

/** One neutral: its swatch and value, and under them its lightness, chroma, and opacity. */
function ColorControl({
  name,
  value,
  base,
  alpha,
  onChange,
}: {
  name: string;
  value: LibraryColor;
  base: LibraryColor;
  alpha: boolean;
  onChange: (value: LibraryColor) => void;
}) {
  return (
    <details className="group/color">
      <summary className="focus-visible:ring-ring flex h-8 cursor-pointer list-none items-center gap-2 rounded-(--library-item) outline-none focus-visible:ring-2 [&::-webkit-details-marker]:hidden">
        <span
          aria-hidden
          style={{ background: colorCss(value) }}
          className="ring-foreground/15 size-4 shrink-0 rounded-[4px] ring-1"
        />
        <span className="text-muted-foreground min-w-0 flex-1 truncate text-[13px]">
          {name}
        </span>
        <code className="text-muted-foreground font-mono text-[11px] tabular-nums [font-variant-ligatures:none]">
          {value.l.toFixed(3)} {value.c.toFixed(3)}
          {alpha ? ` / ${value.a}%` : ""}
        </code>
        <ChevronDownIcon
          aria-hidden
          className="text-muted-foreground size-3.5 shrink-0 transition-transform group-open/color:rotate-180 motion-reduce:transition-none"
        />
      </summary>
      <div className="flex flex-col ps-6 pb-1">
        <Range
          name="Lightness"
          resetName={`${name} lightness`}
          value={value.l}
          base={base.l}
          max={1}
          step={0.001}
          display={value.l.toFixed(3)}
          onChange={(l) => onChange({ ...value, l })}
        />
        <Range
          name="Chroma"
          resetName={`${name} chroma`}
          value={value.c}
          base={base.c}
          max={0.37}
          step={0.001}
          display={value.c.toFixed(3)}
          onChange={(c) => onChange({ ...value, c })}
        />
        {alpha ? (
          <Range
            name="Opacity"
            resetName={`${name} opacity`}
            value={value.a}
            base={base.a}
            max={100}
            display={`${value.a}%`}
            onChange={(a) => onChange({ ...value, a })}
          />
        ) : null}
      </div>
    </details>
  );
}

const CODE_THEME_OPTIONS = (
  Object.entries(CODE_THEMES) as [CodeThemeId, { label: string }][]
).map(([id, { label }]) => ({ id, label }));

const HUES =
  "linear-gradient(to right, oklch(0.75 0.12 0), oklch(0.75 0.12 60), oklch(0.75 0.12 120), oklch(0.75 0.12 180), oklch(0.75 0.12 240), oklch(0.75 0.12 300), oklch(0.75 0.12 360))";

const LAYOUTS = [
  { id: "tabs", label: "Tabs" },
  { id: "sidebar", label: "Sidebar" },
] as const;

const section = "border-foreground/10 flex flex-col gap-2 border-t px-4 py-4";

/**
 * How the library looks, as a panel that stays open beside the page so a
 * change shows as it is made: its types as tabs or a sidebar, a preset theme,
 * and every setting a theme is made of, each with a reset. The layout choice
 * needs room for a sidebar, so it is offered from desktop width up.
 */
export function LibraryAppearancePanel({
  open,
  onOpenChange,
  layout,
  onLayoutChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  layout: LibraryLayout;
  onLayoutChange: (layout: LibraryLayout) => void;
}) {
  const values = useLibraryTheme();
  const preset = presetOf(values);
  const base = baseOf(values);
  const set = (next: Partial<LibraryThemeValues>) =>
    remember({ ...values, ...next });
  const mode: LibraryMode =
    useTheme().resolvedTheme === "dark" ? "dark" : "light";
  const baseLabel =
    LIBRARY_PRESETS.find((entry) => entry.id === values.base)?.label ??
    values.base;
  const copyCss = () => {
    const css =
      document.querySelector("style[data-library-theme]")?.textContent ?? "";
    // One declaration a line, so the copy reads as a stylesheet.
    void copyWithLibraryToast(
      css
        .replaceAll("{", " {\n  ")
        .replaceAll(";", ";\n  ")
        .replaceAll("}", ";\n}\n")
        .replaceAll("  ;\n", ""),
      "Theme CSS copied.",
    );
  };

  return (
    <Dialog.Root
      open={open}
      onOpenChange={onOpenChange}
      modal={false}
      disablePointerDismissal
    >
      <Dialog.Portal>
        <Dialog.Popup className="bg-background ring-foreground/10 fixed inset-y-2 right-2 z-50 flex w-[min(22.5rem,calc(100vw-1rem))] flex-col overflow-hidden rounded-(--library-floating) shadow-xl ring-1 transition-transform duration-200 outline-none data-ending-style:translate-x-[calc(100%+1rem)] data-starting-style:translate-x-[calc(100%+1rem)] motion-reduce:transition-none">
          <div className="flex items-center gap-1 py-3 ps-4 pe-2.5">
            <div className="flex min-w-0 flex-1 flex-col">
              <Dialog.Title className="text-sm font-medium">
                Appearance
              </Dialog.Title>
              <Dialog.Description className="text-muted-foreground truncate text-xs">
                Colors apply to {mode} mode
              </Dialog.Description>
            </div>
            <button
              type="button"
              onClick={copyCss}
              className="text-muted-foreground hover:text-foreground hover:bg-foreground/[0.06] focus-visible:ring-ring inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-(--library-control) px-2.5 text-[13px] transition-colors outline-none focus-visible:ring-2"
            >
              <CopyIcon aria-hidden className="size-3.5" />
              Copy CSS
            </button>
            <LibraryIconButton
              tooltip={`Reset all to ${baseLabel}`}
              side="bottom"
              disabled={preset !== null}
              onClick={() => remember(base)}
              className="disabled:opacity-40"
            >
              <RotateCcwIcon aria-hidden className="size-3.5" />
            </LibraryIconButton>
            <Dialog.Close
              render={
                <LibraryIconButton tooltip="Close appearance" side="bottom" />
              }
            >
              <XIcon aria-hidden />
            </Dialog.Close>
          </div>
          <div className="min-h-0 flex-1 [scrollbar-width:thin] overflow-y-auto">
            <section className={cn(section, "hidden lg:flex")}>
              <h3 className={sectionTitle}>Layout</h3>
              <Segmented
                name="Layout"
                options={LAYOUTS}
                value={layout}
                onChange={onLayoutChange}
              />
            </section>
            <section className={section}>
              <div className="flex items-baseline justify-between gap-3">
                <h3 className={sectionTitle}>Theme</h3>
                {preset ? null : (
                  <span className="text-muted-foreground text-xs">Custom</span>
                )}
              </div>
              <div className="flex gap-2">
                {LIBRARY_PRESETS.map((entry) => (
                  <PresetCard
                    key={entry.id}
                    preset={entry}
                    selected={entry.id === preset}
                    onSelect={() => remember(entry.values)}
                  />
                ))}
              </div>
            </section>
            <section className={section}>
              <h3 className={sectionTitle}>Corners</h3>
              <div className="flex flex-col">
                {LIBRARY_RADII.map(({ key, label: name }) => (
                  <Range
                    key={key}
                    name={name}
                    resetName={`${name} corners`}
                    value={values[key]}
                    base={base[key]}
                    max={RADIUS_FULL}
                    display={
                      values[key] >= RADIUS_FULL ? "Full" : `${values[key]}px`
                    }
                    onChange={(value) => set({ [key]: value })}
                  />
                ))}
              </div>
            </section>
            {LIBRARY_TYPE.map((group) => (
              <section key={group.title} className={section}>
                <h3 className={sectionTitle}>{group.title}</h3>
                <div className="flex flex-col">
                  {group.title === "Title" ? (
                    <Pick<LibrarySansId>
                      name="Font"
                      resetName="Title font"
                      options={LIBRARY_FONTS.sans}
                      value={values.display}
                      base={base.display}
                      onChange={(display) => set({ display })}
                    />
                  ) : (
                    <Pick<LibrarySansId>
                      name="Font"
                      resetName="Text font"
                      options={LIBRARY_FONTS.sans}
                      value={values.sans}
                      base={base.sans}
                      onChange={(sans) => set({ sans })}
                    />
                  )}
                  {group.settings.map(
                    ({ key, label: name, min, max, step }) => (
                      <Range
                        key={key}
                        name={name}
                        resetName={`${group.title} ${name.toLowerCase()}`}
                        value={values[key]}
                        base={base[key]}
                        min={min}
                        max={max}
                        step={step}
                        display={
                          key.endsWith("Size")
                            ? `${values[key]}px`
                            : key.endsWith("Tracking")
                              ? `${values[key] / 10}%`
                              : key.endsWith("Leading")
                                ? (values[key] / 100).toFixed(2)
                                : `${values[key]}`
                        }
                        onChange={(value) => set({ [key]: value })}
                      />
                    ),
                  )}
                </div>
              </section>
            ))}
            <section className={section}>
              <h3 className={sectionTitle}>Code</h3>
              <div className="flex flex-col">
                <Pick<LibraryMonoId>
                  name="Font"
                  resetName="Code font"
                  options={LIBRARY_FONTS.mono}
                  value={values.mono}
                  base={base.mono}
                  onChange={(mono) => set({ mono })}
                />
                <Pick<CodeThemeId>
                  name="Theme"
                  resetName="Code theme"
                  options={CODE_THEME_OPTIONS}
                  value={values.code}
                  base={base.code}
                  onChange={(code) => set({ code })}
                />
              </div>
            </section>
            <section className={section}>
              <h3 className={sectionTitle}>Color</h3>
              <div className="flex flex-col">
                <Range
                  name="Tint"
                  value={values.tint}
                  base={base.tint}
                  max={360}
                  display={`${values.tint}°`}
                  track={HUES}
                  onChange={(tint) => set({ tint })}
                />
                <Range
                  name="Accent"
                  value={values.accent}
                  base={base.accent}
                  max={360}
                  display={`${values.accent}°`}
                  track={HUES}
                  onChange={(accent) => set({ accent })}
                />
                {LIBRARY_COLORS.map(({ key, label: name, alpha }) => (
                  <ColorControl
                    key={key}
                    name={name}
                    alpha={alpha}
                    value={values.colors[mode][key]}
                    base={base.colors[mode][key]}
                    onChange={(next) =>
                      set({
                        colors: {
                          ...values.colors,
                          [mode]: { ...values.colors[mode], [key]: next },
                        },
                      })
                    }
                  />
                ))}
              </div>
            </section>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
