"use client";

import {
  useEffect,
  useId,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { Dialog } from "@base-ui/react/dialog";
import { useTheme } from "next-themes";
import {
  CopyIcon,
  RotateCcwIcon,
  SlidersHorizontalIcon,
  XIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  CODE_THEMES,
  COLORS,
  DEFAULT_TOKENS,
  PRESETS,
  FONT_CHOICES,
  RADII,
  RADIUS_FULL,
  TYPES,
  VOICES,
  fontHref,
  oklch,
  parseTokens,
  tokenCss,
  type CodeThemeId,
  type Oklch,
  type Tokens,
} from "@/lib/tokens";

const STORAGE_KEY = "sitemap-tokens";
const STYLE_ID = "sitemap-token-overrides";

const noopSubscribe = () => () => {};

const readSaved = () => {
  if (typeof window === "undefined") return DEFAULT_TOKENS;
  try {
    return parseTokens(localStorage.getItem(STORAGE_KEY));
  } catch {
    return DEFAULT_TOKENS;
  }
};

/** Writes the tokens' CSS into the page and loads any font they name. */
function useApplyTokens(tokens: Tokens) {
  useEffect(() => {
    let style = document.getElementById(STYLE_ID);
    if (!style) {
      style = document.createElement("style");
      style.id = STYLE_ID;
      document.head.append(style);
    }
    style.textContent = tokenCss(tokens);

    for (const family of new Set(Object.values(tokens.fonts))) {
      const href = fontHref(family);
      if (!href || document.querySelector(`link[href="${href}"]`)) continue;
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = href;
      document.head.append(link);
    }
  }, [tokens]);
}

/** The site's design tokens, editable live; development only. */
export function TokenPanel() {
  // Saved tokens live in this browser, so nothing renders until hydration.
  const hydrated = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
  const [tokens, setTokens] = useState<Tokens>(readSaved);
  const [open, setOpen] = useState(false);
  const { resolvedTheme } = useTheme();
  const mode = resolvedTheme === "dark" ? "dark" : "light";

  useApplyTokens(tokens);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
    } catch {
      // The edits still apply for this visit when storage is unavailable.
    }
  }, [tokens]);

  if (!hydrated) return null;

  const css = tokenCss(tokens);
  const changes = css
    ? css.split("\n").filter((line) => /^\s+\S/.test(line)).length
    : 0;
  const set = (update: (draft: Tokens) => Tokens) => setTokens(update);
  return (
    <Dialog.Root
      open={open}
      onOpenChange={setOpen}
      modal={false}
      disablePointerDismissal
    >
      <Dialog.Trigger
        render={
          <Button
            variant="outline"
            size="icon"
            aria-label="Design tokens"
            className="bg-popover fixed right-4 bottom-4 z-40 size-11 rounded-full shadow-md"
          />
        }
      >
        <SlidersHorizontalIcon />
        {changes > 0 ? (
          <span className="bg-foreground text-background absolute -top-1 -right-1 grid h-4 min-w-4 place-items-center rounded-full px-1 text-[10px] font-medium tabular-nums">
            {changes}
          </span>
        ) : null}
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Popup className="bg-popover text-popover-foreground border-foreground/10 fixed inset-y-0 end-0 z-50 flex h-full w-[24rem] max-w-[calc(100vw-3rem)] flex-col border-s shadow-lg transition duration-200 ease-in-out data-ending-style:translate-x-[2.5rem] data-ending-style:opacity-0 data-starting-style:translate-x-[2.5rem] data-starting-style:opacity-0">
          <div className="border-foreground/10 flex items-center gap-2 border-b px-4 py-3">
            <div className="flex min-w-0 flex-1 flex-col">
              <Dialog.Title className="text-sm font-medium">
                Tokens
              </Dialog.Title>
              <Dialog.Description className="text-muted-foreground text-xs">
                Colors apply to {mode} mode
              </Dialog.Description>
            </div>
            <Button
              variant="ghost"
              size="sm"
              disabled={!css}
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(css);
                  toast.success("Token CSS copied");
                } catch {
                  toast.error("The browser blocked copying");
                }
              }}
            >
              <CopyIcon />
              Copy CSS
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Reset all tokens"
              disabled={!css}
              onClick={() => setTokens(DEFAULT_TOKENS)}
            >
              <RotateCcwIcon />
            </Button>
            <Dialog.Close
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Close tokens"
                />
              }
            >
              <XIcon />
            </Dialog.Close>
          </div>

          <div className="flex flex-col overflow-y-auto px-4 pb-4">
            <div className="border-foreground/10 flex flex-col gap-2 border-b py-3">
              <p className="text-sm font-medium">Presets</p>
              <div className="flex flex-wrap gap-2">
                {PRESETS.map((preset) => {
                  const active =
                    JSON.stringify(preset.tokens) === JSON.stringify(tokens);
                  return (
                    <Button
                      key={preset.id}
                      variant={active ? "default" : "outline"}
                      size="sm"
                      aria-pressed={active}
                      onClick={() => setTokens(preset.tokens)}
                    >
                      {preset.label}
                    </Button>
                  );
                })}
              </div>
            </div>

            <Section title="Shape">
              {RADII.map(({ key, note }) => (
                <Range
                  key={key}
                  label={`radius-${key}`}
                  hint={note}
                  min={0}
                  max={RADIUS_FULL}
                  step={1}
                  unit="px"
                  value={tokens.radius[key]}
                  display={
                    key === "capsule" && tokens.radius[key] >= RADIUS_FULL
                      ? "full"
                      : undefined
                  }
                  base={DEFAULT_TOKENS.radius[key]}
                  onChange={(value) =>
                    set((t) => ({
                      ...t,
                      radius: { ...t.radius, [key]: value },
                    }))
                  }
                />
              ))}
            </Section>

            <Section title="Ink">
              <Range
                label="tint"
                hint="The hue every neutral sits on"
                min={0}
                max={360}
                step={1}
                value={tokens.tint}
                base={DEFAULT_TOKENS.tint}
                onChange={(value) => set((t) => ({ ...t, tint: value }))}
              />
              {COLORS.filter(({ key }) => key !== "border").map(
                ({ key, label, hue }) => (
                  <ColorControl
                    key={key}
                    label={label}
                    ownHue={hue === "own"}
                    value={tokens.colors[mode][key]}
                    base={DEFAULT_TOKENS.colors[mode][key]}
                    onChange={(value) =>
                      set((t) => ({
                        ...t,
                        colors: {
                          ...t.colors,
                          [mode]: { ...t.colors[mode], [key]: value },
                        },
                      }))
                    }
                  />
                ),
              )}
              <ColorControl
                label="blue-500"
                ownHue
                value={tokens.blue}
                base={DEFAULT_TOKENS.blue}
                onChange={(value) => set((t) => ({ ...t, blue: value }))}
              />
              <ColorControl
                label="Glint"
                ownHue
                alpha
                value={tokens.glint}
                base={DEFAULT_TOKENS.glint}
                onChange={(value) => set((t) => ({ ...t, glint: value }))}
              />
            </Section>

            <Section title="Line">
              <ColorControl
                label="Border"
                alpha
                value={tokens.colors[mode].border}
                base={DEFAULT_TOKENS.colors[mode].border}
                onChange={(value) =>
                  set((t) => ({
                    ...t,
                    colors: {
                      ...t.colors,
                      [mode]: { ...t.colors[mode], border: value },
                    },
                  }))
                }
              />
            </Section>

            <Section title="Code">
              <div className="grid grid-cols-[7.5rem_minmax(0,1fr)_1.25rem] items-center gap-2">
                <span
                  id="token-code-theme"
                  className={cn(
                    "text-xs",
                    tokens.codeTheme !== DEFAULT_TOKENS.codeTheme
                      ? "text-foreground font-medium"
                      : "text-muted-foreground",
                  )}
                >
                  Theme
                </span>
                <Select
                  items={Object.fromEntries(
                    Object.entries(CODE_THEMES).map(([id, { label }]) => [
                      id,
                      label,
                    ]),
                  )}
                  value={tokens.codeTheme}
                  onValueChange={(next) => {
                    if (typeof next === "string" && next in CODE_THEMES)
                      set((t) => ({ ...t, codeTheme: next as CodeThemeId }));
                  }}
                >
                  <SelectTrigger
                    size="sm"
                    aria-labelledby="token-code-theme"
                    className="w-full"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CODE_THEMES).map(([id, { label }]) => (
                      <SelectItem key={id} value={id}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {tokens.codeTheme !== DEFAULT_TOKENS.codeTheme ? (
                  <button
                    type="button"
                    aria-label="Reset code theme"
                    onClick={() =>
                      set((t) => ({
                        ...t,
                        codeTheme: DEFAULT_TOKENS.codeTheme,
                      }))
                    }
                    className="text-muted-foreground hover:text-foreground grid size-5 place-items-center rounded-sm"
                  >
                    <RotateCcwIcon className="size-3" />
                  </button>
                ) : (
                  <span />
                )}
              </div>
            </Section>

            <Section title="Voice">
              {VOICES.map(({ key, label, kind }) => (
                <FontControl
                  key={key}
                  label={label}
                  choices={FONT_CHOICES[kind]}
                  value={tokens.fonts[key]}
                  base={DEFAULT_TOKENS.fonts[key]}
                  onChange={(value) =>
                    set((t) => ({ ...t, fonts: { ...t.fonts, [key]: value } }))
                  }
                />
              ))}
              <Range
                label="tracking-hero"
                min={-0.08}
                max={0.04}
                step={0.001}
                unit="em"
                value={tokens.trackingHero}
                base={DEFAULT_TOKENS.trackingHero}
                onChange={(value) =>
                  set((t) => ({ ...t, trackingHero: value }))
                }
              />
              <Range
                label="tracking-section"
                min={-0.08}
                max={0.04}
                step={0.001}
                unit="em"
                value={tokens.trackingSection}
                base={DEFAULT_TOKENS.trackingSection}
                onChange={(value) =>
                  set((t) => ({ ...t, trackingSection: value }))
                }
              />
            </Section>

            <Section title="Type">
              {TYPES.map(({ key, label, breakpoint }) => {
                const style = tokens.type[key];
                const base = DEFAULT_TOKENS.type[key];
                const update = (patch: Partial<typeof style>) =>
                  set((t) => ({
                    ...t,
                    type: { ...t.type, [key]: { ...t.type[key], ...patch } },
                  }));
                return (
                  <div key={key} className="flex flex-col gap-1.5 pt-2">
                    <p className="font-mono text-xs">{label}</p>
                    <Range
                      label="Size"
                      min={10}
                      max={120}
                      step={1}
                      unit="px"
                      value={style.size}
                      base={base.size}
                      onChange={(size) => update({ size })}
                    />
                    {breakpoint ? (
                      <Range
                        label={`Size at ${breakpoint}`}
                        min={10}
                        max={160}
                        step={1}
                        unit="px"
                        value={style.sizeLg}
                        base={base.sizeLg}
                        onChange={(sizeLg) => update({ sizeLg })}
                      />
                    ) : null}
                    <Range
                      label="Leading"
                      min={0.8}
                      max={2}
                      step={0.005}
                      value={style.leading}
                      base={base.leading}
                      onChange={(leading) => update({ leading })}
                    />
                    <Range
                      label="Weight"
                      min={300}
                      max={800}
                      step={10}
                      value={style.weight}
                      base={base.weight}
                      onChange={(weight) => update({ weight })}
                    />
                    <Range
                      label="Tracking"
                      min={-0.08}
                      max={0.08}
                      step={0.001}
                      unit="em"
                      value={style.tracking}
                      base={base.tracking}
                      onChange={(tracking) => update({ tracking })}
                    />
                  </div>
                );
              })}
            </Section>

            <Section
              title="Motion"
              action={
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => {
                    for (const animation of document.getAnimations()) {
                      animation.cancel();
                      animation.play();
                    }
                  }}
                >
                  Replay
                </Button>
              }
            >
              <Range
                label="hero-word"
                hint="Each headline word arriving"
                min={0.1}
                max={2}
                step={0.05}
                unit="s"
                value={tokens.motion.word}
                base={DEFAULT_TOKENS.motion.word}
                onChange={(word) =>
                  set((t) => ({ ...t, motion: { ...t.motion, word } }))
                }
              />
              <Range
                label="hero-rise"
                hint="Deck, actions, and stats rising"
                min={0.1}
                max={2}
                step={0.05}
                unit="s"
                value={tokens.motion.rise}
                base={DEFAULT_TOKENS.motion.rise}
                onChange={(rise) =>
                  set((t) => ({ ...t, motion: { ...t.motion, rise } }))
                }
              />
              <Range
                label="hero-glint"
                hint="One sweep across the mark"
                min={2}
                max={20}
                step={0.5}
                unit="s"
                value={tokens.motion.glint}
                base={DEFAULT_TOKENS.motion.glint}
                onChange={(glint) =>
                  set((t) => ({ ...t, motion: { ...t.motion, glint } }))
                }
              />
            </Section>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <details
      open
      className="group border-foreground/10 border-b py-3 last:border-b-0"
    >
      <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium [&::-webkit-details-marker]:hidden">
        <span className="flex-1">{title}</span>
        {action}
      </summary>
      <div className="flex flex-col gap-1.5 pt-2">{children}</div>
    </details>
  );
}

