"use client";

import { useState } from "react";
import {
  AssistantRuntimeProvider,
  type ChatModelAdapter,
  type ThreadMessageLike,
} from "@assistant-ui/react";
import { Thread } from "@/components/assistant-ui/elements/thread.aui";
import { Button } from "@/components/ui/button";
import { SampleScope } from "./sample-scope";
import { useSampleRuntime } from "./use-sample-runtime";

type Vars = Record<string, string>;
type Theme = { label: string; light: Vars; dark: Vars };

const THEMES = {
  default: { label: "Default", light: {}, dark: {} },
  ocean: {
    label: "Ocean",
    light: {
      "--background": "oklch(0.985 0.008 230)",
      "--foreground": "oklch(0.26 0.04 250)",
      "--primary": "oklch(0.55 0.17 250)",
      "--primary-foreground": "oklch(0.985 0.01 250)",
      "--muted": "oklch(0.94 0.025 235)",
      "--muted-foreground": "oklch(0.5 0.04 250)",
      "--accent": "oklch(0.92 0.04 235)",
      "--accent-foreground": "oklch(0.3 0.06 250)",
      "--border": "oklch(0.55 0.08 250 / 18%)",
      "--ring": "oklch(0.62 0.14 250)",
    },
    dark: {
      "--background": "oklch(0.2 0.03 250)",
      "--foreground": "oklch(0.95 0.015 230)",
      "--primary": "oklch(0.72 0.14 235)",
      "--primary-foreground": "oklch(0.2 0.03 250)",
      "--muted": "oklch(0.28 0.04 250)",
      "--muted-foreground": "oklch(0.72 0.04 235)",
      "--accent": "oklch(0.32 0.05 250)",
      "--accent-foreground": "oklch(0.95 0.015 230)",
      "--border": "oklch(0.8 0.05 235 / 14%)",
      "--ring": "oklch(0.6 0.12 235)",
    },
  },
  paper: {
    label: "Paper",
    light: {
      "--background": "oklch(0.97 0.018 85)",
      "--foreground": "oklch(0.3 0.035 55)",
      "--primary": "oklch(0.56 0.15 40)",
      "--primary-foreground": "oklch(0.98 0.012 85)",
      "--muted": "oklch(0.92 0.03 80)",
      "--muted-foreground": "oklch(0.52 0.04 60)",
      "--accent": "oklch(0.9 0.04 75)",
      "--accent-foreground": "oklch(0.3 0.035 55)",
      "--border": "oklch(0.45 0.05 60 / 16%)",
      "--ring": "oklch(0.62 0.12 45)",
    },
    dark: {
      "--background": "oklch(0.22 0.015 60)",
      "--foreground": "oklch(0.93 0.02 85)",
      "--primary": "oklch(0.7 0.14 45)",
      "--primary-foreground": "oklch(0.22 0.015 60)",
      "--muted": "oklch(0.29 0.02 60)",
      "--muted-foreground": "oklch(0.72 0.03 75)",
      "--accent": "oklch(0.33 0.03 60)",
      "--accent-foreground": "oklch(0.93 0.02 85)",
      "--border": "oklch(0.9 0.03 80 / 12%)",
      "--ring": "oklch(0.6 0.1 45)",
    },
  },
} satisfies Record<string, Theme>;

type ThemeName = keyof typeof THEMES;
const THEME_NAMES = Object.keys(THEMES) as ThemeName[];

const cssBlock = (selector: string, vars: Vars) =>
  `${selector} {\n${Object.entries(vars)
    .map(([name, value]) => `  ${name}: ${value};`)
    .join("\n")}\n}`;

// The sample scopes each theme to its own box. The Thread root reads
// --color-muted for the composer background, and the docs declare that
// variable on :root, so the scoped rule re-resolves it against the theme's
// --muted. An app that redefines :root, as the CSS shown below does, gets
// this for free.
const SCOPED_CSS = THEME_NAMES.filter((name) => name !== "default")
  .flatMap((name) => [
    cssBlock(`[data-theme-sample="${name}"]`, {
      ...THEMES[name].light,
      "--color-muted": "var(--muted)",
    }),
    cssBlock(`.dark [data-theme-sample="${name}"]`, THEMES[name].dark),
  ])
  .join("\n");

// What the reader would write in their own stylesheet: the light values on
// :root and the dark ones on .dark, which must come after :root.
const shownCss = (name: ThemeName): string[] =>
  name === "default"
    ? [
        "/* No overrides: the thread uses the variables\n   your shadcn setup already put in globals.css. */",
      ]
    : [
        cssBlock(":root", THEMES[name].light),
        cssBlock(".dark", THEMES[name].dark),
      ];

const CREATED_AT = new Date("2026-11-26T12:00:00Z");
const HISTORY: ThreadMessageLike[] = [
  {
    role: "user",
    content: "Can the chat match our brand?",
    createdAt: CREATED_AT,
  },
  {
    role: "assistant",
    content:
      "Yes. Switch the theme above: this reply, your message and the composer all change color, and no component was edited. Each theme is a few CSS variables, shown below the thread.",
    createdAt: CREATED_AT,
  },
];

const REPLY =
  "This reply streams in the same theme. The text, the bubbles and the send button read `--foreground`, `--muted` and `--primary`, so new values restyle all of them at once.";

const wait = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => {
      clearTimeout(timer);
      resolve();
    });
  });

const cannedModel: ChatModelAdapter = {
  async *run({ abortSignal }) {
    const words = REPLY.split(" ");
    for (let i = 1; i <= words.length; i++) {
      await wait(30, abortSignal);
      if (abortSignal.aborted) return;
      yield { content: [{ type: "text", text: words.slice(0, i).join(" ") }] };
    }
  },
};

const RUNTIME_OPTIONS = { initialMessages: HISTORY };

function ThemedThread() {
  const runtime = useSampleRuntime(cannedModel, RUNTIME_OPTIONS);
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <Thread autoFocus={false} />
    </AssistantRuntimeProvider>
  );
}

export function ThemeSwitcherSample() {
  const [theme, setTheme] = useState<ThemeName>("default");
  return (
    <div className="not-prose border-foreground/10 bg-foreground/[0.025] dark:bg-foreground/[0.04] rounded-document my-6 border p-4">
      <style>{SCOPED_CSS}</style>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground text-xs">
          The same Thread element under three themes. Only CSS variables change.
        </p>
        <div role="group" aria-label="Theme" className="flex gap-1">
          {THEME_NAMES.map((name) => (
            <Button
              key={name}
              size="sm"
              variant={name === theme ? "default" : "outline"}
              aria-pressed={name === theme}
              onClick={() => setTheme(name)}
            >
              {THEMES[name].label}
            </Button>
          ))}
        </div>
      </div>
      <div
        data-theme-sample={theme}
        className="border-foreground/10 bg-background text-foreground rounded-document h-96 overflow-hidden border"
      >
        <SampleScope>
          <ThemedThread />
        </SampleScope>
      </div>
      <p className="text-muted-foreground mt-4 mb-2 font-mono text-xs">
        app/globals.css
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {shownCss(theme).map((css) => (
          <pre
            key={css}
            className="bg-code-surface rounded-document overflow-x-auto p-3 font-mono text-xs leading-relaxed sm:only:col-span-2"
          >
            <code>{css}</code>
          </pre>
        ))}
      </div>
    </div>
  );
}
