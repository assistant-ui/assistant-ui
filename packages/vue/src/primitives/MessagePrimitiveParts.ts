import { defineComponent, h, type Component, type SlotsType } from "vue";
import type { PartMethods } from "@assistant-ui/core/store";
import { isDevelopment } from "@assistant-ui/core/store/internal";
import type { AssistantState } from "@assistant-ui/store/client";
import { useAui } from "../useAui";
import { useAuiState } from "../useAuiState";
import { PartByIndexProvider } from "./PartByIndexProvider";

const warnedTypes = new Set<string>();

export const clearPartWarningsForTesting = () => warnedTypes.clear();

/**
 * The value of the single `tool` prop passed to a tool UI registered in the
 * `tools` scope. React spreads the part state as individual props; in Vue any
 * prop the component does not declare falls through to `$attrs` and gets
 * stringified onto its root element, so the Vue face passes one `tool` object
 * instead, which a component always declares in full. The tools scope
 * declares renderers as React's `ToolCallMessagePartComponent`, so the Vue
 * face bridges the seam with casts at registration and render; a genuine
 * React renderer arriving through a shared toolkit type-checks at `setToolUI`
 * and then fails when invoked as a Vue component. This type is the Vue-facing
 * contract until the scope's renderer type goes framework-generic.
 */
export type ToolUIProps = {
  part: Extract<AssistantState["part"], { type: "tool-call" }>;
  addResult: PartMethods["addToolResult"];
  resume: PartMethods["resumeToolCall"];
  respondToApproval: PartMethods["respondToToolApproval"];
};

/**
 * Renders the current message's content parts in order, each scoped through
 * {@link PartByIndexProvider}. A `tool-call` part first resolves a renderer
 * registered in the `tools` scope by tool name (`aui.tools.setToolUI`, or a
 * `Tools({ toolkit })` config entry) and renders it with a single `tool` prop
 * of type {@link ToolUIProps}.
 * Otherwise a slot named after the part type (`text`, `reasoning`,
 * `tool-call`, ...) renders that part; the `default` slot is the fallback for
 * types without a named slot, except text, which always renders its text
 * unless a `text` slot overrides it.
 */
export const MessagePrimitiveParts = defineComponent({
  name: "MessagePrimitiveParts",
  slots: Object as SlotsType<Record<string, (() => unknown) | undefined>>,
  setup(_, { slots }) {
    const count = useAuiState((s) => s.message.parts.length);
    const PartView = defineComponent({
      name: "MessagePartView",
      setup() {
        const aui = useAui();
        const type = useAuiState((s) => s.part.type);
        const text = useAuiState((s) =>
          s.part.type === "text" ? s.part.text : "",
        );
        const toolUI = useAuiState((s) =>
          s.part.type === "tool-call"
            ? (s.optional.tools?.toolUIs[s.part.toolName]?.[0]?.render ?? null)
            : null,
        );
        const toolPart = useAuiState((s) =>
          s.part.type === "tool-call" ? s.part : null,
        );
        return () => {
          if (type.value === "tool-call") {
            const render = toolUI.value;
            const part = toolPart.value;
            if (render && part) {
              return h(render as unknown as Component, {
                tool: {
                  part,
                  addResult: aui.part.addToolResult,
                  resume: aui.part.resumeToolCall,
                  respondToApproval: aui.part.respondToToolApproval,
                } satisfies ToolUIProps,
              });
            }
          }
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
