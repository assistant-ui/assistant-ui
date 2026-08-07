import { computed, defineComponent, h, type SlotsType } from "vue";
import { AuiConfig, Derived } from "@assistant-ui/store/client";
import type { PartMethods } from "@assistant-ui/core/store";
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
    const config = computed(() => {
      const index = props.index;
      // When the collection shrinks, this scope re-resolves before Vue
      // unmounts it; serve the last valid client for that window. A
      // never-valid index falls through and still throws.
      let lastPart: PartMethods | undefined;
      return AuiConfig({
        part: Derived({
          source: "message",
          query: { type: "index", index },
          get: (aui) => {
            if (index < aui.message.getState().parts.length) {
              lastPart = aui.message.part({ index });
            }
            return lastPart ?? aui.message.part({ index });
          },
        }),
      });
    });
    return () =>
      h(
        AuiProvider,
        { config: config.value, extends: aui },
        { default: () => slots.default?.() },
      );
  },
});
