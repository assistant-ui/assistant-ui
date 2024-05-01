import {
  useThreadContext,
  useMessageContext,
} from "assistant-ui/src/utils/context/Context";
import { FC } from "react";

export const BranchPickerNumber: FC = () => {
  const chat = useThreadContext();
  const message = useMessageContext();
  const { branchId } = chat.getBranchState(message);
  return <>{branchId + 1}</>;
};
