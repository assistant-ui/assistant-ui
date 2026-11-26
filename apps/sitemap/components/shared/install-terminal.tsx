"use client";

import { CheckIcon, CopyIcon, RotateCcwIcon } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { DeferredHighlight } from "@/components/shared/deferred-highlight";
import { DemoFrame } from "@/components/shared/demo-frame";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";

/** One package or platform: the command that installs it, then what you do and get. */
export type TerminalTab = {
  id: string;
  label: string;
  icon?: ReactNode;
  command: string;
  /** The next step, as real code from its docs. */
  next?: { language: string; code: string };
  /** The thing itself, running, when it can run on the page. */
  result?: ReactNode;
  /** The caption under the frame for this tab. */
  caption: string;
};

const TYPE_MS = 24;
const SETTLE_MS = 350;
const DWELL_MS = 4200;

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function Caret() {
  return (
    <span
      aria-hidden
      className="bg-foreground/70 ms-px inline-block h-[1.1em] w-[0.55em] translate-y-[0.2em] animate-pulse motion-reduce:animate-none"
    />
  );
}

function CommandCopy({ command }: { command: string }) {
  const { isCopied, copyToClipboard } = useCopyToClipboard({
    copiedDuration: 1600,
  });
  return (
    <button
      type="button"
      onClick={() => copyToClipboard(command)}
      aria-label={`Copy ${command}`}
      className="text-muted-foreground hover:text-foreground hover:bg-foreground/[0.05] focus-visible:ring-ring inline-flex size-7 shrink-0 items-center justify-center rounded-md transition-colors outline-none focus-visible:ring-2"
    >
      {isCopied ? (
        <CheckIcon aria-hidden className="size-3.5" />
      ) : (
        <CopyIcon aria-hidden className="size-3.5" />
      )}
      <span role="status" className="sr-only">
        {isCopied ? "Copied" : ""}
      </span>
    </button>
  );
}

/**
 * An overview page's hero aside: a tab per package or platform. Each tab
 * types its install command, then shows the next step from its docs and the
 * thing running where it can. No invented install output. Tabs advance on
 * their own until the reader picks one; reduced motion shows each at once.
 */
