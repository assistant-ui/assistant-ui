import type { ComponentProps } from "react";
import { Text } from "ink";
import { useAuiState } from "@assistant-ui/store";

export type BranchPickerNumberProps = ComponentProps<typeof Text>;

export const BranchPickerNumber = (props: BranchPickerNumberProps) => {
  const branchNumber = useAuiState((s) => s.message.branchNumber);
  return <Text {...props}>{branchNumber}</Text>;
};
