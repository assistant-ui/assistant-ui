"use client";

import { CircleAlertIcon } from "lucide-react";
import { Select } from "@/components/shared/select";
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

  return (
    <div className="scrollbar-none h-full overflow-y-auto">
      <div className="space-y-5">
        <Row
          label="Preset"
          control={<PresetSelect config={config} onChange={onChange} />}
        />

        <Section title="Features">
          <div className="space-y-1">
            <Row
              label="Attachments"
              control={
                <Switch
                  checked={config.components.attachments}
                  onCheckedChange={(checked) =>
                    updateComponents({ attachments: checked })
                  }
                />
              }
            />
            <Row
              label="Branch Picker"
              control={
                <Switch
                  checked={config.components.branchPicker}
                  onCheckedChange={(checked) =>
                    updateComponents({ branchPicker: checked })
                  }
                />
              }
            />
            <Row
              label="Edit Messages"
              control={
                <Switch
                  checked={config.components.editMessage}
                  onCheckedChange={(checked) =>
                    updateComponents({ editMessage: checked })
                  }
                />
              }
            />
            <Row
              label="Welcome Screen"
              control={
                <Switch
                  checked={config.components.threadWelcome}
                  onCheckedChange={(checked) =>
                    updateComponents({ threadWelcome: checked })
                  }
                />
              }
            />
            <Row
              label="Suggestions"
              control={
                <Switch
                  checked={config.components.suggestions}
                  onCheckedChange={(checked) =>
                    updateComponents({ suggestions: checked })
                  }
                />
              }
            />
            <Row
              label="Scroll to Bottom"
              control={
                <Switch
                  checked={config.components.scrollToBottom}
                  onCheckedChange={(checked) =>
                    updateComponents({ scrollToBottom: checked })
                  }
                />
              }
            />
            <Row
              label="Markdown"
              control={
                <Switch
                  checked={config.components.markdown}
                  onCheckedChange={(checked) =>
                    updateComponents({ markdown: checked })
                  }
                />
              }
            />
            {config.components.markdown && (
              <Row
                label="Code Theme"
                info={
                  <>
                    Syntax highlighting theme powered by{" "}
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
                    value={config.components.codeHighlightTheme}
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
                  checked={config.components.reasoning}
                  onCheckedChange={(checked) =>
                    updateComponents({ reasoning: checked })
                  }
                />
              }
            />
            <Row
              label="Follow-ups"
              control={
                <Switch
                  checked={config.components.followUpSuggestions}
                  onCheckedChange={(checked) =>
                    updateComponents({ followUpSuggestions: checked })
                  }
                />
              }
            />
            <Row
              label="Avatar"
              control={
                <Switch
                  checked={config.components.avatar}
                  onCheckedChange={(checked) =>
                    updateComponents({ avatar: checked })
                  }
                />
              }
            />
            <Row
              label="Typing Indicator"
              control={
                <Select
                  value={config.components.typingIndicator}
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
              label="Loading"
              control={
                <Select
                  value={config.components.loadingIndicator}
                  onValueChange={(value) =>
                    updateComponents({
                      loadingIndicator: value as LoadingIndicator,
                    })
                  }
                  options={LOADING_INDICATORS}
                />
              }
            />
            {config.components.loadingIndicator === "text" && (
              <Row
                label="Loading Text"
                control={
                  <input
                    type="text"
                    value={config.components.loadingText}
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
                  checked={config.components.actionBar.copy}
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
                  checked={config.components.actionBar.reload}
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
                  checked={config.components.actionBar.speak}
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
                  checked={config.components.actionBar.feedback}
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
                  value={config.styles.fontFamily}
                  onValueChange={(value) => updateStyles({ fontFamily: value })}
                  options={FONT_FAMILIES}
                />
              }
            />
            <Row
              label="Size"
              control={
                <Select
                  value={config.styles.fontSize}
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
              label="Max Width"
              control={
                <Select
                  value={config.styles.maxWidth}
                  onValueChange={(value) => updateStyles({ maxWidth: value })}
                  options={MAX_WIDTHS}
                />
              }
            />
            <Row
              label="Spacing"
              control={
                <Select
                  value={config.styles.messageSpacing}
                  onValueChange={(value) =>
                    updateStyles({ messageSpacing: value as MessageSpacing })
                  }
                  options={MESSAGE_SPACINGS}
                />
              }
            />
            <Row
              label="User Message"
              control={
                <Select
                  value={config.styles.userMessagePosition}
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
              label="Radius"
              control={
                <Select
                  value={config.styles.borderRadius}
                  onValueChange={(value) =>
                    updateStyles({ borderRadius: value as BorderRadius })
                  }
                  options={BORDER_RADIUSES}
                />
              }
            />
          </div>
        </Section>

        <Section title="Colors">
          <div className="space-y-1">
            <Row
              label="Accent"
              control={
                <ThemeColorPicker
                  value={config.styles.colors.accent}
                  onChange={(value) => updateColor("accent", value)}
                />
              }
            />
            <Row
              label="Background"
              control={
                <OptionalThemeColorPicker
                  value={config.styles.colors.background}
                  defaultValue={DEFAULT_COLORS.background}
                  onChange={(value) => updateOptionalColor("background", value)}
                />
              }
            />
            <Row
              label="Foreground"
              control={
                <OptionalThemeColorPicker
                  value={config.styles.colors.foreground}
                  defaultValue={DEFAULT_COLORS.foreground}
                  onChange={(value) => updateOptionalColor("foreground", value)}
                />
              }
            />
            <Row
              label="Muted"
              control={
                <OptionalThemeColorPicker
                  value={config.styles.colors.mutedForeground}
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
                  value={config.styles.colors.border}
                  defaultValue={DEFAULT_COLORS.border}
                  onChange={(value) => updateOptionalColor("border", value)}
                />
              }
            />
          </div>
        </Section>

        <Section title="Message Colors">
          <div className="space-y-1">
            <Row
              label="User Background"
              control={
                <OptionalThemeColorPicker
                  value={config.styles.colors.userMessage}
                  defaultValue={DEFAULT_COLORS.userMessage}
                  onChange={(value) =>
                    updateOptionalColor("userMessage", value)
                  }
                />
              }
            />
            <Row
              label="Assistant Background"
              control={
                <OptionalThemeColorPicker
                  value={config.styles.colors.assistantMessage}
                  defaultValue={DEFAULT_COLORS.background}
                  onChange={(value) =>
                    updateOptionalColor("assistantMessage", value)
                  }
                />
              }
            />
            <Row
              label="Composer"
              control={
                <OptionalThemeColorPicker
                  value={config.styles.colors.composer}
                  defaultValue={DEFAULT_COLORS.composer}
                  onChange={(value) => updateOptionalColor("composer", value)}
                />
              }
            />
          </div>
        </Section>

        {config.components.avatar && (
          <Section title="Avatar Colors">
            <div className="space-y-1">
              <Row
                label="User Avatar"
                control={
                  <OptionalThemeColorPicker
                    value={config.styles.colors.userAvatar}
                    defaultValue={DEFAULT_COLORS.userAvatar}
                    onChange={(value) =>
                      updateOptionalColor("userAvatar", value)
                    }
                  />
                }
              />
              <Row
                label="Assistant Avatar"
                control={
                  <OptionalThemeColorPicker
                    value={config.styles.colors.assistantAvatar}
                    defaultValue={DEFAULT_COLORS.assistantAvatar}
                    onChange={(value) =>
                      updateOptionalColor("assistantAvatar", value)
                    }
                  />
                }
              />
            </div>
          </Section>
        )}

        {config.components.suggestions && (
          <Section title="Suggestion Colors">
            <div className="space-y-1">
              <Row
                label="Background"
                control={
                  <OptionalThemeColorPicker
                    value={config.styles.colors.suggestion}
                    defaultValue={DEFAULT_COLORS.suggestion}
                    onChange={(value) =>
                      updateOptionalColor("suggestion", value)
                    }
                  />
                }
              />
              <Row
                label="Border"
                control={
                  <OptionalThemeColorPicker
                    value={config.styles.colors.suggestionBorder}
                    defaultValue={DEFAULT_COLORS.suggestionBorder}
                    onChange={(value) =>
                      updateOptionalColor("suggestionBorder", value)
                    }
                  />
                }
              />
            </div>
          </Section>
        )}

        <Section title="Style">
          <div className="space-y-1">
            <Row
              label="Animations"
              control={
                <Switch
                  checked={config.styles.animations}
                  onCheckedChange={(checked) =>
                    updateStyles({ animations: checked })
                  }
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
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <span className="font-medium text-muted-foreground text-xs">{title}</span>
      {children}
    </div>
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
        if (preset) onChange(preset.config);
      }}
      options={options}
      placeholder="Custom"
    />
  );
}