export function InstallTerminal({
  tabs,
  cwd = "~/my-app",
  frameClassName = "h-[28rem]",
}: {
  tabs: readonly TerminalTab[];
  cwd?: string;
  frameClassName?: string;
}) {
  const [id, setId] = useState(tabs[0]!.id);
  const [auto, setAuto] = useState(true);
  const [run, setRun] = useState(0);
  const [typed, setTyped] = useState(0);
  const [settled, setSettled] = useState(false);
  const tab = tabs.find((entry) => entry.id === id) ?? tabs[0]!;
  const scroller = useRef<HTMLDivElement>(null);
  const tabRow = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const command = tab.command;
    let char = 0;
    let timer: ReturnType<typeof setTimeout>;
    const advance = () => {
      if (!auto) return;
      const index = tabs.findIndex((entry) => entry.id === tab.id);
      setId(tabs[(index + 1) % tabs.length]!.id);
    };
    const tick = () => {
      if (char < command.length) {
        char += 1;
        setTyped(char);
        timer = setTimeout(tick, TYPE_MS);
        return;
      }
      timer = setTimeout(() => {
        setSettled(true);
        timer = setTimeout(advance, DWELL_MS);
      }, SETTLE_MS);
    };
    timer = setTimeout(() => {
      setSettled(false);
      if (prefersReducedMotion()) {
        setTyped(command.length);
        setSettled(true);
        return;
      }
      setTyped(0);
      tick();
    }, 0);
    return () => clearTimeout(timer);
  }, [tab, tabs, auto, run]);

  useEffect(() => {
    if (scroller.current) scroller.current.scrollTop = 0;
    const list = tabRow.current?.querySelector<HTMLElement>("[role=tablist]");
    const active = list?.querySelector<HTMLElement>("[aria-selected=true]");
    if (list && active) {
      const left =
        active.getBoundingClientRect().left -
        list.getBoundingClientRect().left +
        list.scrollLeft;
      const start = left - 8;
      const end = left + active.offsetWidth + 8 - list.clientWidth;
      if (list.scrollLeft > start) list.scrollLeft = start;
      else if (list.scrollLeft < end) list.scrollLeft = end;
    }
  }, [tab.id]);

  const done = typed >= tab.command.length;

  return (
    <div onPointerDown={() => setAuto(false)} onKeyDown={() => setAuto(false)}>
      <DemoFrame caption={tab.caption} frameClassName={frameClassName}>
        <div
          ref={tabRow}
          className="border-foreground/10 flex h-11 shrink-0 items-center gap-1 border-b ps-1.5 pe-2"
        >
          <Tabs
            value={tab.id}
            onValueChange={(value) => setId(String(value))}
            className="min-w-0 flex-1"
          >
            <TabsList
              aria-label="Terminal tabs"
              className="h-8 w-full [scrollbar-width:none] justify-start gap-0.5 overflow-x-auto bg-transparent p-0"
            >
              {tabs.map((entry) => (
                <TabsTrigger
                  key={entry.id}
                  value={entry.id}
                  className="data-active:bg-foreground/[0.07] text-muted-foreground data-active:text-foreground hover:text-foreground h-7 flex-none gap-1.5 rounded-md border-0 px-2 font-mono text-xs shadow-none [font-variant-ligatures:none] data-active:shadow-none"
                >
                  {entry.icon ? (
                    <span
                      aria-hidden
                      className="flex h-3.5 w-4 items-center justify-center [&_svg]:h-3.5 [&_svg]:w-4"
                    >
                      {entry.icon}
                    </span>
                  ) : null}
                  {entry.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <button
            type="button"
            onClick={() => setRun((value) => value + 1)}
            aria-label="Run it again"
            className="text-muted-foreground hover:text-foreground hover:bg-foreground/[0.05] focus-visible:ring-ring inline-flex size-7 shrink-0 items-center justify-center rounded-md transition-colors outline-none focus-visible:ring-2"
          >
            <RotateCcwIcon aria-hidden className="size-3.5" />
          </button>
        </div>
        <div
          ref={scroller}
          className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-3.5 font-mono text-[13px] leading-relaxed [font-variant-ligatures:none]"
        >
          <div className="flex items-start gap-2">
            <span className="text-muted-foreground shrink-0 select-none">
              {cwd} $
            </span>
            <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">
              <span className="sr-only">{tab.command}</span>
              <span aria-hidden>
                {tab.command.slice(0, typed)}
                {done ? null : <Caret />}
              </span>
            </span>
            {done ? <CommandCopy command={tab.command} /> : null}
          </div>
          {settled ? (
            <div className="animate-in fade-in-0 flex flex-col gap-3 duration-300 motion-reduce:animate-none">
              {tab.next ? (
                <div>
                  <p className="text-muted-foreground"># then</p>
                  <div className="text-[12.5px] [&_code]:[overflow-wrap:anywhere] [&_code]:whitespace-pre-wrap [&_pre]:m-0 [&_pre]:bg-transparent! [&_pre]:p-0">
                    <DeferredHighlight
                      key={tab.id}
                      language={tab.next.language}
                      theme={{ light: "github-light", dark: "github-dark" }}
                      defaultColor="light-dark()"
                      addDefaultStyles={false}
                      showLanguage={false}
                    >
                      {tab.next.code}
                    </DeferredHighlight>
                  </div>
                </div>
              ) : null}
              {tab.result ? (
                <div className="bg-foreground/[0.025] dark:bg-foreground/[0.04] rounded-document flex min-h-40 flex-1 flex-col overflow-hidden font-sans">
                  {tab.result}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </DemoFrame>
    </div>
  );
}
