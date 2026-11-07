"use client";

import {
  ModelSelectorContent,
  ModelSelectorEffort,
  ModelSelectorEmpty,
  ModelSelectorItem,
  ModelSelectorList,
  ModelSelectorRoot,
  ModelSelectorSearch,
  ModelSelectorTrigger,
  type ModelOption,
} from "@/components/assistant-ui/elements/model-selector.aui";
import {
  ClaudeLogo,
  GeminiLogo,
  OpenAILogo,
} from "@/components/assistant-ui/elements/logos";
import { SampleRuntimeProvider } from "@/components/pages/docs/samples/sample-runtime-provider";
import { defineStates } from "./types";

const noop = () => {};

const MODELS: ModelOption[] = [
  {
    id: "claude-opus-4-5",
    name: "Claude Opus 4.5",
    description: "200K context window",
    icon: <ClaudeLogo />,
    efforts: true,
  },
  {
    id: "gpt-5",
    name: "GPT-5",
    description: "400K context window",
    icon: <OpenAILogo />,
    efforts: true,
  },
  {
    id: "gemini-2-5-pro",
    name: "Gemini 2.5 Pro",
    description: "1M context window",
    icon: <GeminiLogo />,
  },
];

const LOCKED_MODELS: ModelOption[] = [
  MODELS[0]!,
  { ...MODELS[1]!, description: "Sign in to use", disabled: true },
  { ...MODELS[2]!, description: "Sign in to use", disabled: true },
];

/** Leaves room under the trigger for the open popover. */
function Stage({
  open,
  children,
}: {
  open?: boolean;
  children: React.ReactNode;
}) {
  return (
    <SampleRuntimeProvider>
      <div
        className={
          open ? "flex h-80 w-72 items-start" : "flex w-72 justify-center"
        }
      >
        {children}
      </div>
    </SampleRuntimeProvider>
  );
}

export const states = defineStates([
  { key: "default", label: "Default" },
  {
    key: "open",
    label: "Open",
    note: "The list is open with the reasoning effort row for the selected model.",
    Component: () => (
      <Stage open>
        <ModelSelectorRoot
          models={MODELS}
          value="claude-opus-4-5"
          effort="high"
          onValueChange={noop}
          onEffortChange={noop}
          open
          onOpenChange={noop}
        >
          <ModelSelectorTrigger />
          <ModelSelectorContent />
        </ModelSelectorRoot>
      </Stage>
    ),
  },
  {
    key: "empty",
    label: "No selection",
    note: "Before a model is picked the trigger shows its placeholder.",
    Component: () => (
      <Stage>
        <ModelSelectorRoot models={MODELS} value="" onValueChange={noop}>
          <ModelSelectorTrigger />
          <ModelSelectorContent />
        </ModelSelectorRoot>
      </Stage>
    ),
  },
  {
    key: "disabled",
    label: "Locked models",
    note: "Models the user cannot pick yet stay listed but disabled.",
    Component: () => (
      <Stage open>
        <ModelSelectorRoot
          models={LOCKED_MODELS}
          value="claude-opus-4-5"
          onValueChange={noop}
          open
          onOpenChange={noop}
        >
          <ModelSelectorTrigger />
          <ModelSelectorContent />
        </ModelSelectorRoot>
      </Stage>
    ),
  },
  {
    key: "no-matches",
    label: "No matches",
    note: "A search that matches no model shows the empty message.",
    Component: () => (
      <Stage open>
        <ModelSelectorRoot
          models={MODELS}
          value="gpt-5"
          onValueChange={noop}
          open
          onOpenChange={noop}
        >
          <ModelSelectorTrigger />
          <ModelSelectorContent>
            <ModelSelectorSearch value="llama" onValueChange={noop} />
            <ModelSelectorList>
              <ModelSelectorEmpty />
              {MODELS.map((model) => (
                <ModelSelectorItem key={model.id} model={model} />
              ))}
            </ModelSelectorList>
            <ModelSelectorEffort />
          </ModelSelectorContent>
        </ModelSelectorRoot>
      </Stage>
    ),
  },
]);
