"use client";

import {
  RegenerateMenu,
  type RegenerateOption,
} from "@/components/assistant-ui/elements/regenerate-menu";
import { defineStates } from "./types";

const noop = () => {};

const OPTIONS: readonly RegenerateOption[] = [
  { id: "opus", label: "Try again with Opus 5", detail: "slower" },
  { id: "sonnet", label: "Try again with Sonnet 5", detail: "balanced" },
  { id: "haiku", label: "Try again with Haiku 4.5", detail: "fastest" },
];

export const states = defineStates([
  { key: "default", label: "Default" },
  {
    key: "closed",
    label: "Closed",
    note: "Only the regenerate button shows until the user opens the menu.",
    Component: () => (
      <RegenerateMenu
        options={OPTIONS}
        open={false}
        currentId="sonnet"
        onOpenChange={noop}
        onPick={noop}
      />
    ),
  },
  {
    key: "disabled",
    label: "Read only",
    note: "Without handlers the list shows the models but none can be picked.",
    Component: () => <RegenerateMenu options={OPTIONS} open currentId="opus" />,
  },
  {
    key: "long-content",
    label: "Long labels",
    note: "Long model names truncate and keep their detail on the right.",
    Component: () => (
      <RegenerateMenu
        options={[
          {
            id: "opus",
            label: "Try again with Opus 5 and extended thinking",
            detail: "slower",
          },
          {
            id: "sonnet",
            label: "Try again with Sonnet 5 at 1M context",
            detail: "balanced",
          },
          {
            id: "haiku",
            label: "Try again with Haiku 4.5",
            detail: "fastest",
          },
          {
            id: "gpt",
            label: "Try again with gpt-5.1-codex-max via OpenRouter",
            detail: "external",
          },
          {
            id: "local",
            label: "Try again with llama-3.3-70b-instruct on localhost:11434",
            detail: "local",
          },
        ]}
        open
        currentId="sonnet"
        onOpenChange={noop}
        onPick={noop}
      />
    ),
  },
]);
