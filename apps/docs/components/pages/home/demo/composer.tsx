"use client";

import {
  AuiIf,
  ComposerPrimitive,
  MessagePrimitive,
  unstable_useMentionAdapter,
} from "@assistant-ui/react";
import { ArrowUpIcon, MicIcon, PlusIcon, SquareIcon } from "lucide-react";
import { useMemo, type ReactNode } from "react";
import { ComposerAttachments } from "@/components/assistant-ui/elements/attachment.aui";
import { ComposerTriggerPopover } from "@/components/assistant-ui/elements/composer-trigger-popover.aui";
import { ContextDisplay } from "@/components/assistant-ui/elements/context-display.aui";
import { ModelSelector } from "@/components/assistant-ui/elements/model-selector.aui";
import { ComposerQuotePreview } from "@/components/assistant-ui/elements/quote.aui";
import { docsModelOptions } from "@/components/pages/docs/assistant/docs-model-options";
import {
  DEFAULT_MODEL_ID,
  getContextWindow,
  isAvailableModelId,
  supportsReasoningEffort,
} from "@/lib/model";
import {
  createPersistedPreference,
  usePersistedPreference,
} from "@/lib/persisted-preference";
import { COMMAND_ICONS, HOME_COMMANDS } from "./commands";

const homeModelPreference = createPersistedPreference<string>({
  key: "aui-home-model",
  fallback: DEFAULT_MODEL_ID,
  read: (raw) => (isAvailableModelId(raw) ? raw : null),
});

// High effort stays off the anonymous landing page: it multiplies the cost
// of a request the rate limit counts as one.
const HOME_EFFORT_OPTIONS = [
  { id: "low", name: "Low" },
  { id: "medium", name: "Med" },
] as const;

const homeEffortPreference = createPersistedPreference<string>({
  key: "aui-home-effort",
  fallback: "low",
  read: (raw) =>
    HOME_EFFORT_OPTIONS.some((option) => option.id === raw) ? raw : null,
});

