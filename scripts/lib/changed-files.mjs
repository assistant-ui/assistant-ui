import { spawnSync } from "node:child_process";

export function changedFilesSince(
  base,
  cwd = process.cwd(),
  env = process.env,
) {
  const result = spawnSync(
    "git",
    ["diff", "--name-only", "--no-renames", "-z", base],
    { cwd, encoding: "utf8", env },
  );
  if (result.status !== 0) {
    throw new Error(
      `Unable to determine changed files since ${base}:\n${result.stdout}${result.stderr}`,
    );
  }
  return result.stdout.split("\0").filter((file) => file !== "");
}
