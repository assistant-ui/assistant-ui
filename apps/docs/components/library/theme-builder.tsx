"use client";

import { useId, useState, type ReactNode } from "react";
import { ElementDemo } from "@/components/pages/elements/element-demos";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { agentSetupPrompt } from "@/lib/agent-setup-prompt";
import {
  THEME_ACCENT_COLORS,
  THEME_BASE_COLORS,
  type ThemeAccentColor,
  type ThemeBaseColor,
} from "@/lib/library/theme-colors";
import {
  LIBRARY_THEMES,
  THEME_FONTS,
  THEME_ICON_LIBRARIES,
  THEME_MENU_ACCENTS,
  THEME_MENU_COLORS,
  THEME_RADII,
  THEME_STYLES,
  getLibraryTheme,
  themeApplyCommand,
  themeOverridesCss,
  themePresetUrl,
  themeSummary,
  themeTitle,
  type ThemeColorChoice,
  type ThemeOverrides,
  type ThemeSettings,
} from "@/lib/library/themes";
import { LibraryPage } from "./library-page";
import { CopyLine } from "./setup-page";
import { ThemeScope, ThemeSwatches, themeHeadingFamily } from "./theme-preview";

type Option<Value extends string> = {
  value: Value;
  label: string;
  /** Shown as a dot before the label, on a choice that is a color. */
  color?: string;
};

const titled = <Value extends string>(
  values: readonly Value[],
): Option<Value>[] =>
  values.map((value) => ({ value, label: themeTitle(value) }));

const labeled = <Value extends string>(
  labels: Record<Value, string>,
): Option<Value>[] =>
  (Object.entries(labels) as [Value, string][]).map(([value, label]) => ({
    value,
    label,
  }));

const START_OPTIONS = LIBRARY_THEMES.map((theme) => ({
  value: theme.slug,
  label: theme.name,
}));
const STYLE_OPTIONS = titled(THEME_STYLES);
const ICON_OPTIONS = labeled(THEME_ICON_LIBRARIES);
const FONT_OPTIONS = labeled(THEME_FONTS);
const HEADING_OPTIONS: Option<ThemeSettings["fontHeading"]>[] = [
  { value: "inherit", label: "Same as body" },
  ...FONT_OPTIONS,
];
const RADIUS_OPTIONS = titled(THEME_RADII);
const MENU_ACCENT_OPTIONS = titled(THEME_MENU_ACCENTS);
const MENU_COLOR_OPTIONS = labeled(THEME_MENU_COLORS);

const BASE_COLORS = Object.keys(THEME_BASE_COLORS) as ThemeBaseColor[];
const ACCENT_COLORS = Object.keys(THEME_ACCENT_COLORS) as ThemeAccentColor[];

/** The color a swatch shows for a base: its grey, where the tint is visible. */
const baseSwatch = (color: ThemeBaseColor) =>
  THEME_BASE_COLORS[color].light["muted-foreground"];

function Field({
  label,
  children,
}: {
  label: string;
  children: (id: string) => ReactNode;
}) {
  const id = useId();
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className="text-muted-foreground text-xs">
        {label}
      </label>
      {children(id)}
    </div>
  );
}

function OptionLabel({ option }: { option: Option<string> | undefined }) {
  if (!option) return null;
  return (
    <span className="flex items-center gap-2">
      {option.color ? (
        <span
          aria-hidden
          style={{ background: option.color }}
          className="border-foreground/10 size-3 shrink-0 rounded-full border"
        />
      ) : null}
      {option.label}
    </span>
  );
}

