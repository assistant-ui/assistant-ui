"use client";

import { CircleAlertIcon, SunIcon, MoonIcon } from "lucide-react";

import { Select } from "@/components/assistant-ui/select";
import { Switch } from "@/components/shared/switch";
import {
  ThemeColorPicker,
  OptionalThemeColorPicker,
} from "@/components/shared/color-picker";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  BORDER_RADIUSES,
  CODE_HIGHLIGHT_THEMES,
  DEFAULT_COLORS,
  FONT_FAMILIES,
  FONT_SIZES,
  LOADING_INDICATORS,
  MAX_WIDTHS,
  MESSAGE_SPACINGS,
  TYPING_INDICATORS,
  USER_MESSAGE_POSITIONS,
  type BuilderConfig,
  type BorderRadius,
  type CodeHighlightTheme,
  type FontSize,
  type LoadingIndicator,
  type MessageSpacing,
  type ThemeColor,
  type TypingIndicator,
} from "./types";
import { PRESETS } from "./presets";
import { analytics } from "@/lib/analytics";

interface BuilderControlsProps {
  config: BuilderConfig;
  onChange: (config: BuilderConfig) => void;
}

export function BuilderControls({ config, onChange }: BuilderControlsProps) {
  const updateComponents = (updates: Partial<BuilderConfig["components"]>) => {
    onChange({
      ...config,
      components: { ...config.components, ...updates },
    });
  };

  const updateStyles = (updates: Partial<BuilderConfig["styles"]>) => {
    onChange({
      ...config,
      styles: { ...config.styles, ...updates },
    });
  };

  const updateColor = <K extends keyof BuilderConfig["styles"]["colors"]>(
    key: K,
    value: BuilderConfig["styles"]["colors"][K],
  ) => {
    onChange({
      ...config,
      styles: {
        ...config.styles,
        colors: { ...config.styles.colors, [key]: value },
      },
    });
  };

  const updateOptionalColor = <
    K extends keyof BuilderConfig["styles"]["colors"],
  >(
    key: K,
    value: ThemeColor | undefined,
  ) => {
    const newColors = { ...config.styles.colors };
    if (value === undefined) {
      delete newColors[key];
    } else {
      newColors[key] = value;
    }
    onChange({
      ...config,
      styles: {
        ...config.styles,
        colors: newColors,
      },
    });
  };

  const updateActionBar = (
    updates: Partial<BuilderConfig["components"]["actionBar"]>,
  ) => {
    onChange({
      ...config,
      components: {
        ...config.components,
        actionBar: { ...config.components.actionBar, ...updates },
      },
    });
  };

  const { components, styles } = config;

  return (
    <div className="scrollbar-none h-full overflow-y-auto">
      <div className="space-y-5">
        <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-1">
          <span className="font-medium text-sm">Preset</span>
          <PresetSelect config={config} onChange={onChange} />
        </div>

        <Section
          title="Messages"
          headerRight={<ColorModeHeader />}
          withDivider={false}
        >
          <div className="space-y-1">
            <Row
              label="User Position"
              control={
                <Select
                  value={styles.userMessagePosition}
                  onValueChange={(value) =>
                    updateStyles({
                      userMessagePosition: value as "left" | "right",
                    })
                  }
                  options={USER_MESSAGE_POSITIONS}
                />
              }
            />
            <Row
              label="User Background"
              control={
                <ThemeColorPicker
                  value={
                    styles.colors.userMessage ?? DEFAULT_COLORS.userMessage
                  }
                  onChange={(value) => updateColor("userMessage", value)}
                />
              }
            />
            <SwitchColorRow
              label="Assistant Background"
              enabled={styles.colors.assistantMessage !== undefined}
              onEnabledChange={(enabled) => {
                if (enabled) {
                  updateOptionalColor(
                    "assistantMessage",
                    DEFAULT_COLORS.background,
                  );
                } else {
                  updateOptionalColor("assistantMessage", undefined);
                }
              }}
              color={styles.colors.assistantMessage}
              defaultColor={DEFAULT_COLORS.background}
              onColorChange={(color) =>
                updateOptionalColor("assistantMessage", color)
              }
            />
            <Row
              label="Spacing"
              control={
                <Select
                  value={styles.messageSpacing}
                  onValueChange={(value) =>
                    updateStyles({ messageSpacing: value as MessageSpacing })
                  }
                  options={MESSAGE_SPACINGS}
                />
              }
            />
            <Row
              label="Edit"
              control={
                <Switch
                  checked={components.editMessage}
                  onCheckedChange={(checked) =>
                    updateComponents({ editMessage: checked })
                  }
                />
              }
            />
            <Row
              label="Branch Picker"
              control={
                <Switch
                  checked={components.branchPicker}
                  onCheckedChange={(checked) =>
                    updateComponents({ branchPicker: checked })
                  }
                />
              }
            />
          </div>
        </Section>

        <Section title="Thread">
          <div className="space-y-1">
            <Row
              label="Welcome"
              control={
                <Switch
                  checked={components.threadWelcome}
                  onCheckedChange={(checked) =>
                    updateComponents({ threadWelcome: checked })
                  }
                />
              }
            />
            <Row
              label="Scroll to Bottom"
              control={
                <Switch
                  checked={components.scrollToBottom}
                  onCheckedChange={(checked) =>
                    updateComponents({ scrollToBottom: checked })
                  }
                />
              }
            />
            <Row
              label="Max Width"
              control={
                <Select
                  value={styles.maxWidth}
                  onValueChange={(value) => updateStyles({ maxWidth: value })}
                  options={MAX_WIDTHS}
                />
              }
            />
          </div>
        </Section>

        <Section title="Composer" headerRight={<ColorModeHeader />}>
          <div className="space-y-1">
            <Row
              label="Attachments"
              control={
                <Switch
                  checked={components.attachments}
                  onCheckedChange={(checked) =>
                    updateComponents({ attachments: checked })
                  }
                />
              }
            />
            <SwitchColorRow
              label="Background"
              enabled={styles.colors.composer !== undefined}
              onEnabledChange={(enabled) => {
                if (enabled) {
                  updateOptionalColor("composer", DEFAULT_COLORS.composer);
                } else {
                  updateOptionalColor("composer", undefined);
                }
              }}
              color={styles.colors.composer}
              defaultColor={DEFAULT_COLORS.composer}
              onColorChange={(color) => updateOptionalColor("composer", color)}
            />
          </div>
        </Section>

        <Section title="Content">
          <div className="space-y-1">
            <Row
              label="Markdown"
              control={
                <Switch
                  checked={components.markdown}
                  onCheckedChange={(checked) =>
                    updateComponents({ markdown: checked })
                  }
                />
              }
            />
            {components.markdown && (
              <IndentedRow
                label="Code Theme"
                info={
                  <>
                    Syntax highlighting powered by{" "}
                    <a
                      href="https://shiki.style/themes"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline"
                    >
                      Shiki
                    </a>
                  </>
                }
                control={
                  <Select
                    value={components.codeHighlightTheme}
                    onValueChange={(value) =>
                      updateComponents({
                        codeHighlightTheme: value as CodeHighlightTheme,
                      })
                    }
                    options={CODE_HIGHLIGHT_THEMES}
                  />
                }
              />
            )}
            <Row
              label="Reasoning"
              control={
                <Switch
                  checked={components.reasoning}
                  onCheckedChange={(checked) =>
                    updateComponents({ reasoning: checked })
                  }
                />
              }
            />
            <Row
              label="Sources"
              control={
                <Switch
                  checked={components.sources}
                  onCheckedChange={(checked) =>
                    updateComponents({ sources: checked })
                  }
                />
              }
            />
            <Row
              label="Follow-ups"
              control={
                <Switch
                  checked={components.followUpSuggestions}
                  onCheckedChange={(checked) =>
                    updateComponents({ followUpSuggestions: checked })
                  }
                />
              }
            />
            <Row
              label="Suggestions"
              control={
                <Switch
                  checked={components.suggestions}
                  onCheckedChange={(checked) =>
                    updateComponents({ suggestions: checked })
                  }
                />
              }
            />
            {components.suggestions && (
              <>
                <IndentedRow
                  label="Background"
                  control={
                    <OptionalThemeColorPicker
                      value={styles.colors.suggestion}
                      defaultValue={DEFAULT_COLORS.suggestion}
                      onChange={(value) =>
                        updateOptionalColor("suggestion", value)
                      }
                    />
                  }
                />
                <IndentedRow
                  label="Border"
                  control={
                    <OptionalThemeColorPicker
                      value={styles.colors.suggestionBorder}
                      defaultValue={DEFAULT_COLORS.suggestionBorder}
                      onChange={(value) =>
                        updateOptionalColor("suggestionBorder", value)
                      }
                    />
                  }
                />
              </>
            )}
          </div>
        </Section>

        <SectionWithToggle
          title="Avatar"
          headerRight={<ColorModeHeader />}
          enabled={components.avatar}
          onEnabledChange={(checked) => updateComponents({ avatar: checked })}
        >
          <div className="space-y-1">
            <Row
              label="User"
              control={
                <OptionalThemeColorPicker
                  value={styles.colors.userAvatar}
                  defaultValue={DEFAULT_COLORS.userAvatar}
                  onChange={(value) => updateOptionalColor("userAvatar", value)}
                />
              }
            />
            <Row
              label="Assistant"
              control={
                <OptionalThemeColorPicker
                  value={styles.colors.assistantAvatar}
                  defaultValue={DEFAULT_COLORS.assistantAvatar}
                  onChange={(value) =>
                    updateOptionalColor("assistantAvatar", value)
                  }
                />
              }
            />
          </div>
        </SectionWithToggle>

        <Section title="Loading">
          <div className="space-y-1">
            <Row
              label="Typing Indicator"
              control={
                <Select
                  value={components.typingIndicator}
                  onValueChange={(value) =>
                    updateComponents({
                      typingIndicator: value as TypingIndicator,
                    })
                  }
                  options={TYPING_INDICATORS}
                />
              }
            />
            <Row
              label="Loading Style"
              control={
                <Select
                  value={components.loadingIndicator}
                  onValueChange={(value) =>
                    updateComponents({
                      loadingIndicator: value as LoadingIndicator,
                    })
                  }
                  options={LOADING_INDICATORS}
                />
              }
            />
            {components.loadingIndicator === "text" && (
              <IndentedRow
                label="Text"
                control={
                  <input
                    type="text"
                    value={components.loadingText}
                    onChange={(e) =>
                      updateComponents({ loadingText: e.target.value })
                    }
                    className="h-7 w-32 rounded-md border bg-background px-2 text-sm"
                    placeholder="Thinking..."
                  />
                }
              />
            )}
          </div>
        </Section>

        <Section title="Actions">
          <div className="space-y-1">
            <Row
              label="Copy"
              control={
                <Switch
                  checked={components.actionBar.copy}
                  onCheckedChange={(checked) =>
                    updateActionBar({ copy: checked })
                  }
                />
              }
            />
            <Row
              label="Reload"
              control={
                <Switch
                  checked={components.actionBar.reload}
                  onCheckedChange={(checked) =>
                    updateActionBar({ reload: checked })
                  }
                />
              }
            />
            <Row
              label="Speak"
              control={
                <Switch
                  checked={components.actionBar.speak}
                  onCheckedChange={(checked) =>
                    updateActionBar({ speak: checked })
                  }
                />
              }
            />
            <Row
              label="Feedback"
              control={
                <Switch
                  checked={components.actionBar.feedback}
                  onCheckedChange={(checked) =>
                    updateActionBar({ feedback: checked })
                  }
                />
              }
            />
          </div>
        </Section>

        <Section title="Typography">
          <div className="space-y-1">
            <Row
              label="Font"
              control={
                <Select
                  value={styles.fontFamily}
                  onValueChange={(value) => updateStyles({ fontFamily: value })}
                  options={FONT_FAMILIES}
                />
              }
            />
            <Row
              label="Size"
              control={
                <Select
                  value={styles.fontSize}
                  onValueChange={(value) =>
                    updateStyles({ fontSize: value as FontSize })
                  }
                  options={FONT_SIZES}
                />
              }
            />
          </div>
        </Section>

        <Section title="Layout">
          <div className="space-y-1">
            <Row
              label="Radius"
              control={
                <Select
                  value={styles.borderRadius}
                  onValueChange={(value) =>
                    updateStyles({ borderRadius: value as BorderRadius })
                  }
                  options={BORDER_RADIUSES}
                />
              }
            />
            <Row
              label="Animations"
              control={
                <Switch
                  checked={styles.animations}
                  onCheckedChange={(checked) =>
                    updateStyles({ animations: checked })
                  }
                />
              }
            />
          </div>
        </Section>

        <Section title="Colors" headerRight={<ColorModeHeader />}>
          <div className="space-y-1">
            <Row
              label="Accent"
              control={
                <ThemeColorPicker
                  value={styles.colors.accent}
                  onChange={(value) => updateColor("accent", value)}
                />
              }
            />
            <Row
              label="Background"
              control={
                <OptionalThemeColorPicker
                  value={styles.colors.background}
                  defaultValue={DEFAULT_COLORS.background}
                  onChange={(value) => updateOptionalColor("background", value)}
                />
              }
            />
            <Row
              label="Foreground"
              control={
                <OptionalThemeColorPicker
                  value={styles.colors.foreground}
                  defaultValue={DEFAULT_COLORS.foreground}
                  onChange={(value) => updateOptionalColor("foreground", value)}
                />
              }
            />
            <Row
              label="Muted"
              control={
                <OptionalThemeColorPicker
                  value={styles.colors.mutedForeground}
                  defaultValue={DEFAULT_COLORS.mutedForeground}
                  onChange={(value) =>
                    updateOptionalColor("mutedForeground", value)
                  }
                />
              }
            />
            <Row
              label="Border"
              control={
                <OptionalThemeColorPicker
                  value={styles.colors.border}
                  defaultValue={DEFAULT_COLORS.border}
                  onChange={(value) => updateOptionalColor("border", value)}
                />
              }
            />
          </div>
        </Section>
      </div>
    </div>
  );
}

