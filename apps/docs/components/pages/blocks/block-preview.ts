import { spawn } from "node:child_process";
import path from "node:path";

const globals = globalThis as { __blockPreviews?: Set<string> };
const started = (globals.__blockPreviews ??= new Set());

// The docs server's own Next.js settings would redirect the block's server.
const INHERITED = /^(?:__NEXT|NEXT_|TURBOPACK|PORT$|NODE_OPTIONS$)/;

/** Starts a block's own dev server once per docs dev server. */
export function startBlockPreview(directory: string, port: number) {
  if (started.has(directory)) return;
  started.add(directory);

  const cwd = path.join(
    /* turbopackIgnore: true */ process.cwd(),
    "..",
    "..",
    directory,
  );
  const env = { ...process.env };
  for (const key of Object.keys(env)) {
    if (INHERITED.test(key)) delete env[key];
  }
  const child = spawn(
    path.join(cwd, "node_modules", ".bin", "next"),
    ["dev", "--port", String(port)],
    {
      cwd,
      env,
      stdio: "ignore",
    },
  );
  child.on("error", () => started.delete(directory));
  process.once("exit", () => child.kill());
}
