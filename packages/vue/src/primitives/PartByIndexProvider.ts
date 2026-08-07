import { computed, defineComponent, h, type SlotsType } from "vue";
import { AuiConfig, Derived } from "@assistant-ui/store/client";
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
    const config = computed(() =>
      AuiConfig({
        part: Derived({
          source: "message",
          query: { type: "index", index: props.index },
          get: (aui) => aui.message.part({ index: props.index }),
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
