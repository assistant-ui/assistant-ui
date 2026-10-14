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
    .filter((path) =>
      sourcesToMigrate.includes(path.node.source.value as string),
    )
    .forEach((path) => {
      const specifiers = path.node.specifiers ?? [];
      const moved = specifiers.filter(
        (specifier) =>
          j.ImportSpecifier.check(specifier) &&
          reactUIExports.includes(specifier.imported.name as string),
      );
      if (moved.length === 0) return;

      const destination = j.literal("@assistant-ui/react-ui");
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
