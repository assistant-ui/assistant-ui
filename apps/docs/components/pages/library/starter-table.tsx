"use client";

import type { ReactNode } from "react";
import { ArrowUpRightIcon, CheckIcon } from "lucide-react";
import type { LibraryEntry } from "@/lib/library/library-data";
import {
  PRESET_STACK,
  presetCommand,
  presetId,
  type LibraryPreset,
} from "@/lib/library/presets-data";
import type { LibraryKind } from "@/lib/library/saved-items";
import {
  starterCommand,
  starterId,
  starterSourceHref,
  type Starter,
  type StarterFramework,
  type StarterIntegration,
  type StarterRuntime,
} from "@/lib/library/starters-data";
import { LIBRARY_UPDATED, formatLibraryDay } from "@/lib/library/updated-data";
import { cn } from "@/lib/utils";
import { FilterIcon } from "./filter-icons";
import { LibraryKindLabel } from "./library-kind";
import { PresetMenu } from "./preset-card";
import { StarterMenu } from "./starter-menu";

type Row = {
  key: string;
  name: string;
  kind: LibraryKind;
  framework: StarterFramework;
  runtime: StarterRuntime | undefined;
  integrations: readonly StarterIntegration[];
  /** Absent for a starter `create` does not offer. */
  command: string | undefined;
  /** Where to get it instead, shown in place of a command. */
  source: { label: string; href: string } | undefined;
  /** What stands in the Installable column when there is no command. */
  instead: string;
  /** The day its code last changed, as an ISO date. */
  updated: string | undefined;
  onOpen: () => void;
  menu: ReactNode;
};

const menuClass = "relative shrink-0";

const CLI = "npx assistant-ui@latest ";

/** A command without the start every row shares, so the part that differs fits its cell. */
const shortCommand = (command: string) =>
  command.startsWith(CLI) ? command.slice(CLI.length) : command;

const cell = "px-2.5 py-2 text-left align-middle text-[13px]";
const head = cn(cell, "text-muted-foreground py-2.5 text-xs font-normal");

function Stack({
  name,
}: {
  name: StarterFramework | StarterRuntime | StarterIntegration;
}) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      <FilterIcon name={name} />
      <span className="truncate">{name}</span>
    </span>
  );
}

