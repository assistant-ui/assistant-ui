"use client";

import { useComposedRefs } from "@radix-ui/react-compose-refs";
import { type ChangeEvent, forwardRef, useRef } from "react";
import { useAutosize } from "../../utils/hooks/useAutosize";
import { composeEventHandlers } from "@radix-ui/primitive";
import { useMessageContext } from "../../utils/context/MessageContext";

type MessageEditableContentProps = React.ComponentPropsWithoutRef<"textarea">;

export const MessageEditableContent = forwardRef<
	HTMLTextAreaElement,
	MessageEditableContentProps
>(({ onChange, value, ...rest }, forwardedRef) => {
	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const ref = useComposedRefs(forwardedRef, textareaRef);

	// make the textarea grow with the content
	useAutosize(textareaRef);

	const [editState, setEditState] = useMessageContext(
		"Message.EditableContent",
		(s) => [s.editState, s.setEditState],
	);
	const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
		setEditState({ isEditing: true, value: e.target.value });
	};

	if (!editState.isEditing)
		throw new Error(
			"Message.EditableContent may only be rendered when edit mode is enabled. Consider wrapping the component in <Message.If editing>.",
		);

	return (
		<textarea
			{...rest}
			ref={ref}
			onChange={composeEventHandlers(onChange, handleChange)}
			value={editState.value || value}
		/>
	);
});
