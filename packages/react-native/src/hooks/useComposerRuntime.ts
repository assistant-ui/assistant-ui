import {
  useComposerContext,
  useComposerContextOptional,
  type ComposerRuntime,
} from "../context/ComposerContext";

export function useComposerRuntime(): ComposerRuntime;
export function useComposerRuntime(options: {
  optional?: false;
}): ComposerRuntime;
export function useComposerRuntime(options: {
  optional: true;
}): ComposerRuntime | null;
export function useComposerRuntime(options?: {
  optional?: boolean;
}): ComposerRuntime | null {
  if (options?.optional) {
    return useComposerContextOptional();
  }
  return useComposerContext();
}
