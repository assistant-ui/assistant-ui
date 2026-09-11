import { existsSync } from "node:fs";
import { createBashTool } from "bash-tool";
import { Bash, InMemoryFs, OverlayFs } from "just-bash";
import { repoSourceRoot } from "./repo-source";

const REPO_MOUNT = "/repo";
const MAX_OUTPUT_LENGTH = 15000;
const MAX_SANDBOX_WRITE_BYTES = 16 * 1024 * 1024;

type RepoToolkit = Awaited<ReturnType<typeof createBashTool>>;

/**
 * The mount is writable, so a shared sandbox would carry one visitor's edits
 * into the next request. Each caller gets its own copy-on-write overlay on the
 * deployed source tree, which costs its own writes rather than a second copy.
 */
export function createRepoSandbox(options: { toolPrompt?: string } = {}) {
  let toolkitPromise: Promise<RepoToolkit> | null = null;
  return () => (toolkitPromise ??= createRepoToolkit(options));
}

function createRepoToolkit({ toolPrompt }: { toolPrompt?: string }) {
  const root = repoSourceRoot();

  return createBashTool({
    sandbox: new Bash({ fs: createRepoFs(root), cwd: REPO_MOUNT }),
    destination: REPO_MOUNT,
    maxOutputLength: MAX_OUTPUT_LENGTH,
    ...(toolPrompt === undefined ? {} : { promptOptions: { toolPrompt } }),
  });
}

// The tree is missing only before generate:source-snapshot has run, so the empty
// mount keeps a local dev server usable and recovers as soon as it does run.
function createRepoFs(root: string) {
  if (existsSync(root)) {
    return new OverlayFs({
      root,
      mountPoint: REPO_MOUNT,
      maxMemoryBytes: MAX_SANDBOX_WRITE_BYTES,
    });
  }

  console.warn(
    `Missing repo source tree at ${root}; repo tools will be unavailable until generate:source-snapshot runs.`,
  );

  return new InMemoryFs({}, { maxTotalBytes: MAX_SANDBOX_WRITE_BYTES });
}
