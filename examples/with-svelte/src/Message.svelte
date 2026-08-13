<script lang="ts">
  import type { ThreadMessage } from "@assistant-ui/core";

  let { message }: { message: ThreadMessage } = $props();

  const text = $derived(
    message.content
      .map((part) => (part.type === "text" ? part.text : ""))
      .join(""),
  );
</script>

<li
  data-role={message.role}
  class={[
    "group flex flex-col gap-1",
    message.role === "user" ? "items-end" : "items-start",
  ].join(" ")}
>
  <div
    class={[
      "px-2 wrap-break-word",
      message.role === "user"
        ? "bg-muted text-foreground max-w-[80%] rounded-xl px-4 py-2"
        : "text-foreground leading-relaxed",
    ].join(" ")}
  >
    <p class="whitespace-pre-line">{text}</p>
  </div>
</li>
