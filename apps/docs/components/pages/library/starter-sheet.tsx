"use client";

import { useRef } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { Tabs } from "@base-ui/react/tabs";
import {
  ArrowUpRightIcon,
  BotIcon,
  CopyIcon,
  BookmarkCheckIcon,
  BookmarkIcon,
  TerminalIcon,
  XIcon,
  BoxIcon,
  ComponentIcon,
  FileCodeIcon,
  PackageIcon,
  type LucideIcon,
} from "lucide-react";
import {
  starterCommand,
  starterId,
  starterPrompt,
  starterSourceHref,
  type Starter,
} from "@/lib/library/starters-data";
import { cn } from "@/lib/utils";
import {
  setLibrarySavedOpen,
  toggleLibrarySavedItem,
  useLibrarySaved,
} from "./saved-store";
import { copyWithLibraryToast, libraryToast } from "./library-toast";
import { StarterScreenshots } from "./starter-screenshots";

const button =
  "focus-visible:ring-ring inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-lg px-3.5 text-sm font-medium transition-colors outline-none focus-visible:ring-2 [&_svg]:size-4";

function Detail({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-muted-foreground text-xs">{title}</h3>
      {children}
    </section>
  );
}

function CodeList({ items }: { items: readonly string[] }) {
  return (
    <ul className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <li
          key={item}
          className="bg-foreground/[0.04] rounded-md px-2 py-1 font-mono text-xs [font-variant-ligatures:none]"
        >
          {item}
        </li>
      ))}
    </ul>
  );
}

type Row = { label: string; value?: string };

