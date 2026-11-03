"use client";

import {
  ClaudeLogo,
  GeminiLogo,
  OpenAILogo,
} from "@/components/assistant-ui/elements/logos";
import { defineStates } from "./types";

const MODELS = [
  { name: "GPT-5", Logo: OpenAILogo },
  { name: "Claude Opus 5", Logo: ClaudeLogo },
  { name: "Gemini 3 Pro", Logo: GeminiLogo },
] as const;

export const states = defineStates([
  { key: "default", label: "Default" },
  {
    key: "small",
    label: "Small",
    note: "At 16 pixels the marks stay legible at inline icon size.",
    Component: () => (
      <div className="flex items-center gap-4">
        <OpenAILogo className="size-4" />
        <ClaudeLogo className="size-4" />
        <GeminiLogo className="size-4" />
      </div>
    ),
  },
  {
    key: "with-labels",
    label: "With labels",
    note: "Each mark sits beside a model name, as in a model picker.",
    Component: () => (
      <div className="flex flex-col gap-2">
        {MODELS.map(({ name, Logo }) => (
          <div key={name} className="flex items-center gap-2 text-sm">
            <Logo className="size-4 shrink-0" />
            <span>{name}</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    key: "tinted",
    label: "Tinted",
    note: "The OpenAI mark follows the text color while the others keep brand colors.",
    Component: () => (
      <div className="flex items-center gap-8 text-blue-600 dark:text-blue-400">
        <OpenAILogo className="size-9" />
        <ClaudeLogo className="size-9" />
        <GeminiLogo className="size-9" />
      </div>
    ),
  },
]);
