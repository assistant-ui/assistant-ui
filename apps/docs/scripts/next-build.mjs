// Runs `next build` in two processes: `compile` bundles the app, then
// `generate` prerenders it. Turbopack holds its compile state until its
// process exits, so one `next build` stacks the prerender workers on top of it.
//
// A deploy adapter (Vercel sets NEXT_ADAPTER_PATH) runs onBuildComplete at the
// end of every `next build`, and after `compile` the prerendered output it
// reads does not exist yet. The compile step gets scripts/compile-adapter.mjs
// instead, which applies the adapter's config changes and skips the rest.
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

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

const adapterPath = process.env.NEXT_ADAPTER_PATH;
nextBuild(
  "compile",
  adapterPath
    ? {
        ...process.env,
        NEXT_ADAPTER_PATH: fileURLToPath(
          new URL("./compile-adapter.mjs", import.meta.url),
        ),
        DOCS_DEPLOY_ADAPTER_PATH: adapterPath,
      }
    : process.env,
);
nextBuild("generate", process.env);
