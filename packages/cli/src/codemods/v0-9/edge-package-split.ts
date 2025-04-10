import { createTransformer } from "../utils/createTransformer";

const reactEdgeExports: string[] = [
  // Edge Runtime
  "useEdgeRuntime",
  "EdgeRuntimeOptions",
  "EdgeModelAdapter",
  "EdgeChatAdapter",
  "EdgeRuntimeRequestOptions",
  "createEdgeRuntimeAPI",
  "getEdgeRuntimeResponse",
  
  // Dangerous in Browser Runtime
  "useDangerousInBrowserRuntime",
  "DangerousInBrowserAdapter",
  
  // Core Types
  "CoreMessage",
  "CoreUserMessage",
  "CoreAssistantMessage",
  "CoreSystemMessage",
  "CoreUserContentPart",
  "CoreAssistantContentPart",
  "CoreToolCallContentPart"
];

const migrateToEdgePackage = createTransformer(({ j, root, markAsChanged }) => {
  const sourcesToMigrate: string[] = [
    "@assistant-ui/react",
  ];
  const movedSpecifiers: any[] = [];
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
          reactEdgeExports.includes(specifier.imported.name as string)
        ) {
          movedSpecifiers.push(specifier);
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

  if (movedSpecifiers.length > 0) {
    const existingEdgeImport = root.find(j.ImportDeclaration, {
      source: { value: "@assistant-ui/react-edge" },
    });
    if (existingEdgeImport.size() > 0) {
      existingEdgeImport.forEach((path: any) => {
        movedSpecifiers.forEach((specifier: any) => {
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
        movedSpecifiers,
        j.literal("@assistant-ui/react-edge"),
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
    if (sourceValue.startsWith("@assistant-ui/react/") && 
        (sourceValue.includes("edge/") || sourceValue.includes("dangerous-in-browser/"))) {
      path.value.source = j.literal(
        sourceValue.replace("@assistant-ui/react/", "@assistant-ui/react-edge/")
      );
      markAsChanged();
    }
  });
});

export default migrateToEdgePackage;