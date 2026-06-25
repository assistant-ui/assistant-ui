import {
  McpServer,
  ResourceTemplate,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import { join } from "node:path";
import { DOCS_PATH, MDX_EXTENSION } from "../constants.js";
import { getAvailableDocFiles } from "../utils/paths.js";
import { readMDXFileSafe, formatMDXContent } from "../utils/mdx.js";
import { sanitizePath } from "../utils/security.js";
import { listCodeExamples, readCodeExample } from "./examples.js";
import { logger } from "../utils/logger.js";

const MARKDOWN_MIME_TYPE = "text/markdown";
const DOCS_SCHEME = "aui-docs";
const EXAMPLE_SCHEME = "aui-example";

function templateVarToPath(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value.join("/");
  return value ?? "";
}

interface MarkdownResourceConfig {
  name: string;
  scheme: string;
  variable: string;
  title: string;
  description: string;
  notFoundLabel: string;
  list: () => Promise<string[]>;
  read: (key: string) => Promise<string | null>;
}

function registerMarkdownResource(
  server: McpServer,
  config: MarkdownResourceConfig,
): void {
  const {
    name,
    scheme,
    variable,
    title,
    description,
    notFoundLabel,
    list,
    read,
  } = config;
  server.registerResource(
    name,
    new ResourceTemplate(`${scheme}:///{+${variable}}`, {
      list: async () => ({
        resources: (await list()).map((key) => ({
          uri: `${scheme}:///${key}`,
          name: key,
          mimeType: MARKDOWN_MIME_TYPE,
        })),
      }),
    }),
    { title, description, mimeType: MARKDOWN_MIME_TYPE },
    async (uri, variables) => {
      const key = templateVarToPath(variables[variable]);
      const text = await read(key);
      if (text === null) {
        throw new Error(`${notFoundLabel} not found: ${key}`);
      }
      return {
        contents: [{ uri: uri.href, mimeType: MARKDOWN_MIME_TYPE, text }],
      };
    },
  );
}

async function readDocResource(path: string): Promise<string | null> {
  const sanitized = sanitizePath(path);
  const mdx = await readMDXFileSafe(
    join(DOCS_PATH, `${sanitized}${MDX_EXTENSION}`),
  );
  return mdx ? formatMDXContent(mdx) : null;
}

export function registerResources(server: McpServer): void {
  registerMarkdownResource(server, {
    name: "assistant-ui-docs",
    scheme: DOCS_SCHEME,
    variable: "path",
    title: "assistant-ui Documentation",
    description:
      "Individual assistant-ui documentation pages, readable as markdown by path.",
    notFoundLabel: "Documentation",
    list: getAvailableDocFiles,
    read: readDocResource,
  });

  registerMarkdownResource(server, {
    name: "assistant-ui-examples",
    scheme: EXAMPLE_SCHEME,
    variable: "name",
    title: "assistant-ui Examples",
    description:
      "Complete assistant-ui example projects, readable as markdown.",
    notFoundLabel: "Example",
    list: listCodeExamples,
    read: readCodeExample,
  });

  logger.debug("Registered docs and examples resources");
}
