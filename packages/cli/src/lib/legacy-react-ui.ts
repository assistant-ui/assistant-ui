import jscodeshift from "jscodeshift";
import { readFileSync } from "node:fs";
import * as nodePath from "node:path";

export const LEGACY_REACT_UI_EXPORTS = [
  "ThreadConfigProvider",
  "useThreadConfig",
  "ThreadConfig",
  "ThreadWelcomeConfig",
  "UserMessageConfig",
  "AssistantMessageConfig",
  "StringsConfig",
  "SuggestionConfig",
  "ThreadConfigProviderProps",
  "AssistantActionBar",
  "AssistantMessage",
  "AssistantModal",
  "BranchPicker",
  "Composer",
  "MessagePart",
  "AttachmentUI",
  "EditComposer",
  "Thread",
  "ThreadList",
  "ThreadListItem",
  "ThreadWelcome",
  "UserMessage",
  "makeMarkdownText",
  "MakeMarkdownTextProps",
  "CodeHeader",
] as const;

const LEGACY_REACT_UI_EXPORT_SET = new Set<string>(LEGACY_REACT_UI_EXPORTS);
const LEGACY_STYLE_IMPORTS = [
  "@assistant-ui/react/styles/",
  "@assistant-ui/react-markdown/styles/markdown.css",
  "@assistant-ui/react/tailwindcss",
  "@assistant-ui/react-markdown/tailwindcss",
];

export function hasLegacyReactUIImports(source: string): boolean {
  if (source.includes("@assistant-ui/react-ui")) return true;
  if (LEGACY_STYLE_IMPORTS.some((pattern) => source.includes(pattern))) {
    return true;
  }
  if (
    !source.includes("@assistant-ui/react") &&
    !source.includes("@assistant-ui/react-markdown")
  ) {
    return false;
  }

  try {
    const j = jscodeshift.withParser("tsx");
    const imports = j(source).find(j.ImportDeclaration).nodes();
    return imports.some((declaration) => {
      if (
        declaration.source.value !== "@assistant-ui/react" &&
        declaration.source.value !== "@assistant-ui/react-markdown"
      ) {
        return false;
      }

      return declaration.specifiers?.some((specifier) => {
        if (!j.ImportSpecifier.check(specifier)) return false;
        const imported = specifier.imported;
        const name = "name" in imported ? imported.name : imported.value;
        return isLegacyReactUIExport(name);
      });
    });
  } catch {
    return false;
  }
}

export function isLegacyReactUIExport(value: unknown): boolean {
  return typeof value === "string" && LEGACY_REACT_UI_EXPORT_SET.has(value);
}

export function assertNoLegacyReactUIImports(
  files: string[],
  cwd: string,
): void {
  const legacyFiles = files.filter((file) => {
    try {
      return hasLegacyReactUIImports(readFileSync(file, "utf8"));
    } catch {
      return false;
    }
  });
  if (legacyFiles.length === 0) return;

  const paths = legacyFiles
    .slice(0, 5)
    .map((file) => `- ${nodePath.relative(cwd, file)}`)
    .join("\n");
  const remainder =
    legacyFiles.length > 5 ? `\n- and ${legacyFiles.length - 5} more` : "";

  throw new Error(
    "The upgrade command cannot automatically migrate legacy assistant-ui components to the v0.15 registry components. " +
      "Follow https://www.assistant-ui.com/docs/migrations/v0-15 before rerunning the upgrade.\n\n" +
      `Legacy UI imports were found in:\n${paths}${remainder}`,
  );
}
