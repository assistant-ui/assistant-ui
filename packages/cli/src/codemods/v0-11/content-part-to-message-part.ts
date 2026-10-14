import { createTransformer } from "../utils/createTransformer";
import { resolveBinding } from "../utils/resolveBinding";

// Map of old ContentPart names to new MessagePart names
const typeRenamingMap: Record<string, string> = {
  // Core types
  TextContentPart: "TextMessagePart",
  ReasoningContentPart: "ReasoningMessagePart",
  SourceContentPart: "SourceMessagePart",
  ImageContentPart: "ImageMessagePart",
  FileContentPart: "FileMessagePart",
  Unstable_AudioContentPart: "Unstable_AudioMessagePart",
  ToolCallContentPart: "ToolCallMessagePart",

  // Status types
  ContentPartStatus: "MessagePartStatus",
  ToolCallContentPartStatus: "ToolCallMessagePartStatus",

  // Thread message parts
  ThreadUserContentPart: "ThreadUserMessagePart",
  ThreadAssistantContentPart: "ThreadAssistantMessagePart",

  // Runtime and state types
  ContentPartRuntime: "MessagePartRuntime",
  ContentPartState: "MessagePartState",

  // Component types
  EmptyContentPartComponent: "EmptyMessagePartComponent",
  TextContentPartComponent: "TextMessagePartComponent",
  ReasoningContentPartComponent: "ReasoningMessagePartComponent",
  SourceContentPartComponent: "SourceMessagePartComponent",
  ImageContentPartComponent: "ImageMessagePartComponent",
  FileContentPartComponent: "FileMessagePartComponent",
  Unstable_AudioContentPartComponent: "Unstable_AudioMessagePartComponent",
  ToolCallContentPartComponent: "ToolCallMessagePartComponent",

  // Props types
  EmptyContentPartProps: "EmptyMessagePartProps",
  TextContentPartProps: "TextMessagePartProps",
  ReasoningContentPartProps: "ReasoningMessagePartProps",
  SourceContentPartProps: "SourceMessagePartProps",
  ImageContentPartProps: "ImageMessagePartProps",
  FileContentPartProps: "FileMessagePartProps",
  Unstable_AudioContentPartProps: "Unstable_AudioMessagePartProps",
  ToolCallContentPartProps: "ToolCallMessagePartProps",

  // Provider types
  TextContentPartProvider: "TextMessagePartProvider",
  TextContentPartProviderProps: "TextMessagePartProviderProps",
  ContentPartRuntimeProvider: "MessagePartRuntimeProvider",

  // Context types
  ContentPartContext: "MessagePartContext",
  ContentPartContextValue: "MessagePartContextValue",

  // Hook names
  useContentPart: "useMessagePart",
  useContentPartRuntime: "useMessagePartRuntime",
  useContentPartText: "useMessagePartText",
  useContentPartReasoning: "useMessagePartReasoning",
  useContentPartSource: "useMessagePartSource",
  useContentPartFile: "useMessagePartFile",
  useContentPartImage: "useMessagePartImage",
  useTextContentPart: "useTextMessagePart",

  // Primitive names
  ContentPartPrimitive: "MessagePartPrimitive",
  ContentPartPrimitiveText: "MessagePartPrimitiveText",
  ContentPartPrimitiveImage: "MessagePartPrimitiveImage",
  ContentPartPrimitiveInProgress: "MessagePartPrimitiveInProgress",
};

