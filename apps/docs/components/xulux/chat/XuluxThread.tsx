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
import { XuluxUsageLimitBanner } from "./XuluxUsageLimitBanner";

const XULUX_CONTEXT_WINDOW = 400_000;
const XULUX_DEFAULT_MODEL_ID = "gpt-5.4-mini";

const XULUX_MODELS = [
  {
    id: "gpt-5.4-mini",
    name: "GPT-5.4 Mini",
    modelName: "gpt-5.4-mini",
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
      composer={<XuluxComposer onNewThread={onNewThread} />}
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

function XuluxComposer({
  onNewThread,
}: {
  onNewThread: () => void;
}): ReactNode {
  return (
    <div>
      <XuluxUsageLimitBanner onNewThread={onNewThread} />
      <AssistantComposer
        placeholder="Ask Xulux to build or refine the UI..."
        modelSelector={<XuluxModelSelector />}
      />
    </div>
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
