<script setup lang="ts">
import { computed, ref, watch } from "vue";
import {
  PartByIndexProvider,
  useAui,
  useAuiState,
  useScrollLock,
} from "@assistant-ui/vue";
import type {} from "@assistant-ui/core/store";
import {
  CollapsibleContent,
  CollapsibleRoot,
  CollapsibleTrigger,
} from "reka-ui";
import { BrainIcon, ChevronDownIcon } from "@lucide/vue";
import MarkdownText from "./markdown-text.vue";

const aui = useAui();
const index = useAuiState(() => {
  const query = aui.part.query;
  return query && "index" in query && typeof query.index === "number"
    ? query.index
    : -1;
});
const end = useAuiState((s) => {
  const parts = s.message.parts;
  const start = index.value;
  if (
    parts[start]?.type !== "reasoning" ||
    parts[start - 1]?.type === "reasoning"
  )
    return start;
  let last = start + 1;
  while (parts[last]?.type === "reasoning") last++;
  return last;
});
const indices = computed(() =>
  Array.from(
    { length: end.value - index.value },
    (_, offset) => index.value + offset,
  ),
);
const streaming = useAuiState((s) => {
  if (s.message.status?.type !== "running") return false;
  for (let partIndex = index.value; partIndex < end.value; partIndex++) {
    if (s.message.parts[partIndex]?.status.type === "running") return true;
  }
  return false;
});

const userOpen = ref<boolean | null>(null);
const open = computed(() => userOpen.value ?? streaming.value);
const collapsibleRoot = ref<InstanceType<typeof CollapsibleRoot> | null>(null);
const collapsible = computed<HTMLElement | null>(
  () => collapsibleRoot.value?.$el ?? null,
);
const lockScroll = useScrollLock(collapsible, 200);
const setOpen = (value: boolean) => {
  lockScroll();
  userOpen.value = value;
};
watch(streaming, () => {
  if (userOpen.value === null) lockScroll();
});

const preview = computed(() => streaming.value && open.value);
const scroller = ref<HTMLElement | null>(null);
const content = ref<HTMLElement | null>(null);

watch(
  [preview, scroller, content],
  ([active, scrollEl, contentEl], _, onCleanup) => {
    if (!active || !scrollEl || !contentEl) return;
    let pinned = true;
    let lastScrollTop = scrollEl.scrollTop;
    let lastScrollHeight = scrollEl.scrollHeight;
    const isAtBottom = () =>
      Math.abs(
        scrollEl.scrollHeight - scrollEl.scrollTop - scrollEl.clientHeight,
      ) <= 1 || scrollEl.scrollHeight <= scrollEl.clientHeight;
    const pin = () => {
      if (pinned) scrollEl.scrollTop = scrollEl.scrollHeight;
    };
    // A pin's own scroll event can arrive after new content grew the scroll
    // height and read as "not at bottom"; only an upward move at unchanged
    // scroll height is user intent.
    const onScroll = () => {
      if (isAtBottom()) {
        pinned = true;
      } else if (
        scrollEl.scrollTop < lastScrollTop &&
        scrollEl.scrollHeight === lastScrollHeight
      ) {
        pinned = false;
      }
      lastScrollTop = scrollEl.scrollTop;
      lastScrollHeight = scrollEl.scrollHeight;
    };
    pin();
    scrollEl.addEventListener("scroll", onScroll);
    const observer = new ResizeObserver(pin);
    observer.observe(contentEl);
    onCleanup(() => {
      scrollEl.removeEventListener("scroll", onScroll);
      observer.disconnect();
    });
  },
  { flush: "post" },
);
</script>

<template>
  <CollapsibleRoot
    v-if="indices.length"
    ref="collapsibleRoot"
    :open="open"
    data-slot="aui_reasoning-root"
    class="group/reasoning-root mb-4 w-full rounded-lg border px-3 py-2"
    @update:open="setOpen"
  >
    <CollapsibleTrigger
      data-slot="aui_reasoning-trigger"
      class="group/trigger text-muted-foreground hover:text-foreground flex max-w-[75%] origin-left items-center gap-2 py-1.5 text-sm transition-[color,scale] active:scale-[0.98]"
    >
      <BrainIcon class="size-4 shrink-0" />
      <span
        class="inline-block leading-none"
        :class="streaming && 'animate-pulse motion-reduce:animate-none'"
      >
        Reasoning
      </span>
      <ChevronDownIcon
        class="mt-0.5 size-4 shrink-0 -rotate-90 transition-transform duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] group-data-[state=open]/trigger:rotate-0 motion-reduce:transition-none"
      />
    </CollapsibleTrigger>
    <CollapsibleContent
      data-slot="aui_reasoning-content"
      class="aui-collapsible-content text-muted-foreground relative overflow-hidden text-sm outline-none"
      :aria-busy="streaming"
    >
      <div
        class="pointer-events-none absolute inset-x-0 top-0 z-10 h-8 bg-[linear-gradient(to_bottom,var(--color-background),transparent)]"
      />
      <div
        ref="scroller"
        data-slot="aui_reasoning-text"
        class="relative z-0 max-h-64 overflow-y-auto ps-6 pt-2 pb-2 leading-relaxed text-pretty"
      >
        <div ref="content">
          <PartByIndexProvider
            v-for="partIndex in indices"
            :key="partIndex"
            :index="partIndex"
          >
            <MarkdownText />
          </PartByIndexProvider>
        </div>
      </div>
      <div
        v-if="preview"
        class="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-8 bg-[linear-gradient(to_top,var(--color-background),transparent)]"
      />
    </CollapsibleContent>
  </CollapsibleRoot>
</template>

<style scoped>
.aui-collapsible-content[data-state="open"] {
  animation: aui-collapsible-down 200ms cubic-bezier(0.32, 0.72, 0, 1);
}
.aui-collapsible-content[data-state="closed"] {
  animation: aui-collapsible-up 200ms cubic-bezier(0.32, 0.72, 0, 1);
}
@media (prefers-reduced-motion: reduce) {
  .aui-collapsible-content[data-state] {
    animation: none;
  }
}
@keyframes aui-collapsible-down {
  from {
    height: 0;
  }
  to {
    height: var(--reka-collapsible-content-height);
  }
}
@keyframes aui-collapsible-up {
  from {
    height: var(--reka-collapsible-content-height);
  }
  to {
    height: 0;
  }
}
</style>
