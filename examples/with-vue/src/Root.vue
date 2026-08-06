<script setup lang="ts">
import { AuiConfig, AuiProvider } from "@assistant-ui/vue";
import App from "./App.vue";
import { ComposerScope, ThreadScope } from "./scopes";

const config = AuiConfig({
  thread: ThreadScope(),
  composer: ComposerScope(),
});
</script>

<template>
  <AuiProvider :config="config">
    <App />
  </AuiProvider>
</template>
