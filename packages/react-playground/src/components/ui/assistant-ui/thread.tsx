"use client";

import {
  ActionBarPrimitive,
  ComposerPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
  useComposer,
  useComposerRuntime,
  useMessage,
  useMessageRuntime,
  useThread,
  useThreadRuntime,
} from "@assistant-ui/react";
import { useState, type FC, type KeyboardEvent, type MouseEvent } from "react";
import {
  CheckIcon,
  CopyIcon,
  InfoIcon,
  PlusIcon,
  SendHorizontalIcon,
  SquareFunction,
  TrashIcon,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectValue } from "../select";
import { Avatar, AvatarFallback } from "../avatar";
import { SelectTrigger } from "@radix-ui/react-select";
import { Button } from "../button";
import { TooltipIconButton } from "./tooltip-icon-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "../dropdown-menu";
import { usePlaygroundRuntime } from "../../../lib/usePlaygroundRuntime";
import { ToolUI } from "./tool-ui";
import { Text } from "./text";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../dialog";
import { Input } from "../input";
import { Image } from "./image";
import { useShallow } from "zustand/shallow";

export const Thread: FC = () => {
  return (
    <ThreadPrimitive.Root className="bg-aui-background h-full">
      <ThreadPrimitive.Viewport className="flex h-full flex-col items-center overflow-y-scroll scroll-smooth bg-inherit px-4 pt-8">
        <ThreadWelcome />

        <ThreadPrimitive.Messages
          components={{ SystemMessage: Message, Message }}
        />

        <div className="sticky bottom-0 mt-4 flex w-full max-w-2xl flex-grow flex-col items-center justify-end rounded-t-lg bg-inherit pb-4">
          <Composer />
        </div>
      </ThreadPrimitive.Viewport>
    </ThreadPrimitive.Root>
  );
};

const ThreadWelcome: FC = () => {
  return (
    <ThreadPrimitive.Empty>
      <div className="flex flex-grow basis-full flex-col items-center justify-center">
        <Avatar>
          <AvatarFallback>C</AvatarFallback>
        </Avatar>
        <p className="mt-4 font-medium">How can I help you today?</p>
      </div>
    </ThreadPrimitive.Empty>
  );
};

type RoleSelectProps = {
  role: string;
  setRole: (role: "system" | "assistant" | "user") => void;
  children: React.ReactNode;
};

const RoleSelect: FC<RoleSelectProps> = ({ role, setRole, children }) => {
  return (
    <Select value={role} onValueChange={setRole as (v: string) => void}>
      <SelectTrigger asChild>{children}</SelectTrigger>
      <SelectContent>
        <SelectItem value="user" defaultChecked>
          User
        </SelectItem>
        <SelectItem value="assistant">Assistant</SelectItem>
        <SelectItem value="system">System</SelectItem>
      </SelectContent>
    </Select>
  );
};

const Composer: FC = () => {
  const [role, setRole] = useState<"user" | "assistant" | "system">("user");

  const isRunning = useThread((t) => t.isRunning);
  const hasText = useComposer((c) => c.text.length > 0);

  const threadRuntime = useThreadRuntime();
  const composerRuntime = useComposerRuntime();

  const performAdd = () => {
    threadRuntime.append({
      role,
      content: [{ type: "text", text: composerRuntime.getState().text }],
    });
    composerRuntime.reset();

    setRole("user");
  };

  const performSubmit = () => {
    performAdd();
    threadRuntime.startRun(null);
  };

  const handleAdd = (e: MouseEvent) => {
    e.preventDefault();
    performAdd();
  };

  const handleSubmit = (e: MouseEvent) => {
    e.preventDefault();
    performSubmit();
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    // cmd+enter
    if (e.metaKey && e.key === "Enter") {
      e.preventDefault();
      performSubmit();
    } else if (e.key === "Enter") {
      e.preventDefault();
      performAdd();
    }
  };

  return (
    <ComposerPrimitive.Root className="focus-within:border-aui-ring/20 flex w-full flex-col rounded-lg border shadow-sm transition-colors ease-in">
      <ComposerPrimitive.Input
        autoFocus
        placeholder="Write a message..."
        rows={1}
        className="placeholder:text-aui-muted-foreground size-full max-h-40 resize-none border-none bg-transparent p-4 pr-24 text-sm outline-none focus:ring-0"
        onKeyDown={handleKeyDown}
      />
      <div className="mx-3 mb-3 mt-0 flex items-end gap-2">
        <RoleSelect role={role} setRole={setRole}>
          <Button size="sm">
            <SelectValue placeholder="User" />
          </Button>
        </RoleSelect>
        <div className="flex-grow" />
        <Button
          onClick={handleAdd}
          disabled={isRunning || !hasText}
          variant="default"
          size="sm"
          className="transition-opacity"
        >
          Add
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={isRunning}
          variant="default"
          size="sm"
          className="transition-opacity"
        >
          Run
          <SendHorizontalIcon className="ml-2 size-4" />
        </Button>
      </div>
    </ComposerPrimitive.Root>
  );
};