export function Composer(): ReactNode {
  const commands = unstable_useMentionAdapter({
    items: HOME_COMMANDS,
    includeModelContextTools: false,
    iconMap: COMMAND_ICONS,
  });
  const model = usePersistedPreference(homeModelPreference);
  const effort = usePersistedPreference(homeEffortPreference);
  const models = useMemo(
    () =>
      docsModelOptions().map((option) =>
        supportsReasoningEffort(option.id)
          ? { ...option, efforts: HOME_EFFORT_OPTIONS }
          : option,
      ),
    [],
  );

  return (
    <ComposerPrimitive.Unstable_TriggerPopoverRoot>
      <ComposerPrimitive.Root className="relative w-full">
        <ComposerTriggerPopover
          char="/"
          adapter={commands.adapter}
          directive={commands.directive}
          iconMap={COMMAND_ICONS}
          emptyItemsLabel="No matching command"
          className="w-72"
        />
        <ComposerPrimitive.AttachmentDropzone asChild>
          <div className="border-foreground/10 bg-muted/30 focus-within:border-foreground/25 data-[dragging=true]:border-foreground/40 rounded-thread flex flex-col border transition-colors data-[dragging=true]:border-dashed">
            <ComposerQuotePreview className="bg-foreground/[0.04] rounded-control mx-3 mt-3" />
            <div className="has-[.aui-attachment-root]:px-3 has-[.aui-attachment-root]:pt-3">
              <ComposerAttachments />
            </div>
            <ComposerPrimitive.Input asChild>
              <textarea
                data-composer-input
                placeholder="Send a message..."
                rows={1}
                className="placeholder:text-muted-foreground field-sizing-content max-h-48 w-full resize-none bg-transparent px-4 pt-3 pb-2 text-base leading-6 focus:outline-none"
              />
            </ComposerPrimitive.Input>
            <div className="flex items-center justify-between gap-2 px-2 pb-2">
              <div className="flex min-w-0 items-center gap-1">
                <ComposerPrimitive.AddAttachment asChild>
                  <button
                    type="button"
                    aria-label="Add attachment"
                    className="text-muted-foreground hover:text-foreground rounded-control grid size-7 shrink-0 place-items-center transition-colors"
                  >
                    <PlusIcon className="size-4" />
                  </button>
                </ComposerPrimitive.AddAttachment>
                <ModelSelector
                  models={models}
                  value={model}
                  onValueChange={homeModelPreference.set}
                  effort={effort}
                  onEffortChange={homeEffortPreference.set}
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-foreground rounded-control h-7 min-w-0 text-[13px] font-normal"
                />
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <ContextDisplay.Text
                  modelContextWindow={getContextWindow(model)}
                  side="top"
                  className="text-muted-foreground hover:text-foreground rounded-control h-7 px-2 text-[11px] hover:bg-transparent"
                />
                <AuiIf
                  condition={(s) =>
                    s.thread.capabilities.dictation &&
                    s.composer.dictation == null
                  }
                >
                  <ComposerPrimitive.Dictate asChild>
                    <button
                      type="button"
                      aria-label="Start voice input"
                      className="text-muted-foreground hover:text-foreground rounded-control grid size-7 place-items-center transition-colors disabled:opacity-40"
                    >
                      <MicIcon className="size-4" />
                    </button>
                  </ComposerPrimitive.Dictate>
                </AuiIf>
                <AuiIf condition={(s) => s.composer.dictation != null}>
                  <ComposerPrimitive.StopDictation asChild>
                    <button
                      type="button"
                      aria-label="Stop voice input"
                      className="text-destructive rounded-control grid size-7 place-items-center transition-colors"
                    >
                      <SquareIcon className="size-3 animate-pulse fill-current" />
                    </button>
                  </ComposerPrimitive.StopDictation>
                </AuiIf>
                <AuiIf condition={(s) => !s.thread.isRunning}>
                  <ComposerPrimitive.Send asChild>
                    <button
                      type="button"
                      aria-label="Send message"
                      className="bg-primary text-primary-foreground rounded-control grid size-7 place-items-center transition-opacity disabled:opacity-40"
                    >
                      <ArrowUpIcon className="size-4" />
                    </button>
                  </ComposerPrimitive.Send>
                </AuiIf>
                <AuiIf condition={(s) => s.thread.isRunning}>
                  <ComposerPrimitive.Cancel asChild>
                    <button
                      type="button"
                      aria-label="Stop generating"
                      className="bg-primary text-primary-foreground rounded-control grid size-7 place-items-center"
                    >
                      <SquareIcon className="size-3 fill-current" />
                    </button>
                  </ComposerPrimitive.Cancel>
                </AuiIf>
              </div>
            </div>
          </div>
        </ComposerPrimitive.AttachmentDropzone>
      </ComposerPrimitive.Root>
    </ComposerPrimitive.Unstable_TriggerPopoverRoot>
  );
}

export function EditComposer(): ReactNode {
  return (
    <MessagePrimitive.Root
      data-role="user"
      className="mx-auto flex w-full max-w-(--thread-max-width) flex-col items-end"
    >
      <ComposerPrimitive.Root className="border-foreground/10 bg-muted/30 focus-within:border-foreground/25 rounded-thread flex w-full max-w-[85%] flex-col border transition-colors">
        <ComposerPrimitive.Input asChild>
          <textarea
            autoFocus
            aria-label="Edit message"
            rows={1}
            className="field-sizing-content max-h-48 min-h-12 w-full resize-none bg-transparent px-4 pt-3.5 pb-1 text-[15px] leading-6 focus:outline-none"
          />
        </ComposerPrimitive.Input>
        <div className="flex items-center justify-end gap-1.5 px-2.5 pb-2.5">
          <ComposerPrimitive.Cancel asChild>
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground rounded-control h-8 px-3 text-[13px] transition-colors"
            >
              Cancel
            </button>
          </ComposerPrimitive.Cancel>
          <ComposerPrimitive.Send asChild>
            <button
              type="button"
              className="bg-primary text-primary-foreground rounded-control h-8 px-3 text-[13px] font-medium transition-opacity disabled:opacity-40"
            >
              Update
            </button>
          </ComposerPrimitive.Send>
        </div>
      </ComposerPrimitive.Root>
    </MessagePrimitive.Root>
  );
}
