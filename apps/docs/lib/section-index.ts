import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";

const DOCS_CONTENT = fileURLToPath(new URL("../content/docs", import.meta.url));

/**
 * Sections whose index page lists every page of the section, generated from
 * the section's meta.json files and each page's frontmatter between the two
 * markers. Run `pnpm generate:section-indexes` after changing their nav.
 */
export const GENERATED_SECTION_INDEXES = [
  "vue",
  "react-native",
  "ink",
  "cloud",
] as const;

export const SECTION_INDEX_START =
  "{/* section-index:start. Generated from meta.json and each page's title and description by `pnpm generate:section-indexes`; edit those, not this list. */}";
export const SECTION_INDEX_END = "{/* section-index:end */}";

type Meta = { title?: string; pages?: string[] };

export type SectionIndexPage = {
  title: string;
  description: string;
  href: string;
};

export type SectionIndexGroup = {
  title: string | null;
  pages: SectionIndexPage[];
};

const readMeta = (dir: string): Meta => {
  const file = path.join(dir, "meta.json");
  return existsSync(file)
    ? (JSON.parse(readFileSync(file, "utf8")) as Meta)
    : {};
};

const isDirectory = (file: string) =>
  existsSync(file) && statSync(file).isDirectory();

// The url segment a folder adds: group folders such as "(auth)" add none.
const segment = (name: string) => (/^\(.*\)$/.test(name) ? [] : [name]);

const href = (segments: readonly string[]) => ["/docs", ...segments].join("/");

// A folder without a meta.json lists its pages by name, as the nav does.
const entriesOf = (dir: string): string[] =>
  readMeta(dir).pages ??
  readdirSync(dir)
    .filter(
      (name) => name.endsWith(".mdx") || isDirectory(path.join(dir, name)),
    )
    .map((name) => name.replace(/\.mdx$/, ""))
    .sort();

const readPage = (file: string, url: string): SectionIndexPage => {
  const { title, description } = matter(readFileSync(file, "utf8")).data as {
    title?: unknown;
    description?: unknown;
  };
  if (typeof title !== "string") {
    throw new Error(`${file} has no title for its section index card.`);
  }
  return {
    title,
    description: typeof description === "string" ? description.trim() : "",
    href: url,
  };
};

// A folder's own page first, then its pages in nav order, nested folders
// flattened in place.
const folderPages = (
  dir: string,
  segments: readonly string[],
): SectionIndexPage[] => {
  const pages: SectionIndexPage[] = [];
  const index = path.join(dir, "index.mdx");
  if (existsSync(index)) pages.push(readPage(index, href(segments)));
  pages.push(...childPages(dir, segments));
  return pages;
};

const childPages = (
  dir: string,
  segments: readonly string[],
): SectionIndexPage[] =>
  entriesOf(dir).flatMap((entry) => {
    if (entry.startsWith("---") || entry.startsWith("[") || entry === "...") {
      return [];
    }
    const name = entry.startsWith("...") ? entry.slice(3) : entry;
    const child = path.join(dir, name);
    if (isDirectory(child)) {
      return folderPages(child, [...segments, ...segment(name)]);
    }
    if (name === "index") return [];
    return [readPage(`${child}.mdx`, href([...segments, name]))];
  });

/**
 * A section's pages in the order its sidebar shows them, grouped the way the
 * sidebar groups them: by `---Separator---` entries and by top-level folders.
 */
export function sectionIndexGroups(
  section: string,
  docsDir: string = DOCS_CONTENT,
): SectionIndexGroup[] {
  const dir = path.join(docsDir, section);
  const segments = section.split("/").flatMap(segment);
  const groups: SectionIndexGroup[] = [{ title: null, pages: [] }];
  const current = () => groups[groups.length - 1]!;

  for (const entry of entriesOf(dir)) {
    if (entry === "..." || entry.startsWith("[")) continue;
    const separator = /^---(?:\[[^\]]*\])?(.*)---$/.exec(entry);
    if (separator) {
      groups.push({ title: separator[1]!.trim() || null, pages: [] });
      continue;
    }
    const inline = entry.startsWith("...");
    const name = inline ? entry.slice(3) : entry;
    const child = path.join(dir, name);
    if (!isDirectory(child)) {
      if (name !== "index") {
        current().pages.push(
          readPage(`${child}.mdx`, href([...segments, name])),
        );
      }
      continue;
    }
    const pages = folderPages(child, [...segments, ...segment(name)]);
    if (inline) {
      current().pages.push(...pages);
    } else {
      groups.push({ title: readMeta(child).title ?? name, pages });
      groups.push({ title: null, pages: [] });
    }
  }
  return groups.filter((group) => group.pages.length > 0);
}

const attribute = (value: string) =>
  /["&{}<>]/.test(value) ? `{${JSON.stringify(value)}}` : `"${value}"`;

// Descriptions render as inline markdown, so backticks still mark code.
const inline = (text: string) => text.replace(/[{}<>]/g, (c) => `\\${c}`);

const card = ({ title, description, href: url }: SectionIndexPage) =>
  description
    ? `  <Card title=${attribute(title)} href="${url}">${inline(description)}</Card>`
    : `  <Card title=${attribute(title)} href="${url}" />`;

/** The generated list, markers included, for one section's index page. */
export function renderSectionIndex(groups: readonly SectionIndexGroup[]) {
  const lines = [SECTION_INDEX_START, ""];
  for (const group of groups) {
    if (group.title) lines.push(`### ${group.title}`, "");
    lines.push("<Cards>", ...group.pages.map(card), "</Cards>", "");
  }
  lines.push(SECTION_INDEX_END);
  return lines.join("\n");
}

/**
 * The index page with its generated list rewritten. The hand-written text
 * around the markers stays as it is.
 */
export function syncSectionIndex(
  source: string,
  groups: readonly SectionIndexGroup[],
): string {
  const start = source.indexOf(SECTION_INDEX_START);
  const end = source.indexOf(SECTION_INDEX_END);
  if (start === -1 || end < start) {
    throw new Error(
      `The index page needs the lines ${SECTION_INDEX_START} and ${SECTION_INDEX_END} where its generated list goes.`,
    );
  }
  return (
    source.slice(0, start) +
    renderSectionIndex(groups) +
    source.slice(end + SECTION_INDEX_END.length)
  );
}

export const sectionIndexFile = (
  section: string,
  docsDir: string = DOCS_CONTENT,
) => path.join(docsDir, section, "index.mdx");
