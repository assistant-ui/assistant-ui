"use client";

import { useMessageContext } from "../../utils/context/MessageContext";
import { createActionButton } from "../../utils/createActionButton";

export const useActionBarEdit = () => {
	const [editState, messageContent, setEditState] = useMessageContext(
		"ActionBar.Edit",
		(s) => [s.editState, s.message.content, s.setEditState],
	);

	if (editState.isEditing) return null;
	return () => {
		setEditState({ isEditing: true, value: messageContent });
	};
};

export const ActionBarEdit = createActionButton(useActionBarEdit);