function Range({
  label,
  hint,
  min,
  max,
  step,
  unit,
  value,
  base,
  display,
  onChange,
}: {
  label: string;
  hint?: string | undefined;
  min: number;
  max: number;
  step: number;
  unit?: string;
  value: number;
  base: number;
  display?: string | undefined;
  onChange: (value: number) => void;
}) {
  const id = useId();
  const changed = value !== base;
  return (
    <div className="grid grid-cols-[7.5rem_minmax(0,1fr)_3.5rem_1.25rem] items-center gap-2">
      <label
        htmlFor={id}
        title={hint}
        className={cn(
          "truncate text-xs",
          changed ? "text-foreground font-medium" : "text-muted-foreground",
        )}
      >
        {label}
      </label>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.currentTarget.value))}
        className="accent-foreground w-full"
      />
      <span className="text-muted-foreground text-right font-mono text-[11px] tabular-nums">
        {display ?? `${Number(value.toFixed(3))}${unit ?? ""}`}
      </span>
      {changed ? (
        <button
          type="button"
          aria-label={`Reset ${label}`}
          onClick={() => onChange(base)}
          className="text-muted-foreground hover:text-foreground grid size-5 place-items-center rounded-sm"
        >
          <RotateCcwIcon className="size-3" />
        </button>
      ) : (
        <span />
      )}
    </div>
  );
}

