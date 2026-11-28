"use client";

import { useEffect, useRef, useState } from "react";
import { Tabs } from "@base-ui/react/tabs";
import {
  ArrowRightIcon,
  ArrowUpRightIcon,
  BotIcon,
  CalendarIcon,
  DownloadIcon,
  FolderGitIcon,
  GlobeIcon,
  KeyRoundIcon,
  TerminalIcon,
  ComponentIcon,
  AppWindowIcon,
  CpuIcon,
  PlugIcon,
  ShapesIcon,
} from "lucide-react";
import {
  componentForRegistryItem,
  entryKey,
  entryName,
  type LibraryLink,
  type StarterEntry,
} from "@/lib/library/library-data";
import {
  PRESET_STACK,
  presetCommand,
  presetId,
  presetPlayground,
  presetPrompt,
} from "@/lib/library/presets-data";
import {
  LIBRARY_KIND_LABEL,
  type LibraryKind,
} from "@/lib/library/saved-items";
import { LIBRARY_UPDATED, formatLibraryDay } from "@/lib/library/updated-data";
import {
  LIBRARY_STATUS_LABEL,
  LIBRARY_STATUS_MEANING,
  libraryStatus,
} from "@/lib/library/status-data";
import type {
  StarterFramework,
  StarterIntegration,
  StarterRuntime,
} from "@/lib/library/starters-data";
import {
  STARTERS,
  starterCommand,
  starterId,
  starterOpen,
  starterPrompt,
  starterSourceHref,
  type Starter,
} from "@/lib/library/starters-data";
import { cn } from "@/lib/utils";
import { copyWithLibraryToast } from "./library-toast";
import { FilterIcon } from "./filter-icons";
import { LibraryCopyButton } from "./library-copy-button";
import { LibraryIconButton } from "./library-icon-button";
import { PackageMark } from "./package-icons";
import {
  SheetFooter,
  SheetHeader,
  SheetLinkRow,
  sheetButton,
  sheetPrimary,
} from "./library-sheet";
import { LibraryStatusBadge } from "./library-status";
import { PresetThumbnail } from "./preset-card";
import { StarterThumbnail } from "./starter-card";
import { GroupRow, RowGroup } from "./library-row-group";
import { CommandLine, Step } from "./library-steps";
import { LibraryDrawer, LibraryDrawerContent } from "./library-drawer";
import { StarterScreenshots } from "./starter-screenshots";

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

const SCREENSHOTS_TAB = {
  value: "screenshots",
  label: "Screenshots",
} as const;

const TABS = [
  { value: "overview", label: "Overview" },
  { value: "setup", label: "Setup" },
  { value: "dependencies", label: "Dependencies" },
] as const;

function OpenStep({ open }: { open: ReturnType<typeof starterOpen> }) {
  if ("text" in open) {
    return <p className="text-muted-foreground text-sm">{open.text}</p>;
  }
  return (
    <>
      <div className="bg-foreground/[0.025] dark:bg-foreground/[0.04] flex items-center gap-2 rounded-xl py-1 ps-3 pe-1">
        <code className="min-w-0 flex-1 truncate font-mono text-xs [font-variant-ligatures:none]">
          {open.url}
        </code>
        <LibraryIconButton
          tooltip="Open in a new tab"
          aria-label={`Open ${open.url} (opens in a new tab)`}
          nativeButton={false}
          render={<a href={open.url} target="_blank" rel="noreferrer" />}
        >
          <ArrowUpRightIcon aria-hidden />
        </LibraryIconButton>
      </div>
      <p className="text-muted-foreground text-sm">
        Open it in your browser once the dev server is running.
      </p>
    </>
  );
}

/** What the drawer shows for one starter or preset, so every kind is laid out the same way. */
type SheetView = {
  /** Its id in the saved panel. */
  id: string;
  label: string;
  description: string;
  kind: LibraryKind;
  /** Absent when `create` does not offer it. */
  command: string | undefined;
  prompt: string;
  /** Its code on GitHub. */
  repo: string | undefined;
  /** Where it runs on the web. */
  preview: string | undefined;
  download: string | undefined;
  /** The day its code last changed, as an ISO date. */
  updated: string | undefined;
  /** Why there is no install command, or what the command does beyond creating a project. */
  note: string | undefined;
  framework: StarterFramework;
  runtime: StarterRuntime | undefined;
  integrations: readonly StarterIntegration[];
  env: readonly string[];
  /** How to start it once `create` has made it; absent without a command. */
  setup:
    | { devScript: string; open: ReturnType<typeof starterOpen> }
    | undefined;
  /** The starter itself, for what `create` installs and its screenshots. */
  starter: Starter | undefined;
};

