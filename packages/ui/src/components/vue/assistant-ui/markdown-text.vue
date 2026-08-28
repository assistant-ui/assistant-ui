<script lang="ts">
import MarkdownIt from "markdown-it";

const md = new MarkdownIt({ html: false, linkify: true, breaks: true });
</script>

<script setup lang="ts">
import { computed } from "vue";
import { useAuiState } from "@assistant-ui/vue";

const text = useAuiState((s) => (s.part.type === "text" ? s.part.text : ""));
const html = computed(() => md.render(text.value));
</script>

<template>
  <div class="aui-md" v-html="html" />
</template>

<style scoped>
.aui-md :deep(p) {
  margin: 0.5rem 0;
}
.aui-md :deep(p:first-child) {
  margin-top: 0;
}
.aui-md :deep(p:last-child) {
  margin-bottom: 0;
}
.aui-md :deep(h1),
.aui-md :deep(h2),
.aui-md :deep(h3) {
  font-weight: 600;
  margin: 1rem 0 0.5rem;
}
.aui-md :deep(h1) {
  font-size: 1.25rem;
}
.aui-md :deep(h2) {
  font-size: 1.125rem;
}
.aui-md :deep(ul),
.aui-md :deep(ol) {
  margin: 0.5rem 0;
  padding-left: 1.5rem;
}
.aui-md :deep(ul) {
  list-style: disc;
}
.aui-md :deep(ol) {
  list-style: decimal;
}
.aui-md :deep(li) {
  margin: 0.125rem 0;
}
.aui-md :deep(code) {
  background: var(--color-muted);
  border-radius: 0.25rem;
  padding: 0.125rem 0.375rem;
  font-size: 0.875em;
}
.aui-md :deep(pre) {
  background: var(--color-muted);
  border: 1px solid var(--color-border);
  border-radius: 0.75rem;
  padding: 0.75rem 1rem;
  margin: 0.5rem 0;
  overflow-x: auto;
}
.aui-md :deep(pre code) {
  background: transparent;
  padding: 0;
}
.aui-md :deep(a) {
  text-decoration: underline;
  text-underline-offset: 2px;
}
.aui-md :deep(blockquote) {
  border-left: 2px solid var(--color-border);
  padding-left: 0.75rem;
  color: var(--color-muted-foreground);
  margin: 0.5rem 0;
}
</style>