/** Starters and presets as one table: what each is, what it runs on, and whether `create` installs it. */
export function StarterTable({
  entries,
  onStarter,
  onPreset,
}: {
  entries: readonly LibraryEntry[];
  /** Opens a starter's details. */
  onStarter: (starter: Starter) => void;
  /** Opens a preset's details. */
  onPreset: (preset: LibraryPreset) => void;
}) {
  const rows = entries.flatMap((entry): Row[] => {
    if (entry.kind === "starter") {
      const { starter } = entry;
      const onOpen = () => onStarter(starter);
      const source = starterSourceHref(starter);
      return [
        {
          key: starterId(starter),
          name: starter.label,
          kind: starter.kind,
          framework: starter.framework,
          runtime: starter.runtime,
          integrations: starter.integrations ?? [],
          command: starterCommand(starter),
          source: starter.hosted
            ? { label: "Preview", href: starter.hosted.preview }
            : source && starter.repoOnly
              ? { label: `examples/${starter.name}`, href: source }
              : undefined,
          instead: starter.hosted ? "Download" : "Repo only",
          updated: LIBRARY_UPDATED[starterId(starter)],
          onOpen,
          menu: (
            <StarterMenu
              starter={starter}
              onDetails={onOpen}
              tooltipSide="top"
              className={menuClass}
            />
          ),
        },
      ];
    }
    if (entry.kind === "preset") {
      const { preset } = entry;
      return [
        {
          key: presetId(preset),
          name: preset.name,
          kind: "preset",
          framework: PRESET_STACK.framework,
          runtime: PRESET_STACK.runtime,
          integrations: [],
          command: presetCommand(preset),
          source: undefined,
          instead: "",
          updated: LIBRARY_UPDATED[presetId(preset)],
          onOpen: () => onPreset(preset),
          menu: (
            <PresetMenu
              preset={preset}
              onSelect={onPreset}
              tooltipSide="top"
              className={menuClass}
            />
          ),
        },
      ];
    }
    return [];
  });

  return (
    <div className="border-foreground/10 overflow-x-auto rounded-(--library-thumb) border">
      <table className="w-full min-w-[72rem] table-fixed border-collapse">
        <colgroup>
          <col className="w-[10.5rem]" />
          <col className="w-[6.25rem]" />
          <col className="w-[8.25rem]" />
          <col className="w-[7.5rem]" />
          <col className="w-[8.75rem]" />
          <col className="w-[5.25rem]" />
          <col />
          <col className="w-[6.5rem]" />
          <col className="w-10" />
        </colgroup>
        <thead>
          <tr className="border-foreground/10 border-b">
            <th scope="col" className={head}>
              Name
            </th>
            <th scope="col" className={head}>
              Type
            </th>
            <th scope="col" className={head}>
              Framework
            </th>
            <th scope="col" className={head}>
              Runtime
            </th>
            <th scope="col" className={head}>
              Integrations
            </th>
            <th scope="col" className={head}>
              Installable
            </th>
            <th scope="col" className={head}>
              Command or source
            </th>
            <th scope="col" className={head}>
              Last updated
            </th>
            <th scope="col" className={head}>
              <span className="sr-only">Options</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-foreground/10 divide-y">
          {rows.map((row) => (
            <tr
              key={row.key}
              className="hover:bg-foreground/[0.025] dark:hover:bg-foreground/[0.04] transition-colors"
            >
              <th scope="row" className={cn(cell, "font-medium")}>
                <button
                  type="button"
                  aria-haspopup="dialog"
                  onClick={row.onOpen}
                  className="focus-visible:ring-ring max-w-full cursor-pointer rounded-sm text-left text-pretty underline-offset-4 outline-none hover:underline focus-visible:ring-2"
                >
                  {row.name}
                </button>
              </th>
              <td className={cell}>
                <LibraryKindLabel kind={row.kind} className="text-[13px]" />
              </td>
              <td className={cell}>
                <Stack name={row.framework} />
              </td>
              <td className={cell}>
                {row.runtime ? (
                  <Stack name={row.runtime} />
                ) : (
                  <span className="text-muted-foreground">None</span>
                )}
              </td>
              <td className={cell}>
                {row.integrations.length > 0 ? (
                  <span className="flex flex-col gap-1.5">
                    {row.integrations.map((name) => (
                      <Stack key={name} name={name} />
                    ))}
                  </span>
                ) : (
                  <span className="text-muted-foreground">None</span>
                )}
              </td>
              <td className={cell}>
                {row.command ? (
                  <span className="flex items-center gap-1.5">
                    <CheckIcon aria-hidden className="size-3.5 shrink-0" />
                    Yes
                  </span>
                ) : (
                  <span className="text-muted-foreground whitespace-nowrap">
                    {row.instead}
                  </span>
                )}
              </td>
              <td className={cell}>
                {row.command ? (
                  <code
                    title={row.command}
                    className="text-muted-foreground block truncate font-mono text-xs [font-variant-ligatures:none]"
                  >
                    {shortCommand(row.command)}
                  </code>
                ) : row.source ? (
                  <a
                    href={row.source.href}
                    target="_blank"
                    rel="noreferrer"
                    className="text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex max-w-full items-center gap-1 rounded-sm font-mono text-xs underline-offset-4 transition-colors outline-none [font-variant-ligatures:none] hover:underline focus-visible:ring-2"
                  >
                    <span className="truncate">{row.source.label}</span>
                    <ArrowUpRightIcon
                      aria-hidden
                      className="size-3.5 shrink-0"
                    />
                    <span className="sr-only">(opens in a new tab)</span>
                  </a>
                ) : null}
              </td>
              <td className={cn(cell, "whitespace-nowrap")}>
                {row.updated ? (
                  <time dateTime={row.updated}>
                    {formatLibraryDay(row.updated)}
                  </time>
                ) : (
                  <span className="text-muted-foreground">Unknown</span>
                )}
              </td>
              <td className={cn(cell, "px-1")}>{row.menu}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
