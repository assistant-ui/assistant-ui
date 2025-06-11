import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

export const ROOT_DIR = join(__dirname, "../../../");
export const PACKAGE_DIR = join(__dirname, "../");

export const EXAMPLES_PATH = join(ROOT_DIR, "examples");

export const DOCS_BASE = join(PACKAGE_DIR, ".docs");
export const DOCS_PATH = join(DOCS_BASE, "raw/docs");
export const BLOG_PATH = join(DOCS_BASE, "raw/blog");
export const CODE_EXAMPLES_PATH = join(DOCS_BASE, "organized/code-examples");

export const MDX_EXTENSION = ".mdx";
export const MD_EXTENSION = ".md";

export const MAX_FILE_SIZE = 10 * 1024 * 1024;

export const IS_PREPARE_MODE = process.env.PREPARE === "true";
