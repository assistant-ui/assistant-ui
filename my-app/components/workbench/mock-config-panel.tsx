"use client";

import { useState, useCallback } from "react";
import { useShallow } from "zustand/react/shallow";
import { useWorkbenchStore, useMockConfig } from "@/lib/workbench/store";
import type { MockVariant } from "@/lib/workbench/mock-config";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Trash2,
  ChevronDown,
  Pencil,
  Server,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/ui/cn";
import { MockVariantEditor } from "./mock-variant-editor";

function CollapsibleSection({
  title,
  expanded,
  onToggle,
  children,
}: {
  title: string;
  expanded?: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border/50">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-3 py-2 text-left font-medium text-xs hover:bg-muted/50"
      >
        {title}
        <ChevronDown
          className={cn(
            "size-3.5 transition-transform duration-200",
            expanded && "rotate-180",
          )}
        />
      </button>
      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-200 ease-out",
          expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="px-3 pb-3">{children}</div>
        </div>
      </div>
    </div>
  );
}

function formatDelay(ms: number): string {
  if (ms >= 1000) {
    return `${(ms / 1000).toFixed(1)}s`;
  }
  return `${ms}ms`;
}

function AnnotationToggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: Switch is a form control wrapped by label
    <label className="flex items-center justify-between gap-2">
      <div>
        <div className="font-medium text-xs">{label}</div>
        <div className="text-[10px] text-muted-foreground">{hint}</div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
}

