"use client";

import { useMessageContext } from "../../utils/context/MessageContext";
import { createActionButton } from "../../utils/createActionButton";

export const useEditBarCancel = () => {
	const [isEditing, setEditState] = useMessageContext("EditBar.Cancel", (s) => [
		s.editState.isEditing,
		s.setEditState,
	]);

	if (!isEditing) return null;
	return () => {
		setEditState({ isEditing: false });
	};
};

export const EditBarCancel = createActionButton(useEditBarCancel);
