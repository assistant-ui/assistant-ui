import {
  useMessageContext,
  useMessageContextOptional,
  type MessageRuntime,
} from "../context/MessageContext";

export function useMessageRuntime(): MessageRuntime;
export function useMessageRuntime(options: {
  optional?: false;
}): MessageRuntime;
export function useMessageRuntime(options: {
  optional: true;
}): MessageRuntime | null;
export function useMessageRuntime(options?: {
  optional?: boolean;
}): MessageRuntime | null {
  if (options?.optional) {
    return useMessageContextOptional();
  }
  return useMessageContext();
}
