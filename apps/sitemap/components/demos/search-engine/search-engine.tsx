"use client";

import { useState, useSyncExternalStore, type ComponentType } from "react";
import {
  ActionBarPrimitive,
  AssistantRuntimeProvider,
  AuiIf,
  CompositeAttachmentAdapter,
  ComposerPrimitive,
  MessagePrimitive,
  SimpleImageAttachmentAdapter,
  SimpleTextAttachmentAdapter,
  ThreadPrimitive,
  WebSpeechDictationAdapter,
  unstable_useSlashCommandAdapter,
  useAui,
  useAuiState,
  useLocalRuntime,
  type ChatModelAdapter,
  type SourceMessagePart,
  type SuggestionAdapter,
  type ThreadAssistantMessagePart,
  type ThreadMessage,
  type Unstable_SlashCommand,
} from "@assistant-ui/react";
import {
  AppWindowIcon,
  ArrowUpIcon,
  BookOpenIcon,
  CheckIcon,
  CloudIcon,
  CopyIcon,
  EraserIcon,
  FlaskConicalIcon,
  GlobeIcon,
  GripIcon,
  LayoutGridIcon,
  LayoutTemplateIcon,
  LibraryIcon,
  MicIcon,
  NewspaperIcon,
  RefreshCwIcon,
  SearchIcon,
  ShapesIcon,
  SquareIcon,
  SquarePenIcon,
} from "lucide-react";
import {
  ComposerAddAttachment,
  ComposerAttachments,
  UserMessageAttachments,
} from "@/components/assistant-ui/elements/attachment.aui";
import { ComposerTriggerPopover } from "@/components/assistant-ui/elements/composer-trigger-popover.aui";
import { ThreadFollowupSuggestions } from "@/components/assistant-ui/elements/follow-up-suggestions.aui";
import { MarkdownText } from "@/components/assistant-ui/elements/markdown-text";
import { TooltipIconButton } from "@/components/assistant-ui/elements/tooltip-icon-button";
import { ClaudeIcon } from "@/components/icons/claude";
import { DiscordIcon } from "@/components/icons/discord";
import { GitHubIcon } from "@/components/icons/github";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import data from "./data.json";

/* -------------------------------------------------------------------------- */
/* The script: what the search answers, in place of a model.                  */
/* Swap `scriptedSearch` for a real ChatModelAdapter to search with a model.  */
/* -------------------------------------------------------------------------- */

const SITE = "https://www.assistant-ui.com";

type Topic = {
  /** Tested against the lowercased question, in order. */
  match?: RegExp;
  question?: string;
  answer: string;
  sources: readonly { title: string; url: string }[];
  followUps: readonly string[];
};

const TOPICS: Topic[] = data.topics.map((topic) => ({
  ...topic,
  match: new RegExp(topic.match),
}));

const FALLBACK: Topic = { ...data.fallback, sources: [] };

const TRY_QUESTIONS = data.topics.slice(0, 5).map((topic) => topic.question);
const LUCKY_QUESTIONS = data.topics.map((topic) => topic.question);

const findTopic = (question: string) =>
  TOPICS.find((topic) => topic.match?.test(question.toLowerCase())) ?? FALLBACK;

const lastQuestion = (messages: readonly ThreadMessage[]) =>
  messages.findLast((message) => message.role === "user");

const textOf = (message: ThreadMessage | undefined) =>
  message?.content
    .map((part) => (part.type === "text" ? part.text : ""))
    .join(" ")
    .trim() ?? "";

const wait = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true },
    );
  });

