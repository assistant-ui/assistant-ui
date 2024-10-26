import {
  TextContentPartComponent,
  useMessageRuntime,
} from "@assistant-ui/react";
import TextareaAutosize from "react-textarea-autosize";
import { usePlaygroundRuntime } from "../../../lib/usePlaygroundRuntime";

export const Text: TextContentPartComponent = (part) => {
  const runtime = usePlaygroundRuntime();
  const messageRuntime = useMessageRuntime();
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    try {
      runtime.setMessageText({
        messageId: messageRuntime.getState().id,
        contentPart: part,
        text: e.target.value,
      });
    } catch (ex) {
      console.error(ex);
    }
  };

  return (
    <TextareaAutosize
      className="bg-aui-background w-full resize-none border-none p-0 outline-none focus:ring-0"
      onChange={handleChange}
      value={part.text}
      rows={1}
    />
  );
};
