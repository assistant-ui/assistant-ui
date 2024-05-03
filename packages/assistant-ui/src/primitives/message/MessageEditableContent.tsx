import { useComposedRefs } from "@radix-ui/react-compose-refs";
import { useIsEditingContext } from "../../utils/context/Context";
import { ChangeEvent, FC, forwardRef, useRef } from "react";
import { useAutosize } from "../../utils/hooks/useAutosize";
import { composeEventHandlers } from "@radix-ui/primitive";

type MessageEditableContentProps = React.ComponentPropsWithoutRef<"textarea">;

export const MessageEditableContent = forwardRef<
  HTMLTextAreaElement,
  MessageEditableContentProps
>(({ onChange, value, ...rest }, forwardedRef) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const ref = useComposedRefs(forwardedRef, textareaRef);

  // make the textarea grow with the content
  useAutosize(textareaRef);

  const [isEditing, setIsEditing] = useIsEditingContext();
  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setIsEditing(e.target.value);
  };

  return (
    <textarea
      {...rest}
      ref={ref}
      onChange={composeEventHandlers(onChange, handleChange)}
      value={isEditing || value}
    />
  );
});
