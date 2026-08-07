<script setup lang="ts">
import { useAuiState } from "@assistant-ui/vue";
import type {} from "@assistant-ui/core/store";

const role = useAuiState((s) => s.message.role);
const text = useAuiState((s) => {
  const part = s.message.content[0];
  return (part?.type === "text" && part.text) || "…";
});
</script>

<template>
  <li
    :data-role="role"
    class="rounded-xl px-3 py-2"
    :class="role === 'user' ? 'self-end bg-blue-50' : 'bg-neutral-100'"
  >
    <span class="block text-xs text-neutral-400">{{ role }}</span>
    <span>{{ text }}</span>
  </li>
</template>
