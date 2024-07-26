"use client";

import { ChangeEvent, FC, PropsWithChildren, useState } from "react";
import { Tool, useAssistantContext } from "@assistant-ui/react";
import { PayloadEditorButton } from "../../payload-editor-button";
import { Thread } from "./thread";
import { Button } from "../button";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../dialog";
import { Input } from "../input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../select";
import { Slider } from "../slider";
import { usePlaygroundRuntime } from "../../../lib/usePlaygroundRuntime";
import { CircleXIcon, FunctionSquareIcon } from "lucide-react";
import { TooltipIconButton } from "./tooltip-icon-button";
import { JSONEditor } from "./json-editor";

type ToolDialogProps = PropsWithChildren<{
  name: string;
  tool: Tool;
  setTool: (name: string, tool: Tool) => void;
}>;

type ToolItemProps = {
  name: string;
  tool: Tool;
  setTool: (name: string, tool: Tool) => void;
  deleteTool: () => void;
};

const ToolDialog: FC<ToolDialogProps> = ({ name, tool, setTool, children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [value, setValue] = useState("");

  const handleOpen = (open: boolean) => {
    setIsOpen(open);
    if (!open) return;

    setValue(JSON.stringify({ name, ...tool }, null, 2));
  };

  const handleSave = () => {
    let jsonValue;
    try {
      jsonValue = JSON.parse(value);
    } catch (e) {
      alert("Unable to parse input as JSON");
      return;
    }

    const { name, ...toolWithoutName } = jsonValue;
    if (typeof name !== "string" || name.trim().length === 0) {
      alert("Name is required");
      return;
    }
    try {
      setTool(name.trim(), toolWithoutName);
      setIsOpen(false);
    } catch (e) {
      alert((e as Error).message);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent
        className="max-w-2xl"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{name === "" ? "Add" : "Edit"} Tool</DialogTitle>
        </DialogHeader>
        <div className="h-[400px] overflow-auto rounded-lg border p-4">
          <JSONEditor value={value} onValueChange={setValue} />
        </div>
        <DialogFooter>
          <Button onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const ToolItem: FC<ToolItemProps> = ({ name, tool, setTool, deleteTool }) => {
  return (
    <ToolDialog name={name} tool={tool} setTool={setTool}>
      <button className="hover:bg-aui-muted flex h-10 items-center justify-between gap-2 rounded border px-3 transition-colors">
        <span className="flex flex-grow items-center gap-2 overflow-hidden font-mono text-sm">
          <FunctionSquareIcon className="size-5 shrink-0" />
          <span className="truncate"> {name}(...)</span>
        </span>
        <TooltipIconButton tooltip="Delete" onClick={deleteTool}>
          <CircleXIcon className="size-5" />
        </TooltipIconButton>
      </button>
    </ToolDialog>
  );
};

const DEFAULT_GET_WEATHER_TOOL: Tool = {
  description: "Determine weather in my location",
  parameters: {
    type: "object",
    properties: {
      location: {
        type: "string",
        description: "The city and state e.g. San Francisco, CA",
      },
      unit: {
        type: "string",
        enum: ["c", "f"],
      },
    },
    required: ["location"],
  },
};

const ToolManager: FC = () => {
  const { useModelConfig } = usePlaygroundRuntime();
  const tools = useModelConfig((c) => c.tools ?? {});

  return (
    <div className="flex flex-col gap-2">
      {Object.entries(tools).map(([name, tool], idx) => (
        <ToolItem
          key={idx}
          name={name}
          tool={tool}
          setTool={(newName, newTool) => {
            if (useModelConfig.getState().tools?.[newName] && newName !== name)
              throw new Error(
                "A tool with the same name already exists. Tool names must be unique.",
              );

            useModelConfig.setState({
              tools: Object.fromEntries(
                Object.entries(tools).map(([k, v]) =>
                  k === name ? [newName, newTool] : [k, v],
                ),
              ),
            });
          }}
          deleteTool={() => {
            const { [name]: _, ...otherTools } = tools;
            useModelConfig.setState({
              tools: otherTools,
            });
          }}
        />
      ))}
      <ToolDialog
        name={"get_weather"}
        tool={DEFAULT_GET_WEATHER_TOOL}
        setTool={(name, newTool) => {
          if (useModelConfig.getState().tools?.[name])
            throw new Error(
              "A tool with the same name already exists. Tool names must be unique.",
            );

          useModelConfig.setState({
            tools: {
              ...tools,
              [name]: newTool,
            },
          });
        }}
      >
        <Button variant="outline">Add Tool</Button>
      </ToolDialog>
    </div>
  );
};

const APIKeyInput: FC = () => {
  const { useModelConfig } = usePlaygroundRuntime();
  const value = useModelConfig((c) => c.config?.apiKey ?? "");
  const setValue = (e: ChangeEvent<HTMLInputElement>) => {
    useModelConfig.setState({
      config: { ...useModelConfig.getState().config, apiKey: e.target.value },
    });
  };

  return (
    <div className="flex flex-col gap-2">
      <label>Provider API Key</label>
      <Input
        placeholder="Enter your provider API key"
        type="password"
        value={value}
        onChange={setValue}
      />
    </div>
  );
};

type ModelSelectorProps = {
  models?: string[] | undefined;
};

const ModelSelector: FC<ModelSelectorProps> = ({
  models = ["gpt-4", "gpt-4o"],
}) => {
  const { useModelConfig } = usePlaygroundRuntime();
  const value = useModelConfig((c) => c.config?.modelName ?? "");
  const setValue = (value: string) => {
    useModelConfig.setState({
      config: {
        ...useModelConfig.getState().config,
        modelName: value,
      },
    });
  };

  return (
    <div className="flex flex-col gap-2">
      <label>Model</label>
      <Select value={value} onValueChange={setValue}>
        <SelectTrigger>
          <SelectValue placeholder="Select a model" />
        </SelectTrigger>
        <SelectContent>
          {models.map((model) => (
            <SelectItem key={model} value={model}>
              {model}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

const TemperatureSlider: FC = () => {
  const { useModelConfig } = usePlaygroundRuntime();
  const values = useModelConfig((c) => [c.callSettings?.temperature ?? 1]);
  const setValues = ([value]: number[]) => {
    useModelConfig.setState({
      callSettings: {
        ...useModelConfig.getState().callSettings,
        temperature: value,
      },
    });
  };

  const setValue = (e: ChangeEvent<HTMLInputElement>) => {
    setValues([parseFloat(e.target.value)]);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between">
        <label>Temperature</label>
        <Input
          value={values[0]!.toFixed(2)}
          onChange={setValue}
          className="inline h-6 w-16 py-0"
        />
      </div>
      <Slider
        min={0}
        max={2}
        step={0.01}
        value={values}
        onValueChange={setValues}
      />
    </div>
  );
};

const MaxTokensSlider: FC = () => {
  const { useModelConfig } = usePlaygroundRuntime();
  const values = useModelConfig((c) => [c.callSettings?.maxTokens ?? 256]);
  const setValues = ([value]: number[]) => {
    useModelConfig.setState({
      callSettings: {
        ...useModelConfig.getState().callSettings,
        maxTokens: value,
      },
    });
  };

  const setValue = (e: ChangeEvent<HTMLInputElement>) => {
    setValues([parseInt(e.target.value)]);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between">
        <label>Max Tokens</label>
        <Input
          value={values[0]!.toString()}
          onChange={setValue}
          className="inline h-6 w-16 py-0"
        />
      </div>
      <Slider
        min={1}
        max={4095}
        step={1}
        value={values}
        onValueChange={setValues}
      />
    </div>
  );
};

const Sidebar: FC<AssistantPlaygroundProps> = ({
  modelSelector,
  apiKey = true,
}) => {
  const { useAssistantActions } = useAssistantContext();
  const handleReset = () => {
    useAssistantActions.getState().switchToThread(null);
  };

  return (
    <div className="flex w-[300px] min-w-[300px] flex-col gap-4 px-4 py-4">
      <PayloadEditorButton />
      <Button onClick={handleReset}>Reset</Button>

      <ModelSelector {...modelSelector} />
      {apiKey && <APIKeyInput />}
      <TemperatureSlider />
      <MaxTokensSlider />

      <div className="flex flex-col gap-2">
        <p className="font-medium">Tools</p>
        <ToolManager />
      </div>
    </div>
  );
};

type AssistantPlaygroundProps = {
  modelSelector?:
    | {
        models?: string[] | undefined;
      }
    | undefined;
  apiKey?: boolean | undefined;
};

export const AssistantPlayground: FC<AssistantPlaygroundProps> = ({
  modelSelector,
  apiKey,
}) => {
  return (
    <div className="flex h-full overflow-hidden">
      <div className="flex flex-grow flex-col">
        <Thread />
      </div>
      <Sidebar modelSelector={modelSelector} apiKey={apiKey} />
    </div>
  );
};
