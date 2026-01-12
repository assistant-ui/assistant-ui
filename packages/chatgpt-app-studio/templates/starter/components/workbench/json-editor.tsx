"use client";

import { useState, useMemo } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { json, jsonParseLinter } from "@codemirror/lang-json";
import { linter, lintGutter, type Diagnostic } from "@codemirror/lint";
import { EditorView, placeholder, tooltips } from "@codemirror/view";
import { githubLight, githubDark } from "@uiw/codemirror-theme-github";
import { useTheme } from "next-themes";
import { cn } from "@/lib/ui/cn";

const jsonLinterWithNullSupport = linter((view): Diagnostic[] => {
  const content = view.state.doc.toString().trim();
  if (content === "" || content === "null") {
    return [];
  }
  return jsonParseLinter()(view);
});

interface JsonEditorProps {
  label?: string;
  value: Record<string, unknown>;
  onChange: (value: Record<string, unknown>) => void;
}

const customEditorStyleLight = EditorView.theme(
  {
    "&": {
      fontSize: "12px",
      fontFamily: "ui-monospace, monospace",
    },
    ".cm-content": {
      padding: "0px",
    },
    ".cm-gutters": {
      backgroundColor: "transparent",
      borderRight: "none",
      marginLeft: "8px",
      userSelect: "none",
      pointerEvents: "none",
    },
    ".cm-line": {
      padding: "0",
    },
    "&.cm-focused": {
      outline: "none",
    },

    ".cm-activeLineGutter": {
      backgroundColor: "transparent",
      color: "rgba(0, 0, 0, 0.8)",
    },
    ".cm-placeholder": {
      color: "rgba(0, 0, 0, 0.35)",
      fontStyle: "italic",
    },
    ".cm-lintRange-error": {
      backgroundImage: `url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='6' height='3'><path d='m0 2.5 l2 -1.5 l1 0 l2 1.5 l1 0' stroke='%23e53935' fill='none' stroke-width='1'/></svg>")`,
      backgroundRepeat: "repeat-x",
      backgroundPosition: "bottom",
    },
    ".cm-lint-marker-error": {
      content: '"●"',
      color: "#e53935",
    },
    ".cm-tooltip-lint": {
      backgroundColor: "#fef2f2",
      border: "1px solid #fecaca",
      borderRadius: "6px",
      padding: "6px 10px",
      fontSize: "13px",
      color: "#991b1b",
    },
  },
  { dark: false },
);

const customEditorStyleDark = EditorView.theme(
  {
    "&": {
      fontSize: "12px",
      fontFamily: "ui-monospace, monospace",
    },
    ".cm-content": {},
    ".cm-gutters": {
      backgroundColor: "transparent",
      borderRight: "none",
      marginLeft: "4px",
      color: "rgba(255, 255, 255, 0.35)",
      userSelect: "none",
      pointerEvents: "none",
    },
    ".cm-line": {
      padding: "0",
    },
    "&.cm-focused": {
      outline: "none",
    },
    ".cm-activeLine": {
      backgroundColor: "rgba(255, 255, 255, 0.06)",
    },
    ".cm-activeLineGutter": {
      backgroundColor: "transparent",
      color: "rgba(255, 255, 255, 0.8)",
    },
    ".cm-placeholder": {
      color: "rgba(255, 255, 255, 0.35)",
      fontStyle: "italic",
    },
    ".cm-lintRange-error": {
      backgroundImage: `url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='6' height='3'><path d='m0 2.5 l2 -1.5 l1 0 l2 1.5 l1 0' stroke='%23f87171' fill='none' stroke-width='1'/></svg>")`,
      backgroundRepeat: "repeat-x",
      backgroundPosition: "bottom",
    },
    ".cm-lint-marker-error": {
      content: '"●"',
      color: "#f87171",
    },
    ".cm-tooltip-lint": {
      backgroundColor: "#450a0a",
      border: "1px solid #7f1d1d",
      borderRadius: "6px",
      padding: "6px 10px",
      fontSize: "13px",
      color: "#fecaca",
    },
  },
  { dark: true },
);

function computeText(value: Record<string, unknown>): string {
  if (Object.keys(value).length === 0) {
    return "";
  }
  return JSON.stringify(value, null, 2);
}

