"use client";

import { useCallback, useState } from "react";
import { useTheme } from "next-themes";
import type {
  Action,
  GenerativeUIDispatch,
} from "@assistant-ui/react-generative-ui";
import type { GalleryTemplate } from "@/lib/gallery-templates";
import {
  ACCENT_PRESETS,
  RADIUS_PRESETS,
  type AccentPreset,
  type PreviewTheme,
} from "./style-controls";
import { TemplateCodeTabs } from "./template-code-tabs";

export function TemplateDetail({ template }: { template: GalleryTemplate }) {
  const defaultJson = JSON.stringify(template.tree, null, 2);

  const [tree, setTree] = useState(template.tree);
  const [jsonText, setJsonText] = useState(defaultJson);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [actions, setActions] = useState<Action[]>([]);

  const { resolvedTheme } = useTheme();
  const [radius, setRadius] = useState<string>(RADIUS_PRESETS[1].value);
  const [accent, setAccent] = useState<AccentPreset>(ACCENT_PRESETS[0]);
  const [themeOverride, setThemeOverride] = useState<PreviewTheme | null>(null);
  const previewTheme: PreviewTheme =
    themeOverride ?? (resolvedTheme === "dark" ? "dark" : "light");

  const dispatch = useCallback<GenerativeUIDispatch>((action) => {
    setActions((prev) => [action, ...prev].slice(0, 5));
    return undefined;
  }, []);

  const handleJsonChange = (text: string) => {
    setJsonText(text);
    try {
      setTree(JSON.parse(text));
      setJsonError(null);
    } catch (error) {
      setJsonError(error instanceof Error ? error.message : "Invalid JSON");
    }
  };

  const handleReset = () => {
    setTree(template.tree);
    setJsonText(defaultJson);
    setJsonError(null);
  };

  const actionLog =
    actions.length === 0 ? null : (
      <div className="border-border/60 bg-muted/30 mt-3 rounded-lg border p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="text-muted-foreground text-xs font-medium">
            Dispatched actions
          </span>
          <button
            type="button"
            onClick={() => setActions([])}
            className="text-muted-foreground hover:text-foreground text-xs"
          >
            Clear
          </button>
        </div>
        <div className="flex flex-col gap-1">
          {actions.map((action, index) => (
            <div
              key={index}
              className="text-muted-foreground overflow-x-auto font-mono text-xs whitespace-nowrap"
            >
              {JSON.stringify(action)}
            </div>
          ))}
        </div>
      </div>
    );

  return (
    <TemplateCodeTabs
      tree={tree}
      jsonText={jsonText}
      jsonError={jsonError}
      isEdited={jsonText !== defaultJson}
      onJsonChange={handleJsonChange}
      onReset={handleReset}
      dispatch={dispatch}
      actionLog={actionLog}
      styleControls={{
        radius,
        onRadiusChange: setRadius,
        accent,
        onAccentChange: setAccent,
        previewTheme,
        onPreviewThemeChange: setThemeOverride,
      }}
    />
  );
}