/** A labelled group of rows in a bordered box, each with an icon, its name, and an optional value on the right. */
function DependencyList({
  title,
  icon: Icon,
  rows,
}: {
  title: string;
  icon: LucideIcon;
  rows: readonly Row[];
}) {
  return (
    <section className="flex flex-col gap-2">
      <div className="text-muted-foreground flex items-baseline justify-between gap-4 text-sm">
        <h3>{title}</h3>
        <span className="tabular-nums">{rows.length}</span>
      </div>
      {rows.length > 0 ? (
        <ul className="border-foreground/10 divide-foreground/10 divide-y rounded-2xl border px-4">
          {rows.map((row) => (
            <li
              key={row.value ? `${row.value}/${row.label}` : row.label}
              className="flex min-w-0 items-center gap-3 py-3"
            >
              <Icon
                aria-hidden
                className="text-muted-foreground size-4 shrink-0"
              />
              <span className="min-w-0 flex-1 truncate font-mono text-[13px] [font-variant-ligatures:none]">
                {row.label}
              </span>
              {row.value ? (
                <span className="text-muted-foreground max-w-[50%] shrink-0 truncate font-mono text-xs [font-variant-ligatures:none]">
                  {row.value}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="border-foreground/10 text-muted-foreground rounded-2xl border px-4 py-3 text-sm">
          None
        </p>
      )}
    </section>
  );
}

const names = (items: readonly string[]): Row[] =>
  items.map((label) => ({ label }));

/** A file as its name, with the folder it is written to as the value. */
const fileRows = (paths: readonly string[]): Row[] =>
  paths.map((path) => {
    const slash = path.lastIndexOf("/");
    return slash === -1
      ? { label: path }
      : { label: path.slice(slash + 1), value: path.slice(0, slash) };
  });

const SCREENSHOTS_TAB = {
  value: "screenshots",
  label: "Screenshots",
} as const;

const TABS = [
  { value: "overview", label: "Overview" },
  { value: "setup", label: "Setup" },
  { value: "dependencies", label: "Dependencies" },
] as const;

function CommandLine({ command }: { command: string }) {
  return (
    <div className="bg-foreground/[0.025] dark:bg-foreground/[0.04] flex items-center gap-2 rounded-xl py-1 ps-3 pe-1">
      <code className="min-w-0 flex-1 overflow-x-auto font-mono text-xs whitespace-nowrap [font-variant-ligatures:none]">
        {command}
      </code>
      <button
        type="button"
        aria-label="Copy command"
        onClick={() => copyWithLibraryToast(command, "Command copied.")}
        className="text-muted-foreground hover:text-foreground hover:bg-foreground/[0.06] focus-visible:ring-ring grid size-8 shrink-0 cursor-pointer place-items-center rounded-lg transition-colors outline-none focus-visible:ring-2"
      >
        <CopyIcon aria-hidden className="size-4" />
      </button>
    </div>
  );
}

function Step({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex gap-3">
      <span className="bg-foreground/[0.06] grid size-6 shrink-0 place-items-center rounded-full text-xs tabular-nums">
        {number}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-2 pt-0.5">
        <h3 className="text-sm font-medium">{title}</h3>
        {children}
      </div>
    </li>
  );
}

function StarterDetails({ starter }: { starter: Starter }) {
  const command = starterCommand(starter);
  const isSaved = useLibrarySaved().includes(starterId(starter));
  const facts = [
    ["Type", starter.kind === "template" ? "Template" : "Example"],
    ["Framework", starter.framework],
    ["Runtime", starter.runtime ?? "None"],
    ["Integrations", starter.integrations?.join(", ") ?? "None"],
  ] as const;

  const toggleSaved = () => {
    const added = toggleLibrarySavedItem(starterId(starter));
    libraryToast.success(
      added
        ? `${starter.label} saved.`
        : `${starter.label} removed from saved.`,
      {
        group: "saved",
        action: {
          label: "View saved",
          onClick: () => setLibrarySavedOpen(true),
        },
      },
    );
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <div className="flex flex-1 flex-col gap-6 p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 flex-col gap-1.5">
              <Dialog.Title className="text-xl font-medium">
                {starter.label}
              </Dialog.Title>
              <Dialog.Description className="text-muted-foreground text-sm">
                {starter.description}
              </Dialog.Description>
            </div>
            <a
              href={starterSourceHref(starter)}
              target="_blank"
              rel="noreferrer"
              className="text-muted-foreground hover:text-foreground focus-visible:ring-ring mt-1.5 inline-flex shrink-0 items-center gap-1 rounded-sm text-sm underline-offset-4 transition-colors outline-none hover:underline focus-visible:ring-2"
            >
              View repo
              <ArrowUpRightIcon aria-hidden className="size-3.5" />
              <span className="sr-only">on GitHub (opens in a new tab)</span>
            </a>
            <Dialog.Close
              aria-label="Close"
              className="text-muted-foreground hover:text-foreground hover:bg-foreground/[0.06] focus-visible:ring-ring -me-2 -mt-0.5 grid size-8 shrink-0 cursor-pointer place-items-center rounded-full transition-colors outline-none focus-visible:ring-2"
            >
              <XIcon aria-hidden className="size-4" />
            </Dialog.Close>
          </div>

          <Tabs.Root
            defaultValue="overview"
            className="flex flex-1 flex-col gap-5"
          >
            <Tabs.List
              aria-label="Starter details"
              className="flex flex-wrap gap-1"
            >
              {(starter.screenshots ? [...TABS, SCREENSHOTS_TAB] : TABS).map(
                (tab) => (
                  <Tabs.Tab
                    key={tab.value}
                    value={tab.value}
                    className={cn(
                      "text-muted-foreground hover:text-foreground data-active:bg-foreground/[0.06] data-active:text-foreground dark:data-active:bg-foreground/[0.09] focus-visible:ring-ring h-8 cursor-pointer rounded-full px-3.5 text-sm transition-colors outline-none focus-visible:ring-2",
                    )}
                  >
                    {tab.label}
                  </Tabs.Tab>
                ),
              )}
            </Tabs.List>

            <Tabs.Panel
              value="overview"
              className="flex flex-col gap-6 outline-none"
            >
              <Detail title="Create it">
                <CommandLine command={command} />
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      copyWithLibraryToast(
                        starterPrompt(starter),
                        "Agent prompt copied.",
                      )
                    }
                    className={cn(
                      button,
                      "bg-foreground text-background hover:bg-foreground/90",
                    )}
                  >
                    <BotIcon aria-hidden />
                    Copy agent prompt
                  </button>
                </div>
              </Detail>
              <dl className="grid grid-cols-2 gap-4 text-sm">
                {facts.map(([label, value]) => (
                  <div key={label} className="flex flex-col gap-1">
                    <dt className="text-muted-foreground text-xs">{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
            </Tabs.Panel>

            <Tabs.Panel value="setup" className="outline-none">
              <ol className="flex flex-col gap-5">
                <Step number={1} title="Create the project">
                  <CommandLine command={command} />
                </Step>
                <Step number={2} title="Set its environment variables">
                  {starter.env.length > 0 ? (
                    <>
                      <p className="text-muted-foreground text-sm">
                        Start from the project&apos;s{" "}
                        <span className="font-mono text-xs">.env.example</span>.
                      </p>
                      <CodeList items={starter.env} />
                    </>
                  ) : (
                    <p className="text-muted-foreground text-sm">
                      None to set.
                    </p>
                  )}
                </Step>
                <Step number={3} title="Start it">
                  <CommandLine
                    command={`cd my-app && npm run ${starter.devScript ?? "dev"}`}
                  />
                </Step>
              </ol>
            </Tabs.Panel>

            <Tabs.Panel
              value="dependencies"
              className="flex flex-col gap-6 outline-none"
            >
              <p className="text-muted-foreground text-sm">
                {starter.componentsIncluded
                  ? `This ${starter.kind}'s components ship inside it, so create copies them with the project instead of installing them from the registry.`
                  : "Everything create installs, including the items each component needs."}
              </p>
              <DependencyList
                title="Registry components"
                icon={ComponentIcon}
                rows={names(starter.components)}
              />
              <DependencyList
                title="UI components"
                icon={BoxIcon}
                rows={names(starter.uiComponents)}
              />
              <DependencyList
                title={
                  starter.componentsIncluded
                    ? "Component files"
                    : "Files created"
                }
                icon={FileCodeIcon}
                rows={fileRows(starter.files)}
              />
              <DependencyList
                title="npm packages"
                icon={PackageIcon}
                rows={names(starter.dependencies)}
              />
            </Tabs.Panel>
            {starter.screenshots ? (
              <Tabs.Panel
                value="screenshots"
                className="flex min-h-0 flex-1 flex-col outline-none"
              >
                <StarterScreenshots starter={starter} />
              </Tabs.Panel>
            ) : null}
          </Tabs.Root>
        </div>
      </div>
      <div className="flex gap-2 border-t p-4">
        <button
          type="button"
          aria-label={`Install ${starter.label}: copy its install command`}
          onClick={() =>
            copyWithLibraryToast(command, "Install command copied.")
          }
          className={cn(
            button,
            "bg-foreground text-background hover:bg-foreground/90 flex-1",
          )}
        >
          <TerminalIcon aria-hidden />
          Install
        </button>
        <button
          type="button"
          aria-pressed={isSaved}
          onClick={toggleSaved}
          className={cn(
            button,
            "bg-foreground/[0.06] hover:bg-foreground/[0.1] flex-1",
          )}
        >
          {isSaved ? (
            <BookmarkCheckIcon aria-hidden />
          ) : (
            <BookmarkIcon aria-hidden />
          )}
          {isSaved ? "Remove from saved" : "Save"}
        </button>
      </div>
    </div>
  );
}

/** `starter` stays set while the sheet closes, so its content holds through the exit animation. */
export function StarterSheet({
  starter,
  open,
  onOpenChange,
}: {
  starter: Starter | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const popupRef = useRef<HTMLDivElement>(null);
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/40 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0 motion-reduce:transition-none" />
        <Dialog.Popup
          ref={popupRef}
          tabIndex={-1}
          initialFocus={popupRef}
          className="bg-background ring-foreground/10 fixed inset-y-2 right-2 z-50 flex w-[min(36rem,calc(100vw-1rem))] flex-col overflow-hidden rounded-xl shadow-xl ring-1 transition-transform duration-200 outline-none data-ending-style:translate-x-[calc(100%+1rem)] data-starting-style:translate-x-[calc(100%+1rem)] motion-reduce:transition-none"
        >
          {starter ? <StarterDetails starter={starter} /> : null}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
