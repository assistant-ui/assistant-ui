<script lang="ts">
  import { useAuiState, type PartItem } from "@assistant-ui/svelte";

  let { item }: { item: PartItem } = $props();

  // The part handle is index-bound and referentially stable for this
  // position's lifetime under unkeyed iteration, so a one-time capture is
  // correct.
  // svelte-ignore state_referenced_locally
  const target = { item };

  const tool = useAuiState(
    (s) =>
      s.part.type === "tool-call"
        ? {
            name: s.part.toolName,
            argsText: s.part.argsText,
            result: s.part.result,
            running: s.part.status.type === "running",
          }
        : null,
    target,
  );
</script>

{#if tool.current}
  <div
    class="border-border/60 my-1 rounded-lg border px-3 py-2 font-mono text-xs"
  >
    <span class="font-semibold">{tool.current.name}</span>({tool.current
      .argsText})
    {#if tool.current.running}
      <span class="animate-pulse">…</span>
    {:else if tool.current.result !== undefined}
      <pre class="text-muted-foreground mt-1 whitespace-pre-wrap">{JSON.stringify(
          tool.current.result,
        )}</pre>
    {/if}
  </div>
{/if}
