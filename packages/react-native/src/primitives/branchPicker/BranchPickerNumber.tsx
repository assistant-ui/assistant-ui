import { Text, type TextProps } from "react-native";
import { useAuiState } from "@assistant-ui/store";

export type BranchPickerNumberProps = TextProps;

export const BranchPickerNumber = (props: BranchPickerNumberProps) => {
  const branchNumber = useAuiState((s) => s.message.branchNumber);
  return <Text {...props}>{branchNumber}</Text>;
};