function SelectField<Value extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: Value;
  options: readonly Option<Value>[];
  onChange: (value: Value) => void;
}) {
  return (
    <Field label={label}>
      {(id) => (
        <Select
          items={options}
          value={value}
          onValueChange={(next) => {
            if (next !== null) onChange(next);
          }}
        >
          <SelectTrigger id={id} className="w-full">
            <SelectValue>
              {(current: Value) => (
                <OptionLabel
                  option={options.find((option) => option.value === current)}
                />
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                <OptionLabel option={option} />
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </Field>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-strong text-sm">{title}</h2>
      {children}
    </section>
  );
}

const fieldGrid = "grid grid-cols-1 gap-4 @md:grid-cols-2";

/**
 * Makes a theme: every setting a shadcn preset carries, a chat drawn in the
 * colors and fonts chosen, and the command that applies the result.
 */
export function ThemeBuilder({
  description,
  from,
}: {
  description: string;
  /** The theme to start from, by its slug. */
  from?: string | undefined;
}) {
  const initial = (from && getLibraryTheme(from)) || LIBRARY_THEMES[0]!;
  const [start, setStart] = useState(initial.slug);
  const [name, setName] = useState("My theme");
  const [settings, setSettings] = useState<ThemeSettings>(initial.settings);
  const [overrides, setOverrides] = useState<ThemeOverrides | undefined>(
    initial.overrides,
  );

  const set = <Key extends keyof ThemeSettings>(
    key: Key,
    value: ThemeSettings[Key],
  ) => setSettings((current) => ({ ...current, [key]: value }));

  const baseOptions = BASE_COLORS.map((color) => ({
    value: color,
    label: themeTitle(color),
    color: baseSwatch(color),
  }));
  const baseChoice = {
    value: "base" as const,
    label: themeTitle(settings.baseColor),
    color: baseSwatch(settings.baseColor),
  };
  const accentOptions: Option<ThemeColorChoice>[] = [
    baseChoice,
    ...ACCENT_COLORS.map((color) => ({
      value: color,
      label: themeTitle(color),
      color: THEME_ACCENT_COLORS[color].theme.light.primary,
    })),
  ];
  const chartOptions: Option<ThemeColorChoice>[] = [
    baseChoice,
    ...ACCENT_COLORS.map((color) => ({
      value: color,
      label: themeTitle(color),
      color: THEME_ACCENT_COLORS[color].chart.light["chart-2"],
    })),
  ];

  const command = themeApplyCommand(themePresetUrl(settings));
  const css = overrides && themeOverridesCss(overrides);
  const themeName = name.trim() || "My theme";

  return (
    <LibraryPage title="New theme" search={false} description={description}>
      <div className="@container">
        <div className="grid grid-cols-1 items-start gap-x-10 gap-y-8 @3xl:grid-cols-[minmax(0,1fr)_26rem]">
          <div className="flex flex-col gap-8">
            <div className={fieldGrid}>
              <SelectField
                label="Start from"
                value={start}
                options={START_OPTIONS}
                onChange={(slug) => {
                  const theme = getLibraryTheme(slug);
                  if (!theme) return;
                  setStart(slug);
                  setSettings(theme.settings);
                  setOverrides(theme.overrides);
                }}
              />
              <Field label="Name">
                {(id) => (
                  <Input
                    id={id}
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    autoComplete="off"
                  />
                )}
              </Field>
            </div>

            <Group title="Colors">
              <div className={fieldGrid}>
                <SelectField
                  label="Base"
                  value={settings.baseColor}
                  options={baseOptions}
                  onChange={(value) => set("baseColor", value)}
                />
                <SelectField
                  label="Accent"
                  value={settings.theme}
                  options={accentOptions}
                  onChange={(value) => set("theme", value)}
                />
                <SelectField
                  label="Charts"
                  value={settings.chartColor}
                  options={chartOptions}
                  onChange={(value) => set("chartColor", value)}
                />
              </div>
            </Group>

            <Group title="Type">
              <div className={fieldGrid}>
                <SelectField
                  label="Body font"
                  value={settings.font}
                  options={FONT_OPTIONS}
                  onChange={(value) => set("font", value)}
                />
                <SelectField
                  label="Heading font"
                  value={settings.fontHeading}
                  options={HEADING_OPTIONS}
                  onChange={(value) => set("fontHeading", value)}
                />
              </div>
            </Group>

            <Group title="Components">
              <div className={fieldGrid}>
                <SelectField
                  label="Style"
                  value={settings.style}
                  options={STYLE_OPTIONS}
                  onChange={(value) => set("style", value)}
                />
                <SelectField
                  label="Icons"
                  value={settings.iconLibrary}
                  options={ICON_OPTIONS}
                  onChange={(value) => set("iconLibrary", value)}
                />
                <SelectField
                  label="Radius"
                  value={settings.radius}
                  options={RADIUS_OPTIONS}
                  onChange={(value) => set("radius", value)}
                />
                <SelectField
                  label="Menu color"
                  value={settings.menuColor}
                  options={MENU_COLOR_OPTIONS}
                  onChange={(value) => set("menuColor", value)}
                />
                <SelectField
                  label="Menu accent"
                  value={settings.menuAccent}
                  options={MENU_ACCENT_OPTIONS}
                  onChange={(value) => set("menuAccent", value)}
                />
              </div>
            </Group>
          </div>

          <div className="flex flex-col gap-3 @3xl:sticky @3xl:top-14">
            <ThemeScope
              settings={settings}
              overrides={overrides}
              className="border-foreground/10 rounded-document flex flex-col overflow-hidden border"
            >
              <div className="flex flex-col gap-1 px-5 pt-5">
                <h2
                  style={{ fontFamily: themeHeadingFamily(settings) }}
                  className="text-xl leading-7 tracking-tight"
                >
                  {themeName}
                </h2>
                <p className="text-muted-foreground text-sm">
                  {themeSummary(settings)}
                </p>
              </div>
              <div className="flex min-h-56 items-center justify-center p-5">
                <ElementDemo demo="message-pair" />
              </div>
              <div className="flex flex-wrap gap-2 px-5 pb-5">
                <Button size="sm">Primary</Button>
                <Button size="sm" variant="secondary">
                  Secondary
                </Button>
                <Button size="sm" variant="outline">
                  Outline
                </Button>
              </div>
              <ThemeSwatches />
            </ThemeScope>
            <p className="text-muted-foreground text-xs">
              The preview shows the colors and fonts. Style, icons, radius, and
              menus take effect in the project the theme is applied to.
              {overrides
                ? " This theme's own colors sit over the ones chosen here."
                : null}
            </p>
            <CopyLine
              label="Apply it to a project"
              value={command}
              copied="Command copied."
              copyLabel="Copy the command that applies the theme"
            />
            {css ? (
              <>
                <CopyLine
                  label="Then add this to the global stylesheet"
                  value={css}
                  copied="Theme CSS copied."
                  copyLabel="Copy the theme's CSS"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="self-start"
                  onClick={() => setOverrides(undefined)}
                >
                  Remove the CSS overrides
                </Button>
              </>
            ) : null}
            <CopyLine
              label="Ask your coding agent"
              value={agentSetupPrompt(
                [],
                css
                  ? `Apply the ${themeName} theme with \`${command}\`, then add this to the global stylesheet: ${css}`
                  : `Apply the ${themeName} theme with \`${command}\``,
              )}
              copied="Prompt copied."
              copyLabel="Copy the prompt that applies the theme"
            />
          </div>
        </div>
      </div>
    </LibraryPage>
  );
}
