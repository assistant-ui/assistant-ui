<script setup lang="ts">
import { onMounted, onUnmounted } from "vue";
import { useAui } from "@assistant-ui/vue";
import type {} from "@assistant-ui/core/store";
import type { ToolCallMessagePartComponent } from "@assistant-ui/core/react";
import WeatherToolUI from "./WeatherToolUI.vue";

const aui = useAui();
let unregister: (() => void) | undefined;
onMounted(() => {
  unregister = aui.tools.setToolUI(
    "weather",
    WeatherToolUI as unknown as ToolCallMessagePartComponent,
  );
});
onUnmounted(() => unregister?.());
</script>

<template><slot /></template>
