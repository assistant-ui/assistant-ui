import { defineComponent, h, type SlotsType } from "vue";
import type {} from "@assistant-ui/core/store";
import { useAuiState } from "../useAuiState";
import { PartByIndexProvider } from "./PartByIndexProvider";

/**
 * Renders the current message's content parts in order, each scoped through
 * {@link PartByIndexProvider}. A slot named after the part type (`text`,
 * `reasoning`, `tool-call`, ...) renders that part; the `default` slot is the
 * fallback for types without a named slot. Text parts without any slot render
 * their text.
 */
export const MessagePrimitiveParts = defineComponent({
  name: "MessagePrimitiveParts",
  slots: Object as SlotsType<Record<string, (() => unknown) | undefined>>,
  setup(_, { slots }) {
    const count = useAuiState((s) => s.message.content.length);
    const PartView = defineComponent({
      name: "MessagePartView",
      setup() {
        const type = useAuiState((s) => s.part.type);
        const text = useAuiState((s) =>
          s.part.type === "text" ? s.part.text : "",
        );
        return () => {
          const slot = slots[type.value] ?? slots.default;
          if (slot) return slot();
          return type.value === "text" ? text.value : null;
        };
      },
    });
    return () =>
      Array.from({ length: count.value }, (_, index) =>
        h(
          PartByIndexProvider,
          { index, key: index },
          { default: () => h(PartView) },
        ),
      );
  },
});
