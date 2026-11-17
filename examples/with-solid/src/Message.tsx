import {
  MessagePrimitiveParts,
  MessagePrimitiveRoot,
  useAuiState,
} from "@assistant-ui/solid";

export default function Message() {
  const role = useAuiState((s) => s.message.role);

  return (
    <li
      data-role={role()}
      class="flex min-w-0 flex-col gap-1"
      classList={{
        "items-end": role() === "user",
        "items-start": role() !== "user",
      }}
    >
      <MessagePrimitiveRoot
        class={`min-w-0 px-2 wrap-break-word ${
          role() === "user"
            ? "bg-muted text-foreground max-w-[80%] rounded-xl px-4 py-2"
            : "text-foreground max-w-full leading-relaxed"
        }`}
      >
        <MessagePrimitiveParts />
      </MessagePrimitiveRoot>
    </li>
  );
}
