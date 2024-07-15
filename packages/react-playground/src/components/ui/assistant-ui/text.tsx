import {
  TextContentPartComponent,
  useMessageContext,
} from "@assistant-ui/react";
import TextareaAutosize from "react-textarea-autosize";
import { useGetPlaygroundRuntime } from "../../../lib/usePlaygroundRuntime";

export const Text: TextContentPartComponent = ({ part }) => {
  const getPlaygroundRuntime = useGetPlaygroundRuntime();
  const { useMessage } = useMessageContext();
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    try {
      getPlaygroundRuntime().setMessageText({
        messageId: useMessage.getState().message.id,
        contentPart: part,
        text: e.target.value,
      });
    } catch (ex) {
      console.error(ex);
    }
  };

  return (
    <TextareaAutosize
      className="w-full resize-none outline-none"
      onChange={handleChange}
      value={part.text}
    />
  );
};
