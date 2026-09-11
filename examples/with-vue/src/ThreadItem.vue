<script setup lang="ts">
import {
  ThreadListItemPrimitiveTitle,
  ThreadListItemPrimitiveTrigger,
} from "@assistant-ui/vue";
</script>

<template>
  <ThreadListItemPrimitiveTrigger
    class="hover:bg-muted text-muted-foreground data-[active=true]:bg-muted data-[active=true]:text-foreground w-full truncate rounded-lg px-3 py-2 text-left text-sm transition-colors"
  >
    <ThreadListItemPrimitiveTitle fallback="New Chat" />
  </ThreadListItemPrimitiveTrigger>
</template>
