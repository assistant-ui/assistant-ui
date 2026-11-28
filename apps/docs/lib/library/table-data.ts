import {
  LIBRARY_AVAILABILITY,
  LIBRARY_PLATFORMS,
  libraryFact,
  totalNeeds,
  totalUsedBy,
  type LibraryFact,
} from "./facts";
import {
  LIBRARY_SECTIONS,
  entryKey,
  type LibraryEntry,
  type LibrarySection,
} from "./library-data";
import { presetCommand, presetId, presetPrompt } from "./presets-data";
import {
  LIBRARY_SECTION_KIND,
  blockSavedId,
  skillSavedId,
  type LibraryKind,
} from "./saved-items";
import { starterCommand, starterId, starterPrompt } from "./starters-data";

/** An entry with the tab and the group it is listed under. */
export type LibraryTableItem = {
  section: LibrarySection;
  group: string;
  entry: LibraryEntry;
};

/** What one row of the library's table says, as text. */
export type LibraryTableRecord = {
  key: string;
  /** Its id in the saved panel; absent for an item that cannot be saved. */
  savedId: string | undefined;
  /** The id its facts are kept under. */
  factId: string;
  fact: LibraryFact | undefined;
  name: string;
  kind: LibraryKind;
  /** What it is, by the tab it is listed under: a component, a starter, a runtime. */
  type: string;
  /** The kind whose color the type is drawn in, one for each tab. */
  tone: LibraryKind;
  /** Which of its type's groups it is in; empty for a type with one group. */
  group: string;
  description: string;
  /** The description is a path, so it is set in the code face. */
  code: boolean;
  command: string | undefined;
  /** How to get it when there is no command. */
  instead: string;
  /** What to tell a coding agent to add it. */
  prompt: string | undefined;
};

/** The id an entry's facts are kept under, which is its id in the saved panel. */
export const entryFactId = (entry: LibraryEntry): string => {
  switch (entry.kind) {
    case "starter":
      return starterId(entry.starter);
    case "preset":
      return presetId(entry.preset);
    case "skill":
      return skillSavedId(entry.skill.name);
    case "block":
      return blockSavedId(entry.block.slug);
    case "link":
      return entry.link.id ?? entry.link.href;
  }
};

type RecordText = Omit<
  LibraryTableRecord,
  "key" | "type" | "tone" | "group" | "fact" | "factId"
>;

const recordText = (
  section: LibrarySection,
  entry: LibraryEntry,
): RecordText => {
  switch (entry.kind) {
    case "starter":
      return {
        savedId: starterId(entry.starter),
        name: entry.starter.label,
        kind: entry.starter.kind,
        description: entry.starter.description,
        code: false,
        command: starterCommand(entry.starter),
        instead: entry.starter.hosted ? "Download" : "Repo only",
        prompt: starterPrompt(entry.starter),
      };
    case "preset":
      return {
        savedId: presetId(entry.preset),
        name: entry.preset.name,
        kind: "preset",
        description: entry.preset.description,
        code: false,
        command: presetCommand(entry.preset),
        instead: "",
        prompt: presetPrompt(entry.preset),
      };
    case "skill":
      return {
        savedId: skillSavedId(entry.skill.name),
        name: entry.skill.title,
        kind: "skill",
        description: entry.skill.summary,
        code: false,
        command: entry.skill.command,
        instead: "",
        prompt: entry.skill.prompt,
      };
    case "block":
      return {
        savedId: blockSavedId(entry.block.slug),
        name: entry.block.title,
        kind: "block",
        description: entry.block.description,
        code: false,
        command: undefined,
        instead: "Copy from its page",
        prompt: entry.block.prompt,
      };
    case "link": {
      const { link } = entry;
      return {
        savedId: link.id && link.prompt ? link.id : undefined,
        name: link.name,
        kind: LIBRARY_SECTION_KIND[section.id] ?? "component",
        // A row whose line is its own install command says it once, under Install.
        description: link.description === link.command ? "" : link.description,
        code: link.code ?? false,
        command: link.command,
        instead: "Follow its page",
        prompt: link.prompt,
      };
    }
  }
};

export const libraryTableRecord = ({
  section,
  group,
  entry,
}: LibraryTableItem): LibraryTableRecord => {
  const factId = entryFactId(entry);
  return {
    ...recordText(section, entry),
    key: `${section.id}:${entryKey(entry)}`,
    type: section.type,
    // Starters come in several kinds and skills in none of the tabs' own; each tab draws in one color.
    tone:
      LIBRARY_SECTION_KIND[section.id] ??
      (section.id === "starters" ? "template" : "skill"),
    group: section.groups.length > 1 ? group : "",
    factId,
    fact: libraryFact(factId),
  };
};

