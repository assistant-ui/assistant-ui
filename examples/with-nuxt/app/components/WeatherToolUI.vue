<script setup lang="ts">
defineOptions({ inheritAttrs: false });

defineProps<{
  args?: { city?: string };
  result?: { city: string; temperature: number; condition: string };
}>();
</script>

<template>
  <div
    class="border-border/60 my-2 flex items-center gap-3 rounded-xl border px-4 py-3 text-sm"
  >
    <span class="text-muted-foreground">Weather</span>
    <span class="font-medium">{{ args?.city ?? "…" }}</span>
    <span v-if="result" class="ml-auto"
      >{{ result.temperature }}°C · {{ result.condition }}</span
    >
    <span v-else class="text-muted-foreground ml-auto animate-pulse"
      >running…</span
    >
  </div>
</template>
