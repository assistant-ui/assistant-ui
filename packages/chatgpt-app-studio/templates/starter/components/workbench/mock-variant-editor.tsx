"use client";

import { useState, useMemo } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { json, jsonParseLinter } from "@codemirror/lang-json";
import { linter, lintGutter, type Diagnostic } from "@codemirror/lint";
import { EditorView, tooltips } from "@codemirror/view";
import { githubLight, githubDark } from "@uiw/codemirror-theme-github";
import { useTheme } from "next-themes";
import type {
  MockVariant,
  MockVariantType,
  MockResponse,
} from "@/lib/workbench/mock-config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/ui/cn";
import { COMPACT_LABEL_CLASSES } from "./styles";

interface MockVariantEditorProps {
  variant: MockVariant;
  onSave: (variant: MockVariant) => void;
  onCancel: () => void;
  inline?: boolean;
  disabled?: boolean;
}

const jsonLinterWithNullSupport = linter((view): Diagnostic[] => {
  const content = view.state.doc.toString().trim();
  if (content === "" || content === "null") {
    return [];
  }
  return jsonParseLinter()(view);
});

const compactEditorStyle = EditorView.theme({
  "&": {
    fontSize: "11px",
    fontFamily: "ui-monospace, monospace",
  },
  ".cm-content": {
    padding: "8px",
  },
  ".cm-gutters": {
    display: "none",
  },
  ".cm-line": {
    padding: "0",
  },
  "&.cm-focused": {
    outline: "none",
  },
});

const VARIANT_TYPES: { value: MockVariantType; label: string }[] = [
  { value: "success", label: "Success" },
  { value: "empty", label: "Empty" },
  { value: "error", label: "Error" },
  { value: "slow", label: "Slow" },
  { value: "custom", label: "Custom" },
];

function formatDelay(ms: number): string {
  if (ms >= 1000) {
    return `${(ms / 1000).toFixed(1)}s`;
  }
  return `${ms}ms`;
}

export function MockVariantEditor({
  variant,
  onSave,
  onCancel,
  inline = false,
  disabled = false,
}: MockVariantEditorProps) {
  const [prevVariantId, setPrevVariantId] = useState(variant.id);
  const [name, setName] = useState(variant.name);
  const [type, setType] = useState<MockVariantType>(variant.type);
  const [delay, setDelay] = useState(variant.delay);
  const [responseText, setResponseText] = useState(() =>
    JSON.stringify(variant.response, null, 2),
  );
  const [hasError, setHasError] = useState(false);
  const [lastParsed, setLastParsed] = useState<MockResponse>(variant.response);
  const { theme } = useTheme();

  if (variant.id !== prevVariantId) {
    setPrevVariantId(variant.id);
    setName(variant.name);
    setType(variant.type);
    setDelay(variant.delay);
    setResponseText(JSON.stringify(variant.response, null, 2));
    setLastParsed(variant.response);
  }

  const extensions = useMemo(
    () => [
      json(),
      jsonLinterWithNullSupport,
      lintGutter(),
      tooltips({ position: "fixed" }),
      EditorView.lineWrapping,
      compactEditorStyle,
    ],
    [],
  );

  const handleResponseChange = (text: string) => {
    setResponseText(text);
    try {
      const parsed = JSON.parse(text);
      setLastParsed(parsed);
      setHasError(false);
      if (inline) {
        onSave({
          ...variant,
          response: parsed,
        });
      }
    } catch {
      setHasError(true);
    }
  };

  const handleSave = () => {
    if (hasError) return;

    onSave({
      ...variant,
      name,
      type,
      delay,
      response: lastParsed,
    });
  };

  if (inline) {
    return (
      <div
        className={cn(
          "overflow-hidden rounded-md border bg-input/50",
          disabled && "pointer-events-none",
        )}
      >
        <CodeMirror
          value={responseText}
          height="180px"
          extensions={extensions}
          onChange={handleResponseChange}
          theme={theme === "dark" ? githubDark : githubLight}
          editable={!disabled}
          basicSetup={{
            lineNumbers: false,
            foldGutter: false,
            highlightActiveLineGutter: false,
            highlightActiveLine: false,
          }}
          className={cn(
            "[&_.cm-editor]:bg-transparent!",
            "[&_.cm-gutters]:bg-transparent!",
          )}
        />
      </div>
    );
  }

  return (
    <div className="border-t pt-4">
      <div className={cn(COMPACT_LABEL_CLASSES, "mb-3")}>Edit Scenario</div>

      <div className="flex flex-col gap-3">
        <div className="flex gap-2">
          <div className="flex-1">
            <Label className={cn(COMPACT_LABEL_CLASSES, "mb-1 block")}>
              Name
            </Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-7 text-xs"
            />
          </div>
          <div className="w-28">
            <Label className={cn(COMPACT_LABEL_CLASSES, "mb-1 block")}>
              Type
            </Label>
            <Select
              value={type}
              onValueChange={(v) => setType(v as MockVariantType)}
            >
              <SelectTrigger className="h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VARIANT_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value} className="text-xs">
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label className={cn(COMPACT_LABEL_CLASSES, "mb-1 block")}>
            Delay: {formatDelay(delay)}
          </Label>
          <Slider
            value={[delay]}
            onValueChange={(values: number[]) => setDelay(values[0])}
            min={0}
            max={5000}
            step={100}
            className="mt-2"
          />
        </div>

        <div>
          <Label className={cn(COMPACT_LABEL_CLASSES, "mb-1 block")}>
            Response
          </Label>
          <div className="overflow-hidden rounded-md border bg-input/50">
            <CodeMirror
              value={responseText}
              height="120px"
              extensions={extensions}
              onChange={handleResponseChange}
              theme={theme === "dark" ? githubDark : githubLight}
              basicSetup={{
                lineNumbers: false,
                foldGutter: false,
                highlightActiveLineGutter: false,
                highlightActiveLine: false,
              }}
              className={cn(
                "[&_.cm-editor]:bg-transparent!",
                "[&_.cm-gutters]:bg-transparent!",
              )}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} disabled={hasError}>
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}
