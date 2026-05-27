"use client";

import {
  AtSignIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  FileTextIcon,
  GlobeIcon,
  LanguagesIcon,
  SlashIcon,
  WrenchIcon,
} from "lucide-react";
import { SampleFrame } from "@/components/docs/samples/sample-frame";

export function ComposerTriggerPopoverSample() {
  return (
    <SampleFrame className="flex h-auto flex-wrap items-start justify-center gap-10 p-8">
      <div className="flex flex-col items-center gap-3">
        <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
          <AtSignIcon className="size-3.5" />
          Mention — directive behavior
        </span>
        <div className="bg-popover text-popover-foreground w-64 overflow-hidden rounded-xl border shadow-lg">
          <div className="flex flex-col py-1">
            <button
              type="button"
              data-highlighted=""
              className="data-[highlighted]:bg-accent flex cursor-pointer items-center justify-between gap-2 px-3 py-2 text-sm transition-colors outline-none"
            >
              <span className="flex items-center gap-2">
                <WrenchIcon className="text-muted-foreground size-4" />
                Tools
              </span>
              <ChevronRightIcon className="text-muted-foreground size-4" />
            </button>
            <button
              type="button"
              className="hover:bg-accent flex cursor-pointer items-center justify-between gap-2 px-3 py-2 text-sm transition-colors outline-none"
            >
              <span className="flex items-center gap-2">
                <WrenchIcon className="text-muted-foreground size-4" />
                Users
              </span>
              <ChevronRightIcon className="text-muted-foreground size-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center gap-3">
        <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
          <SlashIcon className="size-3.5" />
          Slash — action behavior
        </span>
        <div className="bg-popover text-popover-foreground w-64 overflow-hidden rounded-xl border shadow-lg">
          <div className="flex flex-col">
            <div className="text-muted-foreground flex items-center gap-1.5 border-b px-3 py-2 text-xs tracking-wide uppercase">
              <ChevronLeftIcon className="size-3.5" />
              Back
            </div>
            <div className="py-1">
              <button
                type="button"
                data-highlighted=""
                className="data-[highlighted]:bg-accent flex w-full cursor-pointer flex-col items-start gap-0.5 px-3 py-2 text-start transition-colors outline-none"
              >
                <span className="flex items-center gap-2 text-sm font-medium">
                  <FileTextIcon className="text-primary size-3.5" />
                  /summarize
                </span>
                <span className="text-muted-foreground ms-5.5 text-xs leading-tight">
                  Summarize the conversation
                </span>
              </button>
              <button
                type="button"
                className="hover:bg-accent flex w-full cursor-pointer flex-col items-start gap-0.5 px-3 py-2 text-start transition-colors outline-none"
              >
                <span className="flex items-center gap-2 text-sm font-medium">
                  <LanguagesIcon className="text-primary size-3.5" />
                  /translate
                </span>
                <span className="text-muted-foreground ms-5.5 text-xs leading-tight">
                  Translate to another language
                </span>
              </button>
              <button
                type="button"
                className="hover:bg-accent flex w-full cursor-pointer flex-col items-start gap-0.5 px-3 py-2 text-start transition-colors outline-none"
              >
                <span className="flex items-center gap-2 text-sm font-medium">
                  <GlobeIcon className="text-primary size-3.5" />
                  /search
                </span>
                <span className="text-muted-foreground ms-5.5 text-xs leading-tight">
                  Search the web
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </SampleFrame>
  );
}
