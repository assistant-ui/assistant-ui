import { useMemo } from "react";
import { useMessageContext, useMessageRuntime } from "./MessageContext";
import { useThreadContext, useThreadRuntime } from "./ThreadContext";
import { ReadonlyStore } from "../ReadonlyStore";
import { createContextStoreHook } from "./utils/createContextStoreHook";
import { ComposerRuntime, ComposerState } from "../../api/ComposerRuntime";

export type ComposerContextValue = {
  useComposer: ReadonlyStore<ComposerState>;
  type: "edit" | "new";
};

export const useComposerContext = (): ComposerContextValue => {
  const { useComposer: useThreadComposer } = useThreadContext();
  const { useEditComposer } = useMessageContext({ optional: true }) ?? {};
  return useMemo(
    () => ({
      useComposer: useEditComposer ?? useThreadComposer,
      type: useEditComposer ? ("edit" as const) : ("new" as const),
    }),
    [useEditComposer, useThreadComposer],
  );
};

export const { useComposer, useComposerStore } = createContextStoreHook(
  useComposerContext,
  "useComposer",
);

export function useComposerRuntime(options?: {
  optional?: false | undefined;
}): ComposerRuntime;
export function useComposerRuntime(options?: {
  optional?: boolean | undefined;
}): ComposerRuntime | null;
export function useComposerRuntime(options?: {
  optional?: boolean | undefined;
}) {
  const messageRuntime = useMessageRuntime({ optional: true });
  const threadRuntime = useThreadRuntime(options);
  return messageRuntime
    ? messageRuntime.composer
    : (threadRuntime?.composer ?? null);
}
