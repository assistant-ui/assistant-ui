<script setup lang="ts">
import {
  AuiIf,
  ComposerPrimitiveCancel,
  ComposerPrimitiveInput,
  ComposerPrimitiveSend,
  ThreadPrimitiveMessages,
} from "@assistant-ui/vue";
import type {} from "@assistant-ui/core/store";
import Message from "./Message.vue";
</script>

<template>
  <main class="mx-auto mt-12 max-w-lg px-4 font-sans">
    <h1 class="mb-4 text-xl font-semibold">assistant-ui × Vue</h1>
    <ol class="flex min-h-48 flex-col gap-2">
      <ThreadPrimitiveMessages>
        <Message />
      </ThreadPrimitiveMessages>
    </ol>
    <div class="mt-4 flex gap-2">
      <ComposerPrimitiveInput
        class="flex-1 resize-none rounded-xl border border-neutral-300 px-3 py-2 outline-none"
        placeholder="Say something"
        rows="1"
      />
      <AuiIf :condition="(s) => !s.thread.isRunning">
        <ComposerPrimitiveSend
          class="rounded-xl bg-neutral-900 px-4 py-2 text-white disabled:opacity-50"
        >
          Send
        </ComposerPrimitiveSend>
      </AuiIf>
      <AuiIf :condition="(s) => s.thread.isRunning">
        <ComposerPrimitiveCancel
          class="rounded-xl bg-neutral-200 px-4 py-2 text-neutral-900 disabled:opacity-50"
        >
          Stop
        </ComposerPrimitiveCancel>
      </AuiIf>
    </div>
  </main>
</template>
