"use client";

import { Button } from "@/components/ui/button";
import { type Model, MODELS } from "@/constants/model";
import { AssistantIf, ComposerPrimitive } from "@assistant-ui/react";
import { ArrowUpIcon, ChevronDownIcon, SquareIcon } from "lucide-react";
import Image from "next/image";
import { type FC, useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

export const SidebarComposer: FC = () => {
  const [model, setModel] = useState<Model>(MODELS[0]);
  const [showPicker, setShowPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showPicker) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowPicker(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showPicker]);

  return (
    <ComposerPrimitive.Root className="bg-background py-3">
      <div className="rounded-xl border border-border bg-muted/50 focus-within:border-ring/50 focus-within:ring-1 focus-within:ring-ring/20">
        <ComposerPrimitive.Input asChild>
          <textarea
            placeholder="Ask a question..."
            className="field-sizing-content max-h-32 w-full resize-none bg-transparent px-3 pt-2.5 pb-2 text-sm leading-5 placeholder:text-muted-foreground focus:outline-none"
            rows={1}
          />
        </ComposerPrimitive.Input>
        <div className="flex items-center justify-between px-1.5 pb-1.5">
          <div className="relative" ref={pickerRef}>
            <button
              type="button"
              onClick={() => setShowPicker(!showPicker)}
              className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-muted-foreground text-xs transition-colors hover:bg-muted hover:text-foreground"
            >
              <Image
                src={model.icon}
                alt={model.name}
                width={14}
                height={14}
                className="size-3.5"
              />
              <span>{model.name}</span>
              <ChevronDownIcon
                className={cn(
                  "size-3 transition-transform duration-200",
                  showPicker && "rotate-180",
                )}
              />
            </button>
            {showPicker && (
              <div className="fade-in slide-in-from-bottom-2 absolute bottom-full left-0 mb-1 flex w-44 animate-in flex-col gap-0.5 rounded-lg border border-border bg-popover p-1 shadow-md duration-150">
                {MODELS.map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => {
                      setModel(m);
                      setShowPicker(false);
                    }}
                    disabled={m.disabled}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors hover:bg-muted",
                      m.value === model.value && "bg-muted",
                      m.disabled && "cursor-not-allowed opacity-50",
                    )}
                  >
                    <Image
                      src={m.icon}
                      alt={m.name}
                      width={14}
                      height={14}
                      className="size-3.5"
                    />
                    <span>{m.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <SidebarComposerAction />
        </div>
      </div>
    </ComposerPrimitive.Root>
  );
};

const SidebarComposerAction: FC = () => {
  return (
    <>
      <AssistantIf condition={({ thread }) => !thread.isRunning}>
        <ComposerPrimitive.Send asChild>
          <Button type="submit" size="icon" className="size-7 rounded-lg">
            <ArrowUpIcon className="size-4" />
          </Button>
        </ComposerPrimitive.Send>
      </AssistantIf>

      <AssistantIf condition={({ thread }) => thread.isRunning}>
        <ComposerPrimitive.Cancel asChild>
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="size-7 rounded-lg"
          >
            <SquareIcon className="size-3 fill-current" />
          </Button>
        </ComposerPrimitive.Cancel>
      </AssistantIf>
    </>
  );
};
