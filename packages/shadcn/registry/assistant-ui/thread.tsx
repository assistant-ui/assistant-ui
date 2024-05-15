import {
  ActionBarPrimitive,
  BranchPickerPrimitive,
  ComposerPrimitive,
  EditBarPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
} from "@assistant-ui/react";
import React, { type PropsWithChildren, type FC } from "react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CopyIcon,
  PencilIcon,
  RefreshCwIcon,
  SendHorizonalIcon,
} from "lucide-react";

export const Thread: FC = () => {
  return (
    <ThreadPrimitive.Root className="flex h-full flex-col items-center px-4 pb-3">
      <ThreadPrimitive.Viewport className="flex w-full flex-grow flex-col items-center overflow-y-scroll pt-16">
        <ThreadPrimitive.Empty>
          <ThreadEmpty />
        </ThreadPrimitive.Empty>

        <ThreadPrimitive.Messages
          components={{ UserMessage, AssistantMessage }}
        />
      </ThreadPrimitive.Viewport>

      <Composer />
    </ThreadPrimitive.Root>
  );
};

const ThreadEmpty: FC = () => {
  return (
    <div className="flex flex-grow flex-col items-center justify-center">
      <Avatar>
        <AvatarFallback>C</AvatarFallback>
      </Avatar>
      <p className="mt-4 text-xl">How can I help you today?</p>
    </div>
  );
};

const Composer: FC = () => {
  return (
    <ComposerPrimitive.Root className="flex w-full max-w-2xl items-end rounded-lg border p-0.5 shadow-sm">
      <ComposerPrimitive.Input
        placeholder="Write a message..."
        className="h-12 max-h-40 flex-grow resize-none bg-transparent p-3.5 text-sm outline-none placeholder:text-foreground/50"
      />
      <ThreadPrimitive.If busy={false}>
        <ComposerPrimitive.Send className="m-2 flex h-8 w-8 items-center justify-center rounded-md bg-foreground font-bold text-2xl shadow disabled:opacity-10">
          <SendHorizonalIcon className="size-4 text-background" />
        </ComposerPrimitive.Send>
      </ThreadPrimitive.If>
      <ThreadPrimitive.If busy>
        <ComposerPrimitive.Stop className="m-3.5 flex size-5 items-center justify-center rounded-full border-2 border-foreground">
          <div className="size-2 rounded-[1px] bg-foreground" />
        </ComposerPrimitive.Stop>
      </ThreadPrimitive.If>
    </ComposerPrimitive.Root>
  );
};

const UserMessage: FC = () => {
  return (
    <MessagePrimitive.Root className="mb-12 flex w-full max-w-2xl gap-3">
      <Avatar>
        <AvatarFallback>Y</AvatarFallback>
      </Avatar>

      <div className="flex-grow">
        <p className="font-semibold">You</p>

        <p className="whitespace-pre-line text-foreground">
          <MessagePrimitive.Content />
        </p>

        <UserActionBar />
        <EditBar />
      </div>
    </MessagePrimitive.Root>
  );
};

const AssistantMessage: FC = () => {
  return (
    <MessagePrimitive.Root className="mb-12 flex w-full max-w-2xl gap-3">
      <Avatar>
        <AvatarFallback>A</AvatarFallback>
      </Avatar>

      <div className="flex-grow">
        <p className="font-semibold">Assistant</p>

        <p className="whitespace-pre-line text-foreground">
          <MessagePrimitive.Content />
        </p>

        <AssistantActionBar />
      </div>
    </MessagePrimitive.Root>
  );
};

const AssistantActionBar: FC = () => {
  return (
    <ActionBarPrimitive.Root className="mt-2 flex items-center gap-1">
      <BranchPicker />

      <ActionBarPrimitive.Copy asChild>
        <ActionBarButton tooltip="Copy">
          <MessagePrimitive.If copied>
            <CheckIcon className="size-4" />
          </MessagePrimitive.If>
          <MessagePrimitive.If copied={false}>
            <CopyIcon className="size-4" />
          </MessagePrimitive.If>
        </ActionBarButton>
      </ActionBarPrimitive.Copy>
      <ActionBarPrimitive.Reload asChild>
        <ActionBarButton tooltip="Refresh">
          <RefreshCwIcon className="size-4" />
        </ActionBarButton>
      </ActionBarPrimitive.Reload>
    </ActionBarPrimitive.Root>
  );
};

const UserActionBar: FC = () => {
  return (
    <ActionBarPrimitive.Root
      hideWhenEditing
      className="mt-2 flex items-center gap-1"
    >
      <BranchPicker />

      <ActionBarPrimitive.Edit asChild>
        <ActionBarButton tooltip="Edit">
          <PencilIcon className="size-4" />
        </ActionBarButton>
      </ActionBarPrimitive.Edit>
    </ActionBarPrimitive.Root>
  );
};

const BranchPicker: FC = () => {
  return (
    <BranchPickerPrimitive.Root
      hideWhenSingleBranch
      className="inline-flex items-center text-foreground/60 text-xs"
    >
      <BranchPickerPrimitive.Previous asChild>
        <ActionBarButton tooltip="Previous">
          <ChevronLeftIcon className="size-4" />
        </ActionBarButton>
      </BranchPickerPrimitive.Previous>
      <BranchPickerPrimitive.Number /> / <BranchPickerPrimitive.Count />
      <BranchPickerPrimitive.Next asChild>
        <ActionBarButton tooltip="Next">
          <ChevronRightIcon className="size-4" />
        </ActionBarButton>
      </BranchPickerPrimitive.Next>
    </BranchPickerPrimitive.Root>
  );
};

const EditBar: FC = () => {
  return (
    <EditBarPrimitive.Root
      hideWhenNotEditing
      className="mt-2 flex justify-center gap-3"
    >
      <EditBarPrimitive.Save asChild>
        <Button>Save & Submit</Button>
      </EditBarPrimitive.Save>

      <EditBarPrimitive.Cancel asChild>
        <Button variant="outline">Cancel</Button>
      </EditBarPrimitive.Cancel>
    </EditBarPrimitive.Root>
  );
};

type ActionBarButtonProps = PropsWithChildren<{ tooltip: string }>;

const ActionBarButton: FC<ActionBarButtonProps> = ({
  children,
  tooltip,
  ...rest
}) => {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant={"ghost"}
          size="icon"
          className="size-auto p-1"
          {...rest}
        >
          {children}
          <span className="sr-only">{tooltip}</span>
        </Button>
      </TooltipTrigger>

      <TooltipContent side="bottom">{tooltip}</TooltipContent>
    </Tooltip>
  );
};
