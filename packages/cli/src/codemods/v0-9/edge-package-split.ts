import { createTransformer } from "../utils/createTransformer";

// Chat runtime and converter exports moved to react-ai-sdk
const reactAiSdkExports: string[] = [
  // Chat Runtime (replaces edge runtime)
  "useChatRuntime",

  // Core Types
  "CoreMessage",
  "CoreUserMessage",
  "CoreAssistantMessage",
  "CoreSystemMessage",
  "CoreUserMessagePart",
  "CoreAssistantMessagePart",
  "CoreToolCallMessagePart",

  // Core message converters
  "fromCoreMessages",
  "fromCoreMessage",
  "toCoreMessages",
  "toCoreMessage",

  // Language model converters
  "toLanguageModelMessages",
  "toLanguageModelTools",
  "fromLanguageModelMessages",
  "fromLanguageModelTools",
  "useDangerousInBrowserRuntime",
];

const migrateToEdgePackage = createTransformer(({ j, root, markAsChanged }) => {
  const sourcesToMigrate: string[] = ["@assistant-ui/react"];
  const movedAiSdkSpecifiers: any[] = [];
  let lastMigratedImportPath: any = null;

  root
    .find(j.ImportDeclaration)
    .filter((path: any) => sourcesToMigrate.includes(path.value.source.value))
    .forEach((path: any) => {
      let hadMigratedSpecifiers = false;
      const remainingSpecifiers: any[] = [];
      path.value.specifiers.forEach((specifier: any) => {
        if (
          j.ImportSpecifier.check(specifier) &&
          reactAiSdkExports.includes(specifier.imported.name as string)
        ) {
          movedAiSdkSpecifiers.push(specifier);
          hadMigratedSpecifiers = true;
        } else {
          remainingSpecifiers.push(specifier);
        }
      });
      if (hadMigratedSpecifiers) {
        lastMigratedImportPath = path;
      }
      if (remainingSpecifiers.length === 0) {
        j(path).remove();
        markAsChanged();
      } else if (remainingSpecifiers.length !== path.value.specifiers.length) {
        path.value.specifiers = remainingSpecifiers;
        markAsChanged();
      }
    });

  // Add imports for react-ai-sdk (all edge-related imports now go here)
  if (movedAiSdkSpecifiers.length > 0) {
    const existingAiSdkImport = root.find(j.ImportDeclaration, {
      source: { value: "@assistant-ui/react-ai-sdk" },
    });
    if (existingAiSdkImport.size() > 0) {
      existingAiSdkImport.forEach((path: any) => {
        movedAiSdkSpecifiers.forEach((specifier: any) => {
          if (
            !path.value.specifiers.some(
              (s: any) => s.imported.name === specifier.imported.name,
            )
          ) {
            path.value.specifiers.push(specifier);
          }
        });
      });
    } else {
      const newImport = j.importDeclaration(
        movedAiSdkSpecifiers,
        j.literal("@assistant-ui/react-ai-sdk"),
      );
      if (lastMigratedImportPath) {
        j(lastMigratedImportPath).insertAfter(newImport);
      } else {
        const firstImport = root.find(j.ImportDeclaration).at(0);
        if (firstImport.size() > 0) {
          firstImport.insertBefore(newImport);
        } else {
          root.get().node.program.body.unshift(newImport);
        }
      }
    }
    markAsChanged();
  }

  // Migrate imports from edge/converters
  root.find(j.ImportDeclaration).forEach((path: any) => {
    const sourceValue: string = path.value.source.value;
    if (
      sourceValue.startsWith("@assistant-ui/react/") &&
      (sourceValue.includes("edge/") ||
        sourceValue.includes("dangerous-in-browser/"))
    ) {
      path.value.source = j.literal(
        sourceValue.replace(
          "@assistant-ui/react/",
          "@assistant-ui/react-ai-sdk/",
        ),
      );
      markAsChanged();
    }
  });

  // Migrate language model converter imports from react-edge to react-ai-sdk
  root.find(j.ImportDeclaration).forEach((path: any) => {
    const sourceValue: string = path.value.source.value;
    if (
      sourceValue === "@assistant-ui/react-edge" ||
      sourceValue === "@assistant-ui/react"
    ) {
      let hasLanguageModelConverters = false;
      const remainingSpecifiers: any[] = [];
      const aiSdkSpecifiers: any[] = [];

      path.value.specifiers.forEach((specifier: any) => {
        if (
          j.ImportSpecifier.check(specifier) &&
          reactAiSdkExports.includes(specifier.imported.name as string)
        ) {
          aiSdkSpecifiers.push(specifier);
          hasLanguageModelConverters = true;
        } else {
          remainingSpecifiers.push(specifier);
        }
      });

      if (hasLanguageModelConverters) {
        if (remainingSpecifiers.length === 0) {
          j(path).remove();
        } else {
          path.value.specifiers = remainingSpecifiers;
        }

        const existingAiSdkImport = root.find(j.ImportDeclaration, {
          source: { value: "@assistant-ui/react-ai-sdk" },
        });

        if (existingAiSdkImport.size() > 0) {
          existingAiSdkImport.forEach((importPath: any) => {
            aiSdkSpecifiers.forEach((specifier: any) => {
              if (
                !importPath.value.specifiers.some(
                  (s: any) => s.imported.name === specifier.imported.name,
                )
              ) {
                importPath.value.specifiers.push(specifier);
              }
            });
          });
        } else {
          const newImport = j.importDeclaration(
            aiSdkSpecifiers,
            j.literal("@assistant-ui/react-ai-sdk"),
          );
          j(path).insertAfter(newImport);
        }

        markAsChanged();
      }
    }
  });
});

export default migrateToEdgePackage;