/** Streams the matching answer word by word, then its sources one by one. */
const scriptedSearch: ChatModelAdapter = {
  async *run({ messages, abortSignal }) {
    const question = lastQuestion(messages);
    const topic = findTopic(textOf(question));
    const files = question?.attachments?.map((file) => file.name) ?? [];
    const lead = files.length
      ? `You attached **${files.join("**, **")}**. The script can't read files, so here is what it knows.\n\n`
      : "";

    await wait(450, abortSignal);
    const parts: ThreadAssistantMessagePart[] = [];
    let shown = "";
    for (const word of `${lead}${topic.answer}`.match(/\S+\s*|\s+/g) ?? []) {
      if (abortSignal.aborted) return;
      shown += word;
      parts[0] = { type: "text", text: shown };
      yield { content: [...parts] };
      await wait(22, abortSignal);
    }
    for (const source of topic.sources) {
      if (abortSignal.aborted) return;
      await wait(120, abortSignal);
      parts.push({
        type: "source",
        sourceType: "url",
        id: source.url,
        ...source,
      });
      yield { content: [...parts] };
    }
  },
};

const followUps: SuggestionAdapter = {
  async generate({ messages }) {
    return findTopic(textOf(lastQuestion(messages))).followUps.map(
      (prompt) => ({ prompt }),
    );
  },
};

const attachments = new CompositeAttachmentAdapter([
  new SimpleImageAttachmentAdapter(),
  new SimpleTextAttachmentAdapter(),
]);

/* The adapter is always there so the composer's capabilities never change after
   the first render; the mic only shows where the browser can listen. */
const dictation = new WebSpeechDictationAdapter();

/* -------------------------------------------------------------------------- */
/* The search engine                                                           */
/* -------------------------------------------------------------------------- */

