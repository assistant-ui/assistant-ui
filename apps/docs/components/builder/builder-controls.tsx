"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Layers,
  Palette,
  Layout,
  Sparkles,
  MonitorSmartphone,
  Moon,
  Sun,
} from "lucide-react";

import type {
  BuilderConfig,
  BorderRadius,
  Theme,
  Layout as LayoutType,
  UserMessagePosition,
} from "./types";
import { ACCENT_COLORS, FONT_FAMILIES, MAX_WIDTHS } from "./types";
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
      {/* Presets */}
      <div className="border-b p-4">
        <Label className="mb-3 block text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          Presets
        </Label>
        <div className="grid grid-cols-2 gap-2">
          {PRESETS.slice(0, 4).map((preset) => (
            <Button
              key={preset.id}
              variant="outline"
              size="sm"
              className={cn(
                "h-auto flex-col items-start gap-0.5 px-3 py-2 text-left",
                JSON.stringify(config) === JSON.stringify(preset.config) &&
                  "border-primary bg-primary/5",
              )}
              onClick={() => onChange(preset.config)}
            >
              <span className="text-xs font-medium">{preset.name}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        defaultValue="components"
        className="min-h-0 flex-1 overflow-hidden"
      >
        <TabsList className="mx-4 mt-4 grid w-[calc(100%-2rem)] grid-cols-3">
          <TabsTrigger value="components" className="gap-1.5 text-xs">
            <Layers className="size-3.5" />
            <span className="hidden sm:inline">Components</span>
          </TabsTrigger>
          <TabsTrigger value="styles" className="gap-1.5 text-xs">
            <Palette className="size-3.5" />
            <span className="hidden sm:inline">Styles</span>
          </TabsTrigger>
          <TabsTrigger value="layout" className="gap-1.5 text-xs">
            <Layout className="size-3.5" />
            <span className="hidden sm:inline">Layout</span>
          </TabsTrigger>
        </TabsList>

        {/* Components Tab */}
        <TabsContent value="components" className="flex-1 overflow-y-auto p-4">
          <div className="space-y-6">
            <div className="space-y-4">
              <Label className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Features
              </Label>

              <ToggleRow
                label="Attachments"
                description="Allow file uploads"
                checked={config.components.attachments}
                onCheckedChange={(checked) =>
                  updateComponents({ attachments: checked })
                }
              />

              <ToggleRow
                label="Branch Picker"
                description="Navigate message versions"
                checked={config.components.branchPicker}
                onCheckedChange={(checked) =>
                  updateComponents({ branchPicker: checked })
                }
              />

              <ToggleRow
                label="Edit Messages"
                description="Allow editing sent messages"
                checked={config.components.editMessage}
                onCheckedChange={(checked) =>
                  updateComponents({ editMessage: checked })
                }
              />

              <ToggleRow
                label="Welcome Screen"
                description="Show welcome when empty"
                checked={config.components.threadWelcome}
                onCheckedChange={(checked) =>
                  updateComponents({ threadWelcome: checked })
                }
              />

              <ToggleRow
                label="Suggestions"
                description="Show prompt suggestions"
                checked={config.components.suggestions}
                onCheckedChange={(checked) =>
                  updateComponents({ suggestions: checked })
                }
              />

              <ToggleRow
                label="Scroll to Bottom"
                description="Show scroll button"
                checked={config.components.scrollToBottom}
                onCheckedChange={(checked) =>
                  updateComponents({ scrollToBottom: checked })
                }
              />
            </div>

            <div className="space-y-4">
              <Label className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Content
              </Label>

              <ToggleRow
                label="Markdown"
                description="Render markdown formatting"
                checked={config.components.markdown}
                onCheckedChange={(checked) =>
                  updateComponents({ markdown: checked })
                }
              />

              <ToggleRow
                label="Reasoning"
                description="Show AI thinking process"
                checked={config.components.reasoning}
                onCheckedChange={(checked) =>
                  updateComponents({ reasoning: checked })
                }
              />

              <ToggleRow
                label="Follow-up Suggestions"
                description="Show suggestions after responses"
                checked={config.components.followUpSuggestions}
                onCheckedChange={(checked) =>
                  updateComponents({ followUpSuggestions: checked })
                }
              />

              <ToggleRow
                label="Avatar"
                description="Show user/assistant avatars"
                checked={config.components.avatar}
                onCheckedChange={(checked) =>
                  updateComponents({ avatar: checked })
                }
              />

              <ToggleRow
                label="Typing Indicator"
                description="Show loading animation"
                checked={config.components.typingIndicator}
                onCheckedChange={(checked) =>
                  updateComponents({ typingIndicator: checked })
                }
              />
            </div>

            <div className="space-y-4">
              <Label className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Action Bar
              </Label>

              <ToggleRow
                label="Copy"
                description="Copy message content"
                checked={config.components.actionBar.copy}
                onCheckedChange={(checked) =>
                  updateActionBar({ copy: checked })
                }
              />

              <ToggleRow
                label="Reload"
                description="Regenerate response"
                checked={config.components.actionBar.reload}
                onCheckedChange={(checked) =>
                  updateActionBar({ reload: checked })
                }
              />

              <ToggleRow
                label="Speak"
                description="Read message aloud"
                checked={config.components.actionBar.speak}
                onCheckedChange={(checked) =>
                  updateActionBar({ speak: checked })
                }
              />
            </div>
          </div>
        </TabsContent>

        {/* Styles Tab */}
        <TabsContent value="styles" className="flex-1 overflow-y-auto p-4">
          <div className="space-y-6">
            <div className="space-y-3">
              <Label className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Theme
              </Label>
              <div className="flex gap-2">
                {(["light", "dark", "system"] as Theme[]).map((theme) => (
                  <Button
                    key={theme}
                    variant="outline"
                    size="sm"
                    className={cn(
                      "flex-1 gap-1.5",
                      config.styles.theme === theme &&
                        "border-primary bg-primary/5",
                    )}
                    onClick={() => updateStyles({ theme })}
                  >
                    {theme === "light" && <Sun className="size-3.5" />}
                    {theme === "dark" && <Moon className="size-3.5" />}
                    {theme === "system" && (
                      <MonitorSmartphone className="size-3.5" />
                    )}
                    <span className="capitalize">{theme}</span>
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Accent Color
              </Label>
              <div className="flex flex-wrap gap-2">
                {ACCENT_COLORS.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    className={cn(
                      "size-8 rounded-full border-2 transition-all hover:scale-110",
                      config.styles.accentColor === color.value
                        ? "border-foreground"
                        : "border-transparent",
                    )}
                    style={{ backgroundColor: color.value }}
                    onClick={() => updateStyles({ accentColor: color.value })}
                    title={color.name}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Border Radius
              </Label>
              <div className="flex gap-2">
                {(["none", "sm", "md", "lg", "full"] as BorderRadius[]).map(
                  (radius) => (
                    <Button
                      key={radius}
                      variant="outline"
                      size="sm"
                      className={cn(
                        "flex-1",
                        config.styles.borderRadius === radius &&
                          "border-primary bg-primary/5",
                      )}
                      onClick={() => updateStyles({ borderRadius: radius })}
                    >
                      {radius}
                    </Button>
                  ),
                )}
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Font Family
              </Label>
              <Select
                value={config.styles.fontFamily}
                onValueChange={(value) => updateStyles({ fontFamily: value })}
              >
                <SelectTrigger>
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
            </div>

            <div className="space-y-3">
              <Label className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Max Width
              </Label>
              <Select
                value={config.styles.maxWidth}
                onValueChange={(value) => updateStyles({ maxWidth: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MAX_WIDTHS.map((width) => (
                    <SelectItem key={width.value} value={width.value}>
                      {width.name} ({width.value})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                User Message Position
              </Label>
              <div className="flex gap-2">
                {(["right", "left"] as UserMessagePosition[]).map(
                  (position) => (
                    <Button
                      key={position}
                      variant="outline"
                      size="sm"
                      className={cn(
                        "flex-1 capitalize",
                        config.styles.userMessagePosition === position &&
                          "border-primary bg-primary/5",
                      )}
                      onClick={() =>
                        updateStyles({ userMessagePosition: position })
                      }
                    >
                      {position}
                    </Button>
                  ),
                )}
              </div>
            </div>

            <ToggleRow
              label="Animations"
              description="Enable message animations"
              checked={config.styles.animations}
              onCheckedChange={(checked) =>
                updateStyles({ animations: checked })
              }
            />
          </div>
        </TabsContent>

        {/* Layout Tab */}
        <TabsContent value="layout" className="flex-1 overflow-y-auto p-4">
          <div className="space-y-6">
            <div className="space-y-3">
              <Label className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Layout Style
              </Label>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    {
                      value: "default",
                      label: "Default",
                      description: "Standard chat layout",
                    },
                    {
                      value: "sidebar",
                      label: "Sidebar",
                      description: "With thread list",
                    },
                    {
                      value: "modal",
                      label: "Modal",
                      description: "Floating dialog",
                    },
                    {
                      value: "fullscreen",
                      label: "Fullscreen",
                      description: "Full viewport",
                    },
                  ] as const
                ).map((layout) => (
                  <Button
                    key={layout.value}
                    variant="outline"
                    className={cn(
                      "h-auto flex-col items-start gap-0.5 px-3 py-3 text-left",
                      config.layout === layout.value &&
                        "border-primary bg-primary/5",
                    )}
                    onClick={() =>
                      onChange({
                        ...config,
                        layout: layout.value as LayoutType,
                      })
                    }
                  >
                    <span className="text-sm font-medium">{layout.label}</span>
                    <span className="text-xs text-muted-foreground">
                      {layout.description}
                    </span>
                  </Button>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-dashed bg-muted/50 p-4">
              <div className="flex items-start gap-2">
                <Sparkles className="mt-0.5 size-4 text-muted-foreground" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">
                    More layouts coming soon
                  </p>
                  <p className="text-xs text-muted-foreground">
                    We&apos;re working on additional layout options including
                    split view, floating assistant, and more.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface ToggleRowProps {
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

function ToggleRow({
  label,
  description,
  checked,
  onCheckedChange,
}: ToggleRowProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="space-y-0.5">
        <Label className="text-sm font-medium">{label}</Label>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}
