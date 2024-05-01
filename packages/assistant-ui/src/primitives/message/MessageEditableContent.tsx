import { useIsEditingContext } from "../../utils/context/Context";
import { ChangeEvent, FC } from "react";

type MessageEditableContentProps = React.ComponentPropsWithoutRef<"textarea">;

export const MessageEditableContent: FC<MessageEditableContentProps> = (
  props,
) => {
  const [isEditing, setIsEditing] = useIsEditingContext();
  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setIsEditing(e.target.value);
  };

  return (
    <textarea {...props} onChange={handleChange} value={isEditing || ""} />
  );
};