function Section({
  title,
  headerRight,
  children,
  withDivider = true,
}: {
  title: string;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
  withDivider?: boolean;
}) {
  return (
    <div
      className={
        withDivider ? "space-y-2 border-border/50 border-t pt-4" : "space-y-2"
      }
    >
      <div className="flex items-center justify-between">
        <span className="font-medium text-muted-foreground text-xs">
          {title}
        </span>
        {headerRight}
      </div>
      {children}
    </div>
  );
}

function SectionWithToggle({
  title,
  headerRight,
  enabled,
  onEnabledChange,
  children,
}: {
  title: string;
  headerRight?: React.ReactNode;
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2 border-border/50 border-t pt-4">
      <div className="flex items-center justify-between">
        <span className="font-medium text-muted-foreground text-xs">
          {title}
        </span>
        <div className="flex items-center gap-2">
          {enabled && headerRight}
          <Switch checked={enabled} onCheckedChange={onEnabledChange} />
        </div>
      </div>
      {enabled && children}
    </div>
  );
}

function ColorModeHeader() {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex gap-1">
          <div className="flex size-5 items-center justify-center">
            <SunIcon className="size-3.5 text-muted-foreground" />
          </div>
          <div className="flex size-5 items-center justify-center">
            <MoonIcon className="size-3.5 text-muted-foreground" />
          </div>
        </div>
      </TooltipTrigger>
      <TooltipContent side="top">Light &amp; Dark mode colors</TooltipContent>
    </Tooltip>
  );
}

