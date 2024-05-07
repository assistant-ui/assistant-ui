import type { Message } from "ai";
import { createStoreContext } from "./createStoreContext";
import type { BranchState } from "../hooks/useBranches";

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
	isCopied: boolean;
	setIsCopied: (value: boolean) => void;
	isHovering: boolean;
	setIsHovering: (value: boolean) => void;
};

export const [MessageContextProvider, useMessageContext] =
	createStoreContext<MessageStore>("Thread.Provider");
