import { defineComponent, h, type SlotsType } from "vue";
import type {} from "@assistant-ui/core/store";
import { isDevelopment } from "@assistant-ui/core/store/internal";
import { useAuiState } from "../useAuiState";
import { PartByIndexProvider } from "./PartByIndexProvider";

const warnedTypes = new Set<string>();

export const clearPartWarningsForTesting = () => warnedTypes.clear();

/**
 * Renders the current message's content parts in order, each scoped through
 * {@link PartByIndexProvider}. A slot named after the part type (`text`,
 * `reasoning`, `tool-call`, ...) renders that part; the `default` slot is the
 * fallback for types without a named slot, except text, which always renders
 * its text unless a `text` slot overrides it.
 */
export const MessagePrimitiveParts = defineComponent({
  name: "MessagePrimitiveParts",
  slots: Object as SlotsType<Record<string, (() => unknown) | undefined>>,
  setup(_, { slots }) {
    const count = useAuiState((s) => s.message.parts.length);
    const PartView = defineComponent({
      name: "MessagePartView",
      setup() {
        const type = useAuiState((s) => s.part.type);
        const text = useAuiState((s) =>
          s.part.type === "text" ? s.part.text : "",
        );
        return () => {
          if (type.value === "text") {
            const slot = slots.text;
            return slot
              ? slot()
              : h("p", { style: { whiteSpace: "pre-line" } }, text.value);
          }
          const slot = slots[type.value] ?? slots.default;
          if (slot) return slot();
          if (isDevelopment && !warnedTypes.has(type.value)) {
            warnedTypes.add(type.value);
            console.warn(
              `MessagePrimitiveParts: no slot for part type "${type.value}"; the part renders nothing. Add a #${type.value} or #default slot.`,
            );
          }
          return null;
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
