<script setup lang="ts">
import { useAui, useAuiState } from "@assistant-ui/vue";

const aui = useAui();
const messages = useAuiState((s) => s.thread.messages);
const isRunning = useAuiState((s) => s.thread.isRunning);
const text = useAuiState((s) => s.composer.text);

const send = () => {
  const value = text.value.trim();
  if (!value || isRunning.value) return;
  aui.composer.setText("");
  aui.thread.append(value);
};
</script>

<template>
  <main class="chat">
    <h1>assistant-ui × Vue</h1>
    <ol class="messages">
      <li
        v-for="message in messages"
        :key="message.id"
        :data-role="message.role"
      >
        <span class="role">{{ message.role }}</span>
        <span>{{ message.text }}</span>
      </li>
      <li v-if="isRunning" data-role="assistant">
        <span class="role">assistant</span>
        <span>…</span>
      </li>
    </ol>
    <form class="composer" @submit.prevent="send">
      <input
        :value="text"
        name="message"
        placeholder="Say something"
        @input="aui.composer.setText(($event.target as HTMLInputElement).value)"
      />
      <button type="submit" :disabled="!text.trim() || isRunning">Send</button>
    </form>
  </main>
</template>

<style scoped>
.chat {
  max-width: 32rem;
  margin: 3rem auto;
  font-family: system-ui, sans-serif;
}
.messages {
  list-style: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-height: 12rem;
}
.messages li {
  padding: 0.5rem 0.75rem;
  border-radius: 0.75rem;
  background: #f2f2f2;
}
.messages li[data-role="user"] {
  background: #e3efff;
  align-self: flex-end;
}
.role {
  display: block;
  font-size: 0.7rem;
  color: #888;
}
.composer {
  display: flex;
  gap: 0.5rem;
}
.composer input {
  flex: 1;
  padding: 0.5rem 0.75rem;
  border: 1px solid #ccc;
  border-radius: 0.5rem;
}
.composer button {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 0.5rem;
  background: #111;
  color: #fff;
}
.composer button:disabled {
  opacity: 0.5;
}
</style>
