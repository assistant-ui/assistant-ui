import { promises as fs, readFileSync } from "node:fs";
import * as path from "node:path";
import { registry } from "../src/registry";
import { RegistryItem } from "@/src/schema";
import threadStyles from "../../../packages/styles/dist/styles/tailwindcss/thread.css.json";
import modalStyles from "../../../packages/styles/dist/styles/tailwindcss/modal.css.json";
import markdownStyles from "../../../packages/styles/dist/styles/tailwindcss/markdown.css.json";

const REGISTRY_PATH = path.join(process.cwd(), "dist");

const tailwindStyles = Object.entries({
  ".aui-root": {},
  ...threadStyles,
  ...modalStyles,
  ...markdownStyles,
}).map(([key, value]) => {
  return {
    key: key.replace(/^\./, ""),
    value: Object.keys(value)
      .map((key) =>
        key
          .replace(/^\@apply /, "")
          .replaceAll("-aui-", "-")
          .replaceAll("max-w-thread", "max-w-aui-thread"),
      )
      .filter((k) => k)
      .join(" "),
  };
});

const transformClassnames = (content: string) => {
  for (const style of tailwindStyles) {
    if (style.key.startsWith(":where")) continue;

    content = content.replaceAll(
      new RegExp(`("| )${style.key}("| )`, "g"),
      `$1${style.value}$2`,
    );
  }

  return content.replaceAll(/className=" /g, `className="`);
};

async function buildRegistry(registry: RegistryItem[]) {
  await fs.mkdir(REGISTRY_PATH, { recursive: true });

  for (const item of registry) {
    const files = item.files?.map((file) => {
      const content = readFileSync(path.join(process.cwd(), file.path), "utf8");
      const transformedContent = transformClassnames(content);

      // in debug mode, write the transformed content to a file
      const debugPath = path.join(
        process.cwd(),
        "dist/debug",
        `${item.name}-${file.path}`,
      );
      fs.mkdir(path.dirname(debugPath), { recursive: true }).then(() => {
        fs.writeFile(debugPath, transformedContent, "utf8");
      });

      return {
        content: transformedContent,
        ...file,
      };
    });

    const payload = {
      $schema: "https://ui.shadcn.com/schema/registry-item.json",
      ...item,
      files,
    };

    const p = path.join(REGISTRY_PATH, `${item.name}.json`);
    await fs.mkdir(path.dirname(p), { recursive: true });

    await fs.writeFile(p, JSON.stringify(payload, null, 2), "utf8");
  }
}

await buildRegistry(registry);
