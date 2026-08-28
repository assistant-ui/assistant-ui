<script setup lang="ts">
import { AuiConfig, AuiProvider } from "@assistant-ui/vue";
import { Suggestions } from "@assistant-ui/core/store";
import { AISDKChat } from "@assistant-ui/ai-sdk";

const config = AuiConfig({
  threads: AISDKChat(),
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
      <Thread />
    </RegisterToolUIs>
  </AuiProvider>
</template>
