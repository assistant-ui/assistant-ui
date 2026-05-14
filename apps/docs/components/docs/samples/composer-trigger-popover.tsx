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
        <span className="flex items-center gap-1.5 text-muted-foreground text-xs">
          <AtSignIcon className="size-3.5" />
          Mention — directive behavior
        </span>
        <div className="w-64 overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-lg">
          <div className="flex flex-col py-1">
            <button
              type="button"
              data-highlighted=""
              className="flex cursor-pointer items-center justify-between gap-2 px-3 py-2 text-sm outline-none transition-colors data-[highlighted]:bg-accent"
            >
              <span className="flex items-center gap-2">
                <WrenchIcon className="size-4 text-muted-foreground" />
                Tools
              </span>
              <ChevronRightIcon className="size-4 text-muted-foreground" />
            </button>
            <button
              type="button"
              className="flex cursor-pointer items-center justify-between gap-2 px-3 py-2 text-sm outline-none transition-colors hover:bg-accent"
            >
              <span className="flex items-center gap-2">
                <WrenchIcon className="size-4 text-muted-foreground" />
                Users
              </span>
              <ChevronRightIcon className="size-4 text-muted-foreground" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center gap-3">
        <span className="flex items-center gap-1.5 text-muted-foreground text-xs">
          <SlashIcon className="size-3.5" />
          Slash — action behavior
        </span>
        <div className="w-64 overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-lg">
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5 border-b px-3 py-2 text-muted-foreground text-xs uppercase tracking-wide">
              <ChevronLeftIcon className="size-3.5" />
              Back
            </div>
            <div className="py-1">
              <button
                type="button"
                data-highlighted=""
                className="flex w-full cursor-pointer flex-col items-start gap-0.5 px-3 py-2 text-start outline-none transition-colors data-[highlighted]:bg-accent"
              >
                <span className="flex items-center gap-2 font-medium text-sm">
                  <FileTextIcon className="size-3.5 text-primary" />
                  /summarize
                </span>
                <span className="ms-5.5 text-muted-foreground text-xs leading-tight">
                  Summarize the conversation
                </span>
              </button>
              <button
                type="button"
                className="flex w-full cursor-pointer flex-col items-start gap-0.5 px-3 py-2 text-start outline-none transition-colors hover:bg-accent"
              >
                <span className="flex items-center gap-2 font-medium text-sm">
                  <LanguagesIcon className="size-3.5 text-primary" />
                  /translate
                </span>
                <span className="ms-5.5 text-muted-foreground text-xs leading-tight">
                  Translate to another language
                </span>
              </button>
              <button
                type="button"
                className="flex w-full cursor-pointer flex-col items-start gap-0.5 px-3 py-2 text-start outline-none transition-colors hover:bg-accent"
              >
                <span className="flex items-center gap-2 font-medium text-sm">
                  <GlobeIcon className="size-3.5 text-primary" />
                  /search
                </span>
                <span className="ms-5.5 text-muted-foreground text-xs leading-tight">
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