const AddToolCallButton = () => {
  const messageRuntime = useMessageRuntime();
  const runtime = usePlaygroundRuntime();
  const toolNames = runtime.useModelContext(
    useShallow((c) => Object.keys(c.tools ?? {})),
  );
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="mt-3 h-8">
          <PlusIcon className="size-4" />
          Add Tool Call
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56">
        {toolNames.length === 0 && (
          <DropdownMenuLabel>No tools available</DropdownMenuLabel>
        )}
        {toolNames.map((toolName, idx) => (
          <DropdownMenuItem
            key={idx}
            className="gap-2"
            onClick={() => {
              runtime.addTool({
                messageId: messageRuntime.getState().id,
                toolName,
              });
            }}
          >
            <SquareFunction className="size-4" />
            {toolName}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const AddImageButton = () => {
  const runtime = usePlaygroundRuntime();
  const messageRuntime = useMessageRuntime();

  const [isOpen, setIsOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const handleAddImage = () => {
    runtime.addImage({
      image: new URL(imageUrl).href,
      messageId: messageRuntime.getState().id,
    });
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="mt-3 h-8">
          <PlusIcon className="mr-1.5 size-4" />
          Add Image
        </Button>
      </DialogTrigger>
      <DialogContent
        className="max-w-2xl"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Add Image</DialogTitle>
        </DialogHeader>
        <Input
          placeholder="Image URL"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
        />
        <DialogFooter>
          <Button onClick={handleAddImage}>Add</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const Message: FC = () => {
  const runtime = usePlaygroundRuntime();
  const messageRuntime = useMessageRuntime();
  const role = useMessage((m) => m.role);
  const status = useMessage((m) => (m.role === "assistant" ? m.status : null));

  const handleDelete = () => {
    runtime.deleteMessage(messageRuntime.getState().id);
  };

  const setRole = (role: "system" | "assistant" | "user") => {
    runtime.setRole({
      messageId: messageRuntime.getState().id,
      role,
    });
  };

  return (
    <MessagePrimitive.Root className="relative mb-4 flex w-full max-w-2xl flex-col rounded-lg border p-4">
      <div className="mb-1 flex">
        <RoleSelect role={role} setRole={setRole}>
          <button className="text-sm font-semibold uppercase">{role}</button>
        </RoleSelect>
        <div className="flex-grow" />
        <ActionBarPrimitive.Copy asChild>
          <TooltipIconButton tooltip="Copy" side="top">
            <MessagePrimitive.If copied={false}>
              <CopyIcon />
            </MessagePrimitive.If>
            <MessagePrimitive.If copied>
              <CheckIcon />
            </MessagePrimitive.If>
          </TooltipIconButton>
        </ActionBarPrimitive.Copy>
        <TooltipIconButton
          tooltip="Delete message"
          side="top"
          onClick={handleDelete}
        >
          <TrashIcon />
        </TooltipIconButton>
      </div>
      <div className="flex flex-col gap-2 break-words">
        <MessagePrimitive.Content
          components={{ Text, Image, tools: { Fallback: ToolUI } }}
        />
      </div>
      {status?.type === "incomplete" && status.reason === "error" && (
        <p className="!border-aui-destructive flex items-center gap-2 rounded-lg border px-4 py-2">
          <InfoIcon className="size-4" />
          <span>
            Encountered an error:{" "}
            {(status.error as Error).message ?? "<unknown error>"}
          </span>
        </p>
      )}
      <div>
        {role === "user" && <AddImageButton />}
        {role === "assistant" && <AddToolCallButton />}
      </div>
    </MessagePrimitive.Root>
  );
};
