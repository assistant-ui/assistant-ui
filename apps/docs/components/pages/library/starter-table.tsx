"use client";

import type { ReactNode } from "react";
import { ArrowUpRightIcon, CheckIcon } from "lucide-react";
import type { LibraryEntry } from "@/lib/library/library-data";
import {
  PRESET_STACK,
  presetCommand,
  presetId,
} from "@/lib/library/presets-data";
import type { LibraryKind } from "@/lib/library/saved-items";
import {
  starterCommand,
  starterId,
  starterSourceHref,
  type Starter,
  type StarterFramework,
  type StarterRuntime,
} from "@/lib/library/starters-data";
import { cn } from "@/lib/utils";
import { FilterIcon } from "./filter-icons";
import { LibraryCopyButton } from "./library-copy-button";
import type { LibraryDetails } from "./library-item-dialog";
import { LibraryKindLabel } from "./library-kind";
import { PresetMenu, presetDetails } from "./preset-card";
import { StarterMenu } from "./starter-menu";

type Row = {
  key: string;
  name: string;
  kind: LibraryKind;
  framework: StarterFramework;
  runtime: StarterRuntime | undefined;
  /** Absent for a starter `create` does not offer. */
  command: string | undefined;
  /** Where to get it instead, shown in place of a command. */
  source: { label: string; href: string } | undefined;
  /** What stands in the Installable column when there is no command. */
  instead: string;
  onOpen: () => void;
  menu: ReactNode;
};

const menuClass = "relative shrink-0";

const CLI = "npx assistant-ui@latest ";

/** A command without the start every row shares, so the part that differs fits its cell. */
const shortCommand = (command: string) =>
  command.startsWith(CLI) ? command.slice(CLI.length) : command;

const cell = "px-3 py-2 text-left align-middle text-[13px]";
const head = cn(cell, "text-muted-foreground py-2.5 text-xs font-normal");

function Stack({ name }: { name: StarterFramework | StarterRuntime }) {
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
  onDetails,
}: {
  entries: readonly LibraryEntry[];
  /** Opens a starter's details. */
  onStarter: (starter: Starter) => void;
  /** Opens a preset's details. */
  onDetails: (details: LibraryDetails) => void;
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
          command: starterCommand(starter),
          source: starter.hosted
            ? { label: "Preview", href: starter.hosted.preview }
            : source && starter.repoOnly
              ? { label: `examples/${starter.name}`, href: source }
              : undefined,
          instead: starter.hosted ? "Download" : "Repo only",
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
          command: presetCommand(preset),
          source: undefined,
          instead: "",
          onOpen: () => onDetails(presetDetails(preset)),
          menu: (
            <PresetMenu
              preset={preset}
              onDetails={onDetails}
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
      <table className="w-full min-w-[56rem] table-fixed border-collapse">
        <colgroup>
          <col className="w-[18%]" />
          <col className="w-[11%]" />
          <col className="w-[15%]" />
          <col className="w-[13%]" />
          <col className="w-[10%]" />
          <col />
          <col className="w-14" />
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
              Installable
            </th>
            <th scope="col" className={head}>
              Command or source
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
                  className="focus-visible:ring-ring block max-w-full cursor-pointer truncate rounded-sm text-left underline-offset-4 outline-none hover:underline focus-visible:ring-2"
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
                  <span className="flex min-w-0 items-center gap-1">
                    <code
                      title={row.command}
                      className="text-muted-foreground min-w-0 flex-1 truncate font-mono text-xs [font-variant-ligatures:none]"
                    >
                      {shortCommand(row.command)}
                    </code>
                    <LibraryCopyButton
                      text={row.command}
                      label={`Copy the install command for ${row.name}`}
                    />
                  </span>
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
              <td className={cn(cell, "px-2")}>{row.menu}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
