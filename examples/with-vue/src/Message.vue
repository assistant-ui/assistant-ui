<script setup lang="ts">
import {
  ActionBarPrimitiveCopy,
  ActionBarPrimitiveEdit,
  ActionBarPrimitiveReload,
  AuiIf,
  BranchPickerPrimitiveCount,
  BranchPickerPrimitiveNext,
  BranchPickerPrimitiveNumber,
  BranchPickerPrimitivePrevious,
  ComposerPrimitiveCancel,
  ComposerPrimitiveInput,
  ComposerPrimitiveSend,
  MessagePrimitiveParts,
  useAuiState,
} from "@assistant-ui/vue";
import type {} from "@assistant-ui/core/store";
import {
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CopyIcon,
  PencilIcon,
  RefreshCwIcon,
} from "@lucide/vue";

const role = useAuiState((s) => s.message.role);
const pulsing = useAuiState(
  (s) => s.message.content.length === 0 && s.thread.isRunning,
);
const editing = useAuiState((s) => s.composer.isEditing);
const copied = useAuiState((s) => s.message.isCopied);
</script>

<template>
  <li
    :data-role="role"
    class="group flex flex-col gap-1"
    :class="role === 'user' ? 'items-end' : 'items-start'"
  >
    <div
      v-if="editing"
      class="border-border/60 flex w-full max-w-[80%] flex-col gap-2 rounded-xl border p-2"
    >
      <ComposerPrimitiveInput
        class="w-full resize-none bg-transparent px-1 py-0.5 outline-none"
        rows="2"
      />
      <div class="flex justify-end gap-2 text-sm">
        <ComposerPrimitiveCancel
          class="text-muted-foreground rounded-lg px-2 py-1"
        >
          Discard
        </ComposerPrimitiveCancel>
        <ComposerPrimitiveSend
          class="bg-primary text-primary-foreground rounded-lg px-2 py-1 disabled:opacity-50"
        >
          Save
        </ComposerPrimitiveSend>
      </div>
    </div>
    <div
      v-else
      class="px-2 wrap-break-word"
      :class="
        role === 'user'
          ? 'bg-muted text-foreground max-w-[80%] rounded-xl px-4 py-2'
          : 'text-foreground leading-relaxed'
      "
    >
      <MessagePrimitiveParts />
      <span v-if="pulsing" class="animate-pulse">…</span>
    </div>
    <div
      class="text-muted-foreground flex items-center gap-1 px-2 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100"
    >
      <ActionBarPrimitiveEdit
        v-if="role === 'user'"
        class="hover:text-foreground rounded p-1"
        aria-label="Edit"
      >
        <PencilIcon class="size-3.5" />
      </ActionBarPrimitiveEdit>
      <ActionBarPrimitiveCopy
        class="hover:text-foreground rounded p-1"
        aria-label="Copy"
      >
        <CheckIcon v-if="copied" class="size-3.5" />
        <CopyIcon v-else class="size-3.5" />
      </ActionBarPrimitiveCopy>
      <ActionBarPrimitiveReload
        v-if="role === 'assistant'"
        class="hover:text-foreground rounded p-1"
        aria-label="Regenerate"
      >
        <RefreshCwIcon class="size-3.5" />
      </ActionBarPrimitiveReload>
      <AuiIf :condition="(s) => s.message.branchCount > 1">
        <span class="flex items-center gap-0.5 text-xs">
          <BranchPickerPrimitivePrevious
            class="hover:text-foreground rounded p-0.5 disabled:opacity-40"
            aria-label="Previous branch"
          >
            <ChevronLeftIcon class="size-3.5" />
          </BranchPickerPrimitivePrevious>
          <BranchPickerPrimitiveNumber /> / <BranchPickerPrimitiveCount />
          <BranchPickerPrimitiveNext
            class="hover:text-foreground rounded p-0.5 disabled:opacity-40"
            aria-label="Next branch"
          >
            <ChevronRightIcon class="size-3.5" />
          </BranchPickerPrimitiveNext>
        </span>
      </AuiIf>
    </div>
  </li>
</template>
