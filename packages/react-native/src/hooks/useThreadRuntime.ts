import {
  useThreadContext,
  useThreadContextOptional,
  type ThreadRuntime,
} from "../context/ThreadContext";

export function useThreadRuntime(): ThreadRuntime;
export function useThreadRuntime(options: { optional?: false }): ThreadRuntime;
export function useThreadRuntime(options: {
  optional: true;
}): ThreadRuntime | null;
export function useThreadRuntime(options?: {
  optional?: boolean;
}): ThreadRuntime | null {
  if (options?.optional) {
    return useThreadContextOptional();
  }
  return useThreadContext();
}
