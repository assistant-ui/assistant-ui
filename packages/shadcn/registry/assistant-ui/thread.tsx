import React, { type PropsWithChildren, type FC } from "react";
import {
  ThreadPrimitive,
  MessagePrimitive,
  ComposerPrimitive,
  ActionBarPrimitive,
  BranchPickerPrimitive,
  EditBarPrimitive,
} from "@assistant-ui/react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

import {
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClipboardIcon,
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

        <ThreadPrimitive.Messages components={{ Message: Message }} />
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

const Message: FC = () => {
  return (
    <MessagePrimitive.Root className="mb-12 flex w-full max-w-2xl gap-3">
      <Avatar>
        <AvatarFallback>
          <MessagePrimitive.If user>Y</MessagePrimitive.If>
          <MessagePrimitive.If assistant>A</MessagePrimitive.If>
        </AvatarFallback>
      </Avatar>

      <div className="flex-grow">
        <p className="font-semibold">
          <MessagePrimitive.If user>You</MessagePrimitive.If>
          <MessagePrimitive.If assistant>Assistant</MessagePrimitive.If>
        </p>

        <MessagePrimitive.If editing={false}>
          <p className="whitespace-pre-line text-foreground">
            <MessagePrimitive.Content />
          </p>

          <ActionBar />
        </MessagePrimitive.If>

        <MessagePrimitive.If editing>
          <MessagePrimitive.EditableContent className="flex h-8 w-full resize-none bg-transparent outline-none" />
          <EditBar />
        </MessagePrimitive.If>
      </div>
    </MessagePrimitive.Root>
  );
};

const ActionBarButton: FC<PropsWithChildren> = ({ children, ...rest }) => {
  return (
    <button
      type="button"
      className="text-foreground/60 transition-colors hover:enabled:text-foreground disabled:opacity-50"
      {...rest}
    >
      {children}
    </button>
  );
};

const ActionBar: FC = () => {
  return (
    <ActionBarPrimitive.Root className="mt-2 flex items-center gap-2">
      <MessagePrimitive.If hasBranches>
        <BranchPickerPrimitive.Root className="inline-flex text-foreground/60 text-xs">
          <BranchPickerPrimitive.Previous asChild>
            <ActionBarButton>
              <ChevronLeftIcon className="size-4" />
            </ActionBarButton>
          </BranchPickerPrimitive.Previous>
          <BranchPickerPrimitive.Number /> / <BranchPickerPrimitive.Count />
          <BranchPickerPrimitive.Next asChild>
            <ActionBarButton>
              <ChevronRightIcon className="size-4" />
            </ActionBarButton>
          </BranchPickerPrimitive.Next>
        </BranchPickerPrimitive.Root>
      </MessagePrimitive.If>

      <MessagePrimitive.If assistant>
        <ActionBarPrimitive.Reload asChild>
          <ActionBarButton>
            <RefreshCwIcon className="size-4" />
          </ActionBarButton>
        </ActionBarPrimitive.Reload>
        <ActionBarPrimitive.Copy asChild>
          <ActionBarButton>
            <MessagePrimitive.If copied>
              <CheckIcon className="size-4" />
            </MessagePrimitive.If>
            <MessagePrimitive.If copied={false}>
              <ClipboardIcon className="size-4" />
            </MessagePrimitive.If>
          </ActionBarButton>
        </ActionBarPrimitive.Copy>
      </MessagePrimitive.If>

      <MessagePrimitive.If user>
        <ActionBarPrimitive.Edit asChild>
          <ActionBarButton>
            <PencilIcon className="size-4" />
          </ActionBarButton>
        </ActionBarPrimitive.Edit>
      </MessagePrimitive.If>
    </ActionBarPrimitive.Root>
  );
};

const EditBar: FC = () => {
  return (
    <EditBarPrimitive.Root className="mt-2 flex justify-center gap-3">
      <EditBarPrimitive.Save asChild>
        <Button>Save & Submit</Button>
      </EditBarPrimitive.Save>

      <EditBarPrimitive.Cancel asChild>
        <Button variant="outline">Cancel</Button>
      </EditBarPrimitive.Cancel>
    </EditBarPrimitive.Root>
  );
};
