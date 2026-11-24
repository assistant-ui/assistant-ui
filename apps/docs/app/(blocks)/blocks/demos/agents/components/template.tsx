"use client";

import { useEffect, useState } from "react";
import { Tabs } from "@base-ui/react/tabs";
import { Copy01Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { AgentFacts, copy } from "./agent";
import { FORMATS, type Format } from "./config";
import { startFrom, type Template } from "./store";
import {
  Icon,
  Tip,
  field,
  focusRing,
  iconButton,
  inkButton,
  rItem,
  textButton,
} from "./ui";

/* -------------------------------------------------------------------------- */
/* A template up close, before it is used: its settings and its config        */
/* -------------------------------------------------------------------------- */

export function TemplateDialog({
  template,
  onClose,
}: {
  template: Template | null;
  onClose: () => void;
}) {
  // The last template stays drawn while the dialog closes.
  const [shown, setShown] = useState<Template | null>(template);
  if (template && template !== shown) setShown(template);

  return (
    <Dialog
      open={template !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[min(46rem,calc(100dvh-2rem))] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl"
      >
        {shown && (
          <>
            <div className="flex flex-col gap-1 px-5 pt-5 pb-4">
              <DialogTitle className="text-lg leading-6 font-medium">
                {shown.name}
              </DialogTitle>
              <DialogDescription className="text-muted-foreground text-sm leading-[1.375rem]">
                {shown.description}
              </DialogDescription>
            </div>
            <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-5 pb-5">
              <AgentFacts agent={shown} />
              <Config template={shown} />
            </div>
            <div className="border-border/60 flex shrink-0 justify-end gap-2 border-t px-5 py-3">
              <DialogClose className={cn(textButton, "h-8 px-3")}>
                Cancel
              </DialogClose>
              <button
                type="button"
                onClick={() => {
                  startFrom(shown);
                  onClose();
                }}
                className={cn(inkButton, "h-8 px-3.5")}
              >
                Use this template
              </button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* The create call for the template, in the form picked from the tabs. */
function Config({ template }: { template: Template }) {
  const [format, setFormat] = useState<Format>("yaml");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timer);
  }, [copied]);

  return (
    <Tabs.Root
      value={format}
      onValueChange={(value: Format) => setFormat(value)}
      className="flex flex-col gap-2"
    >
      <div className="flex items-center gap-2">
        <Tabs.List aria-label="Config format" className="flex gap-1">
          {FORMATS.map((entry) => (
            <Tabs.Tab
              key={entry.id}
              value={entry.id}
              className={cn(
                "text-muted-foreground hover:text-foreground aria-selected:bg-foreground/[0.06] aria-selected:text-foreground flex h-7 items-center rounded-full px-2.5 transition-colors motion-reduce:transition-none",
                focusRing,
              )}
            >
              {entry.label}
            </Tabs.Tab>
          ))}
        </Tabs.List>
        <Tip label={copied ? "Copied" : "Copy"} side="top">
          <button
            type="button"
            onClick={() => copy(template, format, () => setCopied(true))}
            className={cn(iconButton, "ms-auto")}
          >
            <Icon icon={copied ? Tick02Icon : Copy01Icon} />
          </button>
        </Tip>
      </div>
      {FORMATS.map((entry) => (
        <Tabs.Panel
          key={entry.id}
          value={entry.id}
          className={cn(field, rItem, focusRing, "overflow-hidden")}
        >
          <pre
            // A long config scrolls, so the keyboard has to be able to reach it.
            tabIndex={0}
            className={cn(
              "max-h-80 overflow-auto p-3 font-mono text-[0.8125rem] leading-5",
              focusRing,
            )}
          >
            <code>{entry.write(template)}</code>
          </pre>
        </Tabs.Panel>
      ))}
    </Tabs.Root>
  );
}
