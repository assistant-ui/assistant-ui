import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export function prepareCiBase(baseRef, cwd = process.cwd()) {
  const git = (...args) => spawnSync("git", args, { cwd, encoding: "utf8" });
  const checked = (...args) => {
    const result = git(...args);
    if (result.status !== 0) {
      throw new Error(result.stderr || result.error?.message || "git failed");
    }
    return result.stdout.trim();
  };

  checked("check-ref-format", `refs/heads/${baseRef}`);
  if (checked("rev-parse", "--is-shallow-repository") === "false") return;

  const base = `refs/remotes/origin/${baseRef}`;
  const fetched = git(
    "fetch",
    "--no-tags",
    "--depth=2",
    "origin",
    `+refs/heads/${baseRef}:${base}`,
  );
  if (
    fetched.status === 0 &&
    git("merge-base", "--is-ancestor", base, "HEAD").status === 0
  ) {
    return;
  }

  console.warn("Restoring full history to resolve the CI comparison base.");
  checked(
    "fetch",
    "--no-tags",
    "--unshallow",
    "origin",
    "+refs/heads/*:refs/remotes/origin/*",
    "+refs/tags/*:refs/tags/*",
  );
  checked("merge-base", "HEAD", base);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  prepareCiBase(process.env.GITHUB_BASE_REF);
}