const DEFAULT_TEMPLATE = STARTERS.find(
  (starter) => starter.kind === "template" && starter.name === "default",
);

const viewOf = (entry: StarterEntry): SheetView => {
  if (entry.kind === "preset") {
    const { preset } = entry;
    return {
      id: presetId(preset),
      label: preset.name,
      description: preset.description,
      kind: "preset",
      command: presetCommand(preset),
      prompt: presetPrompt(preset),
      repo: undefined,
      preview: presetPlayground(preset),
      download: undefined,
      updated: LIBRARY_UPDATED[presetId(preset)],
      note: "The command creates the default template, then applies this preset's look to its thread.",
      framework: PRESET_STACK.framework,
      runtime: PRESET_STACK.runtime,
      integrations: [],
      env: DEFAULT_TEMPLATE?.env ?? [],
      setup: { devScript: "dev", open: { url: "http://localhost:3000" } },
      starter: undefined,
    };
  }
  const { starter } = entry;
  const command = starterCommand(starter);
  return {
    id: starterId(starter),
    label: starter.label,
    description: starter.description,
    kind: starter.kind,
    command,
    prompt: starterPrompt(starter),
    repo: starterSourceHref(starter),
    preview: starter.hosted?.preview,
    download: starter.hosted?.download,
    updated: LIBRARY_UPDATED[starterId(starter)],
    note: command
      ? undefined
      : starter.hosted
        ? "This is a playground template, so it has no install command. Download it as a project, or open its preview."
        : "The create command does not offer this example, so it has no install command. Run it from a clone of the repository.",
    framework: starter.framework,
    runtime: starter.runtime,
    integrations: starter.integrations ?? [],
    env: starter.env,
    setup: command
      ? { devScript: starter.devScript ?? "dev", open: starterOpen(starter) }
      : undefined,
    starter,
  };
};

const REPOSITORY_PATH =
  /^https:\/\/github\.com\/assistant-ui\/assistant-ui\/(?:tree|blob)\/main\//;

