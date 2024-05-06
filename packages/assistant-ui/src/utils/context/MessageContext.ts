import { Message } from "ai";
import { createStoreContext } from "./createStoreContext";
import { BranchState } from "../hooks/useBranches";

export type MessageEditState =
  | {
      isEditing: false;
    }
  | {
      isEditing: true;
      value: string;
    };

type MessageStore = {
  message: Message;
  editState: MessageEditState;
  setEditState: (value: MessageEditState) => void;
  branchState: BranchState;
};

export const [MessageContextProvider, useMessageContext] =
  createStoreContext<MessageStore>("Thread.Provider");
