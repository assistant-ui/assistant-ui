"use client";

import { ModelSelector } from "@/components/assistant-ui/model-selector";
import { AssistantComposer } from "@/components/docs/assistant/composer";
import { AssistantActionBar } from "@/components/docs/assistant/assistant-action-bar";
import { MarkdownText } from "@/components/docs/assistant/markdown";
import { AssistantFooter } from "@/components/docs/assistant/footer";
import { AssistantThread } from "@/components/docs/assistant/thread";
import { Reasoning } from "@/components/assistant-ui/reasoning";
import { DotMatrix } from "@/components/assistant-ui/dot-matrix";
import { getXuluxThreadWelcome } from "@/lib/xulux/thread-welcome";
import {
  AuiIf,
  ErrorPrimitive,
  MessagePrimitive,
  useAui,
} from "@assistant-ui/react";
import Image from "next/image";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { XuluxPoweredBy } from "../XuluxPoweredBy";
import { useXuluxTemplateContext } from "./XuluxTemplateContext";
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
  const template = useXuluxTemplateContext();
  const welcome = useMemo(() => getXuluxThreadWelcome(template), [template]);

  return (
    <AssistantThread
      welcome={
        <XuluxWelcome welcome={welcome} templateTitle={template?.title} />
      }
      composer={
        <XuluxComposer
          onNewThread={onNewThread}
          placeholder={welcome.composerPlaceholder}
        />
      }
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
  placeholder,
}: {
  onNewThread: () => void;
  placeholder: string;
}): ReactNode {
  return (
    <div>
      <XuluxUsageLimitBanner onNewThread={onNewThread} />
      <AssistantComposer
        placeholder={placeholder}
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
    return aui.modelContext().register({
      getModelContext: () => ({
        config: {
          modelName: selectedModel.modelName,
        },
      }),
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
  return (
    <MessagePrimitive.Root className="py-2" data-role="assistant">
      <div className="text-sm [&_[data-part-type=tool-call]+[data-part-type=text]]:mt-2.5">
        <MessagePrimitive.Parts>
          {({ part }) => {
            if (part.type === "text") {
              return (
                <div data-part-type="text">
                  <MarkdownText />
                </div>
              );
            }
            if (part.type === "reasoning") {
              return (
                <div data-part-type="reasoning">
                  <Reasoning {...part} />
                </div>
              );
            }
            if (part.type === "tool-call") {
              return (
                <div data-part-type="tool-call">
                  {part.toolUI ?? <XuluxToolCall {...part} />}
                </div>
              );
            }
            return null;
          }}
        </MessagePrimitive.Parts>

        <AuiIf
          condition={(s) =>
            s.thread.isRunning && s.message.content.length === 0
          }
        >
          <div className="text-muted-foreground flex items-center gap-2 py-1">
            <DotMatrix state="connecting" aria-hidden />
            <span className="text-sm">Connecting</span>
          </div>
        </AuiIf>
        <MessagePrimitive.Error>
          <ErrorPrimitive.Root className="border-destructive bg-destructive/10 text-destructive dark:bg-destructive/5 mt-2 rounded-md border p-2 text-xs dark:text-red-200">
            <ErrorPrimitive.Message className="line-clamp-2" />
          </ErrorPrimitive.Root>
        </MessagePrimitive.Error>
      </div>
      <AssistantActionBar />
    </MessagePrimitive.Root>
  );
}

function XuluxWelcome({
  welcome,
  templateTitle,
}: {
  welcome: ReturnType<typeof getXuluxThreadWelcome>;
  templateTitle?: string | undefined;
}): ReactNode {
  return (
    <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
      {templateTitle ? (
        <span className="text-muted-foreground mb-3 inline-block rounded-full border px-2.5 py-0.5 text-xs">
          {templateTitle}
        </span>
      ) : null}
      <h2 className="text-base font-semibold tracking-tight">
        {welcome.headline}
      </h2>
      <p className="text-muted-foreground mt-1 max-w-sm text-sm">
        {welcome.body}
      </p>
    </div>
  );
}

function isXuluxModelId(value: string): value is XuluxModelId {
  return XULUX_MODELS.some((model) => model.id === value);
}
