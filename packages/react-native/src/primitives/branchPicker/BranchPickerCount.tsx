import { Text, type TextProps } from "react-native";
import { useAuiState } from "@assistant-ui/store";

export type BranchPickerCountProps = TextProps;

export const BranchPickerCount = (props: BranchPickerCountProps) => {
  const branchCount = useAuiState((s) => s.message.branchCount);
  return <Text {...props}>{branchCount}</Text>;
};
