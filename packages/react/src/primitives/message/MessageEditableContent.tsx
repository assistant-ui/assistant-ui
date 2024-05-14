"use client";

import { type ChangeEvent, forwardRef } from "react";
import { composeEventHandlers } from "@radix-ui/primitive";
import { useMessageContext } from "../../utils/context/MessageContext";
import TextareaAutosize, { type TextareaAutosizeProps } from "react-textarea-autosize";

type MessageEditableContentProps = TextareaAutosizeProps;

export const MessageEditableContent = forwardRef<
  HTMLTextAreaElement,
  MessageEditableContentProps
>(({ onChange, value, ...rest }, forwardedRef) => {
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
    <TextareaAutosize
      {...rest}
      ref={forwardedRef}
      onChange={composeEventHandlers(onChange, handleChange)}
      value={editState.value || value}
    />
  );
});
