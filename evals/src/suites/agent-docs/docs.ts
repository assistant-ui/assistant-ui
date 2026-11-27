import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const SITE = "https://www.assistant-ui.com";

/**
 * Saves the AI docs an agent would read, from `base` (the live site, or a
 * local `next dev` of apps/docs): `llms.txt` and every page it links as
 * markdown, plus the agent skills it points to. Links in the saved
 * `llms.txt` are rewritten to the saved files, so an agent can follow them
 * with plain file reads. Returns the number of pages saved.
 */
export async function snapshotDocs(base: string, dir: string) {
  const root = base.replace(/\/$/, "");
  const get = async (url: string) => {
    const parsed = new URL(url);
    const target =
      parsed.origin === SITE ? root + parsed.pathname + parsed.search : url;
    for (let attempt = 0; ; attempt++) {
      try {
        const res = await fetch(target, {
          headers: { accept: "text/markdown, text/plain, */*" },
          signal: AbortSignal.timeout(120_000),
        });
        if (!res.ok) throw new Error(`${res.status} ${target}`);
        return await res.text();
      } catch (error) {
        if (attempt >= 2) throw error;
      }
    }
  };
  const localPath = (url: string) => {
    const path = new URL(url).pathname;
    return path === "/" || path === "" ? "/index.md" : path;
  };

  const index = await get(`${SITE}/llms.txt`);
  const linked = new Set<string>();
  for (const [, url] of index.matchAll(
    /\]\((https:\/\/www\.assistant-ui\.com\/[^)\s]+)\)/g,
  )) {
    if (/\.(md|mdx|txt|json)$/.test(url!) && !url!.endsWith("/llms-full.txt")) {
      linked.add(url!);
    }
  }

  const skillsIndex = `${SITE}/.well-known/agent-skills/index.json`;
  if (linked.has(skillsIndex)) {
    try {
      const skills = JSON.parse(await get(skillsIndex)) as {
        skills?: { url?: string }[];
      };
      for (const skill of skills.skills ?? []) {
        if (
          skill.url &&
          URL.canParse(skill.url) &&
          new URL(skill.url).origin === SITE
        ) {
          linked.add(skill.url);
        }
      }
    } catch {
      // The index is optional; the pages still count.
    }
  }

  const urls = [...linked];
  let saved = 0;
  const failed: string[] = [];
  let next = 0;
  const worker = async () => {
    while (next < urls.length) {
      const url = urls[next++]!;
      try {
        const body = await get(url);
        const file = join(dir, localPath(url));
        mkdirSync(dirname(file), { recursive: true });
        writeFileSync(file, body);
        saved++;
      } catch {
        failed.push(url);
      }
    }
  };
  await Promise.all(Array.from({ length: 8 }, worker));

  const rewritten = index.replace(
    /\]\((https:\/\/www\.assistant-ui\.com\/[^)\s]+)\)/g,
    (match, url: string) =>
      linked.has(url) && !failed.includes(url)
        ? `](.${localPath(url)})`
        : match,
  );
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "llms.txt"), rewritten);
  writeFileSync(
    join(dir, "SNAPSHOT.json"),
    `${JSON.stringify({ base: root, at: new Date().toISOString(), saved, failed }, null, 2)}\n`,
  );
  return { saved, failed };
}

const snapshots = new Map<string, Promise<string>>();

/**
 * Takes the snapshot once per base URL and run, and shares it between the
 * run's trials, including ones running at the same time. A snapshot with
 * missing pages is refused: an agent can't fetch them, so its trial would be
 * scored against docs the site doesn't have.
 */
export function docsFor(base: string, cacheDir: string) {
  const key = base.replace(/^https?:\/\//, "").replace(/[^a-z0-9.-]+/gi, "_");
  const dir = join(cacheDir, key);
  let pending = snapshots.get(dir);
  if (!pending) {
    pending = (async () => {
      const marker = join(dir, "SNAPSHOT.json");
      if (!existsSync(marker)) await snapshotDocs(base, dir);
      const info = JSON.parse(readFileSync(marker, "utf8")) as {
        saved: number;
        failed: string[];
      };
      if (info.failed.length > 0 || info.saved < 50) {
        throw new Error(
          `The docs snapshot in ${dir} is incomplete: ${info.saved} pages saved, ${info.failed.length} failed (${info.failed.slice(0, 3).join(", ")}).`,
        );
      }
      return dir;
    })();
    snapshots.set(dir, pending);
  }
  return pending;
}
