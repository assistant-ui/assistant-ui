"use client";

import { PropsWithChildren, useEffect, useState, type FC } from "react";
import { CircleXIcon, FileIcon, PaperclipIcon, PlusIcon } from "lucide-react";
import {
  AttachmentPrimitive,
  ComposerPrimitive,
  MessagePrimitive,
  useAttachment,
} from "@assistant-ui/react";
import { useShallow } from "zustand/shallow";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
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
    <div className="flex items-center justify-center w-full h-full min-h-[200px]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        className="max-w-full max-h-[80vh] w-auto h-auto object-contain"
        style={{
          display: isLoaded ? "block" : "none",
        }}
        onLoad={() => setIsLoaded(true)}
        alt="Preview"
      />
      {!isLoaded && (
        <div className="text-muted-foreground">Loading...</div>
      )}
    </div>
  );
};

const AttachmentPreviewDialog: FC<PropsWithChildren> = ({ children }) => {
  const src = useAttachmentSrc();

  if (!src) return children;

  return (
    <Dialog>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-4xl p-0 overflow-hidden">
        <DialogTitle className="sr-only">
          Image Attachment Preview
        </DialogTitle>
        <AttachmentPreview src={src} />
      </DialogContent>
    </Dialog>
  );
};


// Compact attachment UI for composer
const ComposerAttachmentUI: FC = () => {
  const canRemove = useAttachment((a) => a.source !== "message");
  const name = useAttachment((a) => a.name);
  
  return (
    <AttachmentPrimitive.Root className="relative inline-flex">
      <AttachmentPreviewDialog>
        <div className="bg-muted/50 flex h-7 items-center gap-1.5 rounded-md border px-2 py-1">
          <FileIcon className="size-3.5 flex-shrink-0 text-muted-foreground" />
          <span className="text-xs max-w-[120px] truncate">
            {name}
          </span>
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

// Same compact UI for messages
const MessageAttachmentUI: FC = () => {
  const name = useAttachment((a) => a.name);
  
  return (
    <AttachmentPrimitive.Root className="relative inline-flex">
      <AttachmentPreviewDialog>
        <div className="bg-muted/50 flex h-7 items-center gap-1.5 rounded-md border px-2 py-1 hover:bg-muted/80 cursor-pointer transition-colors">
          <FileIcon className="size-3.5 flex-shrink-0 text-muted-foreground" />
          <span className="text-xs max-w-[120px] truncate">
            {name}
          </span>
        </div>
      </AttachmentPreviewDialog>
    </AttachmentPrimitive.Root>
  );
};

export const UserMessageAttachments: FC = () => {
  return (
    <div className="col-start-2 mb-2 flex flex-wrap gap-2 empty:hidden">
      <MessagePrimitive.Attachments components={{ Attachment: MessageAttachmentUI }} />
    </div>
  );
};

export const ComposerAttachments: FC = () => {
  return (
    <div 
      className="flex gap-2 px-1 pt-3 pb-2 empty:hidden overflow-x-auto overflow-y-hidden [&::-webkit-scrollbar]:hidden"
      style={{
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
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
