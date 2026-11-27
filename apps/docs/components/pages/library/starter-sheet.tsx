"use client";

import { useRef, type ReactNode } from "react";
import { Tabs } from "@base-ui/react/tabs";
import {
  ArrowUpRightIcon,
  BotIcon,
  BookmarkCheckIcon,
  BookmarkIcon,
  TerminalIcon,
  XIcon,
  BoxIcon,
  ComponentIcon,
  FileCodeIcon,
  PackageIcon,
  AppWindowIcon,
  CpuIcon,
  PlugIcon,
  ShapesIcon,
  type LucideIcon,
} from "lucide-react";
import type {
  StarterFramework,
  StarterIntegration,
  StarterRuntime,
} from "@/lib/library/starters-data";
import {
  starterCommand,
  starterId,
  starterOpen,
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
import { FilterIcon } from "./filter-icons";
import { LibraryCopyButton } from "./library-copy-button";
import {
  LibraryDrawer,
  LibraryDrawerClose,
  LibraryDrawerContent,
  LibraryDrawerDescription,
  LibraryDrawerTitle,
} from "./library-drawer";
import { StarterScreenshots } from "./starter-screenshots";

const button =
  "focus-visible:ring-ring inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-lg px-3.5 text-sm font-medium transition-colors outline-none focus-visible:ring-2 [&_svg]:size-4";

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

/** A labelled group of rows in a bordered box, like a settings panel. */
function RowGroup({
  title,
  aside,
  children,
}: {
  title: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2">
      <div className="text-muted-foreground flex items-baseline justify-between gap-4 text-sm">
        <h3>{title}</h3>
        {aside}
      </div>
      <ul className="border-foreground/10 divide-foreground/10 divide-y rounded-2xl border px-4">
        {children}
      </ul>
    </section>
  );
}

/** One row: an icon, a label, an optional value on the right, and an optional action after it. */
function GroupRow({
  icon,
  label,
  value,
  action,
  mono = false,
}: {
  icon: ReactNode;
  label: ReactNode;
  value?: ReactNode;
  action?: ReactNode;
  mono?: boolean;
}) {
  return (
    <li className="flex min-h-12 min-w-0 items-center gap-3 py-2.5">
      <span className="text-muted-foreground flex size-4 shrink-0 items-center justify-center [&_svg]:size-4">
        {icon}
      </span>
      <span
        className={cn(
          "min-w-0 truncate",
          value ? "shrink-0" : "flex-1",
          mono
            ? "font-mono text-[13px] [font-variant-ligatures:none]"
            : "text-sm",
        )}
      >
        {label}
      </span>
      {value ? (
        <span className="text-muted-foreground flex min-w-0 flex-1 items-center justify-end gap-1.5 text-sm">
          {value}
        </span>
      ) : null}
      {action}
    </li>
  );
}

type Row = { label: string; value?: string };

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
    <RowGroup
      title={title}
      aside={<span className="tabular-nums">{rows.length}</span>}
    >
      {rows.length > 0 ? (
        rows.map((row) => (
          <GroupRow
            key={row.value ? `${row.value}/${row.label}` : row.label}
            icon={<Icon aria-hidden />}
            label={row.label}
            mono
            {...(row.value && {
              value: (
                <span className="truncate font-mono text-xs [font-variant-ligatures:none]">
                  {row.value}
                </span>
              ),
            })}
          />
        ))
      ) : (
        <li className="text-muted-foreground py-3 text-sm">None</li>
      )}
    </RowGroup>
  );
}

/** Logos and names for one stack field, or "None". */
function StackValue({
  names,
}: {
  names: readonly (StarterFramework | StarterRuntime | StarterIntegration)[];
}) {
  if (names.length === 0) return <span>None</span>;
  return (
    <span className="flex min-w-0 flex-wrap items-center justify-end gap-x-3 gap-y-1">
      {names.map((name) => (
        <span key={name} className="flex items-center gap-1.5">
          <FilterIcon name={name} />
          <span className="text-foreground">{name}</span>
        </span>
      ))}
    </span>
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
      <LibraryCopyButton text={command} label="Copy command" />
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
    <li className="group/step relative flex gap-3 pb-6 last:pb-0">
      <span
        aria-hidden
        className="bg-foreground/25 absolute top-6 bottom-0 left-[11.5px] w-px group-last/step:hidden"
      />
      <span className="bg-foreground/[0.06] ring-background relative grid size-6 shrink-0 place-items-center rounded-full text-xs tabular-nums ring-4">
        {number}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-2 pt-0.5">
        <h3 className="text-sm font-medium">{title}</h3>
        {children}
      </div>
    </li>
  );
}

