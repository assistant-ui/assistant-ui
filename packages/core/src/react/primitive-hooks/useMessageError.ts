import { useAuiState } from "@assistant-ui/store";
import { messageErrorText } from "../../store/primitive-predicates";

export const useMessageError = () => {
  return useAuiState(messageErrorText);
};
