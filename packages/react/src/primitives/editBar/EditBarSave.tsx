"use client";

import { useMessageContext } from "../../utils/context/MessageContext";
import { useThreadContext } from "../../utils/context/ThreadContext";
import { createActionButton } from "../../utils/createActionButton";

export const useEditBarSave = () => {
	const chat = useThreadContext("EditBar.Save", (s) => s.chat);
	const [editState, message, setEditState] = useMessageContext(
		"EditBar.Save",
		(s) => [s.editState, s.message, s.setEditState],
	);

	if (!editState.isEditing) return null;
	return () => {
		if (!editState.isEditing) return;

		chat.editAt(message, {
			...message,
			id: undefined as unknown as string, // remove id to create a new message
			content: editState.value,
		});

		setEditState({ isEditing: false });
	};
};

export const EditBarSave = createActionButton(useEditBarSave);
