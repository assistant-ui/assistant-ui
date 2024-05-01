import { createActionButton } from "../../utils/createActionButton";

export const BranchPickerPrevious = createActionButton(
  (message, chat) => {
    const { branchId } = chat.getBranchState(message);
    chat.switchToBranch(message, branchId - 1);
  },
  (msg, chat) => {
    const { branchId, branchCount } = chat.getBranchState(msg);
    return branchCount > 1 && branchId > 0;
  },
);
