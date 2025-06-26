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
          reactUIExports.includes(specifier.imported.name as string)
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
    const existingReactUIImport = root.find(j.ImportDeclaration, {
      source: { value: "@assistant-ui/react-ui" },
    });
    if (existingReactUIImport.size() > 0) {
      existingReactUIImport.forEach((path: any) => {
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
        j.literal("@assistant-ui/react-ui"),
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
      if (
        parent &&
        parent.value &&
        parent.value.type === "VariableDeclarator"
      ) {
        const varDecl = parent.parentPath;
        if (
          varDecl &&
          varDecl.value.declarations &&
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
          path.parentPath &&
          path.parentPath.value &&
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