function StarterDetails({
  entry,
  previous,
  next,
  onEntryChange,
  onComponent,
}: {
  entry: StarterEntry;
  previous: StarterEntry | undefined;
  next: StarterEntry | undefined;
  onEntryChange: (entry: StarterEntry) => void;
  onComponent: (link: LibraryLink) => void;
}) {
  const view = viewOf(entry);
  const { command, prompt, starter, setup } = view;
  // What the starter installs: the library's own components first, then the
  // support files (hooks, helpers) that are not components of their own.
  const installed = starter
    ? [
        ...starter.components.map((item) => ({
          item,
          link: componentForRegistryItem(item, false),
        })),
        ...starter.uiComponents.map((item) => ({
          item: `ui/${item}`,
          link: componentForRegistryItem(item, true),
        })),
      ]
    : [];
  const components = [
    ...installed.filter(({ link }) => link),
    ...installed.filter(({ link }) => !link),
  ];
  const tabs = [
    TABS[0],
    ...(setup ? [TABS[1]] : []),
    ...(starter && command ? [TABS[2]] : []),
    ...(starter?.screenshots ? [SCREENSHOTS_TAB] : []),
  ];
  // The open tab carries over to the next item when that item has it.
  const [picked, setPicked] = useState<string>(TABS[0].value);
  const tab = tabs.some((item) => item.value === picked)
    ? picked
    : TABS[0].value;
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [view.id]);
  const status = libraryStatus(view.id);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        ref={scrollRef}
        className="flex min-h-0 flex-1 flex-col overflow-y-auto"
      >
        <div className="flex flex-1 flex-col gap-6 p-6">
          <SheetHeader
            thumbnail={
              entry.kind === "preset" ? (
                <PresetThumbnail id={entry.preset.id} />
              ) : (
                <StarterThumbnail starter={entry.starter} />
              )
            }
            title={view.label}
            kind={view.kind}
            badge={<LibraryStatusBadge id={view.id} />}
            description={view.description}
            previous={
              previous && {
                label: entryName(previous),
                go: () => onEntryChange(previous),
              }
            }
            next={
              next && {
                label: entryName(next),
                go: () => onEntryChange(next),
              }
            }
          />

          <Tabs.Root
            value={tab}
            onValueChange={(value) => setPicked(String(value))}
            className="flex flex-1 flex-col gap-5"
          >
            <Tabs.List
              aria-label="Starter details"
              className={cn(
                "flex flex-wrap gap-1",
                tabs.length < 2 && "hidden",
              )}
            >
              {tabs.map((item) => (
                <Tabs.Tab
                  key={item.value}
                  value={item.value}
                  className={cn(
                    "text-muted-foreground hover:text-foreground data-active:bg-foreground/[0.06] data-active:text-foreground dark:data-active:bg-foreground/[0.09] focus-visible:ring-ring h-8 cursor-pointer rounded-(--library-control) px-3.5 text-sm transition-colors outline-none focus-visible:ring-2",
                  )}
                >
                  {item.label}
                </Tabs.Tab>
              ))}
            </Tabs.List>

            <Tabs.Panel
              value="overview"
              className="flex flex-col gap-6 outline-none"
            >
              {status.why ? (
                <p className="text-muted-foreground text-sm text-pretty">
                  <span className="text-foreground font-medium">
                    {LIBRARY_STATUS_LABEL[status.status]}.
                  </span>{" "}
                  {status.why} {LIBRARY_STATUS_MEANING[status.status]}
                </p>
              ) : null}
              {view.note ? (
                <p className="text-muted-foreground text-sm text-pretty">
                  {view.note}
                </p>
              ) : null}
              <RowGroup title="Install">
                {command ? (
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
                ) : null}
                {view.download ? (
                  <SheetLinkRow
                    icon={<DownloadIcon aria-hidden />}
                    label="Download"
                    href={view.download}
                    tooltip="Download the project"
                  />
                ) : null}
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
              {view.repo || view.preview || view.updated ? (
                <RowGroup title="Links">
                  {view.repo ? (
                    <SheetLinkRow
                      icon={<FolderGitIcon aria-hidden />}
                      label="Repo"
                      href={view.repo}
                      text={view.repo.replace(REPOSITORY_PATH, "")}
                      tooltip="Open on GitHub"
                    />
                  ) : null}
                  {view.preview ? (
                    <SheetLinkRow
                      icon={<GlobeIcon aria-hidden />}
                      label="Preview"
                      href={view.preview}
                      tooltip="Open the preview"
                    />
                  ) : null}
                  {view.updated ? (
                    <GroupRow
                      icon={<CalendarIcon aria-hidden />}
                      label="Last updated"
                      value={
                        <time
                          dateTime={view.updated}
                          className="text-foreground"
                        >
                          {formatLibraryDay(view.updated)}
                        </time>
                      }
                    />
                  ) : null}
                </RowGroup>
              ) : null}
              <RowGroup title="Stack">
                <GroupRow
                  icon={<ShapesIcon aria-hidden />}
                  label="Type"
                  value={
                    <span className="text-foreground">
                      {LIBRARY_KIND_LABEL[view.kind]}
                    </span>
                  }
                />
                <GroupRow
                  icon={<AppWindowIcon aria-hidden />}
                  label="Framework"
                  value={<StackValue names={[view.framework]} />}
                />
                <GroupRow
                  icon={<CpuIcon aria-hidden />}
                  label="Runtime"
                  value={
                    <StackValue names={view.runtime ? [view.runtime] : []} />
                  }
                />
                <GroupRow
                  icon={<PlugIcon aria-hidden />}
                  label="Integrations"
                  value={<StackValue names={view.integrations} />}
                />
              </RowGroup>
              {!setup && view.env.length > 0 ? (
                <RowGroup title="Environment variables">
                  {view.env.map((name) => (
                    <GroupRow
                      key={name}
                      icon={<KeyRoundIcon aria-hidden />}
                      label={name}
                      mono
                    />
                  ))}
                </RowGroup>
              ) : null}
            </Tabs.Panel>

            {setup && command ? (
              <Tabs.Panel value="setup" className="outline-none">
                <ol className="flex flex-col">
                  <Step number={1} title="Create the project">
                    <CommandLine command={command} />
                  </Step>
                  <Step number={2} title="Set its environment variables">
                    {view.env.length > 0 ? (
                      <>
                        <CommandLine command="cd my-app && cp .env.example .env.local" />
                        <p className="text-muted-foreground text-sm">
                          Then set these in{" "}
                          <span className="font-mono text-xs">.env.local</span>:
                        </p>
                        <CodeList items={view.env} />
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
                    <CommandLine command={`npm run ${setup.devScript}`} />
                  </Step>
                  <Step number={4} title="Open it">
                    <OpenStep open={setup.open} />
                  </Step>
                </ol>
              </Tabs.Panel>
            ) : null}

            {starter && command ? (
              <Tabs.Panel
                value="dependencies"
                className="flex flex-col gap-6 outline-none"
              >
                <p className="text-muted-foreground text-sm">
                  {starter.componentsIncluded
                    ? `This ${starter.kind}'s components ship inside it, so create copies them with the project instead of installing them from the registry.`
                    : "Everything create installs, including the items each component needs."}
                </p>
                <RowGroup
                  title="Components"
                  aside={
                    <span className="tabular-nums">{components.length}</span>
                  }
                >
                  {components.length > 0 ? (
                    components.map(({ item, link }) => (
                      <GroupRow
                        key={item}
                        icon={<ComponentIcon aria-hidden />}
                        label={link ? link.name : item}
                        mono={!link}
                        {...(link && {
                          value: (
                            <span className="truncate font-mono text-xs [font-variant-ligatures:none]">
                              {item}
                            </span>
                          ),
                          action: (
                            <LibraryIconButton
                              tooltip={`Open ${link.name} in Components`}
                              onClick={() => onComponent(link)}
                              className="-me-1.5"
                            >
                              <ArrowRightIcon aria-hidden />
                            </LibraryIconButton>
                          ),
                        })}
                      />
                    ))
                  ) : (
                    <li className="text-muted-foreground py-3 text-sm">None</li>
                  )}
                </RowGroup>
                <RowGroup
                  title="Packages"
                  aside={
                    <span className="tabular-nums">
                      {starter.dependencies.length}
                    </span>
                  }
                >
                  {starter.dependencies.length > 0 ? (
                    starter.dependencies.map((name) => (
                      <GroupRow
                        key={name}
                        icon={<PackageMark name={name} />}
                        label={name}
                        mono
                      />
                    ))
                  ) : (
                    <li className="text-muted-foreground py-3 text-sm">None</li>
                  )}
                </RowGroup>
              </Tabs.Panel>
            ) : null}
            {starter?.screenshots ? (
              <Tabs.Panel
                value="screenshots"
                className="flex min-h-0 flex-1 flex-col outline-none"
              >
                <StarterScreenshots key={view.id} starter={starter} />
              </Tabs.Panel>
            ) : null}
          </Tabs.Root>
        </div>
      </div>
      <SheetFooter id={view.id} label={view.label}>
        {command ? (
          <button
            type="button"
            aria-label={`Install ${view.label}: copy its install command`}
            onClick={() =>
              copyWithLibraryToast(command, "Install command copied.")
            }
            className={cn(sheetButton, sheetPrimary)}
          >
            <TerminalIcon aria-hidden />
            Install
          </button>
        ) : view.download ? (
          <a
            href={view.download}
            target="_blank"
            rel="noreferrer"
            className={cn(sheetButton, sheetPrimary)}
          >
            <DownloadIcon aria-hidden />
            Download
            <span className="sr-only">(opens in a new tab)</span>
          </a>
        ) : (
          <button
            type="button"
            onClick={() => copyWithLibraryToast(prompt, "Agent prompt copied.")}
            className={cn(sheetButton, sheetPrimary)}
          >
            <BotIcon aria-hidden />
            Copy agent prompt
          </button>
        )}
      </SheetFooter>
    </div>
  );
}