const ROWS = new Map<string, LibraryTableItem>(
  LIBRARY_SECTIONS.flatMap((section) =>
    section.groups.flatMap((group) =>
      group.entries.map(
        (entry) =>
          [entryFactId(entry), { section, group: group.label, entry }] as const,
      ),
    ),
  ),
);

/** The library item its facts are kept under `factId` for. */
export const libraryItem = (factId: string): LibraryTableItem | undefined =>
  ROWS.get(factId);

export type TableSortColumn =
  | "name"
  | "type"
  | "group"
  | "status"
  | "platform"
  | "needs"
  | "usedBy"
  | "updated";

export type TableSort = { column: TableSortColumn; dir: "asc" | "desc" };

const position = <T>(list: readonly T[], value: T | undefined) => {
  const index = value === undefined ? -1 : list.indexOf(value);
  return index === -1 ? list.length : index;
};

/** What a column sorts by: text in the alphabet's order, or a number. */
const SORT_VALUE: Record<
  TableSortColumn,
  (record: LibraryTableRecord) => string | number
> = {
  name: (record) => record.name,
  type: (record) => record.type,
  group: (record) => record.group,
  status: (record) => position(LIBRARY_AVAILABILITY, record.fact?.status),
  platform: (record) => position(LIBRARY_PLATFORMS, record.fact?.platforms[0]),
  needs: (record) => totalNeeds(record.factId),
  usedBy: (record) => totalUsedBy(record.factId),
  updated: (record) => record.fact?.updated ?? "",
};

/** `items` in the picked order; no sort keeps the order the library lists them in. */
export const sortTableItems = (
  items: readonly LibraryTableItem[],
  sort: TableSort | null,
): readonly LibraryTableItem[] => {
  if (!sort) return items;
  const value = SORT_VALUE[sort.column];
  const sign = sort.dir === "asc" ? 1 : -1;
  return items
    .map((item) => {
      const record = libraryTableRecord(item);
      return { item, name: record.name, value: value(record) };
    })
    .sort((a, b) => {
      const order =
        typeof a.value === "number" && typeof b.value === "number"
          ? a.value - b.value
          : String(a.value).localeCompare(String(b.value));
      return sign * order || a.name.localeCompare(b.name);
    })
    .map(({ item }) => item);
};

export const TABLE_EXPORTS = [
  { format: "csv", label: "CSV", type: "text/csv" },
  { format: "json", label: "JSON", type: "application/json" },
  { format: "md", label: "Markdown", type: "text/markdown" },
] as const;

export type TableExportFormat = (typeof TABLE_EXPORTS)[number]["format"];

const EXPORT_COLUMNS: readonly {
  label: string;
  value: (record: LibraryTableRecord) => string;
}[] = [
  { label: "Name", value: (record) => record.name },
  { label: "Type", value: (record) => record.type },
  { label: "Group", value: (record) => record.group },
  { label: "Status", value: (record) => record.fact?.status ?? "" },
  {
    label: "Platform",
    value: (record) => record.fact?.platforms.join(", ") ?? "",
  },
  { label: "What it is", value: (record) => record.description },
  { label: "Install", value: (record) => record.command ?? record.instead },
  { label: "Updated", value: (record) => record.fact?.updated ?? "" },
];

const csvCell = (text: string) =>
  /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;

const mdCell = (text: string) =>
  text.replaceAll("|", "\\|").replaceAll("\n", " ");

/** The rows as a file's text, one line or object per row. */
export const exportTableRecords = (
  format: TableExportFormat,
  records: readonly LibraryTableRecord[],
): string => {
  if (format === "json") {
    return JSON.stringify(
      records.map((record) =>
        Object.fromEntries(
          EXPORT_COLUMNS.map((column) => [column.label, column.value(record)]),
        ),
      ),
      null,
      2,
    );
  }
  const cell = format === "md" ? mdCell : csvCell;
  const rows = [
    EXPORT_COLUMNS.map((column) => column.label),
    ...records.map((record) =>
      EXPORT_COLUMNS.map((column) => column.value(record)),
    ),
  ].map((row) => row.map(cell));
  if (format === "csv") return rows.map((row) => row.join(",")).join("\n");
  const [head = [], ...body] = rows;
  return [head, head.map(() => "---"), ...body]
    .map((row) => `| ${row.join(" | ")} |`)
    .join("\n");
};