export function MockConfigPanel() {
  const mockConfig = useMockConfig();
  const toolNames = Object.keys(mockConfig.tools);

  const {
    setMocksEnabled,
    setServerUrl,
    setToolSource,
    registerTool,
    removeTool,
    setActiveVariant,
    addVariant,
    updateVariant,
    removeVariant,
    setToolAnnotations,
    setToolSchemas,
  } = useWorkbenchStore(
    useShallow((s) => ({
      setMocksEnabled: s.setMocksEnabled,
      setServerUrl: s.setServerUrl,
      setToolSource: s.setToolSource,
      registerTool: s.registerTool,
      removeTool: s.removeTool,
      setActiveVariant: s.setActiveVariant,
      addVariant: s.addVariant,
      updateVariant: s.updateVariant,
      removeVariant: s.removeVariant,
      setToolAnnotations: s.setToolAnnotations,
      setToolSchemas: s.setToolSchemas,
    })),
  );

  const [selectedTool, setSelectedTool] = useState<string | null>(
    toolNames[0] ?? null,
  );
  const [editingVariant, setEditingVariant] = useState<MockVariant | null>(
    null,
  );
  const [newToolName, setNewToolName] = useState("");
  const [showAddTool, setShowAddTool] = useState(false);
  const [expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >({});

  const toggleSection = useCallback((section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  }, []);

  const toolConfig = selectedTool ? mockConfig.tools[selectedTool] : null;

  const handleAddTool = useCallback(() => {
    const name = newToolName.trim();
    if (name && !mockConfig.tools[name]) {
      registerTool(name);
      setSelectedTool(name);
      setNewToolName("");
      setShowAddTool(false);
    }
  }, [newToolName, mockConfig.tools, registerTool]);

  const handleDeleteTool = useCallback(() => {
    if (!selectedTool) return;
    removeTool(selectedTool);
    const remaining = Object.keys(mockConfig.tools).filter(
      (n) => n !== selectedTool,
    );
    setSelectedTool(remaining[0] ?? null);
  }, [selectedTool, mockConfig.tools, removeTool]);

  const handleAddVariant = useCallback(() => {
    if (!selectedTool) return;
    const newVariant: MockVariant = {
      id: `mock-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: "custom",
      type: "custom",
      delay: 300,
      response: {
        structuredContent: {},
      },
    };
    addVariant(selectedTool, newVariant);
    setEditingVariant(newVariant);
  }, [selectedTool, addVariant]);

  const handleSaveVariant = useCallback(
    (variant: MockVariant) => {
      if (!selectedTool) return;
      updateVariant(selectedTool, variant.id, variant);
      setEditingVariant(null);
    },
    [selectedTool, updateVariant],
  );

  const handleDeleteVariant = useCallback(
    (variantId: string) => {
      if (!selectedTool) return;
      removeVariant(selectedTool, variantId);
      if (editingVariant?.id === variantId) {
        setEditingVariant(null);
      }
    },
    [selectedTool, removeVariant, editingVariant],
  );

  if (toolNames.length === 0 && !showAddTool) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="text-muted-foreground text-sm">
          No tools registered yet.
        </div>
        <div className="text-muted-foreground text-xs">
          Tools are auto-registered when callTool() is invoked, or you can add
          one manually.
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAddTool(true)}
          className="mt-2"
        >
          <Plus className="mr-1.5 size-3.5" />
          Add Tool
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          {/* biome-ignore lint/a11y/noLabelWithoutControl: Switch is a form control wrapped by label */}
          <label className="flex items-center gap-2 text-sm">
            <Switch
              checked={mockConfig.globalEnabled}
              onCheckedChange={setMocksEnabled}
            />
            Simulation Mode
          </label>
        </div>

        <div className="space-y-1">
          <label
            htmlFor="mcp-server-url"
            className="font-medium text-[10px] text-muted-foreground uppercase tracking-wider"
          >
            MCP Server URL
          </label>
          <input
            id="mcp-server-url"
            type="text"
            value={mockConfig.serverUrl}
            onChange={(e) => setServerUrl(e.target.value)}
            placeholder="http://localhost:3001/mcp"
            className="w-full rounded-md bg-input/70 px-2 py-1.5 font-mono text-xs focus:outline-none"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        {showAddTool ? (
          <div className="flex flex-1 items-center gap-2">
            <input
              type="text"
              value={newToolName}
              onChange={(e) => setNewToolName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddTool()}
              placeholder="tool_name"
              className="flex-1 rounded-md bg-input/70 px-2 py-1.5 text-sm focus:outline-none"
            />
            <Button variant="ghost" size="sm" onClick={handleAddTool}>
              Add
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowAddTool(false);
                setNewToolName("");
              }}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <>
            <Select value={selectedTool ?? ""} onValueChange={setSelectedTool}>
              <SelectTrigger className="h-8 flex-1 text-xs">
                <SelectValue placeholder="Select tool" />
              </SelectTrigger>
              <SelectContent>
                {toolNames.map((name) => (
                  <SelectItem key={name} value={name} className="text-xs">
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={() => setShowAddTool(true)}
            >
              <Plus className="size-4" />
            </Button>
            {selectedTool && (
              <Button
                variant="ghost"
                size="icon"
                className="size-8 text-destructive hover:text-destructive"
                onClick={handleDeleteTool}
              >
                <Trash2 className="size-4" />
              </Button>
            )}
          </>
        )}
      </div>

      {toolConfig && (
        <>
          <div className="flex-1 space-y-3 overflow-auto">
            <div className="flex items-center gap-1 rounded-lg border border-border/50 p-1">
              <button
                type="button"
                onClick={() => setToolSource(selectedTool!, "mock")}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 font-medium text-xs transition-colors",
                  toolConfig.source === "mock"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted/50",
                )}
              >
                <Layers className="size-3.5" />
                Mock
              </button>
              <button
                type="button"
                onClick={() => setToolSource(selectedTool!, "server")}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 font-medium text-xs transition-colors",
                  toolConfig.source === "server"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted/50",
                )}
              >
                <Server className="size-3.5" />
                Server
              </button>
            </div>

            {toolConfig.source === "mock" && (
              <div className="space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Select
                      value={toolConfig.activeVariantId ?? "default"}
                      onValueChange={(value) =>
                        setActiveVariant(
                          selectedTool!,
                          value === "default" ? null : value,
                        )
                      }
                    >
                      <SelectTrigger className="h-8 flex-1 text-xs">
                        <SelectValue placeholder="Select scenario" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="default" className="text-xs">
                          Default response
                        </SelectItem>
                        {toolConfig.variants.map((variant) => (
                          <SelectItem
                            key={variant.id}
                            value={variant.id}
                            className="text-xs"
                          >
                            <span
                              className={cn(
                                "mr-1.5 rounded px-1 py-0.5 font-medium text-[10px] uppercase",
                                variant.type === "success" &&
                                  "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
                                variant.type === "error" &&
                                  "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
                                variant.type === "empty" &&
                                  "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
                                variant.type === "slow" &&
                                  "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
                                variant.type === "custom" &&
                                  "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
                              )}
                            >
                              {variant.name}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {toolConfig.activeVariantId && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          onClick={() => {
                            const variant = toolConfig.variants.find(
                              (v) => v.id === toolConfig.activeVariantId,
                            );
                            if (variant) setEditingVariant(variant);
                          }}
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-destructive hover:text-destructive"
                          onClick={() =>
                            handleDeleteVariant(toolConfig.activeVariantId!)
                          }
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      onClick={handleAddVariant}
                    >
                      <Plus className="size-4" />
                    </Button>
                  </div>

                  {toolConfig.activeVariantId &&
                    (() => {
                      const activeVariant = toolConfig.variants.find(
                        (v) => v.id === toolConfig.activeVariantId,
                      );
                      if (!activeVariant) return null;
                      return (
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-muted-foreground">
                            Delay: {formatDelay(activeVariant.delay)}
                          </span>
                          <Slider
                            value={[activeVariant.delay]}
                            onValueChange={(values) => {
                              updateVariant(selectedTool!, activeVariant.id, {
                                delay: values[0],
                              });
                            }}
                            min={0}
                            max={5000}
                            step={100}
                            className="flex-1"
                          />
                        </div>
                      );
                    })()}
                </div>

                <CollapsibleSection
                  title="Advanced"
                  expanded={expandedSections.advanced}
                  onToggle={() => toggleSection("advanced")}
                >
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="font-medium text-[10px] text-muted-foreground uppercase tracking-wider">
                        Annotations
                      </div>
                      <AnnotationToggle
                        label="Read Only"
                        hint="Indicates tool doesn't modify state"
                        checked={toolConfig.annotations?.readOnlyHint ?? false}
                        onChange={(checked) =>
                          setToolAnnotations(selectedTool!, {
                            ...toolConfig.annotations,
                            readOnlyHint: checked,
                          })
                        }
                      />
                      <AnnotationToggle
                        label="Destructive"
                        hint="Indicates tool may delete data"
                        checked={
                          toolConfig.annotations?.destructiveHint ?? false
                        }
                        onChange={(checked) =>
                          setToolAnnotations(selectedTool!, {
                            ...toolConfig.annotations,
                            destructiveHint: checked,
                          })
                        }
                      />
                      <AnnotationToggle
                        label="Open World"
                        hint="Indicates tool accesses external resources"
                        checked={toolConfig.annotations?.openWorldHint ?? false}
                        onChange={(checked) =>
                          setToolAnnotations(selectedTool!, {
                            ...toolConfig.annotations,
                            openWorldHint: checked,
                          })
                        }
                      />
                      <AnnotationToggle
                        label="Idempotent"
                        hint="Indicates repeated calls produce same result"
                        checked={
                          toolConfig.annotations?.idempotentHint ?? false
                        }
                        onChange={(checked) =>
                          setToolAnnotations(selectedTool!, {
                            ...toolConfig.annotations,
                            idempotentHint: checked,
                          })
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="font-medium text-[10px] text-muted-foreground uppercase tracking-wider">
                        Schemas
                      </div>
                      <div>
                        <div className="mb-1 text-muted-foreground text-xs">
                          Input Schema (JSON)
                        </div>
                        <textarea
                          className="w-full rounded-md bg-input/70 p-2 font-mono text-xs"
                          rows={3}
                          placeholder="{}"
                          value={
                            toolConfig.schemas?.inputSchema
                              ? JSON.stringify(
                                  toolConfig.schemas.inputSchema,
                                  null,
                                  2,
                                )
                              : ""
                          }
                          onChange={(e) => {
                            try {
                              const parsed = e.target.value
                                ? JSON.parse(e.target.value)
                                : undefined;
                              setToolSchemas(selectedTool!, {
                                ...toolConfig.schemas,
                                inputSchema: parsed,
                              });
                            } catch {
                              // Ignore parse errors while typing
                            }
                          }}
                        />
                      </div>
                      <div>
                        <div className="mb-1 text-muted-foreground text-xs">
                          Output Schema (JSON)
                        </div>
                        <textarea
                          className="w-full rounded-md bg-input/70 p-2 font-mono text-xs"
                          rows={3}
                          placeholder="{}"
                          value={
                            toolConfig.schemas?.outputSchema
                              ? JSON.stringify(
                                  toolConfig.schemas.outputSchema,
                                  null,
                                  2,
                                )
                              : ""
                          }
                          onChange={(e) => {
                            try {
                              const parsed = e.target.value
                                ? JSON.parse(e.target.value)
                                : undefined;
                              setToolSchemas(selectedTool!, {
                                ...toolConfig.schemas,
                                outputSchema: parsed,
                              });
                            } catch {
                              // Ignore parse errors while typing
                            }
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </CollapsibleSection>
              </div>
            )}

            {toolConfig.source === "server" && (
              <div className="flex flex-col items-center justify-center gap-2 py-8 text-center text-muted-foreground text-xs">
                <Server className="size-8 text-muted-foreground/50" />
                <div>Tool calls will be routed to the MCP server.</div>
                <div className="text-[10px]">
                  Make sure your server is running at the configured URL.
                </div>
              </div>
            )}
          </div>

          {editingVariant && (
            <MockVariantEditor
              variant={editingVariant}
              onSave={handleSaveVariant}
              onCancel={() => setEditingVariant(null)}
            />
          )}
        </>
      )}
    </div>
  );
}
