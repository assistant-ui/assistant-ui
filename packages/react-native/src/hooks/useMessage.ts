import type { MessageState } from "@assistant-ui/core/store";
import { useAuiState } from "@assistant-ui/store";

export function useMessage(): MessageState;
export function useMessage<TSelected>(
  selector: (state: MessageState) => TSelected,
): TSelected;
export function useMessage<TSelected = MessageState>(
  selector?: (state: MessageState) => TSelected,
): TSelected {
  return useAuiState((s) =>
    selector ? selector(s.message) : (s.message as unknown as TSelected),
  );
}