function ColorControl({
  label,
  value,
  base,
  ownHue = false,
  alpha = false,
  onChange,
}: {
  label: string;
  value: Oklch;
  base: Oklch;
  ownHue?: boolean;
  alpha?: boolean;
  onChange: (value: Oklch) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5 pt-2">
      <div className="flex items-center gap-2">
        <span
          aria-hidden
          className="border-foreground/15 size-4 shrink-0 rounded-sm border"
          style={{ background: oklch(value) }}
        />
        <p className="text-xs font-medium">{label}</p>
        <code className="text-muted-foreground ms-auto truncate font-mono text-[11px]">
          {oklch(value)}
        </code>
      </div>
      <Range
        label="Lightness"
        min={0}
        max={1}
        step={0.001}
        value={value.l}
        base={base.l}
        onChange={(l) => onChange({ ...value, l })}
      />
      <Range
        label="Chroma"
        min={0}
        max={0.37}
        step={0.001}
        value={value.c}
        base={base.c}
        onChange={(c) => onChange({ ...value, c })}
      />
      {ownHue ? (
        <Range
          label="Hue"
          min={0}
          max={360}
          step={0.5}
          value={value.h}
          base={base.h}
          onChange={(h) => onChange({ ...value, h })}
        />
      ) : null}
      {alpha ? (
        <Range
          label="Opacity"
          min={0}
          max={100}
          step={1}
          unit="%"
          value={value.a}
          base={base.a}
          onChange={(a) => onChange({ ...value, a })}
        />
      ) : null}
    </div>
  );
}

function FontControl({
  label,
  choices,
  value,
  base,
  onChange,
}: {
  label: string;
  choices: readonly string[];
  value: string;
  base: string;
  onChange: (value: string) => void;
}) {
  const id = useId();
  const changed = value !== base;
  return (
    <div className="grid grid-cols-[7.5rem_minmax(0,1fr)_1.25rem] items-center gap-2">
      <span
        id={id}
        className={cn(
          "text-xs",
          changed ? "text-foreground font-medium" : "text-muted-foreground",
        )}
      >
        {label}
      </span>
      <Select
        value={value}
        onValueChange={(next) => {
          if (typeof next === "string") onChange(next);
        }}
      >
        <SelectTrigger size="sm" aria-labelledby={id} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {choices.map((family) => (
            <SelectItem key={family} value={family}>
              {family}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {changed ? (
        <button
          type="button"
          aria-label={`Reset ${label} font`}
          onClick={() => onChange(base)}
          className="text-muted-foreground hover:text-foreground grid size-5 place-items-center rounded-sm"
        >
          <RotateCcwIcon className="size-3" />
        </button>
      ) : (
        <span />
      )}
    </div>
  );
}
