import {
  useContentPartContext,
  useContentPartContextOptional,
  type ContentPartRuntime,
} from "../context/ContentPartContext";

export function useContentPartRuntime(): ContentPartRuntime;
export function useContentPartRuntime(options: {
  optional?: false;
}): ContentPartRuntime;
export function useContentPartRuntime(options: {
  optional: true;
}): ContentPartRuntime | null;
export function useContentPartRuntime(options?: {
  optional?: boolean;
}): ContentPartRuntime | null {
  if (options?.optional) {
    return useContentPartContextOptional();
  }
  return useContentPartContext();
}
