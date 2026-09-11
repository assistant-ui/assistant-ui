<script setup lang="ts">
import { AISDKChat } from "@assistant-ui/ai-sdk";
import { AuiConfig, AuiProvider } from "@assistant-ui/vue";
import Thread from "./assistant-ui/thread.vue";

const config = AuiConfig({ threads: AISDKChat() });
</script>

<template>
  <AuiProvider :config="config">
    <Thread />
  </AuiProvider>
</template>
