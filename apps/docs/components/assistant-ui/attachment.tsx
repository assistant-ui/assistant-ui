"use client";

import { PropsWithChildren, useEffect, useState, type FC } from "react";
import { CircleXIcon, FileIcon, PlusIcon } from "lucide-react";
import {
  AttachmentPrimitive,
  ComposerPrimitive,
  MessagePrimitive,
  useAttachment,
} from "@assistant-ui/react";
import { useShallow } from "zustand/shallow";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import { TooltipIconButton } from "@/components/assistant-ui/tooltip-icon-button";

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
  const { file, src } = useAttachment(
    useShallow((a): { file?: File; src?: string } => {
      if (a.type !== "image") return {};
      if (a.file) return { file: a.file };
      const src = a.content?.filter((c) => c.type === "image")[0]?.image;
      if (!src) return {};
      return { src };
    }),
  );

  return useFileSrc(file) ?? src;
};

type AttachmentPreviewProps = {
  src: string;
};

const AttachmentPreview: FC<AttachmentPreviewProps> = ({ src }) => {
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <div className="flex h-full min-h-[200px] w-full items-center justify-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        className="h-auto max-h-[80vh] w-auto max-w-full object-contain"
        style={{
          display: isLoaded ? "block" : "none",
        }}
        onLoad={() => setIsLoaded(true)}
        alt="Preview"
      />
      {!isLoaded && <div className="text-muted-foreground">Loading...</div>}
    </div>
  );
};

const AttachmentPreviewDialog: FC<PropsWithChildren> = ({ children }) => {
  const src = useAttachmentSrc();

  if (!src) return children;

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-4xl overflow-hidden p-0">
        <DialogTitle className="sr-only">Image Attachment Preview</DialogTitle>
        <AttachmentPreview src={src} />
      </DialogContent>
    </Dialog>
  );
};

const ComposerAttachmentUI: FC = () => {
  const canRemove = useAttachment((a) => a.source !== "message");
  const name = useAttachment((a) => a.name);

  return (
    <AttachmentPrimitive.Root className="relative inline-flex">
      <AttachmentPreviewDialog>
        <div className="bg-muted/50 flex h-7 items-center gap-1.5 rounded-md border px-2 py-1">
          <FileIcon className="text-muted-foreground size-3.5 flex-shrink-0" />
          <span className="max-w-[120px] truncate text-xs">{name}</span>
          {canRemove && (
            <AttachmentPrimitive.Remove asChild>
              <button className="hover:text-destructive -mr-1 ml-1">
                <CircleXIcon className="size-3" />
              </button>
            </AttachmentPrimitive.Remove>
          )}
        </div>
      </AttachmentPreviewDialog>
    </AttachmentPrimitive.Root>
  );
};

const MessageAttachmentUI: FC = () => {
  const name = useAttachment((a) => a.name);

  return (
    <AttachmentPrimitive.Root className="relative inline-flex">
      <AttachmentPreviewDialog>
        <div className="bg-muted/50 hover:bg-muted/80 flex h-7 cursor-pointer items-center gap-1.5 rounded-md border px-2 py-1 transition-colors">
          <FileIcon className="text-muted-foreground size-3.5 flex-shrink-0" />
          <span className="max-w-[120px] truncate text-xs">{name}</span>
        </div>
      </AttachmentPreviewDialog>
    </AttachmentPrimitive.Root>
  );
};

export const UserMessageAttachments: FC = () => {
  return (
    <div className="col-start-2 mb-2 flex flex-wrap gap-2 empty:hidden">
      <MessagePrimitive.Attachments
        components={{ Attachment: MessageAttachmentUI }}
      />
    </div>
  );
};

export const ComposerAttachments: FC = () => {
  return (
    <div
      className="flex gap-2 overflow-x-auto overflow-y-hidden px-1 pb-2 pt-3 empty:hidden [&::-webkit-scrollbar]:hidden"
      style={{
        scrollbarWidth: "none",
        msOverflowStyle: "none",
      }}
    >
      <ComposerPrimitive.Attachments
        components={{ Attachment: ComposerAttachmentUI }}
      />
    </div>
  );
};

export const ComposerAddAttachment: FC = () => {
  return (
    <ComposerPrimitive.AddAttachment asChild>
      <TooltipIconButton
        tooltip="Add Attachment"
        variant="ghost"
        className="hover:bg-foreground/15 dark:hover:bg-background/50 scale-115 p-3.5"
      >
        <PlusIcon />
      </TooltipIconButton>
    </ComposerPrimitive.AddAttachment>
  );
};
