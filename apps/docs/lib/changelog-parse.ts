export type ChangeType =
  | "breaking"
  | "feat"
  | "fix"
  | "perf"
  | "refactor"
  | "revert"
  | "docs"
  | "style"
  | "test"
  | "build"
  | "ci"
  | "chore"
  | "other";

export type ParsedBullet = {
  pr?: { number: string; url: string };
  hash?: { value: string; url: string };
  author?: { handle: string; url: string };
  type: ChangeType;
  scope?: string;
  description: string;
  body: string;
};

export type ParsedRelease = {
  preamble: string;
  bullets: ParsedBullet[];
};

const PR_RE = /\[#(\d+)\]\(([^)]+)\)/;
const HASH_RE_BACKTICK_LINKED = /\[`([a-f0-9]{6,40})`\]\(([^)]+)\)/;
const HASH_RE_BARE_LINKED = /\[([a-f0-9]{6,40})\]\(([^)]+)\)/;
const HASH_RE_BACKTICK = /`([a-f0-9]{6,40})`/;
const AUTHOR_RE = /\(?\[@([\w-]+)\]\(([^)]+)\)\)?/;
const TYPE_RE =
  /^\s*(feat|fix|chore|refactor|perf|docs|style|test|build|ci|revert)(?:\(([^)]+)\))?(!?):\s*/i;
const BREAKING_PREFIX_RE = /^breaking\s+changes?\s*[:-]\s*/i;

function removeMatch(line: string, match: RegExpMatchArray): string {
  const start = match.index ?? 0;
  return line.slice(0, start) + line.slice(start + match[0].length);
}

export function parseRelease(markdown: string): ParsedRelease {
  const cleaned = markdown
    .replace(/^#{1,6}\s+(Patch|Minor|Major)\s+Changes\s*$/gim, "")
    .replace(/^-\s+Updated dependencies[\s\S]*?(?=\n-\s|\n\n|$)/gm, "")
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  const lines = cleaned.split("\n");
  const preambleLines: string[] = [];
  type Chunk = { firstLine: string; bodyLines: string[] };
  const chunks: Chunk[] = [];
  let current: Chunk | null = null;

  for (const rawLine of lines) {
    const isTopBullet = /^-\s+/.test(rawLine);
    if (isTopBullet) {
      if (current) chunks.push(current);
      current = {
        firstLine: rawLine.replace(/^-\s+/, ""),
        bodyLines: [],
      };
    } else if (current) {
      current.bodyLines.push(rawLine.replace(/^ {1,4}/, ""));
    } else if (rawLine.trim().length > 0) {
      preambleLines.push(rawLine);
    }
  }
  if (current) chunks.push(current);

  const bullets: ParsedBullet[] = chunks.map((chunk) => {
    let line = chunk.firstLine;

    let pr: { number: string; url: string } | null = null;
    {
      const m = line.match(PR_RE);
      if (m) {
        pr = { number: m[1]!, url: m[2]! };
        line = removeMatch(line, m);
      }
    }

    let hash: { value: string; url: string } | null = null;
    {
      let m = line.match(HASH_RE_BACKTICK_LINKED);
      if (m) {
        hash = { value: m[1]!.slice(0, 7), url: m[2]! };
        line = removeMatch(line, m);
      } else {
        m = line.match(HASH_RE_BARE_LINKED);
        if (m) {
          hash = { value: m[1]!.slice(0, 7), url: m[2]! };
          line = removeMatch(line, m);
        } else {
          m = line.match(HASH_RE_BACKTICK);
          if (m) {
            hash = {
              value: m[1]!.slice(0, 7),
              url: `https://github.com/assistant-ui/assistant-ui/commit/${m[1]!}`,
            };
            line = removeMatch(line, m);
          }
        }
      }
    }

    let author: { handle: string; url: string } | null = null;
    {
      const m = line.match(AUTHOR_RE);
      if (m) {
        author = { handle: m[1]!, url: m[2]! };
        line = removeMatch(line, m);
      }
    }

    line = line
      .replace(/Thanks\s*!?/i, "")
      .replace(/\(\s*\)/g, "")
      .replace(/^\s*[-:]+\s*/, "")
      .replace(/\s+/g, " ")
      .trim();

    let type: ChangeType = "other";
    let scope: string | null = null;
    let breaking = false;

    const tm = line.match(TYPE_RE);
    if (tm) {
      type = tm[1]!.toLowerCase() as ChangeType;
      scope = tm[2] ?? null;
      breaking = !!tm[3];
      line = line.replace(TYPE_RE, "");
    }

    if (BREAKING_PREFIX_RE.test(line)) {
      breaking = true;
      line = line.replace(BREAKING_PREFIX_RE, "");
    }

    if (breaking) type = "breaking";

    return {
      ...(pr ? { pr } : {}),
      ...(hash ? { hash } : {}),
      ...(author ? { author } : {}),
      type,
      ...(scope ? { scope } : {}),
      description: line.trim(),
      body: chunk.bodyLines.join("\n").trim(),
    };
  });

  return {
    preamble: preambleLines.join("\n").trim(),
    bullets,
  };
}

export const TYPE_LABELS: Record<ChangeType, string> = {
  breaking: "Breaking changes",
  feat: "Features",
  fix: "Fixes",
  perf: "Performance",
  refactor: "Refactors",
  revert: "Reverts",
  docs: "Docs",
  style: "Styles",
  test: "Tests",
  build: "Build",
  ci: "CI",
  chore: "Chores",
  other: "Other",
};

const TYPE_PRIORITY: Record<ChangeType, number> = {
  breaking: 0,
  feat: 1,
  fix: 2,
  perf: 3,
  refactor: 4,
  revert: 5,
  docs: 6,
  style: 7,
  test: 8,
  build: 9,
  ci: 10,
  chore: 11,
  other: 12,
};

export function groupByType(
  bullets: ParsedBullet[],
): { type: ChangeType; items: ParsedBullet[] }[] {
  const map = new Map<ChangeType, ParsedBullet[]>();
  for (const b of bullets) {
    const list = map.get(b.type) ?? [];
    list.push(b);
    map.set(b.type, list);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => TYPE_PRIORITY[a] - TYPE_PRIORITY[b])
    .map(([type, items]) => ({ type, items }));
}
