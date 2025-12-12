import {
  useThreadListContext,
  useThreadListContextOptional,
} from "../context/ThreadListContext";
import type { ThreadListRuntime } from "../runtime/types";

export function useThreadListRuntime(): ThreadListRuntime;
export function useThreadListRuntime(options: {
  optional?: false;
}): ThreadListRuntime;
export function useThreadListRuntime(options: {
  optional: true;
}): ThreadListRuntime | null;
export function useThreadListRuntime(options?: {
  optional?: boolean;
}): ThreadListRuntime | null {
  if (options?.optional) {
    return useThreadListContextOptional();
  }
  return useThreadListContext();
}
