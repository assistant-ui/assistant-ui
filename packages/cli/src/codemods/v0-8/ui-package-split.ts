import { createTransformer } from "../utils/createTransformer";

const reactUIExports = [
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
  "ContentPart",
  "AttachmentUI",
  "EditComposer",
  "Thread",
  "ThreadList",
  "ThreadListItem",
  "ThreadWelcome",
  "UserMessage",
  "UserActionBar",
];

const migrateUIComponents = createTransformer(({ j, root, markAsChanged }) => {
  // Find the import declarations for `@assistant-ui/react`
  const importDeclarations = root.find(j.ImportDeclaration, {
    source: { value: "@assistant-ui/react" },
  });

  importDeclarations.forEach((path: any) => {
    const specifiersToReactUI: any[] = [];
    const specifiersToKeep: any[] = [];

    path.value.specifiers.forEach((specifier: any) => {
      if (
        j.ImportSpecifier.check(specifier) &&
        reactUIExports.includes(specifier.imported.name)
      ) {
        specifiersToReactUI.push(specifier);
      } else {
        specifiersToKeep.push(specifier);
      }
    });

    if (specifiersToReactUI.length === 0) return;

    // Add a new import for `@assistant-ui/react-ui`
    const reactUIImport = j.importDeclaration(
      specifiersToReactUI,
      j.literal("@assistant-ui/react-ui"),
    );
    j(path).insertAfter(reactUIImport);

    if (specifiersToKeep.length > 0) {
      // Update the existing import declaration with the remaining specifiers
      path.value.specifiers = specifiersToKeep;
    } else {
      // Remove the import declaration if no specifiers are left
      j(path).remove();
    }

    markAsChanged();
  });
});

export default migrateUIComponents;
