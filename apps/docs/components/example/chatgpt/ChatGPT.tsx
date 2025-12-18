"use client";

import { cn } from "@/lib/utils";
import {
  ActionBarPrimitive,
  AssistantIf,
  AttachmentPrimitive,
  BranchPickerPrimitive,
  ComposerPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
  useAssistantState,
} from "@assistant-ui/react";
import * as Avatar from "@radix-ui/react-avatar";
import {
  ArrowUpIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CopyIcon,
  Cross2Icon,
  Pencil1Icon,
  ReloadIcon,
} from "@radix-ui/react-icons";
import {
  useEffect,
  useState,
  type ComponentPropsWithoutRef,
  type FC,
} from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useShallow } from "zustand/shallow";
import { PlusIcon } from "lucide-react";

export const ChatGPT: FC = () => {
  return (
    <ThreadPrimitive.Root className="flex h-full flex-col items-stretch bg-background px-4 text-foreground dark:bg-[#212121] dark:text-foreground">
      <ThreadPrimitive.Viewport className="flex flex-grow flex-col gap-8 overflow-y-scroll pt-16">
        <ThreadPrimitive.Empty>
          <div className="flex flex-grow flex-col items-center justify-center">
            <Avatar.Root className="flex h-12 w-12 items-center justify-center rounded-[24px] border shadow dark:border-white/15">
              <Avatar.AvatarFallback>C</Avatar.AvatarFallback>
            </Avatar.Root>
            <p className="mt-4 text-xl dark:text-white">
              How can I help you today?
            </p>
          </div>
        </ThreadPrimitive.Empty>

        <ThreadPrimitive.Messages
          components={{
            UserMessage,
            EditComposer,
            AssistantMessage,
          }}
        />
      </ThreadPrimitive.Viewport>

      <ComposerPrimitive.Root className="mx-auto w-full max-w-screen-md rounded-3xl border pl-2 dark:border-none dark:bg-white/5">
        <AssistantIf condition={(s) => s.composer.attachments.length > 0}>
          <div className="flex flex-row flex-wrap gap-2 px-1 py-3">
            <ComposerPrimitive.Attachments
              components={{ Attachment: ChatGPTAttatchment }}
            />
          </div>
        </AssistantIf>
        <div className="flex items-center justify-center">
          <ComposerPrimitive.AddAttachment className="flex size-8 items-center justify-center overflow-hidden rounded-full hover:bg-foreground/5 dark:hover:bg-foreground/15">
            <PlusIcon size={18} />
          </ComposerPrimitive.AddAttachment>
          <ComposerPrimitive.Input
            placeholder="Ask anything"
            className="h-12 max-h-40 flex-grow resize-none bg-transparent p-3.5 text-foreground text-sm outline-none placeholder:text-muted-foreground dark:text-white dark:placeholder:text-white/50"
          />
          <AssistantIf condition={({ thread }) => !thread.isRunning}>
            <ComposerPrimitive.Send className="m-2 flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity disabled:opacity-10 dark:bg-white dark:text-black">
              <ArrowUpIcon className="size-5 dark:[&_path]:stroke-[1] dark:[&_path]:stroke-black" />
            </ComposerPrimitive.Send>
          </AssistantIf>
          <AssistantIf condition={({ thread }) => thread.isRunning}>
            <ComposerPrimitive.Cancel className="m-2 flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground dark:bg-white">
              <div className="size-2.5 bg-background dark:bg-black" />
            </ComposerPrimitive.Cancel>
          </AssistantIf>
        </div>
      </ComposerPrimitive.Root>

      <p className="p-2 text-center text-muted-foreground text-xs dark:text-[#cdcdcd]">
        ChatGPT can make mistakes. Check important info.
      </p>
    </ThreadPrimitive.Root>
  );
};

const UserMessage: FC = () => {
  return (
    <MessagePrimitive.Root className="relative mx-auto flex w-full max-w-screen-md flex-col items-end gap-1">
      <div className="flex items-start gap-4">
        <ActionBarPrimitive.Root
          hideWhenRunning
          autohide="not-last"
          autohideFloat="single-branch"
          className="mt-2"
        >
          <ActionBarPrimitive.Edit asChild>
            <ActionButton tooltip="Edit">
              <Pencil1Icon />
            </ActionButton>
          </ActionBarPrimitive.Edit>
        </ActionBarPrimitive.Root>

        <div className="rounded-3xl bg-secondary px-5 py-2 text-foreground dark:bg-white/5 dark:text-[#eee]">
          <MessagePrimitive.Parts />
        </div>
      </div>

      <BranchPicker className="mt-2 mr-3" />
    </MessagePrimitive.Root>
  );
};

const EditComposer: FC = () => {
  return (
    <ComposerPrimitive.Root className="mx-auto flex w-full max-w-screen-md flex-col justify-end gap-1 rounded-3xl bg-secondary dark:bg-white/15">
      <ComposerPrimitive.Input className="flex h-8 w-full resize-none bg-transparent p-5 pb-0 text-foreground outline-none dark:text-white" />

      <div className="m-3 mt-2 flex items-center justify-center gap-2 self-end">
        <ComposerPrimitive.Cancel className="rounded-full bg-background px-3 py-2 font-semibold text-foreground text-sm hover:bg-muted dark:bg-zinc-900 dark:text-white dark:hover:bg-zinc-800">
          Cancel
        </ComposerPrimitive.Cancel>
        <ComposerPrimitive.Send className="rounded-full bg-primary px-3 py-2 font-semibold text-primary-foreground text-sm hover:bg-primary/90 dark:bg-white dark:text-black dark:hover:bg-white/90">
          Send
        </ComposerPrimitive.Send>
      </div>
    </ComposerPrimitive.Root>
  );
};

