"use client";

import {
  SettingsPanel,
  type SettingToggle,
} from "@/components/assistant-ui/elements/settings-panel";
import { defineStates } from "./types";

const noop = () => {};

const MODELS = ["Opus", "Sonnet", "Haiku"] as const;

const TOGGLES: readonly SettingToggle[] = [
  {
    key: "tools",
    label: "Tool use",
    detail: "Let the model call your tools",
    on: true,
  },
  {
    key: "memory",
    label: "Memory",
    detail: "Remember facts between threads",
    on: false,
  },
];

const PROMPT =
  "You are a careful engineering assistant. Prefer the repo's existing conventions over your own.";

const handlers = {
  onModelChange: noop,
  onSystemPromptChange: noop,
  onTemperatureChange: noop,
  onToggle: noop,
};

export const states = defineStates([
  { key: "default", label: "Default" },
  {
    key: "read-only",
    label: "Read only",
    note: "Without change handlers the model and switches are static.",
    Component: () => (
      <SettingsPanel
        model="Sonnet"
        models={MODELS}
        systemPrompt={PROMPT}
        temperature={0.7}
        toggles={TOGGLES}
      />
    ),
  },
  {
    key: "empty",
    label: "Blank prompt",
    note: "No system prompt and every toggle off.",
    Component: () => (
      <SettingsPanel
        model="Haiku"
        models={MODELS}
        systemPrompt=""
        temperature={0}
        toggles={TOGGLES.map((toggle) => ({ ...toggle, on: false }))}
        {...handlers}
      />
    ),
  },
  {
    key: "out-of-range",
    label: "Clamped",
    note: "A temperature above the range is clamped to 2.0.",
    Component: () => (
      <SettingsPanel
        model="Opus"
        models={MODELS}
        systemPrompt={PROMPT}
        temperature={3.4}
        toggles={TOGGLES}
        {...handlers}
      />
    ),
  },
  {
    key: "long-content",
    label: "Long prompt",
    note: "A system prompt longer than three rows and long toggle text.",
    Component: () => (
      <SettingsPanel
        model="Sonnet"
        models={MODELS}
        systemPrompt="You are a careful engineering assistant working in the assistant-ui monorepo. Prefer the repo's existing conventions over your own. Run the package's tests before proposing a change, keep diffs small, and never touch generated files under dist or .next. When you are unsure which package owns a file, check the nearest package.json first."
        temperature={0.3}
        toggles={[
          ...TOGGLES,
          {
            key: "web",
            label: "Web search with citations from the public internet",
            detail:
              "Search the web when the docs do not cover a question, and cite every page used",
            on: true,
          },
        ]}
        {...handlers}
      />
    ),
  },
]);
