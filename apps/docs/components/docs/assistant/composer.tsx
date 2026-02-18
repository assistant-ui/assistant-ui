"use client";

import { Button } from "@/components/ui/button";
import { useCurrentPage } from "@/components/docs/contexts/current-page";
import { ModelSelector } from "@/components/assistant-ui/model-selector";
import { DEFAULT_DOCS_MODEL, MODELS } from "@/constants/model";
import Image from "next/image";
import { analytics } from "@/lib/analytics";
import { getComposerMessageMetrics } from "@/lib/assistant-analytics-helpers";
import {
  AuiIf,
  ComposerPrimitive,
  useAui,
  useAuiState,
} from "@assistant-ui/react";
import { cn } from "@/lib/utils";
import { ArrowUpIcon, SquareIcon } from "lucide-react";
import {
  useCallback,
  useEffect,
  useSyncExternalStore,
  type ReactNode,
} from "react";

type ModelStoreListener = () => void;

let sharedDocsModelName: string | undefined;
const modelStoreListeners = new Set<ModelStoreListener>();

const subscribeModelStore = (listener: ModelStoreListener) => {
  modelStoreListeners.add(listener);
  return () => {
    modelStoreListeners.delete(listener);
  };
};

const setSharedDocsModelName = (modelName: string) => {
  if (sharedDocsModelName === modelName) return;
  sharedDocsModelName = modelName;
  modelStoreListeners.forEach((listener) => listener());
};

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

export function useComposerSubmitHandler(onSubmitProp?: () => void) {
  const aui = useAui();
  const threadId = useAuiState((s) => s.threadListItem.id);
  const currentPage = useCurrentPage();
  const pathname = currentPage?.pathname;

  return () => {
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

    onSubmitProp?.();
  };
}

export function useSharedDocsModelSelection(): {
  modelValue: string;
  onModelChange: (value: string) => void;
} {
  const aui = useAui();
  const threadId = useAuiState((s) => s.threadListItem.id);

  useEffect(() => {
    if (!threadId) return;

    let nextModelName = DEFAULT_DOCS_MODEL;
    try {
      const modelName = aui.thread().getModelContext()?.config?.modelName;
      if (typeof modelName === "string" && modelName.trim().length > 0) {
        nextModelName = modelName.trim();
      }
    } catch {
      // ignore
    }

    setSharedDocsModelName(nextModelName);
  }, [aui, threadId]);

  const modelValue = useSyncExternalStore(
    subscribeModelStore,
    () => sharedDocsModelName ?? DEFAULT_DOCS_MODEL,
    () => DEFAULT_DOCS_MODEL,
  );

  const onModelChange = useCallback((value: string) => {
    setSharedDocsModelName(value);
  }, []);

  return { modelValue, onModelChange };
}

export function AssistantComposer({
  onSubmit: onSubmitProp,
  className,
}: {
  onSubmit?: () => void;
  className?: string;
} = {}): ReactNode {
  const handleSubmit = useComposerSubmitHandler(onSubmitProp);
  const { modelValue, onModelChange } = useSharedDocsModelSelection();

  return (
    <ComposerPrimitive.Root
      onSubmit={handleSubmit}
      className={cn("py-2", className)}
    >
      <div className="rounded-xl border border-border bg-background focus-within:border-ring/50 focus-within:ring-1 focus-within:ring-ring/20">
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
            value={modelValue}
            onValueChange={onModelChange}
            variant="ghost"
            size="sm"
          />
          <AssistantComposerAction />
        </div>
      </div>
    </ComposerPrimitive.Root>
  );
}

export function AssistantComposerAction(): ReactNode {
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