const AssistantMessage: FC = () => {
  return (
    <MessagePrimitive.Root className="relative mx-auto flex w-full max-w-screen-md gap-3">
      <Avatar.Root className="flex size-8 flex-shrink-0 items-center justify-center rounded-[24px] border shadow dark:border-white/15">
        <Avatar.AvatarFallback className="text-foreground text-xs dark:text-white">
          C
        </Avatar.AvatarFallback>
      </Avatar.Root>

      <div className="pt-1">
        <div className="text-foreground dark:text-[#eee]">
          <MessagePrimitive.Parts />
        </div>

        <div className="flex pt-2">
          <BranchPicker />

          <ActionBarPrimitive.Root
            hideWhenRunning
            autohide="not-last"
            autohideFloat="single-branch"
            className="flex items-center gap-1 rounded-lg data-[floating]:absolute data-[floating]:border-2 data-[floating]:p-1"
          >
            <ActionBarPrimitive.Reload asChild>
              <ActionButton tooltip="Reload">
                <ReloadIcon />
              </ActionButton>
            </ActionBarPrimitive.Reload>
            <ActionBarPrimitive.Copy asChild>
              <ActionButton tooltip="Copy">
                <AssistantIf condition={({ message }) => message.isCopied}>
                  <CheckIcon />
                </AssistantIf>
                <AssistantIf condition={({ message }) => !message.isCopied}>
                  <CopyIcon />
                </AssistantIf>
              </ActionButton>
            </ActionBarPrimitive.Copy>
          </ActionBarPrimitive.Root>
        </div>
      </div>
    </MessagePrimitive.Root>
  );
};

const BranchPicker: FC<{ className?: string }> = ({ className }) => {
  return (
    <BranchPickerPrimitive.Root
      hideWhenSingleBranch
      className={cn(
        "inline-flex items-center font-semibold text-muted-foreground text-sm dark:text-[#b4b4b4]",
        className,
      )}
    >
      <BranchPickerPrimitive.Previous asChild>
        <ActionButton tooltip="Previous">
          <ChevronLeftIcon />
        </ActionButton>
      </BranchPickerPrimitive.Previous>
      <BranchPickerPrimitive.Number />/<BranchPickerPrimitive.Count />
      <BranchPickerPrimitive.Next asChild>
        <ActionButton tooltip="Next">
          <ChevronRightIcon />
        </ActionButton>
      </BranchPickerPrimitive.Next>
    </BranchPickerPrimitive.Root>
  );
};

type ActionButtonProps = ComponentPropsWithoutRef<typeof Button> & {
  tooltip: string;
};

const ActionButton: FC<ActionButtonProps> = ({
  tooltip,
  className,
  children,
  ...rest
}) => {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "size-auto p-1 text-muted-foreground dark:text-[#b4b4b4]",
            className,
          )}
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

const useFileSrc = (file: File | undefined) => {
  const [src, setSrc] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!file) {
      setSrc(undefined);
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setSrc(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [file]);

  return src;
};

const useAttachmentSrc = () => {
  const { file, src } = useAssistantState(
    useShallow(({ attachment }): { file?: File; src?: string } => {
      if (attachment.type !== "image") return {};
      if (attachment.file) return { file: attachment.file };
      const src = attachment.content?.filter((c) => c.type === "image")[0]
        ?.image;
      if (!src) return {};
      return { src };
    }),
  );

  return useFileSrc(file) ?? src;
};

const ChatGPTAttatchment: FC = () => {
  const src = useAttachmentSrc();

  return (
    <AttachmentPrimitive.Root className="group/attachment relative">
      <div className="flex items-center gap-2 overflow-hidden rounded-2xl border bg-secondary dark:bg-white/5">
        <AssistantIf
          condition={({ attachment }) => attachment.type === "image"}
        >
          {src ? (
            <img
              className="size-32 rounded-md object-cover"
              alt="Attachment"
              src={src}
            />
          ) : (
            <div className="flex h-full w-12 items-center justify-center rounded-md">
              <AttachmentPrimitive.unstable_Thumb className="text-xs" />
            </div>
          )}
        </AssistantIf>
        <AssistantIf
          condition={({ attachment }) => attachment.type !== "image"}
        >
          <div className="flex h-full w-12 items-center justify-center rounded-[9px] bg-background text-[#6b6b6b] dark:bg-[#3a3a3a] dark:text-[#9a9a9a]">
            <AttachmentPrimitive.unstable_Thumb className="text-xs" />
          </div>
        </AssistantIf>
      </div>
      <AttachmentPrimitive.Remove className="-right-1.5 -top-1.5 absolute flex size-7 items-center justify-center rounded-full border border-[#e5e5e5] bg-white text-[#6b6b6b] transition-all hover:bg-[#f5f5f5] hover:text-[#0d0d0d] dark:border-[#3a3a3a] dark:bg-[#1a1a1a] dark:text-[#9a9a9a] dark:hover:bg-[#252525] dark:hover:text-white">
        <Cross2Icon fontSize={8} />
      </AttachmentPrimitive.Remove>
    </AttachmentPrimitive.Root>
  );
};
