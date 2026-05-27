"use client";

import { ModelSelector } from "@/components/assistant-ui/model-selector";
import { AssistantComposer } from "@/components/docs/assistant/composer";
import { AssistantFooter } from "@/components/docs/assistant/footer";
import { AssistantMessage } from "@/components/docs/assistant/messages";
import { AssistantThread } from "@/components/docs/assistant/thread";
import { useAui } from "@assistant-ui/react";
import Image from "next/image";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { XuluxPoweredBy } from "../XuluxPoweredBy";
import { XuluxToolCall } from "./XuluxToolCall";

const XULUX_CONTEXT_WINDOW = 400_000;
const XULUX_DEFAULT_MODEL_ID = "gpt-5.4-low";

const XULUX_MODELS = [
  {
    id: "gpt-5.4-mini",
    name: "GPT-5.4 Mini",
    modelName: "gpt-5.4-mini",
  },
  {
    id: "gpt-5.4-low",
    name: "GPT-5.4 Low",
    description: "Low reasoning",
    modelName: "gpt-5.4",
    reasoningEffort: "low",
  },
] as const;

type XuluxModelId = (typeof XULUX_MODELS)[number]["id"];

export function XuluxThread({
  onNewThread,
}: {
  onNewThread: () => void;
}): ReactNode {
  return (
    <AssistantThread
      welcome={<XuluxWelcome />}
      composer={<XuluxComposer />}
      footer={
        <AssistantFooter
          onNewThread={onNewThread}
          contextWindow={XULUX_CONTEXT_WINDOW}
          centerContent={<XuluxPoweredBy className="min-w-0 truncate px-1" />}
        />
      }
      AssistantMessageComponent={XuluxAssistantMessage}
    />
  );
}

function XuluxComposer(): ReactNode {
  return (
    <AssistantComposer
      placeholder="Ask Xulux to build or refine the UI..."
      modelSelector={<XuluxModelSelector />}
    />
  );
}

function XuluxModelSelector(): ReactNode {
  const aui = useAui();
  const [modelValue, setModelValue] = useState<XuluxModelId>(
    XULUX_DEFAULT_MODEL_ID,
  );
  const selectedModel =
    XULUX_MODELS.find((model) => model.id === modelValue) ?? XULUX_MODELS[0];
  const modelOptions = useMemo(
    () =>
      XULUX_MODELS.map((model) => ({
        id: model.id,
        name: model.name,
        ...("description" in model
          ? { description: model.description }
          : undefined),
        icon: (
          <Image
            src="/icons/openai.svg"
            alt={model.name}
            width={16}
            height={16}
            className="size-4"
          />
        ),
      })),
    [],
  );

  useEffect(() => {
    const config = {
      config: {
        modelName: selectedModel.modelName,
        ...("reasoningEffort" in selectedModel
          ? { reasoningEffort: selectedModel.reasoningEffort }
          : undefined),
      },
    };

    return aui.modelContext().register({
      getModelContext: () => config,
    });
  }, [aui, selectedModel]);

  return (
    <ModelSelector.Root
      models={modelOptions}
      value={modelValue}
      onValueChange={(value) => {
        if (isXuluxModelId(value)) setModelValue(value);
      }}
    >
      <ModelSelector.Trigger variant="ghost" size="sm" />
      <ModelSelector.Content />
    </ModelSelector.Root>
  );
}

function XuluxAssistantMessage(): ReactNode {
  return <AssistantMessage ToolCallComponent={XuluxToolCall} />;
}

function XuluxWelcome(): ReactNode {
  return (
    <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
      <p className="text-muted-foreground text-sm">
        Pick a template preview or describe what to build.
      </p>
    </div>
  );
}

function isXuluxModelId(value: string): value is XuluxModelId {
  return XULUX_MODELS.some((model) => model.id === value);
}