function Row({
  label,
  control,
  info,
}: {
  label: string;
  control: React.ReactNode;
  info?: React.ReactNode;
}) {
  return (
    <div className="flex h-7 items-center justify-between">
      <span className="flex items-center gap-2 text-sm">
        {label}
        {info && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="flex items-center text-muted-foreground hover:text-foreground"
              >
                <CircleAlertIcon className="size-3" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">{info}</TooltipContent>
          </Tooltip>
        )}
      </span>
      {control}
    </div>
  );
}

function IndentedRow({
  label,
  control,
  info,
}: {
  label: string;
  control: React.ReactNode;
  info?: React.ReactNode;
}) {
  return (
    <div className="ml-4 border-border border-l pl-3">
      <Row label={label} control={control} info={info} />
    </div>
  );
}

function SwitchColorRow({
  label,
  enabled,
  onEnabledChange,
  color,
  defaultColor,
  onColorChange,
}: {
  label: string;
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  color: ThemeColor | undefined;
  defaultColor: ThemeColor;
  onColorChange: (color: ThemeColor | undefined) => void;
}) {
  return (
    <div className="flex h-7 items-center justify-between">
      <span className="text-sm">{label}</span>
      <div className="flex items-center gap-2">
        <Switch
          checked={enabled}
          onCheckedChange={(checked) => {
            onEnabledChange(checked);
            if (!checked) onColorChange(undefined);
          }}
        />
        <div className={enabled ? "" : "pointer-events-none opacity-40"}>
          <ThemeColorPicker
            value={color ?? defaultColor}
            onChange={onColorChange}
          />
        </div>
      </div>
    </div>
  );
}

function PresetSelect({
  config,
  onChange,
}: {
  config: BuilderConfig;
  onChange: (config: BuilderConfig) => void;
}) {
  const currentPreset = PRESETS.find(
    (preset) => JSON.stringify(preset.config) === JSON.stringify(config),
  );

  const options = PRESETS.map((preset) => ({
    label: preset.name,
    value: preset.id,
  }));

  return (
    <Select
      value={currentPreset?.id ?? ""}
      onValueChange={(id) => {
        const preset = PRESETS.find((p) => p.id === id);
        if (preset) {
          analytics.builder.presetSelected(preset.name);
          onChange(preset.config);
        }
      }}
      options={options}
      placeholder="Custom"
    />
  );
}