export default function SearchEngineDemo() {
  const runtime = useLocalRuntime(scriptedSearch, {
    adapters: { attachments, dictation, suggestion: followUps },
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <div className="bg-background text-foreground @container flex h-full min-h-0 flex-col">
        <SearchViews />
      </div>
    </AssistantRuntimeProvider>
  );
}

function SearchViews() {
  const isHome = useAuiState((s) => s.thread.messages.length === 0);
  return isHome ? <Home /> : <Results />;
}

function Home() {
  return (
    <>
      <Header />
      <main className="flex min-h-0 flex-1 flex-col items-center justify-center gap-5 px-4 pb-6">
        <h2 className="sr-only">assistant-ui search</h2>
        <Doodle />
        <SearchBar home />
        <ul className="text-muted-foreground flex max-w-xl flex-wrap justify-center gap-2 text-[13px]">
          {TRY_QUESTIONS.map((question, index) => (
            <li key={question} className={cn(index > 2 && "hidden @lg:block")}>
              <ThreadPrimitive.Suggestion
                prompt={question}
                send
                className="hover:text-foreground hover:bg-foreground/[0.025] cursor-pointer rounded-full border px-3 py-1 transition-colors"
              >
                {question}
              </ThreadPrimitive.Suggestion>
            </li>
          ))}
        </ul>
      </main>
      <Footer />
    </>
  );
}

function Results() {
  return (
    <>
      <Header />
      <ThreadPrimitive.Root className="flex min-h-0 flex-1 flex-col">
        <ThreadPrimitive.Viewport
          turnAnchor="top"
          className="flex flex-1 flex-col overflow-y-auto scroll-smooth"
        >
          <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4">
            <div className="flex flex-col gap-8 pt-4 pb-10">
              <ThreadPrimitive.Messages>
                {() => <Message />}
              </ThreadPrimitive.Messages>
            </div>
            <ThreadPrimitive.ViewportFooter className="bg-background sticky bottom-0 mt-auto flex flex-col gap-3 pb-3">
              <ThreadFollowupSuggestions />
              <SearchBar />
              <p className="text-muted-foreground text-center text-xs">
                Answers here come from a script, not a model.
              </p>
            </ThreadPrimitive.ViewportFooter>
          </div>
        </ThreadPrimitive.Viewport>
      </ThreadPrimitive.Root>
    </>
  );
}

/* Header ------------------------------------------------------------------- */

const CLAUDE_URL = `https://claude.ai/new?q=${encodeURIComponent(
  `Read ${SITE}/llms.txt (the assistant-ui documentation) so I can ask questions about building AI chat with assistant-ui.`,
)}`;

const headerLink =
  "hover:text-foreground text-foreground/80 flex items-center gap-1.5 rounded-md px-2 py-1 text-sm transition-colors hover:underline";

function Header() {
  return (
    <header className="flex h-12 shrink-0 items-center gap-3 px-4">
      <HomeLink />
      <div className="ms-auto flex items-center gap-1">
        <a
          href={CLAUDE_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Claude"
          className={headerLink}
        >
          <ClaudeIcon className="size-4 text-[#D97757] @md:size-3.5" />
          <span aria-hidden className="hidden @md:inline">
            Claude
          </span>
        </a>
        <a
          href={`${SITE}/contact-sales`}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(headerLink, "hidden @md:flex")}
        >
          Talk to the team
        </a>
        <AppsMenu />
        <ProfileMenu />
      </div>
    </header>
  );
}

/** Before a search the logo opens assistant-ui.com; after one it starts over. */
function HomeLink() {
  const aui = useAui();
  const isHome = useAuiState((s) => s.thread.messages.length === 0);
  const className =
    "focus-visible:ring-ring/50 flex shrink-0 cursor-pointer items-center gap-2 rounded-md text-sm font-medium tracking-tight outline-none focus-visible:ring-2";
  const content = (
    <>
      <LogoMark className="size-4" />
      assistant-ui
    </>
  );
  return isHome ? (
    <a
      href={SITE}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
    >
      {content}
    </a>
  ) : (
    <button
      type="button"
      onClick={() => aui.thread().reset()}
      aria-label="assistant-ui, start a new search"
      className={className}
    >
      {content}
    </button>
  );
}

const APPS: {
  label: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
}[] = [
  { label: "Docs", href: `${SITE}/docs`, icon: BookOpenIcon },
  { label: "Elements", href: `${SITE}/elements`, icon: ShapesIcon },
  { label: "Blocks", href: `${SITE}/blocks`, icon: LayoutTemplateIcon },
  { label: "Playground", href: `${SITE}/playground`, icon: FlaskConicalIcon },
  { label: "Examples", href: `${SITE}/examples`, icon: AppWindowIcon },
  { label: "Cloud", href: "https://cloud.assistant-ui.com", icon: CloudIcon },
  { label: "Blog", href: `${SITE}/blog`, icon: NewspaperIcon },
  {
    label: "GitHub",
    href: "https://github.com/assistant-ui/assistant-ui",
    icon: GitHubIcon,
  },
  {
    label: "Discord",
    href: "https://discord.gg/S9dwgCNEFs",
    icon: DiscordIcon,
  },
];

function AppsMenu() {
  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            aria-label="assistant-ui apps"
          />
        }
      >
        <GripIcon className="size-5" />
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-72 p-2">
        <ul className="grid grid-cols-3 gap-1">
          {APPS.map(({ label, href, icon: Icon }) => (
            <li key={label}>
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:bg-foreground/[0.05] focus-visible:bg-foreground/[0.05] flex flex-col items-center gap-2 rounded-lg px-2 py-3 text-xs outline-none"
              >
                <span className="bg-muted flex size-9 items-center justify-center rounded-full">
                  <Icon className="size-4" />
                </span>
                {label}
              </a>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

/** A made-up person, so the menu has someone to show. */
const PERSON = { name: "Juniper Hale", email: "juniper@example.com" };

function ProfileMenu() {
  const aui = useAui();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            aria-label={`Account: ${PERSON.name}`}
            className="focus-visible:ring-ring/50 ms-1 flex size-8 cursor-pointer items-center justify-center rounded-full bg-violet-600 text-xs font-medium text-white outline-none focus-visible:ring-2"
          />
        }
      >
        JH
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-60">
        <div className="flex flex-col px-2 py-1.5">
          <span className="text-sm font-medium">{PERSON.name}</span>
          <span className="text-muted-foreground text-xs">{PERSON.email}</span>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => aui.thread().reset()}>
          <SquarePenIcon />
          New search
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* Doodle ------------------------------------------------------------------- */

const BACK_BUBBLE =
  "M12.5 4C12.5 3.90054 12.4704 3.80417 12.416 3.72266L12.3535 3.64648C12.2597 3.55268 12.1325 3.5 12 3.5H4C3.72843 3.5 3.5 3.72843 3.5 4V11.3789L4.93945 9.9395L5.0498 9.8398C5.31669 9.6212 5.65199 9.5 6 9.5H12C12.1326 9.5 12.2597 9.4473 12.3535 9.3535C12.4473 9.2597 12.5 9.1326 12.5 9V4ZM15.5 9C15.5 9.9282 15.131 10.8182 14.4746 11.4746C13.8182 12.131 12.9282 12.5 12 12.5H6.62109L3.06055 16.0605C2.63155 16.4895 1.98629 16.6179 1.42578 16.3857C0.86538 16.1535 0.5 15.6066 0.5 15V4C0.5 2.07157 2.07157 0.5 4 0.5H12C12.9282 0.5 13.8182 0.86905 14.4746 1.52539C15.131 2.18179 15.5 3.07179 15.5 4V9Z";
const FRONT_BUBBLE =
  "M20.5 11C20.5 10.8674 20.4473 10.7403 20.3535 10.6465C20.2597 10.5527 20.1326 10.5 20 10.5H18C17.1716 10.5 16.5 9.8284 16.5 9C16.5 8.17157 17.1716 7.5 18 7.5H20C20.9282 7.5 21.8182 7.86899 22.4746 8.52539C23.131 9.1818 23.5 10.0718 23.5 11V22C23.5 22.6066 23.1346 23.1535 22.5742 23.3857C22.0137 23.6179 21.3685 23.4895 20.9395 23.0605L17.3789 19.5H12C11.0718 19.5 10.1818 19.131 9.52539 18.4746C8.86899 17.8182 8.5 16.9282 8.5 16V15C8.5 14.1716 9.17157 13.5 10 13.5C10.8284 13.5 11.5 14.1716 11.5 15V16C11.5 16.1326 11.5527 16.2597 11.6465 16.3535C11.7403 16.4473 11.8674 16.5 12 16.5H18C18.3978 16.5 18.7792 16.6581 19.0605 16.9395L20.5 18.3789V11Z";

function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path d={BACK_BUBBLE} />
      <path d={FRONT_BUBBLE} />
    </svg>
  );
}

const pop =
  "animate-in fade-in-0 zoom-in-50 fill-mode-both duration-500 ease-out motion-reduce:animate-none";

/** The logo above the search bar: its bubbles pop in and type. A click plays it again. */
function Doodle() {
  const [play, setPlay] = useState(0);
  return (
    <button
      type="button"
      onClick={() => setPlay((n) => n + 1)}
      aria-label="assistant-ui. Play the doodle again"
      className="focus-visible:ring-ring/50 flex cursor-pointer items-center rounded-xl px-3 py-2 outline-none select-none focus-visible:ring-2"
    >
      <span key={play} className="flex items-center gap-3">
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          fill="currentColor"
          className="size-11 overflow-visible @md:size-14"
        >
          <path
            d={BACK_BUBBLE}
            className={cn(pop, "origin-bottom [transform-box:fill-box]")}
          />
          {[5.4, 8, 10.6].map((cx, index) => (
            <circle
              key={cx}
              cx={cx}
              cy={6.5}
              r={1.15}
              className="animate-bounce fill-blue-500 [transform-box:fill-box] motion-reduce:animate-none"
              style={{ animationDelay: `${700 + index * 150}ms` }}
            />
          ))}
          <path
            d={FRONT_BUBBLE}
            className={cn(pop, "origin-bottom [transform-box:fill-box]")}
            style={{ animationDelay: "180ms" }}
          />
        </svg>
        <span
          aria-hidden
          className="text-4xl leading-none font-medium tracking-[-0.04em] @md:text-5xl"
        >
          {"assistant-ui".split("").map((letter, index) => (
            <span
              key={index}
              className="animate-in fade-in-0 slide-in-from-bottom-2 fill-mode-both inline-block duration-500 ease-out motion-reduce:animate-none"
              style={{ animationDelay: `${320 + index * 35}ms` }}
            >
              {letter}
            </span>
          ))}
        </span>
      </span>
    </button>
  );
}

/* Search bar --------------------------------------------------------------- */

/* Google's search box shadow; the site's shadow tokens are zero. */
const RAISED =
  "shadow-[0_1px_6px_rgb(32_33_36/0.16)] hover:shadow-[0_1px_8px_rgb(32_33_36/0.26)] focus-within:shadow-[0_1px_8px_rgb(32_33_36/0.26)] dark:shadow-none dark:bg-muted/50";

function SearchBar({ home = false }: { home?: boolean }) {
  return (
    <ComposerPrimitive.TriggerPopoverRoot>
      <ComposerPrimitive.Root
        className={cn("w-full", home && "flex flex-col items-center gap-6")}
      >
        <div
          className={cn(
            "relative mx-auto w-full",
            home ? "max-w-xl" : "max-w-2xl",
          )}
        >
          {!home && <ComposerAttachments />}
          <div
            className={cn(
              "bg-background flex min-h-12 items-center gap-1 rounded-full border ps-4 pe-2 transition-shadow",
              RAISED,
            )}
          >
            <SearchIcon className="text-muted-foreground size-4 shrink-0" />
            <ComposerPrimitive.Input
              rows={1}
              autoFocus={!home}
              enterKeyHint="search"
              aria-label="Search"
              placeholder="Ask anything, or type /"
              className="placeholder:text-muted-foreground/80 max-h-32 min-w-0 flex-1 resize-none bg-transparent px-2 py-3 text-base leading-6 outline-none"
            />
            <ComposerAddAttachment />
            <MicButton />
            {!home && <SendButton />}
          </div>
          {home && (
            <div className="mt-2 flex justify-center empty:hidden">
              <ComposerAttachments />
            </div>
          )}
          <SlashMenu below={home} />
        </div>
        {home && <HomeButtons />}
      </ComposerPrimitive.Root>
    </ComposerPrimitive.TriggerPopoverRoot>
  );
}

const subscribeNever = () => () => {};

function MicButton() {
  const canListen = useSyncExternalStore(
    subscribeNever,
    () => WebSpeechDictationAdapter.isSupported(),
    () => false,
  );
  if (!canListen) return null;
  return (
    <>
      <AuiIf condition={(s) => s.composer.dictation == null}>
        <ComposerPrimitive.Dictate asChild>
          <TooltipIconButton
            tooltip="Search by voice"
            aria-label="Search by voice"
            className="text-muted-foreground hover:text-foreground size-8 rounded-full"
          >
            <MicIcon className="size-4" />
          </TooltipIconButton>
        </ComposerPrimitive.Dictate>
      </AuiIf>
      <AuiIf condition={(s) => s.composer.dictation != null}>
        <ComposerPrimitive.StopDictation asChild>
          <TooltipIconButton
            tooltip="Stop listening"
            aria-label="Stop listening"
            className="text-destructive size-8 rounded-full"
          >
            <SquareIcon className="size-3.5 animate-pulse fill-current motion-reduce:animate-none" />
          </TooltipIconButton>
        </ComposerPrimitive.StopDictation>
      </AuiIf>
    </>
  );
}

function SendButton() {
  return (
    <>
      <AuiIf condition={(s) => !s.thread.isRunning}>
        <ComposerPrimitive.Send asChild>
          <TooltipIconButton
            tooltip="Search"
            aria-label="Search"
            variant="default"
            className="size-8 rounded-full"
          >
            <ArrowUpIcon className="size-4" />
          </TooltipIconButton>
        </ComposerPrimitive.Send>
      </AuiIf>
      <AuiIf condition={(s) => s.thread.isRunning}>
        <ComposerPrimitive.Cancel asChild>
          <TooltipIconButton
            tooltip="Stop"
            aria-label="Stop"
            variant="default"
            className="size-8 rounded-full"
          >
            <SquareIcon className="size-3 fill-current" />
          </TooltipIconButton>
        </ComposerPrimitive.Cancel>
      </AuiIf>
    </>
  );
}

function HomeButtons() {
  const aui = useAui();
  const feelLucky = () => {
    const question =
      LUCKY_QUESTIONS[Math.floor(Math.random() * LUCKY_QUESTIONS.length)];
    if (question) aui.thread().append(question);
  };
  return (
    <div className="flex flex-wrap justify-center gap-3">
      <ComposerPrimitive.Send asChild>
        <Button
          type="submit"
          variant="secondary"
          size="lg"
          className="px-4 disabled:opacity-100"
        >
          Ask assistant-ui
        </Button>
      </ComposerPrimitive.Send>
      <Button
        type="button"
        variant="secondary"
        size="lg"
        className="px-4"
        onClick={feelLucky}
      >
        I&apos;m feeling lucky
      </Button>
    </div>
  );
}

const COMMAND_ICONS = {
  library: LibraryIcon,
  docs: BookOpenIcon,
  examples: LayoutGridIcon,
  playground: FlaskConicalIcon,
  clear: EraserIcon,
};

function SlashMenu({ below }: { below: boolean }) {
  const aui = useAui();
  const commands: Unstable_SlashCommand[] = [
    {
      id: "library",
      description: "Everything you can install",
      icon: "library",
      execute: () => aui.thread().append("Show me the library"),
    },
    {
      id: "docs",
      description: "What the docs cover",
      icon: "docs",
      execute: () => aui.thread().append("Open the docs"),
    },
    {
      id: "examples",
      description: "Apps built with assistant-ui",
      icon: "examples",
      execute: () => aui.thread().append("Show me examples"),
    },
    {
      id: "playground",
      description: "Open the Playground in a new tab",
      icon: "playground",
      execute: () =>
        window.open(`${SITE}/playground`, "_blank", "noopener,noreferrer"),
    },
    {
      id: "clear",
      description: "Start a new search",
      icon: "clear",
      execute: () => aui.thread().reset(),
    },
  ];
  const slash = unstable_useSlashCommandAdapter({
    commands,
    removeOnExecute: true,
    iconMap: COMMAND_ICONS,
  });

  return (
    <ComposerTriggerPopover
      char="/"
      {...slash}
      className={cn(
        "max-h-60 w-72 overflow-y-auto shadow-[0_8px_24px_rgb(0_0_0/0.12)]",
        below && "top-full bottom-auto mt-2 mb-0",
      )}
    />
  );
}

/* Thread ------------------------------------------------------------------- */

function Message() {
  const role = useAuiState((s) => s.message.role);
  return role === "user" ? <Question /> : <Answer />;
}

function Question() {
  return (
    <MessagePrimitive.Root className="flex flex-col items-end gap-2">
      <UserMessageAttachments />
      <div className="bg-muted max-w-[85%] rounded-2xl px-4 py-2.5 break-words">
        <MessagePrimitive.Parts />
      </div>
    </MessagePrimitive.Root>
  );
}

const NoSource = () => null;

function Answer() {
  return (
    <MessagePrimitive.Root className="flex gap-3">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full border">
        <LogoMark className="size-4" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-3 pt-1">
        <AuiIf
          condition={(s) =>
            s.message.status?.type === "running" && s.message.parts.length === 0
          }
        >
          <p role="status" className="text-muted-foreground text-sm">
            Searching assistant-ui
            <span className="animate-pulse motion-reduce:animate-none">…</span>
          </p>
        </AuiIf>
        <div className="leading-7">
          <MessagePrimitive.Parts
            components={{ Text: MarkdownText, Source: NoSource }}
          />
        </div>
        <SourceLinks />
        <ActionBarPrimitive.Root
          hideWhenRunning
          autohide="never"
          className="text-muted-foreground -ms-1.5 flex items-center gap-0.5"
        >
          <ActionBarPrimitive.Copy asChild>
            <TooltipIconButton
              tooltip="Copy"
              aria-label="Copy"
              className="size-7"
            >
              <AuiIf condition={(s) => s.message.isCopied}>
                <CheckIcon className="size-3.5" />
              </AuiIf>
              <AuiIf condition={(s) => !s.message.isCopied}>
                <CopyIcon className="size-3.5" />
              </AuiIf>
            </TooltipIconButton>
          </ActionBarPrimitive.Copy>
          <ActionBarPrimitive.Reload asChild>
            <TooltipIconButton
              tooltip="Answer again"
              aria-label="Answer again"
              className="size-7"
            >
              <RefreshCwIcon className="size-3.5" />
            </TooltipIconButton>
          </ActionBarPrimitive.Reload>
        </ActionBarPrimitive.Root>
      </div>
    </MessagePrimitive.Root>
  );
}

type UrlSource = Extract<SourceMessagePart, { sourceType: "url" }>;

function SourceLinks() {
  const parts = useAuiState((s) => s.message.parts);
  const sources = parts.flatMap((part): UrlSource[] =>
    part.type === "source" && part.sourceType === "url" ? [part] : [],
  );
  if (sources.length === 0) return null;
  return (
    <ul aria-label="Sources" className="flex flex-wrap gap-2">
      {sources.map((source) => {
        const host = new URL(source.url).hostname;
        const Icon = host.endsWith("assistant-ui.com")
          ? LogoMark
          : host === "github.com"
            ? GitHubIcon
            : GlobeIcon;
        return (
          <li key={source.id}>
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:bg-foreground/[0.025] flex items-center gap-2 rounded-full border py-1 ps-1 pe-3 text-sm transition-colors"
            >
              <span className="bg-muted flex size-6 items-center justify-center rounded-full">
                <Icon className="size-3.5" />
              </span>
              {source.title ?? host}
            </a>
          </li>
        );
      })}
    </ul>
  );
}

/* Footer ------------------------------------------------------------------- */

const footerLink = "hover:text-foreground transition-colors";

function Footer() {
  return (
    <footer className="bg-muted/60 text-muted-foreground flex shrink-0 flex-col gap-2 border-t px-4 py-2.5 text-xs @xl:flex-row @xl:items-center @xl:justify-between">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <a
          href="https://www.agentbase.dev"
          target="_blank"
          rel="noopener noreferrer"
          className={footerLink}
        >
          &copy; {process.env.COPYRIGHT_YEAR} AgentbaseAI Inc.
        </a>
        <span className="flex items-center gap-2">
          <a href={`${SITE}/privacy-policy`} className={footerLink}>
            Privacy
          </a>
          <span aria-hidden>·</span>
          <a href={`${SITE}/terms-of-service`} className={footerLink}>
            Terms
          </a>
          <span aria-hidden>·</span>
          <a href={`${SITE}/privacy-policy`} className={footerLink}>
            Cookies
          </a>
        </span>
      </div>
      <div className="flex items-center gap-3">
        <StatusBadge />
        <a
          href="https://github.com/assistant-ui/assistant-ui"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="GitHub"
          className={footerLink}
        >
          <GitHubIcon className="size-4" />
        </a>
        <a
          href="https://discord.gg/S9dwgCNEFs"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Discord"
          className={footerLink}
        >
          <DiscordIcon className="size-4" />
        </a>
      </div>
    </footer>
  );
}
