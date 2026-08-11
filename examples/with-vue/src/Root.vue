<script setup lang="ts">
import { AuiConfig, AuiProvider } from "@assistant-ui/vue";
import { RuntimeAdapter, Suggestions } from "@assistant-ui/core/store";
import App from "./App.vue";
import { createEchoRuntime } from "./runtime";

const config = AuiConfig({
  threads: RuntimeAdapter(createEchoRuntime()),
  suggestions: Suggestions([
    { title: "Say hello", label: "a friendly opener", prompt: "Hello there!" },
    {
      title: "Ask anything",
      label: "it will echo back",
      prompt: "What can you do?",
    },
    {
      title: "Tell a story",
      label: "a longer prompt",
      prompt: "Tell me a story about an echo.",
    },
  ]),
});
</script>

<template>
  <AuiProvider :config="config">
    <App />
  </AuiProvider>
</template>
