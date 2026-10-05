<script setup lang="ts">
import { AuiConfig, AuiProvider } from "@assistant-ui/vue";
import { Suggestions } from "@assistant-ui/core/store";
import { AISDKThreads } from "@assistant-ui/ai-sdk";
import { MenuIcon } from "@lucide/vue";
import { ref } from "vue";

const threadsOpen = ref(false);
const threadsTrigger = ref<HTMLButtonElement | null>(null);
const closeThreads = () => {
  threadsOpen.value = false;
  threadsTrigger.value?.focus();
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
      <div class="bg-background relative flex h-full">
        <ThreadListSidebar :open="threadsOpen" @close="closeThreads" />
        <button
          ref="threadsTrigger"
          type="button"
          class="border-border/60 bg-background hover:bg-muted absolute top-3 left-3 z-10 flex size-9 items-center justify-center rounded-xl border md:hidden"
          aria-label="Open conversations"
          aria-controls="thread-list-sidebar"
          :aria-expanded="threadsOpen"
          @click="threadsOpen = true"
        >
          <MenuIcon class="size-4" />
        </button>
        <Thread class="min-w-0 flex-1 flex-col" />
      </div>
    </RegisterToolUIs>
  </AuiProvider>
</template>
