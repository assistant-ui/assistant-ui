<script setup lang="ts">
import { ref } from "vue";
import { AuiConfig, AuiProvider } from "@assistant-ui/vue";
import { Suggestions } from "@assistant-ui/core/store";
import { AISDKThreads } from "@assistant-ui/ai-sdk";

const threadListOpen = ref(false);
const threadListToggle = ref<HTMLButtonElement>();

const closeThreadList = () => {
  threadListOpen.value = false;
  if (threadListToggle.value?.getClientRects().length) {
    threadListToggle.value.focus();
  }
};

const config = AuiConfig({
  threads: AISDKThreads(),
  suggestions: Suggestions([
    {
      title: "Check the weather",
      label: "tool UI demo",
      prompt: "What is the weather in San Francisco right now?",
    },
    {
      title: "Explain streaming",
      label: "how token streaming works",
      prompt: "Explain how token streaming works in chat UIs.",
    },
    {
      title: "Write a haiku",
      label: "about the terminal",
      prompt: "Write a haiku about the terminal.",
    },
  ]),
});
</script>

<template>
  <AuiProvider :config="config">
    <RegisterToolUIs>
      <div class="bg-background flex h-full flex-col md:flex-row">
        <div class="border-border/60 flex border-b p-3 md:hidden">
          <button
            ref="threadListToggle"
            type="button"
            class="border-border/60 hover:bg-muted flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-colors"
            aria-controls="thread-list-sidebar"
            :aria-expanded="threadListOpen"
            @click="threadListOpen = !threadListOpen"
          >
            {{ threadListOpen ? "Hide threads" : "Show threads" }}
          </button>
        </div>
        <div
          id="thread-list-sidebar"
          class="w-full shrink-0 overflow-hidden md:h-full md:w-64 md:overflow-visible"
          :class="threadListOpen ? 'h-40' : 'invisible h-0 md:visible'"
        >
          <ThreadListSidebar
            @click="threadListOpen && closeThreadList()"
            @keydown.esc="threadListOpen && closeThreadList()"
          />
        </div>
        <Thread class="min-w-0 flex-1 flex-col" />
      </div>
    </RegisterToolUIs>
  </AuiProvider>
</template>
