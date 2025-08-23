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
    <div className="aui-attachment-preview">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        className="aui-attachment-preview-image"
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
    <AttachmentPrimitive.Root className="aui-attachment-root">
      <AttachmentPreviewDialog>
        <div className="aui-attachment-content">
          <FileIcon className="aui-attachment-thumb" />
          <span className="aui-attachment-name">{name}</span>
          {canRemove && (
            <AttachmentPrimitive.Remove asChild>
              <button className="aui-attachment-remove">
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
    <AttachmentPrimitive.Root className="aui-attachment-root">
      <AttachmentPreviewDialog>
        <div className="aui-attachment-content">
          <FileIcon className="aui-attachment-thumb" />
          <span className="aui-attachment-name">{name}</span>
        </div>
      </AttachmentPreviewDialog>
    </AttachmentPrimitive.Root>
  );
};

export const UserMessageAttachments: FC = () => {
  return (
    <div className="aui-user-message-attachments">
      <MessagePrimitive.Attachments
        components={{ Attachment: MessageAttachmentUI }}
      />
    </div>
  );
};

export const ComposerAttachments: FC = () => {
  return (
    <div
      className="aui-composer-attachments"
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
        className="aui-composer-attachment-button"
      >
        <PlusIcon />
      </TooltipIconButton>
    </ComposerPrimitive.AddAttachment>
  );
};
