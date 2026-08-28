<script setup lang="ts">
import { computed } from "vue";
import type { ToolUIProps } from "@assistant-ui/vue";

const props = defineProps({
  part: { type: Object, required: true },
  addResult: { type: Function, required: true },
  resume: { type: Function, required: true },
  respondToApproval: { type: Function, required: true },
}) as unknown as ToolUIProps;

const city = computed(() => (props.part.args as { city?: string }).city);
const result = computed(
  () =>
    props.part.result as { temperature: number; condition: string } | undefined,
);
</script>

<template>
  <div
    class="border-border/60 my-2 flex items-center gap-3 rounded-xl border px-4 py-3 text-sm"
  >
    <span class="text-muted-foreground">Weather</span>
    <span class="font-medium">{{ city ?? "…" }}</span>
    <span v-if="result" class="ml-auto"
      >{{ result.temperature }}°C · {{ result.condition }}</span
    >
    <span v-else class="text-muted-foreground ml-auto animate-pulse"
      >running…</span
    >
  </div>
</template>
