"use client";

import { ArrowUpIcon, FileText, PlusIcon, XIcon } from "lucide-react";
import { SampleFrame } from "./sample-frame";
import { TooltipIconButton } from "@/components/assistant-ui/tooltip-icon-button.radix";

type AttachmentTileStaticProps = {
  name: string;
  isImage?: boolean;
};

function AttachmentTileStatic({ name, isImage }: AttachmentTileStaticProps) {
  const attachmentType = isImage ? "Image" : "Document";

  return (
    <div className="aui-attachment-root animate-in fade-in-0 zoom-in-95 relative duration-200 motion-reduce:animate-none">
      <div
        className="aui-attachment-tile aui-attachment-tile-composer bg-muted hover:after:bg-foreground/10 focus-visible:ring-ring/50 relative size-14 cursor-pointer overflow-hidden rounded-[14px] transition-transform outline-none after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit] after:ring-1 after:ring-black/10 after:transition-colors after:ring-inset focus-visible:ring-3 active:scale-[0.96] motion-reduce:transition-none dark:after:ring-white/10"
        role="button"
        tabIndex={0}
        aria-label={`${attachmentType} attachment: ${name}`}
      >
        <div className="flex h-full w-full items-center justify-center">
          {isImage ? (
            <div className="h-full w-full bg-linear-to-br from-blue-100 to-blue-200 dark:from-blue-900 dark:to-blue-800" />
          ) : (
            <FileText className="aui-attachment-tile-fallback-icon text-muted-foreground/80 size-6 stroke-[1.5]" />
          )}
        </div>
      </div>
      <TooltipIconButton
        tooltip="Remove file"
        className="aui-attachment-tile-remove absolute end-1 top-1 size-5 rounded-full bg-black/50! text-white backdrop-blur-sm after:absolute after:-inset-1.5 hover:bg-black/70! hover:text-white! active:scale-[0.96] motion-reduce:transition-none"
        side="top"
      >
        <XIcon className="aui-attachment-remove-icon size-3 stroke-[2.5]" />
      </TooltipIconButton>
    </div>
  );
}

export function AttachmentSample() {
  return (
    <SampleFrame className="bg-background flex h-auto items-center justify-center p-8">
      <div className="w-full max-w-xl">
        <div className="aui-composer-root border-border bg-muted dark:border-muted-foreground/15 relative flex w-full flex-col rounded-3xl border px-1 pt-2 shadow-[0_9px_9px_0px_rgba(0,0,0,0.01),0_2px_5px_0px_rgba(0,0,0,0.06)]">
          <div className="aui-composer-attachments mb-2 flex w-full flex-row items-center gap-2 overflow-x-auto px-1.5 pt-0.5 pb-1">
            <AttachmentTileStatic name="screenshot.png" isImage />
            <AttachmentTileStatic name="document.pdf" />
          </div>

          <div className="aui-composer-input text-muted-foreground mb-1 min-h-10 w-full px-3.5 pt-1.5 pb-3">
            Send a message...
          </div>

          <div className="aui-composer-action-wrapper relative mx-1 mt-2 mb-2 flex items-center justify-between">
            <TooltipIconButton
              tooltip="Add Attachment"
              side="bottom"
              variant="ghost"
              size="icon"
              className="aui-composer-add-attachment hover:bg-muted-foreground/15 dark:border-muted-foreground/15 dark:hover:bg-muted-foreground/30 size-8.5 rounded-full p-1 text-xs font-semibold active:scale-[0.96] motion-reduce:transition-none"
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
