import {
  useThreadContext,
  useMessageContext,
} from "assistant-ui/src/utils/context/Context";
import { FC } from "react";

export const BranchPickerCount: FC = () => {
  const chat = useThreadContext();
  const message = useMessageContext();
  const { branchCount } = chat.getBranchState(message);
  return <>{branchCount}</>;
};