/**
 * The drawer every starter and preset opens in. `entry` stays set while it
 * closes, so its content holds through the exit animation; `entries` is the
 * list on screen, in order, which the arrows step through.
 */
export function StarterSheet({
  entry,
  entries,
  onEntryChange,
  onComponent,
  open,
  onOpenChange,
}: {
  entry: StarterEntry | null;
  entries: readonly StarterEntry[];
  onEntryChange: (entry: StarterEntry) => void;
  /** Opens a component the starter installs, in the Components tab. */
  onComponent: (link: LibraryLink) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const popupRef = useRef<HTMLDivElement>(null);
  const index = entry
    ? entries.findIndex((item) => entryKey(item) === entryKey(entry))
    : -1;
  return (
    <LibraryDrawer open={open} onOpenChange={onOpenChange}>
      <LibraryDrawerContent
        ref={popupRef}
        tabIndex={-1}
        initialFocus={popupRef}
        className="w-[30rem]"
      >
        {entry ? (
          <StarterDetails
            entry={entry}
            previous={index > 0 ? entries[index - 1] : undefined}
            next={index === -1 ? undefined : entries[index + 1]}
            onEntryChange={onEntryChange}
            onComponent={onComponent}
          />
        ) : null}
      </LibraryDrawerContent>
    </LibraryDrawer>
  );
}
