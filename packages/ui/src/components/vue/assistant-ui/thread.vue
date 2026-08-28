<script setup lang="ts">
import {
  AttachmentPrimitiveName,
  AttachmentPrimitiveRemove,
  AttachmentPrimitiveThumb,
  AuiIf,
  ComposerPrimitiveAddAttachment,
  ComposerPrimitiveAttachmentDropzone,
  ComposerPrimitiveAttachments,
  ComposerPrimitiveCancel,
  ComposerPrimitiveInput,
  ComposerPrimitiveSend,
  SuggestionPrimitiveDescription,
  SuggestionPrimitiveTitle,
  SuggestionPrimitiveTrigger,
  ThreadPrimitiveMessages,
  ThreadPrimitiveScrollToBottom,
  ThreadPrimitiveSuggestions,
  ThreadPrimitiveViewport,
} from "@assistant-ui/vue";
import type {} from "@assistant-ui/core/store";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  PaperclipIcon,
  SquareIcon,
  XIcon,
} from "@lucide/vue";
import Message from "@/components/assistant-ui/message.vue";
</script>

<template>
  <div class="bg-background flex h-full">
    <div class="flex min-w-0 flex-1 flex-col">
      <ThreadPrimitiveViewport
        class="relative flex flex-1 flex-col overflow-x-auto overflow-y-scroll scroll-smooth"
      >
        <div class="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 pt-12">
          <AuiIf :condition="(s) => s.thread.messages.length === 0">
            <div
              class="flex flex-1 flex-col items-center justify-center gap-6 pb-24"
            >
              <h1 class="text-2xl font-semibold">How can I help you today?</h1>
              <div
                class="flex flex-wrap items-center justify-center gap-2 px-4"
              >
                <ThreadPrimitiveSuggestions>
                  <SuggestionPrimitiveTrigger
                    send
                    class="text-foreground hover:bg-muted border-border/60 flex h-auto flex-col items-start gap-0.5 rounded-2xl border px-3.5 py-2 text-sm transition-colors"
                  >
                    <span class="font-medium"
                      ><SuggestionPrimitiveTitle
                    /></span>
                    <span class="text-muted-foreground text-xs">
                      <SuggestionPrimitiveDescription />
                    </span>
                  </SuggestionPrimitiveTrigger>
                </ThreadPrimitiveSuggestions>
              </div>
            </div>
          </AuiIf>
          <ol class="mb-4 flex flex-col gap-y-6 empty:hidden">
            <ThreadPrimitiveMessages>
              <Message />
            </ThreadPrimitiveMessages>
          </ol>
          <ThreadPrimitiveScrollToBottom
            class="border-border/60 bg-background sticky bottom-2 z-10 mx-auto rounded-full border p-2 shadow-sm transition-[opacity,visibility] disabled:invisible disabled:opacity-0"
            aria-label="Scroll to bottom"
          >
            <ArrowDownIcon class="size-4" />
          </ThreadPrimitiveScrollToBottom>
        </div>
      </ThreadPrimitiveViewport>
      <div class="mx-auto w-full max-w-2xl px-4 pb-4">
        <ComposerPrimitiveAttachmentDropzone
          class="border-border/60 focus-within:border-border data-[dragging=true]:border-primary data-[dragging=true]:bg-primary/5 flex w-full flex-col gap-2 rounded-2xl border p-2.5 shadow-[0_4px_16px_-8px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04)] transition-[border-color,box-shadow] focus-within:shadow-[0_6px_24px_-8px_rgba(0,0,0,0.12),0_1px_2px_rgba(0,0,0,0.05)]"
        >
          <div class="flex flex-wrap gap-2 empty:hidden">
            <ComposerPrimitiveAttachments>
              <div
                class="border-border/60 bg-muted/40 flex items-center gap-2 rounded-lg border px-2 py-1 text-xs"
              >
                <AttachmentPrimitiveThumb
                  class="bg-muted text-muted-foreground rounded px-1.5 py-0.5 font-mono text-[10px] uppercase"
                />
                <span class="max-w-40 truncate"
                  ><AttachmentPrimitiveName
                /></span>
                <AttachmentPrimitiveRemove
                  class="text-muted-foreground hover:text-foreground rounded p-0.5"
                  aria-label="Remove attachment"
                >
                  <XIcon class="size-3" />
                </AttachmentPrimitiveRemove>
              </div>
            </ComposerPrimitiveAttachments>
          </div>
          <ComposerPrimitiveInput
            class="caret-primary placeholder:text-muted-foreground/80 max-h-32 min-h-10 w-full resize-none bg-transparent px-2.5 py-1 text-base outline-none"
            placeholder="Send a message..."
            rows="1"
          />
          <div class="flex items-center justify-between">
            <div class="flex items-center">
              <AuiIf :condition="(s) => s.thread.capabilities.attachments">
                <ComposerPrimitiveAddAttachment
                  class="text-muted-foreground hover:text-foreground flex size-7 items-center justify-center rounded-full transition-colors disabled:opacity-50"
                  aria-label="Add attachment"
                >
                  <PaperclipIcon class="size-4" />
                </ComposerPrimitiveAddAttachment>
              </AuiIf>
            </div>
            <AuiIf :condition="(s) => !s.thread.isRunning">
              <ComposerPrimitiveSend
                class="bg-primary text-primary-foreground flex size-7 items-center justify-center rounded-full transition-opacity disabled:opacity-50"
                aria-label="Send"
              >
                <ArrowUpIcon class="size-4.5" />
              </ComposerPrimitiveSend>
            </AuiIf>
            <AuiIf :condition="(s) => s.thread.isRunning">
              <ComposerPrimitiveCancel
                class="bg-primary text-primary-foreground flex size-7 items-center justify-center rounded-full"
                aria-label="Stop"
              >
                <SquareIcon class="size-3.5 fill-current" />
              </ComposerPrimitiveCancel>
            </AuiIf>
          </div>
        </ComposerPrimitiveAttachmentDropzone>
      </div>
    </div>
  </div>
</template>
