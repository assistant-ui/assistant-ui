<script setup lang="ts">
import { AuiConfig, AuiProvider } from "@assistant-ui/vue";
import { RuntimeAdapter } from "@assistant-ui/core/store";
import App from "./App.vue";
import { createEchoRuntime } from "./runtime";

const config = AuiConfig({ threads: RuntimeAdapter(createEchoRuntime()) });
</script>

<template>
  <AuiProvider :config="config">
    <App />
  </AuiProvider>
</template>
