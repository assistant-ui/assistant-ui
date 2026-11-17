import { createComponent, createMemo, onCleanup, type JSX } from "solid-js";
import {
  AuiConfig,
  Derived,
  createLastValidCache,
  createStaleReporter,
  type AssistantClient,
} from "@assistant-ui/store/client";
import type { AttachmentMethods } from "@assistant-ui/core/store";
import { AuiProvider } from "../AuiProvider";
import { useAui } from "../useAui";

/**
 * Scopes the subtree to the attachment at `index` of `source` (the composer's
 * pending attachments or the current message's attachments): descendants read
 * the attachment through `s.attachment`.
 */
export const AttachmentByIndexProvider = (props: {
  source: "composer" | "message";
  index: number;
  children?: JSX.Element;
}): JSX.Element => {
  const aui = useAui();
  let disposed = false;
  onCleanup(() => {
    disposed = true;
  });
  const config = createMemo(() => {
    const source = props.source;
    const index = props.index;
    const count = (aui: AssistantClient) => {
      const state =
        source === "message" ? aui.message.getState() : aui.composer.getState();
      return (
        ("submission" in state
          ? (state.submission?.attachments ?? state.attachments)
          : state.attachments
        )?.length ?? 0
      );
    };
    const cache = createLastValidCache<AttachmentMethods>(
      createStaleReporter({
        name: "AttachmentByIndexProvider",
        index,
        isCurrent: () =>
          !disposed && index === props.index && source === props.source,
        isValid: () => index < count(aui),
      }),
      queueMicrotask,
    );
    return AuiConfig({
      attachment: Derived({
        source,
        query: { type: "index", index },
        get: (aui) =>
          cache.resolve(index < count(aui), () =>
            aui[source].attachment({ index }),
          ),
      }),
    });
  });
  return createComponent(AuiProvider, {
    get config() {
      return config();
    },
    extends: aui,
    get children() {
      return props.children;
    },
  });
};
