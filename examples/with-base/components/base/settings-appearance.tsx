"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import { Radio } from "@base-ui/react/radio";
import { RadioGroup } from "@base-ui/react/radio-group";
import {
  ArrowDown01Icon,
  ArrowTurnBackwardIcon,
  ComputerIcon,
  Copy01Icon,
  FileImportIcon,
  Moon02Icon,
  PaintBoardIcon,
  Sun03Icon,
  Tick02Icon,
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { ColorPicker, type ColorSwatch } from "@/components/ui/color-picker";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  CODE_THEMES,
  DEFAULT_CODE_THEME,
  THEME_COLORS,
  THEME_FORMAT,
  isCustomThemeEmpty,
  isThemeColor,
  readCustomTheme,
  type CodeThemeId,
  type CustomTheme,
  type ThemeOverrides,
} from "@/lib/custom-theme";
import {
  resolveCssColor,
  setCustomTheme,
  setTheme,
  useCustomTheme,
  useTheme,
  type ThemeChoice,
} from "@/lib/theme";
import { THEME_PRESETS } from "@/lib/theme-presets";
import { cn } from "@/lib/utils";
import {
  Icon,
  Menu,
  MenuChoice,
  MenuItem,
  MenuPopup,
  MenuRadioGroup,
  MenuSeparator,
  MenuTrigger,
  Tip,
  focusRing,
  iconButton,
} from "./base-thread-shell";
import { BRAND_ICONS } from "./brand-icons";

const MODES: readonly {
  value: ThemeChoice;
  label: string;
  icon: typeof Sun03Icon;
}[] = [
  { value: "system", label: "System", icon: ComputerIcon },
  { value: "light", label: "Light", icon: Sun03Icon },
  { value: "dark", label: "Dark", icon: Moon02Icon },
];

const SWATCHES: readonly ColorSwatch[] = [
  { label: "Foreground", value: "var(--foreground)" },
  { label: "Muted foreground", value: "var(--muted-foreground)" },
  { label: "Border", value: "var(--border)" },
  { label: "Muted", value: "var(--muted)" },
  { label: "Brand", value: "var(--brand)" },
  { label: "Destructive", value: "var(--destructive)" },
];

/* The hue the tint slider rests on until a tint is set. */
const TINT_REST = 106;

const settingRow = "flex min-h-10 items-center justify-between gap-4 py-1";

/* A control that opens a menu, showing what is chosen. */
const menuButton = `hover:bg-foreground/[0.07] data-popup-open:bg-foreground/[0.07] flex h-7 items-center gap-1 rounded-md ps-2 pe-1.5 transition-colors motion-reduce:transition-none ${focusRing}`;

function without<Key extends keyof ThemeOverrides>(
  overrides: ThemeOverrides,
  key: Key,
): ThemeOverrides {
  const { [key]: _removed, ...rest } = overrides;
  return rest;
}

