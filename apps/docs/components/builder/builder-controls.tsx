"use client";

import { useState, useEffect, useRef } from "react";
import { Select } from "@/components/shared/select";
import { Switch } from "@/components/shared/switch";

import type {
  BuilderConfig,
  BorderRadius,
  FontSize,
  MessageSpacing,
} from "./types";
import { PRESETS } from "./presets";

const FONT_OPTIONS = [
  { label: "System", value: "system-ui" },
  { label: "Inter", value: "Inter, sans-serif" },
  { label: "Geist", value: "Geist, sans-serif" },
  { label: "Serif", value: "Georgia, serif" },
  { label: "Mono", value: "ui-monospace, monospace" },
];

const FONT_SIZE_OPTIONS = [
  { label: "Small", value: "sm" },
  { label: "Default", value: "base" },
  { label: "Large", value: "lg" },
];

const MAX_WIDTH_OPTIONS = [
  { label: "Narrow", value: "32rem" },
  { label: "Default", value: "44rem" },
  { label: "Wide", value: "56rem" },
  { label: "Full", value: "100%" },
];

const SPACING_OPTIONS = [
  { label: "Compact", value: "compact" },
  { label: "Comfortable", value: "comfortable" },
  { label: "Spacious", value: "spacious" },
];

const USER_MESSAGE_OPTIONS = [
  { label: "Left", value: "left" },
  { label: "Right", value: "right" },
];

const RADIUS_OPTIONS = [
  { label: "None", value: "none" },
  { label: "Small", value: "sm" },
  { label: "Medium", value: "md" },
  { label: "Large", value: "lg" },
  { label: "Full", value: "full" },
];

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
                <Switch
                  checked={config.components.typingIndicator}
                  onCheckedChange={(checked) =>
                    updateComponents({ typingIndicator: checked })
                  }
                />
              }
            />
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
                  options={FONT_OPTIONS}
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
                  options={FONT_SIZE_OPTIONS}
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
                  options={MAX_WIDTH_OPTIONS}
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
                  options={SPACING_OPTIONS}
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
                  options={USER_MESSAGE_OPTIONS}
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
                  options={RADIUS_OPTIONS}
                />
              }
            />
          </div>
        </Section>

        <Section title="Style">
          <div className="space-y-1">
            <Row
              label="Accent Color"
              control={
                <ColorPicker
                  value={config.styles.accentColor}
                  onChange={(value) => updateStyles({ accentColor: value })}
                />
              }
            />
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

function Row({ label, control }: { label: string; control: React.ReactNode }) {
  return (
    <div className="flex h-7 items-center justify-between">
      <span className="text-sm">{label}</span>
      {control}
    </div>
  );
}

function ColorPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [localValue, setLocalValue] = useState(value);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = (newValue: string) => {
    setLocalValue(newValue);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      onChange(newValue);
    }, 50);
  };

  return (
    <label className="relative cursor-pointer">
      <div
        className="size-5 rounded-md shadow-sm ring-1 ring-black/10 ring-inset"
        style={{ backgroundColor: localValue }}
      />
      <input
        type="color"
        value={localValue}
        onChange={(e) => handleChange(e.target.value)}
        className="absolute inset-0 size-full cursor-pointer opacity-0"
      />
    </label>
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
