import { computed, defineComponent, h, type SlotsType } from "vue";
import { AuiConfig, Derived } from "@assistant-ui/store/client";
import type { AssistantClient } from "@assistant-ui/store/client";
import type {} from "@assistant-ui/core/store";
import { AuiProvider } from "../AuiProvider";
import { useAui } from "../useAui";

/**
 * Scopes the subtree to the message part at `index`: descendants read the
 * part through `s.part`.
 */
export const PartByIndexProvider = defineComponent({
  name: "PartByIndexProvider",
  props: {
    index: {
      type: Number,
      required: true,
    },
  },
  slots: Object as SlotsType<{ default?: () => unknown }>,
  setup(props, { slots }) {
    const aui = useAui();
    let lastPart: ReturnType<AssistantClient["message"]["part"]> | undefined;
    let lastPartIndex: number | undefined;
    const config = computed(() =>
      AuiConfig({
        part: Derived({
          source: "message",
          query: { type: "index", index: props.index },
          get: (aui) => {
            const index = props.index;
            if (lastPartIndex !== index) {
              lastPart = undefined;
              lastPartIndex = index;
            }

            if (
              lastPart !== undefined &&
              index >= aui.message.getState().content.length
            ) {
              return lastPart;
            }

            const part = aui.message.part({ index });
            lastPart = part;
            return part;
          },
        }),
      }),
    );
    return () =>
      h(
        AuiProvider,
        { config: config.value, extends: aui },
        { default: () => slots.default?.() },
      );
  },
});