export function JsonEditor({ value, onChange }: JsonEditorProps) {
  const { theme } = useTheme();
  const valueStr = JSON.stringify(value);
  const [prevValueStr, setPrevValueStr] = useState(valueStr);
  const [text, setText] = useState(() => computeText(value));

  if (valueStr !== prevValueStr) {
    setPrevValueStr(valueStr);
    setText(computeText(value));
  }

  const extensions = useMemo(
    () => [
      json(),
      jsonLinterWithNullSupport,
      lintGutter(),
      tooltips({ position: "fixed" }),
      EditorView.lineWrapping,
      theme === "dark" ? customEditorStyleDark : customEditorStyleLight,
      placeholder("null"),
    ],
    [theme],
  );

  const handleChange = (newText: string) => {
    setText(newText);

    const trimmed = newText.trim();
    if (trimmed === "" || trimmed === "null") {
      const emptyObj = {};
      const emptyStr = JSON.stringify(emptyObj);
      setPrevValueStr(emptyStr);
      onChange(emptyObj);
      return;
    }

    try {
      const parsed = JSON.parse(newText);
      const parsedStr = JSON.stringify(parsed);
      setPrevValueStr(parsedStr);
      onChange(parsed);
    } catch {
      // Linter will show the error inline
    }
  };

  return (
    <div className="relative">
      <CodeMirror
        value={text}
        height="100%"
        extensions={extensions}
        onChange={handleChange}
        theme={theme === "dark" ? githubDark : githubLight}
        basicSetup={{
          lineNumbers: true,
          foldGutter: false,
          highlightActiveLineGutter: true,
          highlightActiveLine: true,
          allowMultipleSelections: true,
        }}
        className={cn(
          "h-full",
          "[&_.cm-editor]:h-full",
          "[&_.cm-scroller]:h-full",

          // Editor backgrounds
          "[&_.cm-editor]:bg-transparent!",
          "[&_.cm-gutters]:bg-transparent!",

          // Line numbers
          "[&_.cm-lineNumbers]:text-[rgba(0,0,0,0.25)]!",
          "dark:[&_.cm-lineNumbers]:text-[rgba(255,255,255,0.25)]!",

          // Active line gutter
          "[&_.cm-activeLineGutter]:text-[rgba(0,0,0,0.8)]!",
          "dark:[&_.cm-activeLineGutter]:text-[rgba(255,255,255,0.7)]!",
          "[&_.cm-activeLineGutter]:bg-transparent!",
          "dark:[&_.cm-activeLineGutter]:bg-transparent!",

          // Matching bracket
          "[&_.cm-matchingBracket]:bg-[rgba(0,0,0,0.1)]!",
          "dark:[&_.cm-matchingBracket]:bg-[rgba(255,255,255,0.15)]!",
        )}
      />
    </div>
  );
}

const readOnlyStyle = EditorView.theme({
  "&": {
    fontSize: "12px",
    fontFamily: "ui-monospace, monospace",
  },
  ".cm-content": {
    padding: "16px",
  },
  ".cm-gutters": {
    backgroundColor: "transparent",
    borderRight: "none",
    marginLeft: "8px",
    userSelect: "none",
    pointerEvents: "none",
  },
  ".cm-line": {
    padding: "0",
  },
  "&.cm-focused": {
    outline: "none",
  },
  ".cm-cursor": {
    display: "none",
  },
});

interface ReadOnlyJsonViewProps {
  value: object;
}

export function ReadOnlyJsonView({ value }: ReadOnlyJsonViewProps) {
  const jsonString = JSON.stringify(value, null, 2);
  const { theme } = useTheme();

  const extensions = useMemo(
    () => [
      json(),
      EditorView.lineWrapping,
      readOnlyStyle,
      EditorView.editable.of(false),
    ],
    [],
  );

  return (
    <div className="scrollbar-subtle h-full overflow-y-auto">
      <CodeMirror
        value={jsonString}
        height="100%"
        extensions={extensions}
        theme={theme === "dark" ? githubDark : githubLight}
        editable={false}
        basicSetup={{
          lineNumbers: true,
          foldGutter: false,
          highlightActiveLineGutter: false,
          highlightActiveLine: false,
        }}
        className={cn(
          "h-full",
          "[&_.cm-editor]:h-full",
          "[&_.cm-scroller]:h-full",
          "[&_.cm-editor]:bg-transparent!",
          "[&_.cm-gutters]:bg-transparent!",
          "[&_.cm-lineNumbers]:text-[rgba(0,0,0,0.25)]!",
          "dark:[&_.cm-lineNumbers]:text-[rgba(255,255,255,0.35)]!",
        )}
      />
    </div>
  );
}
