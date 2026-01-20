import "dotenv/config";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import fg from "fast-glob";
import {
  deleteDocs,
  fetchAllDocMeta,
  upsertDoc,
  type DocMetadata,
} from "@/lib/vector";

const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 200;
const DOCS_DIR = path.join(import.meta.dirname, "../content/docs");

type DocPage = {
  url: string;
  title: string;
  content: string;
};

function hashContent(content: string): string {
  return createHash("md5").update(content).digest("hex");
}

function chunkText(text: string): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + CHUNK_SIZE, text.length);
    chunks.push(text.slice(start, end));
    start += CHUNK_SIZE - CHUNK_OVERLAP;
    if (end === text.length) break;
  }
  return chunks;
}

type Frontmatter = { title: string; body: string };

function parseFrontmatter(content: string): Frontmatter {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { title: "", body: content };

  const frontmatter = match[1]!;
  const body = match[2]!;
  const titleMatch = frontmatter.match(/^title:\s*["']?(.+?)["']?\s*$/m);

  return { title: titleMatch?.[1] ?? "", body };
}

function filePathToUrl(filePath: string): string {
  return (
    filePath
      .replace(DOCS_DIR, "/docs")
      .replace(/\.mdx$/, "")
      .replace(/\/index$/, "")
      .replace(/\/\([^)]+\)/g, "") || "/docs"
  );
}

async function loadPages(): Promise<DocPage[]> {
  const files = await fg("**/*.mdx", { cwd: DOCS_DIR, absolute: true });

  return Promise.all(
    files.map(async (file) => {
      const content = await fs.readFile(file, "utf-8");
      const { title, body } = parseFrontmatter(content);
      const url = filePathToUrl(file);

      return {
        url,
        title,
        content: `# ${title}\nURL: ${url}\n\n${body}`,
      };
    }),
  );
}

async function syncPage(
  page: DocPage,
  existingMeta: Map<string, string>,
  seenIds: Set<string>,
): Promise<{ upserted: number; skipped: number }> {
  const contentHash = hashContent(page.content);
  const chunks = chunkText(page.content);
  let upserted = 0;
  let skipped = 0;

  for (let i = 0; i < chunks.length; i++) {
    const id = `${page.url}#chunk-${i}`;
    seenIds.add(id);

    if (existingMeta.get(id) === contentHash) {
      skipped++;
      continue;
    }

    const chunkContent = chunks[i]!;
    const metadata: DocMetadata = {
      url: page.url,
      title: page.title,
      content: chunkContent,
      contentHash,
      chunkIndex: i,
    };

    await upsertDoc(id, chunkContent, metadata);
    upserted++;
    console.log(`Upserted: ${id}`);
  }

  return { upserted, skipped };
}

async function main(): Promise<void> {
  console.log("Fetching existing vectors...");
  const existingMeta = await fetchAllDocMeta();
  console.log(`Found ${existingMeta.size} existing chunks`);

  console.log("Loading docs from filesystem...");
  const pages = await loadPages();
  console.log(`Found ${pages.length} docs`);

  const seenIds = new Set<string>();
  let totalUpserted = 0;
  let totalSkipped = 0;

  for (const page of pages) {
    const { upserted, skipped } = await syncPage(page, existingMeta, seenIds);
    totalUpserted += upserted;
    totalSkipped += skipped;

    if (skipped > 0 && upserted === 0) {
      console.log(`Skipped: ${page.url} (${skipped} chunks unchanged)`);
    } else if (upserted > 0) {
      console.log(
        `Updated: ${page.url} (${upserted} upserted, ${skipped} skipped)`,
      );
    }
  }

  const toDelete = [...existingMeta.keys()].filter((id) => !seenIds.has(id));
  if (toDelete.length > 0) {
    await deleteDocs(toDelete);
    console.log(`Deleted ${toDelete.length} stale chunks`);
  }

  console.log(
    `\nSync complete! Upserted: ${totalUpserted}, Skipped: ${totalSkipped}, Deleted: ${toDelete.length}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
