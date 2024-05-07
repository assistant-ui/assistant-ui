"use client";

import { useMessageContext } from "../../utils/context/MessageContext";
import { useThreadContext } from "../../utils/context/ThreadContext";
import { createActionButton } from "../../utils/createActionButton";

export const useBranchPickerPrevious = () => {
	const switchToBranch = useThreadContext(
		"BranchPicker.Previous",
		(s) => s.chat.switchToBranch,
	);
	const [message, { branchId, branchCount }] = useMessageContext(
		"BranchPicker.Previous",
		(s) => [s.message, s.branchState],
	);

	if (branchCount <= 1 || branchId <= 0) return null;
	return () => {
		switchToBranch(message, branchId - 1);
	};
};

export const BranchPickerPrevious = createActionButton(useBranchPickerPrevious);
