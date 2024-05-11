"use client";

import React, { type PropsWithChildren, type FC } from "react";
import {
  Thread,
  Message,
  Composer,
  ActionBar,
  BranchPicker,
  EditBar,
} from "@assistant-ui/react";
import { Avatar, AvatarFallback } from "../ui/avatar";
import {
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClipboardIcon,
  PencilIcon,
  RefreshCwIcon,
  SendHorizonalIcon,
} from "lucide-react";
import { Button } from "../ui/button";

export const ShadcnThread: FC = () => {
  return (
    <Thread.Root className="flex h-full flex-col items-center px-4 pb-3">
      <Thread.Viewport className="flex w-full flex-grow flex-col items-center overflow-y-scroll pt-16">
        <Thread.Empty>
          <div className="flex flex-grow flex-col items-center justify-center">
            <Avatar>
              <AvatarFallback>C</AvatarFallback>
            </Avatar>
            <p className="mt-4 text-xl">How can I help you today?</p>
          </div>
        </Thread.Empty>

        <Thread.Messages components={{ Message: ChatMessage }} />
      </Thread.Viewport>

      <Composer.Root className="flex w-full max-w-2xl items-end rounded-lg border p-0.5 shadow-sm">
        <Composer.Input
          placeholder="Write a message..."
          className="h-12 max-h-40 flex-grow resize-none bg-transparent p-3.5 text-sm outline-none placeholder:text-foreground/50"
        />
        <Thread.If busy={false}>
          <Composer.Send className="m-2 flex h-8 w-8 items-center justify-center rounded-md bg-foreground font-bold text-2xl shadow disabled:opacity-10">
            <SendHorizonalIcon className="size-4 text-background" />
          </Composer.Send>
        </Thread.If>
        <Thread.If busy>
          <Composer.Stop className="m-3.5 flex size-5 items-center justify-center rounded-full border-2 border-foreground">
            <div className="size-2 rounded-[1px] bg-foreground" />
          </Composer.Stop>
        </Thread.If>
      </Composer.Root>
    </Thread.Root>
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

const ChatMessage: FC = () => {
  return (
    <Message.Root className="mb-12 flex w-full max-w-2xl gap-3">
      <Avatar>
        <AvatarFallback>
          <Message.If user>Y</Message.If>
          <Message.If assistant>A</Message.If>
        </AvatarFallback>
      </Avatar>

      <div className="flex-grow">
        <p className="font-semibold">
          <Message.If user>You</Message.If>
          <Message.If assistant>Assistant</Message.If>
        </p>

        <Message.If editing={false}>
          <p className="whitespace-pre-line text-foreground">
            <Message.Content />
          </p>

          <ActionBar.Root className="mt-2 flex items-center gap-2">
            <Message.If hasBranches>
              <BranchPicker.Root className="inline-flex text-foreground/60 text-xs">
                <BranchPicker.Previous asChild>
                  <ActionBarButton>
                    <ChevronLeftIcon className="size-4" />
                  </ActionBarButton>
                </BranchPicker.Previous>
                <BranchPicker.Number /> / <BranchPicker.Count />
                <BranchPicker.Next asChild>
                  <ActionBarButton>
                    <ChevronRightIcon className="size-4" />
                  </ActionBarButton>
                </BranchPicker.Next>
              </BranchPicker.Root>
            </Message.If>

            <Message.If assistant>
              <ActionBar.Reload asChild>
                <ActionBarButton>
                  <RefreshCwIcon className="size-4" />
                </ActionBarButton>
              </ActionBar.Reload>
              <ActionBar.Copy asChild>
                <ActionBarButton>
                  <Message.If copied>
                    <CheckIcon className="size-4" />
                  </Message.If>
                  <Message.If copied={false}>
                    <ClipboardIcon className="size-4" />
                  </Message.If>
                </ActionBarButton>
              </ActionBar.Copy>
            </Message.If>

            <Message.If user>
              <ActionBar.Edit asChild>
                <ActionBarButton>
                  <PencilIcon className="size-4" />
                </ActionBarButton>
              </ActionBar.Edit>
            </Message.If>
          </ActionBar.Root>
        </Message.If>

        <Message.If editing>
          <Message.EditableContent className="flex h-8 w-full resize-none bg-transparent outline-none" />
          <EditBar.Root className="mt-2 flex justify-center gap-3">
            <EditBar.Save asChild>
              <Button>Save & Submit</Button>
            </EditBar.Save>

            <EditBar.Cancel asChild>
              <Button variant="outline">Cancel</Button>
            </EditBar.Cancel>
          </EditBar.Root>
        </Message.If>
      </div>
    </Message.Root>
  );
};
