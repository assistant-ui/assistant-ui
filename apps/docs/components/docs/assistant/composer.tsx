"use client";

import { Button } from "@/components/ui/button";
import { useCurrentPage } from "@/components/docs/contexts/current-page";
import { ModelSelector } from "@/components/assistant-ui/model-selector";
import { docsModelOptions } from "@/components/docs/assistant/docs-model-options";
import {
  DEFAULT_MODEL_ID,
  resolveModelId,
  type KnownModelId,
} from "@/constants/model";
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

// Shared docs assistant model selection is intentionally global for current docs behavior,
// where a single model picker state should stay in sync across composer surfaces.
// If independent composer instances are introduced later, move this to a scoped React store.
let sharedDocsModelName: KnownModelId | undefined;
const modelStoreListeners = new Set<ModelStoreListener>();

const subscribeModelStore = (listener: ModelStoreListener) => {
  modelStoreListeners.add(listener);
  return () => {
    modelStoreListeners.delete(listener);
  };
};

const setSharedDocsModelName = (modelName: KnownModelId) => {
  if (sharedDocsModelName === modelName) return;
  sharedDocsModelName = modelName;
  modelStoreListeners.forEach((listener) => listener());
};

const models = docsModelOptions();

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

    let nextModelName = DEFAULT_MODEL_ID;
    try {
      nextModelName = resolveModelId(
        aui.thread().getModelContext()?.config?.modelName,
      );
    } catch {
      // ignore
    }

    setSharedDocsModelName(nextModelName);
  }, [aui, threadId]);

  const modelValue = useSyncExternalStore(
    subscribeModelStore,
    () => sharedDocsModelName ?? DEFAULT_MODEL_ID,
    () => DEFAULT_MODEL_ID,
  );

  const onModelChange = useCallback((value: string) => {
    setSharedDocsModelName(resolveModelId(value));
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
      <AuiIf condition={(s) => !s.thread.isRunning}>
        <ComposerPrimitive.Send asChild>
          <Button type="submit" size="icon" className="size-7 rounded-lg">
            <ArrowUpIcon className="size-4" />
          </Button>
        </ComposerPrimitive.Send>
      </AuiIf>

      <AuiIf condition={(s) => s.thread.isRunning}>
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