function OpenStep({ starter }: { starter: Starter }) {
  const open = starterOpen(starter);
  if ("text" in open) {
    return <p className="text-muted-foreground text-sm">{open.text}</p>;
  }
  return (
    <>
      <div className="bg-foreground/[0.025] dark:bg-foreground/[0.04] flex items-center gap-2 rounded-xl py-1 ps-3 pe-1">
        <code className="min-w-0 flex-1 truncate font-mono text-xs [font-variant-ligatures:none]">
          {open.url}
        </code>
        <a
          href={open.url}
          target="_blank"
          rel="noreferrer"
          aria-label={`Open ${open.url} (opens in a new tab)`}
          className="text-muted-foreground hover:text-foreground hover:bg-foreground/[0.06] focus-visible:ring-ring grid size-8 shrink-0 place-items-center rounded-lg transition-colors outline-none focus-visible:ring-2"
        >
          <ArrowUpRightIcon aria-hidden className="size-4" />
        </a>
      </div>
      <p className="text-muted-foreground text-sm">
        Open it in your browser once the dev server is running.
      </p>
    </>
  );
}

function StarterDetails({ starter }: { starter: Starter }) {
  const command = starterCommand(starter);
  const isSaved = useLibrarySaved().includes(starterId(starter));
  const prompt = starterPrompt(starter);

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
              <LibraryDrawerTitle className="text-xl font-medium">
                {starter.label}
              </LibraryDrawerTitle>
              <LibraryDrawerDescription className="text-muted-foreground text-sm">
                {starter.description}
              </LibraryDrawerDescription>
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
            <LibraryDrawerClose
              aria-label="Close"
              className="text-muted-foreground hover:text-foreground hover:bg-foreground/[0.06] focus-visible:ring-ring -me-2 -mt-0.5 grid size-8 shrink-0 cursor-pointer place-items-center rounded-full transition-colors outline-none focus-visible:ring-2"
            >
              <XIcon aria-hidden className="size-4" />
            </LibraryDrawerClose>
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
              <RowGroup title="Install">
                <GroupRow
                  icon={<TerminalIcon aria-hidden />}
                  label="Install command"
                  value={
                    <span className="truncate font-mono text-xs [font-variant-ligatures:none]">
                      {command}
                    </span>
                  }
                  action={
                    <LibraryCopyButton
                      text={command}
                      label="Copy install command"
                      className="-me-1.5"
                    />
                  }
                />
                <GroupRow
                  icon={<BotIcon aria-hidden />}
                  label="Agent prompt"
                  value={<span className="truncate">{prompt}</span>}
                  action={
                    <LibraryCopyButton
                      text={prompt}
                      label="Copy agent prompt"
                      className="-me-1.5"
                    />
                  }
                />
              </RowGroup>
              <RowGroup title="Stack">
                <GroupRow
                  icon={<ShapesIcon aria-hidden />}
                  label="Type"
                  value={
                    <span className="text-foreground">
                      {starter.kind === "template" ? "Template" : "Example"}
                    </span>
                  }
                />
                <GroupRow
                  icon={<AppWindowIcon aria-hidden />}
                  label="Framework"
                  value={<StackValue names={[starter.framework]} />}
                />
                <GroupRow
                  icon={<CpuIcon aria-hidden />}
                  label="Runtime"
                  value={
                    <StackValue
                      names={starter.runtime ? [starter.runtime] : []}
                    />
                  }
                />
                <GroupRow
                  icon={<PlugIcon aria-hidden />}
                  label="Integrations"
                  value={<StackValue names={starter.integrations ?? []} />}
                />
              </RowGroup>
            </Tabs.Panel>

            <Tabs.Panel value="setup" className="outline-none">
              <ol className="flex flex-col">
                <Step number={1} title="Create the project">
                  <CommandLine command={command} />
                </Step>
                <Step number={2} title="Set its environment variables">
                  {starter.env.length > 0 ? (
                    <>
                      <CommandLine command="cd my-app && cp .env.example .env.local" />
                      <p className="text-muted-foreground text-sm">
                        Then set these in{" "}
                        <span className="font-mono text-xs">.env.local</span>:
                      </p>
                      <CodeList items={starter.env} />
                    </>
                  ) : (
                    <>
                      <CommandLine command="cd my-app" />
                      <p className="text-muted-foreground text-sm">
                        It needs no environment variables.
                      </p>
                    </>
                  )}
                </Step>
                <Step number={3} title="Start it">
                  <CommandLine
                    command={`npm run ${starter.devScript ?? "dev"}`}
                  />
                </Step>
                <Step number={4} title="Open it">
                  <OpenStep starter={starter} />
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

/** `starter` stays set while the drawer closes, so its content holds through the exit animation. */
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
    <LibraryDrawer open={open} onOpenChange={onOpenChange}>
      <LibraryDrawerContent
        ref={popupRef}
        tabIndex={-1}
        initialFocus={popupRef}
        className="w-[30rem]"
      >
        {starter ? <StarterDetails starter={starter} /> : null}
      </LibraryDrawerContent>
    </LibraryDrawer>
  );
}
