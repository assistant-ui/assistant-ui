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
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

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

const ComposerAttachmentThumb: FC = () => {
  const canRemove = useAttachment((a) => a.source !== "message");
  const { name, type } = useAttachment(
    useShallow((a) => ({
      name: a.name,
      type: a.type,
    })),
  );
  const src = useAttachmentSrc();

  // Extract file extension or use type
  const fileExt = name.split(".").pop()?.toUpperCase() || type.toUpperCase();

  return (
    <AttachmentPrimitive.Root className="relative inline-flex">
      <AttachmentPreviewDialog>
        <div className="flex items-center gap-2 rounded-md border bg-background/50 px-2 py-2">
          <Avatar className="h-8 w-8 flex-shrink-0 rounded-md">
            {type === "image" && src && <AvatarImage src={src} alt={name} />}
            <AvatarFallback className="rounded-md bg-muted">
              <FileIcon className="h-4 w-4 text-muted-foreground" />
            </AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-col">
            <span className="max-w-[120px] truncate text-xs font-medium">
              {name}
            </span>
            <span className="text-xs text-muted-foreground">{fileExt}</span>
          </div>
          {canRemove && (
            <AttachmentPrimitive.Remove asChild>
              <button className="ml-auto hover:text-destructive">
                <CircleXIcon className="size-3" />
              </button>
            </AttachmentPrimitive.Remove>
          )}
        </div>
      </AttachmentPreviewDialog>
    </AttachmentPrimitive.Root>
  );
};

const MessageAttachmentThumb: FC = () => {
  const { name, type } = useAttachment(
    useShallow((a) => ({
      name: a.name,
      type: a.type,
    })),
  );
  const src = useAttachmentSrc();

  // Extract file extension or use type
  const fileExt = name.split(".").pop()?.toUpperCase() || type.toUpperCase();

  return (
    <AttachmentPrimitive.Root className="relative inline-flex">
      <AttachmentPreviewDialog>
        <div className="flex cursor-pointer items-center gap-2 rounded-md border bg-muted/50 px-2 py-2 transition-colors hover:bg-muted/80">
          <Avatar className="h-8 w-8 flex-shrink-0 rounded-md">
            {type === "image" && src && <AvatarImage src={src} alt={name} />}
            <AvatarFallback className="rounded-md bg-muted">
              <FileIcon className="h-4 w-4 text-muted-foreground" />
            </AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-col">
            <span className="max-w-[120px] truncate text-xs font-medium">
              {name}
            </span>
            <span className="text-xs text-muted-foreground">{fileExt}</span>
          </div>
        </div>
      </AttachmentPreviewDialog>
    </AttachmentPrimitive.Root>
  );
};

export const MessageAttachmentArea: FC = () => {
  return (
    <div className="col-start-2 mb-2 flex flex-wrap gap-2 empty:hidden">
      <MessagePrimitive.Attachments
        components={{ Attachment: MessageAttachmentThumb }}
      />
    </div>
  );
};

export const ComposerAttachmentArea: FC = () => {
  return (
    <div className="flex gap-2 overflow-x-auto overflow-y-hidden rounded-t-2xl bg-muted-foreground/10 p-2.5 empty:hidden">
      <ComposerPrimitive.Attachments
        components={{ Attachment: ComposerAttachmentThumb }}
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
        className="-mb-1.5 scale-115 p-3.5 hover:bg-foreground/15 dark:hover:bg-background/50"
      >
        <PlusIcon />
      </TooltipIconButton>
    </ComposerPrimitive.AddAttachment>
  );
};
