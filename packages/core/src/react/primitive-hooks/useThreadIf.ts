import { useAuiState } from "@assistant-ui/store";

export type UseThreadIfFilters = {
  empty?: boolean | undefined;
  running?: boolean | undefined;
  disabled?: boolean | undefined;
};

export const useThreadIf = (props: UseThreadIfFilters): boolean => {
  return useAuiState((s) => {
    if (props.empty === true && !s.thread.isEmpty) return false;
    if (props.empty === false && s.thread.isEmpty) return false;

    if (props.running === true && !s.thread.isRunning) return false;
    if (props.running === false && s.thread.isRunning) return false;

    if (props.disabled === true && !s.thread.isDisabled) return false;
    if (props.disabled === false && s.thread.isDisabled) return false;

    return true;
  });
};
