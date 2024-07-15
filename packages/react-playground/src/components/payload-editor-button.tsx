import { EdgeRuntimeRequestOptions } from "@assistant-ui/react";
import { FC, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Button } from "./ui/button";
import {
  requestOptionsFromOpenAI,
  requestOptionsToOpenAI,
} from "../lib/converters";
import { useGetPlaygroundRuntime } from "../lib/usePlaygroundRuntime";
import { toCoreMessages, toLanguageModelTools } from "@assistant-ui/react";
import { JSONEditor } from "./ui/assistant-ui/json-editor";

export const PayloadEditorButton: FC = () => {
  const getPlaygroundRuntime = useGetPlaygroundRuntime();

  const [isOpen, setIsOpen] = useState(false);
  const [value, setValue] = useState("");

  const handleOpen = (open: boolean) => {
    setIsOpen(open);
    if (!open) return;

    const runtime = getPlaygroundRuntime();
    const config = runtime.useModelConfig.getState();
    const options: EdgeRuntimeRequestOptions = {
      modelName: config.config?.modelName ?? "gpt-4o",
      messages: toCoreMessages(runtime.messages),
      tools: toLanguageModelTools(config.tools ?? {}),
      ...config.callSettings,
    };
    const openAi = requestOptionsToOpenAI(options);
    setValue(JSON.stringify(openAi, null, 2));
  };

  const handleSave = () => {
    let jsonValue;
    try {
      jsonValue = JSON.parse(value);
    } catch (e) {
      alert("Unable to parse input as JSON");
      return;
    }

    const options = requestOptionsFromOpenAI(jsonValue);
    getPlaygroundRuntime().setRequestData(options);
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button>View Payload</Button>
      </DialogTrigger>
      <DialogContent
        className="max-w-2xl"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Edit Payload</DialogTitle>
        </DialogHeader>
        <div className="max-h-[400px] overflow-auto rounded-lg border p-4">
          <JSONEditor value={value} onValueChange={setValue} />
        </div>
        <DialogFooter>
          <Button onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
