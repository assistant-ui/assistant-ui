"use client";

import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RotateCcw } from "lucide-react";

import type {
  BuilderConfig,
  BorderRadius,
  UserMessagePosition,
  FontSize,
  MessageSpacing,
} from "./types";
import {
  ACCENT_COLORS,
  FONT_FAMILIES,
  MAX_WIDTHS,
  FONT_SIZES,
  MESSAGE_SPACINGS,
  DEFAULT_CONFIG,
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
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-4">
        <span className="font-medium text-sm">Settings</span>
        <button
          onClick={() => onChange(DEFAULT_CONFIG)}
          className="text-muted-foreground transition-colors hover:text-foreground"
          title="Reset"
        >
          <RotateCcw className="size-3.5" />
        </button>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-6 px-4 py-6">
          <Section title="Preset">
            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => onChange(preset.config)}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-xs transition-colors",
                    JSON.stringify(config) === JSON.stringify(preset.config)
                      ? "bg-foreground text-background"
                      : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground",
                  )}
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </Section>

          <Section title="Features">
            <div className="space-y-2.5">
              <Toggle
                label="Attachments"
                checked={config.components.attachments}
                onChange={(checked) =>
                  updateComponents({ attachments: checked })
                }
              />
              <Toggle
                label="Branch Picker"
                checked={config.components.branchPicker}
                onChange={(checked) =>
                  updateComponents({ branchPicker: checked })
                }
              />
              <Toggle
                label="Edit Messages"
                checked={config.components.editMessage}
                onChange={(checked) =>
                  updateComponents({ editMessage: checked })
                }
              />
              <Toggle
                label="Welcome Screen"
                checked={config.components.threadWelcome}
                onChange={(checked) =>
                  updateComponents({ threadWelcome: checked })
                }
              />
              <Toggle
                label="Suggestions"
                checked={config.components.suggestions}
                onChange={(checked) =>
                  updateComponents({ suggestions: checked })
                }
              />
              <Toggle
                label="Scroll to Bottom"
                checked={config.components.scrollToBottom}
                onChange={(checked) =>
                  updateComponents({ scrollToBottom: checked })
                }
              />
            </div>
          </Section>

          <Section title="Content">
            <div className="space-y-2.5">
              <Toggle
                label="Markdown"
                checked={config.components.markdown}
                onChange={(checked) => updateComponents({ markdown: checked })}
              />
              <Toggle
                label="Reasoning"
                checked={config.components.reasoning}
                onChange={(checked) => updateComponents({ reasoning: checked })}
              />
              <Toggle
                label="Follow-up Suggestions"
                checked={config.components.followUpSuggestions}
                onChange={(checked) =>
                  updateComponents({ followUpSuggestions: checked })
                }
              />
              <Toggle
                label="Avatar"
                checked={config.components.avatar}
                onChange={(checked) => updateComponents({ avatar: checked })}
              />
              <Toggle
                label="Typing Indicator"
                checked={config.components.typingIndicator}
                onChange={(checked) =>
                  updateComponents({ typingIndicator: checked })
                }
              />
            </div>
          </Section>

          <Section title="Actions">
            <div className="space-y-2.5">
              <Toggle
                label="Copy"
                checked={config.components.actionBar.copy}
                onChange={(checked) => updateActionBar({ copy: checked })}
              />
              <Toggle
                label="Reload"
                checked={config.components.actionBar.reload}
                onChange={(checked) => updateActionBar({ reload: checked })}
              />
              <Toggle
                label="Speak"
                checked={config.components.actionBar.speak}
                onChange={(checked) => updateActionBar({ speak: checked })}
              />
              <Toggle
                label="Feedback"
                checked={config.components.actionBar.feedback}
                onChange={(checked) => updateActionBar({ feedback: checked })}
              />
            </div>
          </Section>

          <Section title="Accent Color">
            <div className="flex flex-wrap gap-1.5">
              {ACCENT_COLORS.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  className={cn(
                    "size-6 rounded-full transition-all",
                    config.styles.accentColor === color.value
                      ? "ring-2 ring-foreground ring-offset-2 ring-offset-background"
                      : "hover:scale-110",
                  )}
                  style={{ backgroundColor: color.value }}
                  onClick={() => updateStyles({ accentColor: color.value })}
                  title={color.name}
                />
              ))}
            </div>
          </Section>

          <Section title="Border Radius">
            <div className="flex gap-1">
              {(["none", "sm", "md", "lg", "full"] as BorderRadius[]).map(
                (radius) => (
                  <button
                    key={radius}
                    className={cn(
                      "flex-1 rounded-md py-1.5 text-xs transition-colors",
                      config.styles.borderRadius === radius
                        ? "bg-foreground text-background"
                        : "bg-muted text-muted-foreground hover:text-foreground",
                    )}
                    onClick={() => updateStyles({ borderRadius: radius })}
                  >
                    {radius}
                  </button>
                ),
              )}
            </div>
          </Section>

          <Section title="Font">
            <Select
              value={config.styles.fontFamily}
              onValueChange={(value) => updateStyles({ fontFamily: value })}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FONT_FAMILIES.map((font) => (
                  <SelectItem key={font.value} value={font.value}>
                    {font.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Section>

          <Section title="Font Size">
            <div className="flex gap-1">
              {FONT_SIZES.map((size) => (
                <button
                  key={size.value}
                  className={cn(
                    "flex-1 rounded-md py-1.5 text-xs transition-colors",
                    config.styles.fontSize === size.value
                      ? "bg-foreground text-background"
                      : "bg-muted text-muted-foreground hover:text-foreground",
                  )}
                  onClick={() =>
                    updateStyles({ fontSize: size.value as FontSize })
                  }
                >
                  {size.name}
                </button>
              ))}
            </div>
          </Section>

          <Section title="Max Width">
            <Select
              value={config.styles.maxWidth}
              onValueChange={(value) => updateStyles({ maxWidth: value })}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MAX_WIDTHS.map((width) => (
                  <SelectItem key={width.value} value={width.value}>
                    {width.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Section>

          <Section title="Spacing">
            <div className="flex gap-1">
              {MESSAGE_SPACINGS.map((spacing) => (
                <button
                  key={spacing.value}
                  className={cn(
                    "flex-1 rounded-md py-1.5 text-xs transition-colors",
                    config.styles.messageSpacing === spacing.value
                      ? "bg-foreground text-background"
                      : "bg-muted text-muted-foreground hover:text-foreground",
                  )}
                  onClick={() =>
                    updateStyles({
                      messageSpacing: spacing.value as MessageSpacing,
                    })
                  }
                >
                  {spacing.name}
                </button>
              ))}
            </div>
          </Section>

          <Section title="User Message">
            <div className="flex gap-1">
              {(["left", "right"] as UserMessagePosition[]).map((position) => (
                <button
                  key={position}
                  className={cn(
                    "flex-1 rounded-md py-1.5 text-xs capitalize transition-colors",
                    config.styles.userMessagePosition === position
                      ? "bg-foreground text-background"
                      : "bg-muted text-muted-foreground hover:text-foreground",
                  )}
                  onClick={() =>
                    updateStyles({ userMessagePosition: position })
                  }
                >
                  {position}
                </button>
              ))}
            </div>
          </Section>

          <Section title="Animation">
            <Toggle
              label="Enable animations"
              checked={config.styles.animations}
              onChange={(checked) => updateStyles({ animations: checked })}
            />
          </Section>
        </div>
      </ScrollArea>
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
    <div className="space-y-2.5">
      <Label className="text-muted-foreground text-xs">{title}</Label>
      {children}
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
