import {
  ToolCallContentPart,
  ToolCallContentPartComponent,
  useContentPart,
} from "@assistant-ui/react";
import { FC, useEffect, useState } from "react";
import { CornerDownRightIcon } from "lucide-react";
import { JSONEditor } from "./json-editor";
import { tryJsonParse } from "../../../lib/openai/tryJsonParse";
import { RemoveContentPartButton } from "./remove-content-part";

export const ToolUI: ToolCallContentPartComponent = ({ toolName }) => {
  return (
    <div className="bg-aui-muted flex flex-col gap-2 rounded py-4">
      <div className="mx-4 flex justify-between gap-2">
        <p>
          <span className="font-semibold">Used tool: </span>
          <span className="font-mono">{toolName}</span>
        </p>
        <RemoveContentPartButton />
      </div>
      <ToolArgumentsEditor />
      <div className="border-t border-dashed" />
      <div className="mx-4 flex gap-2">
        <CornerDownRightIcon className="mt-0.5 size-4" />
        <ToolResultEditor />
      </div>
    </div>
  );
};

const useContentPartTool = () => {
  const part = useContentPart();
  return part as ToolCallContentPart;
};

const ToolArgumentsEditor: FC = () => {
  const part = useContentPartTool();

  const [value, setValue] = useState("");

  useEffect(() => {
    setValue(part.argsText ?? JSON.stringify(part.args, null, 2));
  }, [part]);

  const handleValueChange = (value: string) => {
    setValue(value);
    (part as any).argsText = value;
    (part as any).args = tryJsonParse(value);
  };

  return (
    <JSONEditor
      value={value}
      onValueChange={handleValueChange}
      placeholder="<enter arguments>"
      className="mx-4"
    />
  );
};

const ToolResultEditor: FC = () => {
  const part = useContentPartTool();

  const [value, setValue] = useState("");

  useEffect(() => {
    setValue(
      !part.result
        ? ""
        : typeof part.result === "string"
          ? part.result
          : JSON.stringify(part.result, null, 2),
    );
  }, [part]);

  const handleValueChange = (value: string) => {
    setValue(value);
    (part as any).result = value;
  };

  return (
    <JSONEditor
      value={value}
      onValueChange={handleValueChange}
      placeholder="<enter result>"
    />
  );
};
