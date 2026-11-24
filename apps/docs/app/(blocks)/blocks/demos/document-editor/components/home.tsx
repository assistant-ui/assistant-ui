"use client";

import { useAui } from "@assistant-ui/react";
import { useEffect } from "react";
import { cn } from "@/lib/utils";
import { ChatSidebarTrigger } from "../../chat-sidebar";
import data from "../data.json";
import {
  documentActions,
  ICON_COLORS,
  TEMPLATES,
  type Block,
  type Template,
} from "../lib/document";
import { getEditorBridge } from "./editor";

/*
 * Home, opened from the sidebar: the templates. Picking one makes a page from it
 * and opens it. The assistant stays in its corner; asked for a page here,
 * it makes one and writes it (`startDescribedPage`).
 */

const copy = data.home;

/** A page's name from what was asked for: its first words, cut at a word. */
function titleFrom(prompt: string) {
  const line =
    prompt
      .trim()
      .split("\n")[0]
      ?.replace(/[.!?]+$/, "") ?? "";
  const short =
    line.length <= 48 ? line : line.slice(0, line.lastIndexOf(" ", 48) || 48);
  return short.charAt(0).toUpperCase() + short.slice(1);
}

/** Resolves once the editor has opened page `id`, so the assistant writes there. */
function editorOn(id: string) {
  return new Promise<void>((resolve) => {
    const started = performance.now();
    const check = () => {
      if (
        getEditorBridge()?.pageId === id ||
        performance.now() - started > 3000
      )
        resolve();
      else requestAnimationFrame(check);
    };
    check();
  });
}

type Aui = ReturnType<typeof useAui>;

/**
 * Sends what the assistant's composer holds as the first message of a new
 * page: the page is made and opened first, so the assistant writes there.
 */
export async function startDescribedPage(aui: Aui) {
  const composer = aui.composer();
  const prompt = composer.getState().text.trim();
  if (!prompt) return;
  if (composer.getState().dictation) composer.stopDictation();
  const id = documentActions.addPage(null, titleFrom(prompt));
  await editorOn(id);
  // Only this message starts a page; the chat's next ones are about it.
  composer.setRunConfig({ custom: { newPage: true } });
  composer.send();
  composer.setRunConfig({});
}

/** Makes a page from a template and opens it. */
function startFromTemplate(template: Template) {
  const id = documentActions.addPage(null, template.title, template.blocks);
  const color = ICON_COLORS.find((entry) => entry === template.color);
  documentActions.setPageIcon(id, {
    kind: "icon",
    value: template.icon,
    ...(color && { color }),
  });
}

export function Home() {
  const aui = useAui();

  // A new page starts its own chat, so the home's chat is an empty one.
  useEffect(() => {
    if (!aui.thread().getState().isEmpty)
      void aui.threads().switchToNewThread();
  }, [aui]);

  return (
    <div className="bg-background absolute inset-0 z-30 flex flex-col">
      <div className="flex h-12 shrink-0 items-center px-3">
        <ChatSidebarTrigger />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-32">
        <div className="mx-auto w-full max-w-6xl pt-2">
          <h1 className="pb-5 text-xl font-medium tracking-tight">
            {copy.heading}
          </h1>
          <ul
            aria-label="Templates"
            className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 xl:grid-cols-4"
          >
            {TEMPLATES.map((template) => (
              <li key={template.id}>
                <TemplateTile template={template} onPick={startFromTemplate} />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

/**
 * A template: its page set into a soft card, running off the card's foot,
 * with the name and the kind under it.
 */
function TemplateTile({
  template,
  onPick,
}: {
  template: Template;
  onPick: (template: Template) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onPick(template)}
      className="group flex w-full flex-col items-center gap-3 text-center outline-hidden"
    >
      <span
        aria-hidden
        className="bg-foreground/[0.04] group-hover:bg-foreground/[0.06] group-focus-visible:ring-foreground/20 dark:bg-foreground/[0.03] dark:group-hover:bg-foreground/[0.05] relative block aspect-[7/5] w-full overflow-hidden rounded-[1.75rem] transition-colors group-focus-visible:ring-1 motion-reduce:transition-none"
      >
        <span className="bg-background dark:bg-foreground/[0.08] absolute inset-x-[16%] top-[14%] -bottom-4 flex flex-col gap-2 overflow-hidden rounded-t-xl px-[9%] pt-[8%] text-start shadow-[0_1px_2px_rgb(0_0_0/0.04)] transition-transform duration-300 group-hover:-translate-y-1 motion-reduce:transition-none [&>*]:shrink-0">
          <span className="text-foreground truncate text-[0.9375rem] leading-5 font-semibold">
            {template.title}
          </span>
          {template.blocks.slice(0, 7).map((block) => (
            <MiniBlock key={block.id} block={block} />
          ))}
        </span>
      </span>
      <span className="flex flex-col gap-0.5">
        <span className="text-foreground text-sm">{template.label}</span>
        <span className="text-muted-foreground text-xs">Page</span>
      </span>
    </button>
  );
}

/** One block of a template, drawn small: enough to tell the page by. */
function MiniBlock({ block }: { block: Block }) {
  const words = block.text.replace(/\*\*|__|`|\[|\]\([^)]*\)/g, "");
  const line = "text-foreground/80 truncate text-[0.6875rem] leading-4";

  switch (block.type) {
    case "h1":
    case "h2":
    case "h3":
      return (
        <span className="text-foreground truncate pt-0.5 text-xs leading-4 font-semibold">
          {words}
        </span>
      );
    case "check":
      return (
        <span className="flex items-center gap-1.5">
          <span
            className={cn(
              "border-foreground/30 size-2.5 shrink-0 rounded-[3px] border",
              block.checked && "bg-foreground/30",
            )}
          />
          <span className={line}>{words}</span>
        </span>
      );
    case "bullet":
    case "numbered":
      return (
        <span className="flex items-center gap-1.5">
          <span className="bg-foreground/60 size-1 shrink-0 rounded-full" />
          <span className={line}>{words}</span>
        </span>
      );
    case "divider":
      return <span className="bg-border my-1 h-px" />;
    case "table":
      return (
        <span className="border-border grid grid-cols-3 overflow-hidden rounded-[4px] border">
          {Array.from({ length: 6 }, (_, index) => (
            <span
              key={index}
              className={cn(
                "border-border h-3 border-e border-b last:border-e-0",
                index < 3 && "bg-foreground/5",
              )}
            />
          ))}
        </span>
      );
    default:
      return <span className={line}>{words}</span>;
  }
}