/* Puts a field back to what the stylesheet gives it; idle until it changes. */
function ResetButton({
  label,
  disabled,
  onClick,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <Tip label={`Reset ${label.toLowerCase()}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={onClick}
        className={iconButton}
      >
        <Icon icon={ArrowTurnBackwardIcon} />
      </button>
    </Tip>
  );
}

function Presets({
  onApply,
}: {
  onApply: (theme: ThemeOverridesPair) => void;
}) {
  return (
    <Menu>
      <MenuTrigger className={menuButton}>
        Presets
        <Icon
          icon={ArrowDown01Icon}
          className="text-muted-foreground size-3.5"
        />
      </MenuTrigger>
      <MenuPopup align="end" className="min-w-44 [&_svg]:size-4">
        <MenuItem onClick={() => onApply({ light: {}, dark: {} })}>
          <Icon icon={PaintBoardIcon} />
          Default
        </MenuItem>
        <MenuSeparator />
        {THEME_PRESETS.map((preset) => (
          <MenuItem
            key={preset.id}
            onClick={() => onApply({ light: preset.light, dark: preset.dark })}
          >
            {BRAND_ICONS[preset.id]}
            {preset.label}
          </MenuItem>
        ))}
      </MenuPopup>
    </Menu>
  );
}

type ThemeOverridesPair = Pick<CustomTheme, "light" | "dark">;

/* A theme someone copied, pasted back in. */
function ImportTheme({ onImport }: { onImport: (theme: CustomTheme) => void }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [failed, setFailed] = useState(false);

  const submit = () => {
    let theme: CustomTheme | null = null;
    try {
      theme = readCustomTheme(JSON.parse(text));
    } catch {
      theme = null;
    }
    if (!theme || isCustomThemeEmpty(theme)) {
      setFailed(true);
      return;
    }
    onImport(theme);
    setText("");
    setFailed(false);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={<Button variant="ghost" size="sm" />}>
        <Icon icon={FileImportIcon} />
        Import
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="flex w-72 flex-col gap-2 p-3 text-[0.8125rem] leading-5"
      >
        <label htmlFor={id} className="font-medium">
          Paste a theme
        </label>
        <textarea
          id={id}
          data-slot="input"
          rows={5}
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            setFailed(false);
          }}
          aria-invalid={failed || undefined}
          aria-describedby={failed ? `${id}-error` : undefined}
          spellCheck={false}
          placeholder={`{ "format": "${THEME_FORMAT}", ... }`}
          className="placeholder:text-muted-foreground resize-none rounded-lg border px-2.5 py-1.5 font-mono text-xs"
        />
        {failed && (
          <p id={`${id}-error`} role="alert" className="text-destructive">
            That is not a theme this app can read.
          </p>
        )}
        <Button size="sm" className="self-end" onClick={submit}>
          Import
        </Button>
      </PopoverContent>
    </Popover>
  );
}

function CopyTheme({ theme }: { theme: CustomTheme }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() =>
        navigator.clipboard
          .writeText(
            JSON.stringify({ format: THEME_FORMAT, ...theme }, null, 2),
          )
          .then(
            () => setCopied(true),
            () => setCopied(false),
          )
      }
    >
      <Icon icon={copied ? Tick02Icon : Copy01Icon} />
      {copied ? "Copied" : "Copy theme"}
    </Button>
  );
}

/* A setting whose choices open in a menu. */
function ChoiceMenu<Value extends string>({
  label,
  value,
  choices,
  onChange,
}: {
  label: string;
  value: Value;
  choices: readonly { value: Value; label: string }[];
  onChange: (value: Value) => void;
}) {
  return (
    <Menu>
      <MenuTrigger aria-label={label} className={menuButton}>
        {choices.find((choice) => choice.value === value)?.label}
        <Icon
          icon={ArrowDown01Icon}
          className="text-muted-foreground size-3.5"
        />
      </MenuTrigger>
      <MenuPopup align="end">
        <MenuRadioGroup
          value={value}
          onValueChange={(next) => onChange(next as Value)}
        >
          {choices.map((choice) => (
            <MenuChoice key={choice.value} value={choice.value}>
              {choice.label}
            </MenuChoice>
          ))}
        </MenuRadioGroup>
      </MenuPopup>
    </Menu>
  );
}

const MOTION_CHOICES = [
  { value: "system", label: "System" },
  { value: "reduce", label: "On" },
  { value: "allow", label: "Off" },
] as const;

function Section({
  title,
  note,
  actions,
  children,
}: {
  title: string;
  note?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <div className="flex min-w-0 flex-col">
          <h4 className="font-medium">{title}</h4>
          {note && <p className="text-muted-foreground">{note}</p>}
        </div>
        {actions && <div className="flex items-center gap-0.5">{actions}</div>}
      </div>
      <div className="divide-border flex flex-col divide-y">{children}</div>
    </section>
  );
}

/**
 * How the app looks: light or dark, the colors and tint of the mode that is
 * showing, and the choices that hold in both. A color that was never changed
 * shows what the stylesheet gives it.
 */
export function Appearance() {
  const { choice, dark } = useTheme();
  const custom = useCustomTheme();
  const mode = dark ? "dark" : "light";
  const overrides = custom[mode];

  const update = (next: ThemeOverrides) =>
    setCustomTheme({ ...custom, [mode]: next });

  const options = {
    translucentSidebar: custom.translucentSidebar === true,
    motion: custom.motion ?? ("system" as const),
    codeTheme: custom.codeTheme ?? DEFAULT_CODE_THEME,
  };

  /* A choice at its default is left out, so the saved theme stays small. */
  const setOptions = (next: typeof options) =>
    setCustomTheme({
      light: custom.light,
      dark: custom.dark,
      ...(next.translucentSidebar ? { translucentSidebar: true } : {}),
      ...(next.motion === "system" ? {} : { motion: next.motion }),
      ...(next.codeTheme === DEFAULT_CODE_THEME
        ? {}
        : { codeTheme: next.codeTheme }),
    });

  return (
    <>
      <div className="flex flex-col gap-2">
        <p id="settings-mode" className="font-medium">
          Mode
        </p>
        <RadioGroup
          aria-labelledby="settings-mode"
          value={choice}
          onValueChange={(value) => setTheme(value as ThemeChoice)}
          className="grid grid-cols-3 gap-2"
        >
          {MODES.map((entry) => (
            <Radio.Root
              key={entry.value}
              value={entry.value}
              className={cn(
                "border-border hover:bg-foreground/[0.04] data-checked:border-primary data-checked:bg-primary/5 flex h-16 flex-col items-center justify-center gap-1.5 rounded-lg border transition-colors motion-reduce:transition-none [&_svg]:size-4",
                focusRing,
              )}
            >
              <Icon icon={entry.icon} />
              {entry.label}
            </Radio.Root>
          ))}
        </RadioGroup>
      </div>

      <Section
        title="Theme"
        note={`Colors for the ${mode} mode.`}
        actions={
          <>
            <Presets
              onApply={(pair) => setCustomTheme({ ...custom, ...pair })}
            />
            <ImportTheme onImport={setCustomTheme} />
            <CopyTheme theme={custom} />
          </>
        }
      >
        {THEME_COLORS.map((color) => (
          <div key={color.key} className={settingRow}>
            <span>{color.label}</span>
            <div className="flex items-center gap-1">
              <ColorPicker
                label={color.label}
                value={
                  overrides[color.key] ??
                  resolveCssColor(`var(${color.variable})`) ??
                  "#000000"
                }
                onValueChange={(value) => {
                  if (isThemeColor(value))
                    update({ ...overrides, [color.key]: value });
                }}
                swatches={SWATCHES}
                opacity={false}
              />
              <ResetButton
                label={color.label}
                disabled={overrides[color.key] === undefined}
                onClick={() => update(without(overrides, color.key))}
              />
            </div>
          </div>
        ))}
        <div className={settingRow}>
          <span id="settings-tint">Tint</span>
          <div className="flex w-3/5 items-center gap-2">
            <Slider
              aria-labelledby="settings-tint"
              min={0}
              max={360}
              value={[overrides.tint ?? TINT_REST]}
              onValueChange={(value) => {
                const tint = Array.isArray(value) ? value[0] : value;
                if (typeof tint === "number") update({ ...overrides, tint });
              }}
            />
            <span className="text-muted-foreground w-8 shrink-0 text-end tabular-nums">
              {overrides.tint ?? "Off"}
            </span>
            <ResetButton
              label="Tint"
              disabled={overrides.tint === undefined}
              onClick={() => update(without(overrides, "tint"))}
            />
          </div>
        </div>
      </Section>

      <Section title="Options">
        <div className={settingRow}>
          <span id="settings-translucent">Translucent sidebar</span>
          <Switch
            aria-labelledby="settings-translucent"
            checked={options.translucentSidebar}
            onCheckedChange={(translucentSidebar) =>
              setOptions({ ...options, translucentSidebar })
            }
          />
        </div>
        <div className={settingRow}>
          <span>Reduce motion</span>
          <ChoiceMenu
            label="Reduce motion"
            value={options.motion}
            choices={MOTION_CHOICES}
            onChange={(motion) => setOptions({ ...options, motion })}
          />
        </div>
        <div className={settingRow}>
          <span>Code theme</span>
          <ChoiceMenu<CodeThemeId>
            label="Code theme"
            value={options.codeTheme}
            choices={CODE_THEMES.map((theme) => ({
              value: theme.id,
              label: theme.label,
            }))}
            onChange={(codeTheme) => setOptions({ ...options, codeTheme })}
          />
        </div>
      </Section>
    </>
  );
}
