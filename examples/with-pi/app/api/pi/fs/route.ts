import { readdir } from "node:fs/promises";
import { homedir } from "node:os";
import { resolve, dirname, join } from "node:path";
import { fail } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export type FsEntry = { name: string; path: string };
export type FsListing = {
  path: string;
  parent: string | null;
  entries: FsEntry[];
};

const expand = (p: string): string =>
  p.startsWith("~") ? join(homedir(), p.slice(1)) : p;

export async function GET(request: Request) {
  // This lists arbitrary host directories for the local workspace picker —
  // never expose it from a deployed instance.
  if (process.env.NODE_ENV === "production") {
    return new Response(null, { status: 404 });
  }
  try {
    const raw = new URL(request.url).searchParams.get("path");
    const dir = resolve(raw ? expand(raw) : homedir());
    const dirents = await readdir(dir, { withFileTypes: true });
    const entries = dirents
      .filter((dirent) => dirent.isDirectory() && !dirent.name.startsWith("."))
      .map((dirent) => ({ name: dirent.name, path: join(dir, dirent.name) }))
      .sort((a, b) => a.name.localeCompare(b.name));
    const parent = dirname(dir);
    return Response.json({
      path: dir,
      parent: parent === dir ? null : parent,
      entries,
    } satisfies FsListing);
  } catch (error) {
    return fail(error);
  }
}
