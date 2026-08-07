<script setup lang="ts">
import { MessagePrimitiveParts, useAuiState } from "@assistant-ui/vue";
import type {} from "@assistant-ui/core/store";

const role = useAuiState((s) => s.message.role);
const pulsing = useAuiState(
  (s) => s.message.content.length === 0 && s.thread.isRunning,
);
</script>

<template>
  <li v-if="role === 'user'" data-role="user" class="flex justify-end px-2">
    <div
      class="bg-muted text-foreground max-w-[80%] rounded-xl px-4 py-2 wrap-break-word"
    >
      <MessagePrimitiveParts />
    </div>
  </li>
  <li
    v-else
    data-role="assistant"
    class="text-foreground px-2 leading-relaxed wrap-break-word"
  >
    <MessagePrimitiveParts />
    <span v-if="pulsing" class="animate-pulse">…</span>
  </li>
</template>
