"use client";

import { ArrowUpIcon, FileText, PlusIcon, XIcon } from "lucide-react";
import { SampleFrame } from "./sample-frame";
import { TooltipIconButton } from "@/components/assistant-ui/tooltip-icon-button";

type AttachmentTileStaticProps = {
  name: string;
  isImage?: boolean;
};

function AttachmentTileStatic({ name, isImage }: AttachmentTileStaticProps) {
  const attachmentType = isImage ? "Image" : "Document";

  return (
    <div className="aui-attachment-root relative">
      <div
        className="aui-attachment-tile aui-attachment-tile-composer size-14 cursor-pointer overflow-hidden rounded-[14px] border border-foreground/20 bg-muted transition-opacity hover:opacity-75"
        role="button"
        aria-label={`${attachmentType} attachment: ${name}`}
      >
        <div className="flex h-full w-full items-center justify-center">
          {isImage ? (
            <div className="h-full w-full bg-linear-to-br from-blue-100 to-blue-200 dark:from-blue-900 dark:to-blue-800" />
          ) : (
            <FileText className="aui-attachment-tile-fallback-icon size-8 text-muted-foreground" />
          )}
        </div>
      </div>
      <TooltipIconButton
        tooltip="Remove file"
        className="aui-attachment-tile-remove absolute top-1.5 right-1.5 size-3.5 rounded-full bg-white text-muted-foreground opacity-100 shadow-sm hover:bg-white! [&_svg]:text-black hover:[&_svg]:text-destructive"
        side="top"
      >
        <XIcon className="aui-attachment-remove-icon size-3 dark:stroke-[2.5px]" />
      </TooltipIconButton>
    </div>
  );
}

export function AttachmentSample() {
  return (
    <SampleFrame className="flex h-auto items-center justify-center bg-background p-8">
      <div className="w-full max-w-xl">
        <div className="aui-composer-root relative flex w-full flex-col rounded-3xl border border-border bg-muted px-1 pt-2 shadow-[0_9px_9px_0px_rgba(0,0,0,0.01),0_2px_5px_0px_rgba(0,0,0,0.06)] dark:border-muted-foreground/15">
          <div className="aui-composer-attachments mb-2 flex w-full flex-row items-center gap-2 overflow-x-auto px-1.5 pt-0.5 pb-1">
            <AttachmentTileStatic name="screenshot.png" isImage />
            <AttachmentTileStatic name="document.pdf" />
          </div>

          <div className="aui-composer-input mb-1 min-h-10 w-full px-3.5 pt-1.5 pb-3 text-muted-foreground">
            Send a message...
          </div>

          <div className="aui-composer-action-wrapper relative mx-1 mt-2 mb-2 flex items-center justify-between">
            <TooltipIconButton
              tooltip="Add Attachment"
              side="bottom"
              variant="ghost"
              size="icon"
              className="aui-composer-add-attachment size-8.5 rounded-full p-1 font-semibold text-xs hover:bg-muted-foreground/15 dark:border-muted-foreground/15 dark:hover:bg-muted-foreground/30"
              aria-label="Add Attachment"
            >
              <PlusIcon className="aui-attachment-add-icon size-5 stroke-[1.5px]" />
            </TooltipIconButton>

            <TooltipIconButton
              tooltip="Send message"
              side="bottom"
              variant="default"
              size="icon"
              className="aui-composer-send size-8.5 rounded-full p-1"
              aria-label="Send message"
            >
              <ArrowUpIcon className="aui-composer-send-icon size-5" />
            </TooltipIconButton>
          </div>
        </div>
      </div>
    </SampleFrame>
  );
}
