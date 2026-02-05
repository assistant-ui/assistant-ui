"use client";

import { Button } from "@/components/ui/button";
import { useCurrentPage } from "@/components/docs/contexts/current-page";
import { ModelSelector } from "@/components/assistant-ui/model-selector";
import { MODELS } from "@/constants/model";
import { analytics } from "@/lib/analytics";
import { getComposerMessageMetrics } from "@/lib/assistant-analytics-helpers";
import {
  AuiIf,
  ComposerPrimitive,
  useAui,
  useAuiState,
} from "@assistant-ui/react";
import { ArrowUpIcon, SquareIcon } from "lucide-react";
import Image from "next/image";
import type { ReactNode } from "react";

const models = MODELS.map((m) => ({
  id: m.value,
  name: m.name,
  icon: (
    <Image
      src={m.icon}
      alt={m.name}
      width={14}
      height={14}
      className="size-3.5"
    />
  ),
  ...(m.disabled ? { disabled: true as const } : undefined),
}));

export function AssistantComposer(): ReactNode {
  const aui = useAui();
  const threadId = useAuiState(({ threadListItem }) => threadListItem.id);
  const currentPage = useCurrentPage();
  const pathname = currentPage?.pathname;

  const handleSubmit = () => {
    const metrics = getComposerMessageMetrics(aui.composer().getState());
    if (!metrics) return;

    let modelName: string | undefined;
    try {
      modelName = aui.thread().getModelContext()?.config?.modelName;
    } catch {
      // ignore
    }

    analytics.assistant.messageSent({
      threadId,
      source: "composer",
      message_length: metrics.messageLength,
      attachments_count: metrics.attachmentsCount,
      ...(pathname ? { pathname } : {}),
      ...(modelName ? { model_name: modelName } : {}),
    });
  };

  return (
    <ComposerPrimitive.Root
      onSubmit={handleSubmit}
      className="bg-background py-2"
    >
      <div className="rounded-xl border border-border bg-muted/50 focus-within:border-ring/50 focus-within:ring-1 focus-within:ring-ring/20">
        <ComposerPrimitive.Input asChild>
          <textarea
            placeholder="Ask a question..."
            className="field-sizing-content max-h-32 w-full resize-none bg-transparent px-3 pt-2.5 pb-2 text-sm leading-5 placeholder:text-muted-foreground focus:outline-none"
            rows={1}
          />
        </ComposerPrimitive.Input>
        <div className="flex items-center justify-between px-1.5 pb-1.5">
          <ModelSelector
            models={models}
            defaultValue={MODELS[0].value}
            variant="ghost"
            size="sm"
          />
          <AssistantComposerAction />
        </div>
      </div>
    </ComposerPrimitive.Root>
  );
}

function AssistantComposerAction(): ReactNode {
  return (
    <>
      <AuiIf condition={({ thread }) => !thread.isRunning}>
        <ComposerPrimitive.Send asChild>
          <Button type="submit" size="icon" className="size-7 rounded-lg">
            <ArrowUpIcon className="size-4" />
          </Button>
        </ComposerPrimitive.Send>
      </AuiIf>

      <AuiIf condition={({ thread }) => thread.isRunning}>
        <ComposerPrimitive.Cancel asChild>
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="size-7 rounded-lg"
          >
            <SquareIcon className="size-3 fill-current" />
          </Button>
        </ComposerPrimitive.Cancel>
      </AuiIf>
    </>
  );
}
