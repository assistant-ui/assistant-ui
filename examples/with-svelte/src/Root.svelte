<script lang="ts">
  import { AuiConfig, provideAui } from "@assistant-ui/svelte";
  import { RuntimeAdapter, Suggestions } from "@assistant-ui/core/store";
  import App from "./App.svelte";
  import { createEchoRuntime } from "./runtime";

  provideAui(
    AuiConfig({
      threads: RuntimeAdapter(createEchoRuntime()),
      suggestions: Suggestions([
        {
          title: "Say hello",
          label: "a friendly opener",
          prompt: "Hello there!",
        },
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
    }),
  );
</script>

<App />
