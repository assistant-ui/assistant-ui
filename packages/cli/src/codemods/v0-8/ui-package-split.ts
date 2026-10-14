import { createTransformer } from "../utils/createTransformer";

const reactUIExports: string[] = [
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
];

const migrateAssistantUI = createTransformer(({ j, root, markAsChanged }) => {
  const sourcesToMigrate: string[] = [
    "@assistant-ui/react",
    "@assistant-ui/react-markdown",
  ];
  root
    .find(j.ImportDeclaration)
    .filter((path: any) => sourcesToMigrate.includes(path.value.source.value))
    .forEach((path: any) => {
      const specifiers = path.value.specifiers ?? [];
      const moved = specifiers.filter(
        (specifier: any) =>
          j.ImportSpecifier.check(specifier) &&
          reactUIExports.includes(specifier.imported.name as string),
      );
      if (moved.length === 0) return;

      const destinationImports = root
        .find(j.ImportDeclaration, {
          source: { value: "@assistant-ui/react-ui" },
        })
        .nodes();
      const movedSpecifiers = moved.filter(
        (specifier: any) =>
          !destinationImports.some((declaration: any) =>
            (declaration.specifiers ?? []).some(
              (existing: any) =>
                j.ImportSpecifier.check(existing) &&
                existing.imported.name === specifier.imported.name &&
                existing.local?.name === specifier.local?.name &&
                (declaration.importKind === "type" ||
                  (existing as any).importKind === "type") ===
                  (path.value.importKind === "type" ||
                    (specifier as any).importKind === "type"),
            ),
          ),
      );

      const destination = j.literal("@assistant-ui/react-ui");
      const remainingSpecifiers = specifiers.filter(
        (specifier: any) => !moved.includes(specifier),
      );
      if (remainingSpecifiers.length === 0) {
        if (movedSpecifiers.length === 0) {
          j(path).remove();
        } else {
          path.value.specifiers = movedSpecifiers;
          path.value.source = destination;
        }
      } else {
        path.value.specifiers = remainingSpecifiers;
        if (movedSpecifiers.length > 0) {
          const declaration = j.importDeclaration(movedSpecifiers, destination);
          declaration.importKind = path.value.importKind ?? "value";
          j(path).insertAfter(declaration);
        }
      }
      markAsChanged();
    });

  const cssReplacements: Record<string, string> = {
    "@assistant-ui/react/styles/index.css":
      "@assistant-ui/react-ui/styles/index.css",
    "@assistant-ui/react/styles/modal.css":
      "@assistant-ui/react-ui/styles/modal.css",
    "@assistant-ui/react-markdown/styles/markdown.css":
      "@assistant-ui/react-ui/styles/markdown.css",
  };

  root.find(j.ImportDeclaration).forEach((path: any) => {
    const sourceValue: string = path.value.source.value;
    if (cssReplacements[sourceValue]) {
      path.value.source = j.literal(cssReplacements[sourceValue]);
      markAsChanged();
    }
  });

  let removedMarkdownPlugin = false;
  root
    .find(j.CallExpression, { callee: { name: "require" } })
    .filter((path: any) => {
      const arg = path.value.arguments[0];
      return (
        arg &&
        (arg.type === "Literal" || arg.type === "StringLiteral") &&
        arg.value === "@assistant-ui/react-markdown/tailwindcss"
      );
    })
    .forEach((path: any) => {
      removedMarkdownPlugin = true;
      const parent = path.parentPath;
      if (parent?.value && parent.value.type === "VariableDeclarator") {
        const varDecl = parent.parentPath;
        if (
          varDecl?.value.declarations &&
          varDecl.value.declarations.length === 1
        ) {
          j(varDecl).remove();
        } else {
          varDecl.value.declarations = varDecl.value.declarations.filter(
            (decl: any) => decl !== parent.value,
          );
        }
        markAsChanged();
      } else {
        j(path).remove();
        markAsChanged();
      }
    });

  root
    .find(j.CallExpression, { callee: { name: "require" } })
    .filter((path: any) => {
      const arg = path.value.arguments[0];
      return (
        arg &&
        (arg.type === "Literal" || arg.type === "StringLiteral") &&
        arg.value === "@assistant-ui/react/tailwindcss"
      );
    })
    .forEach((path: any) => {
      path.value.arguments[0].value = "@assistant-ui/react-ui/tailwindcss";
      markAsChanged();
      if (removedMarkdownPlugin) {
        if (
          path.parentPath?.value &&
          path.parentPath.value.type === "CallExpression" &&
          path.parentPath.value.arguments.length > 0
        ) {
          const configObj = path.parentPath.value.arguments[0];
          if (configObj && configObj.type === "ObjectExpression") {
            const componentsProp = configObj.properties.find((prop: any) => {
              return (
                (prop.key.name === "components" ||
                  prop.key.value === "components") &&
                prop.value.type === "ArrayExpression"
              );
            });
            if (componentsProp) {
              const componentsArray = componentsProp.value.elements;
              const hasMarkdown = componentsArray.some(
                (el: any) => el.type === "Literal" && el.value === "markdown",
              );
              if (!hasMarkdown) {
                componentsArray.push(j.literal("markdown"));
                markAsChanged();
              }
            }
          }
        }
      }
    });
});

export default migrateAssistantUI;
