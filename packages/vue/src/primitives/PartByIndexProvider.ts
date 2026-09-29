import {
  computed,
  defineComponent,
  h,
  onScopeDispose,
  type SlotsType,
  type VNodeChild,
} from "vue";
import { AuiConfig, Derived } from "@assistant-ui/store/client";
import type { PartMethods } from "@assistant-ui/core/store";
import { AuiProvider } from "../AuiProvider";
import { useAui } from "../useAui";
import { createLastValidCache, createStaleReporter } from "./lastValidCache";

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
  slots: Object as SlotsType<{ default?: () => VNodeChild[] }>,
  setup(props, { slots }) {
    const aui = useAui();
    let disposed = false;
    onScopeDispose(() => {
      disposed = true;
    });
    const config = computed(() => {
      const index = props.index;
      const cache = createLastValidCache<PartMethods>(
        createStaleReporter({
          name: "PartByIndexProvider",
          index,
          isCurrent: () => !disposed && index === props.index,
          isValid: () => index < aui.message.getState().parts.length,
        }),
      );
      return AuiConfig({
        part: Derived({
          source: "message",
          query: { type: "index", index },
          get: (aui) =>
            cache.resolve(index < aui.message.getState().parts.length, () =>
              aui.message.part({ index }),
            ),
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
