import { existsSync } from "node:fs";
import { createBashTool } from "bash-tool";
import { Bash, OverlayFs } from "just-bash";
import { repoSourceRoot } from "./repo-source";

const REPO_MOUNT = "/repo";
const MAX_OUTPUT_LENGTH = 15000;
const MAX_SANDBOX_WRITE_BYTES = 16 * 1024 * 1024;

type RepoToolkit = Awaited<ReturnType<typeof createBashTool>>;

let sourceRoot: string | null | undefined;

function resolveSourceRoot() {
  if (sourceRoot !== undefined) return sourceRoot;

  const root = repoSourceRoot();
  sourceRoot = existsSync(root) ? root : null;

  if (sourceRoot === null) {
    console.warn(
      `Missing repo source tree at ${root}; repo tools will be unavailable until generate:source-snapshot runs.`,
    );
  }

  return sourceRoot;
}

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
  const promptOptions =
    toolPrompt === undefined ? {} : { promptOptions: { toolPrompt } };
  const root = resolveSourceRoot();

  if (root === null) {
    return createBashTool({
      files: {},
      destination: REPO_MOUNT,
      maxOutputLength: MAX_OUTPUT_LENGTH,
      ...promptOptions,
    });
  }

  return createBashTool({
    sandbox: new Bash({
      fs: new OverlayFs({
        root,
        mountPoint: REPO_MOUNT,
        maxMemoryBytes: MAX_SANDBOX_WRITE_BYTES,
      }),
      cwd: REPO_MOUNT,
    }),
    destination: REPO_MOUNT,
    maxOutputLength: MAX_OUTPUT_LENGTH,
    ...promptOptions,
  });
}
