"use client";

import { useMessageRuntime } from "./MessageContext";
import { useThreadRuntime } from "./ThreadContext";
import { ComposerRuntime } from "../../api/ComposerRuntime";
import { createStateHookForRuntime } from "./utils/createStateHookForRuntime";

export function useComposerRuntime(options?: {
  optional?: false | undefined;
}): ComposerRuntime;
export function useComposerRuntime(options?: {
  optional?: boolean | undefined;
}): ComposerRuntime | null;
export function useComposerRuntime(options?: {
  optional?: boolean | undefined;
}): ComposerRuntime | null {
  const messageRuntime = useMessageRuntime({ optional: true });
  const threadRuntime = useThreadRuntime(options);
  return messageRuntime
    ? messageRuntime.composer
    : (threadRuntime?.composer ?? null);
}

export const useComposer = createStateHookForRuntime(useComposerRuntime);
