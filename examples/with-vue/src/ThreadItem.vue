<script setup lang="ts">
import {
  ThreadListItemPrimitiveTitle,
  ThreadListItemPrimitiveTrigger,
  useAuiState,
} from "@assistant-ui/vue";
import type {} from "@assistant-ui/core/store";

const isMain = useAuiState((s) => s.threadListItem.isMain);
</script>

<template>
  <ThreadListItemPrimitiveTrigger
    class="hover:bg-muted w-full truncate rounded-lg px-3 py-2 text-left text-sm transition-colors"
    :class="isMain ? 'bg-muted' : 'text-muted-foreground'"
  >
    <ThreadListItemPrimitiveTitle fallback="New Chat" />
  </ThreadListItemPrimitiveTrigger>
</template>
