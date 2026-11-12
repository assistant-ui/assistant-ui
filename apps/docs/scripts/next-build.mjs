// Runs `next build` in two processes: `compile` bundles the app, then
// `generate` prerenders it. Turbopack holds its compile state until its
// process exits, so one `next build` stacks the prerender workers on top of it.
//
// A deployment adapter (Vercel sets NEXT_ADAPTER_PATH) runs at the end of
// every `next build`, and in `compile` mode the prerender output it reads
// does not exist yet, so only the `generate` step gets the adapter.
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";

const nextBin = createRequire(import.meta.url).resolve("next/dist/bin/next");

function nextBuild(mode, env) {
  const { status, signal, error } = spawnSync(
    process.execPath,
    [nextBin, "build", `--experimental-build-mode=${mode}`],
    { stdio: "inherit", env },
  );
  if (error) throw error;
  if (signal) process.kill(process.pid, signal);
  if (status !== 0) process.exit(status ?? 1);
}

const { NEXT_ADAPTER_PATH: _adapter, ...compileEnv } = process.env;
nextBuild("compile", compileEnv);
nextBuild("generate", process.env);
