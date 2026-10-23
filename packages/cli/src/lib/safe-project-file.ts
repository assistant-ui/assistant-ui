import fs from "node:fs";
import path from "node:path";

export const assertSafeProjectFile = (file: string, projectRoot: string) => {
  try {
    if (fs.lstatSync(file).isSymbolicLink()) {
      throw new Error(`${file} is a symbolic link`);
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }

  const root = fs.realpathSync(projectRoot);
  let parent = path.dirname(file);
  const missing: string[] = [];
  while (!fs.existsSync(parent)) {
    const next = path.dirname(parent);
    if (next === parent) break;
    missing.unshift(path.basename(parent));
    parent = next;
  }
  const resolvedParent = path.join(fs.realpathSync(parent), ...missing);
  const relative = path.relative(root, resolvedParent);
  if (
    relative === ".." ||
    relative.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relative)
  ) {
    throw new Error(`${file} has a parent directory outside the project`);
  }
};
