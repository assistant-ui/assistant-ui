<script setup lang="ts">
import {
  ThreadListItemPrimitiveTitle,
  ThreadListItemPrimitiveTrigger,
  ThreadListPrimitiveItems,
  ThreadListPrimitiveNew,
} from "@assistant-ui/vue";
import { PlusIcon } from "@lucide/vue";
</script>

<template>
  <aside
    class="border-border/60 flex h-full w-64 shrink-0 flex-col gap-3 border-r p-3"
  >
    <ThreadListPrimitiveNew
      class="border-border/60 hover:bg-muted flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-colors"
    >
      <PlusIcon class="size-4" />
      New chat
    </ThreadListPrimitiveNew>
    <div class="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
      <ThreadListPrimitiveItems>
        <ThreadListItemPrimitiveTrigger
          class="hover:bg-muted text-muted-foreground data-[active=true]:bg-muted data-[active=true]:text-foreground w-full truncate rounded-xl px-3 py-2 text-left text-sm transition-colors"
        >
          <ThreadListItemPrimitiveTitle fallback="New chat" />
        </ThreadListItemPrimitiveTrigger>
      </ThreadListPrimitiveItems>
    </div>
  </aside>
</template>
