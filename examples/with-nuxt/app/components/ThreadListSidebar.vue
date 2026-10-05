<script setup lang="ts">
import { nextTick, ref, watch } from "vue";
import {
  ThreadListItemPrimitiveTitle,
  ThreadListItemPrimitiveTrigger,
  ThreadListPrimitiveItems,
  ThreadListPrimitiveNew,
} from "@assistant-ui/vue";
import { PlusIcon } from "@lucide/vue";

const props = defineProps<{ open: boolean }>();
const emit = defineEmits<{ close: [] }>();

const panel = ref<HTMLElement | null>(null);

const onKeydown = (event: KeyboardEvent) => {
  if (event.key === "Escape") emit("close");
};

watch(
  () => props.open,
  (open, _, onCleanup) => {
    if (!open) return;
    void nextTick(() => panel.value?.querySelector("button")?.focus());
    window.addEventListener("keydown", onKeydown);
    onCleanup(() => window.removeEventListener("keydown", onKeydown));
  },
);
</script>

<template>
  <div
    v-if="open"
    class="fixed inset-0 z-30 bg-black/40 md:hidden"
    aria-hidden="true"
    @click="emit('close')"
  />
  <aside
    id="thread-list-sidebar"
    ref="panel"
    aria-label="Conversations"
    :role="open ? 'dialog' : undefined"
    :aria-modal="open ? 'true' : undefined"
    class="border-border/60 bg-background fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 flex-col gap-3 border-r p-3 duration-200 md:visible md:static md:z-auto md:h-full md:translate-x-0"
    :class="
      open
        ? 'visible translate-x-0 transition-[translate]'
        : 'invisible -translate-x-full transition-[translate,visibility]'
    "
  >
    <ThreadListPrimitiveNew
      class="border-border/60 hover:bg-muted flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-colors"
      @click="emit('close')"
    >
      <PlusIcon class="size-4" />
      New chat
    </ThreadListPrimitiveNew>
    <div class="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
      <ThreadListPrimitiveItems>
        <ThreadListItemPrimitiveTrigger
          class="hover:bg-muted text-muted-foreground data-[active=true]:bg-muted data-[active=true]:text-foreground w-full truncate rounded-xl px-3 py-2 text-left text-sm transition-colors"
          @click="emit('close')"
        >
          <ThreadListItemPrimitiveTitle fallback="New chat" />
        </ThreadListItemPrimitiveTrigger>
      </ThreadListPrimitiveItems>
    </div>
  </aside>
</template>
