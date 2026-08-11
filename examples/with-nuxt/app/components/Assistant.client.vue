<script setup lang="ts">
import { AuiConfig, AuiProvider } from "@assistant-ui/vue";
import { RuntimeAdapter, Suggestions } from "@assistant-ui/core/store";
import { createChatRuntime } from "~/utils/runtime";

const config = AuiConfig({
  threads: RuntimeAdapter(createChatRuntime()),
  suggestions: Suggestions([
    {
      title: "Plan a weekend trip",
      label: "three stops, one day each",
      prompt: "Plan a weekend trip with three stops, one day each.",
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
    <Thread />
  </AuiProvider>
</template>
