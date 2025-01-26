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
import { toCoreMessages, toLanguageModelTools } from "@assistant-ui/react";
import { JSONEditor } from "./ui/assistant-ui/json-editor";
import { TooltipIconButton } from "./ui/assistant-ui/tooltip-icon-button";
import { EyeIcon } from "lucide-react";
import { usePlaygroundRuntime } from "../lib/usePlaygroundRuntime";

export const PayloadEditorButton: FC = () => {
  const runtime = usePlaygroundRuntime();

  const [isOpen, setIsOpen] = useState(false);
  const [value, setValue] = useState("");

  const handleOpen = (open: boolean) => {
    setIsOpen(open);
    if (!open) return;

    const config = runtime.useModelContext.getState();
    const options: EdgeRuntimeRequestOptions = {
      modelName: config.config?.modelName ?? "gpt-4o",
      messages: toCoreMessages(runtime.getState().messages),
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
    runtime.setRequestData(options);
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <TooltipIconButton
          tooltip="View Payload"
          variant="outline"
          className="size-8 p-2"
        >
          <EyeIcon />
        </TooltipIconButton>
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
