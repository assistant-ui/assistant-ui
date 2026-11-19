import { createComponent, createMemo, onCleanup, type JSX } from "solid-js";
import {
  AuiConfig,
  Derived,
  createLastValidCache,
  createStaleReporter,
} from "@assistant-ui/store/client";
import { hasMessageId } from "@assistant-ui/core/internal";
import type { ComposerMethods, MessageMethods } from "@assistant-ui/core/store";
import { AuiProvider } from "../AuiProvider";
import { useAui } from "../useAui";

/** Scopes the subtree to the thread message with `id` and its edit composer. The scope follows the message's identity and pairs with id-keyed iteration. */
export const MessageByIdProvider = (props: {
  id: string;
  children?: JSX.Element;
}): JSX.Element => {
  const aui = useAui();
  let disposed = false;
  onCleanup(() => {
    disposed = true;
  });
  const config = createMemo(() => {
    const id = props.id;
    const messageCache = createLastValidCache<MessageMethods>(
      createStaleReporter({
        name: "MessageByIdProvider",
        index: id,
        isCurrent: () => !disposed && id === props.id,
        isValid: () => hasMessageId(aui.thread.getState().messages, id),
      }),
      queueMicrotask,
    );
    const composerCache = createLastValidCache<ComposerMethods>(
      null,
      queueMicrotask,
    );
    return AuiConfig({
      message: Derived({
        source: "thread",
        query: { type: "id", id },
        get: (aui) =>
          messageCache.resolve(
            hasMessageId(aui.thread.getState().messages, id),
            () => aui.thread.message({ id }),
          ),
      }),
      composer: Derived({
        source: "message",
        query: {},
        get: (aui) =>
          composerCache.resolve(
            hasMessageId(aui.thread.getState().messages, id),
            () => aui.thread.message({ id }).composer(),
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
