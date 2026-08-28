import {
  computed,
  defineComponent,
  h,
  onScopeDispose,
  type PropType,
  type SlotsType,
} from "vue";
import { AuiConfig, Derived } from "@assistant-ui/store/client";
import type { AssistantClient } from "@assistant-ui/store/client";
import type { AttachmentMethods } from "@assistant-ui/core/store";
import { AuiProvider } from "../AuiProvider";
import { useAui } from "../useAui";
import { createLastValidCache, createStaleReporter } from "./lastValidCache";

const attachmentSourceOf = (
  aui: AssistantClient,
  source: "composer" | "message",
) => (source === "composer" ? aui.composer : aui.message);

const attachmentCountOf = (
  aui: AssistantClient,
  source: "composer" | "message",
) => attachmentSourceOf(aui, source).getState().attachments?.length ?? 0;

/**
 * Scopes the subtree to the attachment at `index` of `source` (the composer's
 * pending attachments or the current message's attachments): descendants read
 * the attachment through `s.attachment`.
 */
export const AttachmentByIndexProvider = defineComponent({
  name: "AttachmentByIndexProvider",
  props: {
    source: {
      type: String as PropType<"composer" | "message">,
      required: true,
    },
    index: {
      type: Number,
      required: true,
    },
  },
  slots: Object as SlotsType<{ default?: () => unknown }>,
  setup(props, { slots }) {
    const aui = useAui();
    let disposed = false;
    onScopeDispose(() => {
      disposed = true;
    });
    const config = computed(() => {
      const source = props.source;
      const index = props.index;
      const cache = createLastValidCache<AttachmentMethods>(
        createStaleReporter({
          name: "AttachmentByIndexProvider",
          index,
          isCurrent: () =>
            !disposed && index === props.index && source === props.source,
          isValid: () => index < attachmentCountOf(aui, source),
        }),
      );
      return AuiConfig({
        attachment: Derived({
          source,
          query: { type: "index", index },
          get: (aui) =>
            cache.resolve(index < attachmentCountOf(aui, source), () =>
              attachmentSourceOf(aui, source).attachment({ index }),
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
