import { createTransformer } from "../utils/createTransformer";

const reactAiSdkExports: string[] = [
  "useChatRuntime",

  "CoreMessage",
  "CoreUserMessage",
  "CoreAssistantMessage",
  "CoreSystemMessage",
  "CoreUserMessagePart",
  "CoreAssistantMessagePart",
  "CoreToolCallMessagePart",

  "fromCoreMessages",
  "fromCoreMessage",
  "toCoreMessages",
  "toCoreMessage",

  "toLanguageModelMessages",
  "toLanguageModelTools",
  "fromLanguageModelMessages",
  "fromLanguageModelTools",
  "useDangerousInBrowserRuntime",
];

const migrateToEdgePackage = createTransformer(({ j, root, markAsChanged }) => {
  root.find(j.ImportDeclaration).forEach((path) => {
    const source = path.node.source.value;
    if (
      typeof source === "string" &&
      source.startsWith("@assistant-ui/react/") &&
      (source.includes("edge/") || source.includes("dangerous-in-browser/"))
    ) {
      path.node.source = j.literal(
        source.replace("@assistant-ui/react/", "@assistant-ui/react-ai-sdk/"),
      );
      markAsChanged();
      return;
    }

    if (
      source !== "@assistant-ui/react" &&
      source !== "@assistant-ui/react-edge"
    )
      return;

    const specifiers = path.node.specifiers ?? [];
    const moved = specifiers.filter(
      (specifier) =>
        j.ImportSpecifier.check(specifier) &&
        reactAiSdkExports.includes(specifier.imported.name as string),
    );
    if (moved.length === 0) return;

    const destination = j.literal("@assistant-ui/react-ai-sdk");
    if (moved.length === specifiers.length) {
      path.node.source = destination;
    } else {
      path.node.specifiers = specifiers.filter(
        (specifier) => !moved.includes(specifier),
      );
      const declaration = j.importDeclaration(moved, destination);
      declaration.importKind = path.node.importKind ?? "value";
      j(path).insertAfter(declaration);
    }
    markAsChanged();
  });
});

export default migrateToEdgePackage;