const migrateContentPartToMessagePart = createTransformer(
  ({ j, root, markAsChanged }) => {
    const declaredNames = new Set<string>();
    root.find(j.TSTypeParameter).forEach((path: any) => {
      declaredNames.add(path.value.name.name ?? path.value.name);
    });
    const identifiers = root.find(j.Identifier).paths();
    for (const path of identifiers) {
      if (path.parent.value.id === path.value)
        declaredNames.add(path.value.name);
    }
    const usedNames = new Set(identifiers.map((path: any) => path.value.name));
    const messageBindings = new Set<any>();

    root.find(j.ImportDeclaration).forEach((path: any) => {
      const source = path.value.source.value;
      if (typeof source !== "string" || !source.startsWith("@assistant-ui/"))
        return;

      path.value.specifiers?.forEach((specifier: any, index: number) => {
        if (
          !j.ImportSpecifier.check(specifier) ||
          !j.Identifier.check(specifier.imported) ||
          !j.Identifier.check(specifier.local)
        )
          return;
        const oldName = specifier.imported.name;
        const importKind = (specifier as { importKind?: string }).importKind;
        const typeOnly =
          path.value.importKind === "type" || importKind === "type";
        if (oldName === "MessagePrimitive" && !typeOnly) {
          messageBindings.add(specifier.local);
        }
        const newName = typeRenamingMap[oldName];
        if (!newName) return;

        const references = identifiers.filter((reference: any) => {
          const node = reference.value;
          if (node.name !== oldName) return false;
          const parent = reference.parent.value;
          if (
            parent.type.startsWith("Import") ||
            parent.id === node ||
            parent.label === node
          )
            return false;
          if (parent.key === node && !parent.computed && parent.value !== node)
            return false;
          if (parent.property === node && !parent.computed) return false;
          if (j.TSQualifiedName.check(parent) && parent.right === node)
            return false;
          if (j.JSXAttribute.check(parent) || j.JSXNamespacedName.check(parent))
            return false;
          if (
            (j.JSXOpeningElement.check(parent) ||
              j.JSXClosingElement.check(parent)) &&
            /^[a-z]/.test(oldName)
          )
            return false;
          if (
            j.ExportSpecifier.check(parent) &&
            (reference.parent.parent.value.source || parent.local !== node)
          )
            return false;
          return true;
        });
        // Retain the local alias when a declaration in either TypeScript namespace
        // could capture a renamed reference. The resolver covers value bindings.
        const canRename =
          specifier.local.name === oldName &&
          !usedNames.has(newName) &&
          !declaredNames.has(newName) &&
          !declaredNames.has(oldName) &&
          references.every((reference: any) => {
            const binding = resolveBinding(j, reference, oldName);
            return binding === specifier.local || (typeOnly && !binding);
          });
        if (canRename) {
          for (const reference of references) {
            const parent = reference.parent.value;
            if (
              (j.Property.check(parent) || j.ObjectProperty.check(parent)) &&
              parent.shorthand
            ) {
              parent.shorthand = false;
              parent.key = j.identifier(oldName);
              parent.value = j.identifier(newName);
            } else if (j.ExportSpecifier.check(parent)) {
              const replacement: any = j.exportSpecifier.from({
                local: j.identifier(newName),
                exported: j.Identifier.check(parent.exported)
                  ? j.identifier(parent.exported.name)
                  : parent.exported,
              });
              replacement.exportKind = (
                parent as { exportKind?: string }
              ).exportKind;
              replacement.comments = parent.comments;
              reference.parent.replace(replacement);
            } else {
              reference.value.name = newName;
            }
          }
        }
        const replacement: any = j.importSpecifier(
          j.identifier(newName),
          j.identifier(canRename ? newName : specifier.local.name),
        );
        replacement.importKind = importKind;
        replacement.comments = specifier.comments;
        path.get("specifiers", index).replace(replacement);
        markAsChanged();
      });
    });

    const renameContent = (path: any) => {
      const { object, property, computed } = path.value;
      if (
        computed ||
        !j.Identifier.check(object) ||
        !j.Identifier.check(property) ||
        property.name !== "Content" ||
        !messageBindings.has(resolveBinding(j, path, object.name))
      )
        return;
      property.name = "Parts";
      markAsChanged();
    };
    root.find(j.MemberExpression).forEach(renameContent);
    root.find(j.JSXMemberExpression).forEach(renameContent);
  },
);

export default migrateContentPartToMessagePart;
