import { createTransformer } from "../utils/createTransformer";

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
    // 1. Update imports
    root.find(j.ImportDeclaration).forEach((path: any) => {
      const source = path.value.source.value;

      // Only process imports from @assistant-ui packages
      if (typeof source === "string" && source.startsWith("@assistant-ui/")) {
        path.value.specifiers?.forEach((specifier: any) => {
          if (j.ImportSpecifier.check(specifier)) {
            const oldName = specifier.imported.name as string;
            if (typeRenamingMap[oldName]) {
              specifier.imported.name = typeRenamingMap[oldName];
              if (specifier.local && specifier.local.name === oldName) {
                specifier.local.name = typeRenamingMap[oldName];
              }
              markAsChanged();
            }
          }
        });
      }
    });

    // 2. Update MessagePrimitive.Content to MessagePrimitive.Parts
    root.find(j.MemberExpression).forEach((path: any) => {
      if (
        path.value.object &&
        path.value.object.name === "MessagePrimitive" &&
        path.value.property &&
        path.value.property.name === "Content"
      ) {
        path.value.property.name = "Parts";
        markAsChanged();
      }
    });

    // 3. Update JSX member expressions (e.g., MessagePrimitive.Content in JSX)
    root.find(j.JSXMemberExpression).forEach((path: any) => {
      if (
        path.value.object &&
        path.value.object.name === "MessagePrimitive" &&
        path.value.property &&
        path.value.property.name === "Content"
      ) {
        path.value.property.name = "Parts";
        markAsChanged();
      }
    });

    // 4. Update all identifiers for types, hooks, and primitives
    Object.entries(typeRenamingMap).forEach(([oldName, newName]) => {
      // Update type references
      root.find(j.TSTypeReference).forEach((path: any) => {
        if (path.value.typeName && path.value.typeName.name === oldName) {
          path.value.typeName.name = newName;
          markAsChanged();
        }
      });

      // Update identifier references
      root.find(j.Identifier).forEach((path: any) => {
        if (path.value.name === oldName) {
          // Skip if this is part of an import declaration (already handled above)
          if (j.ImportSpecifier.check(path.parent.value)) {
            return;
          }

          // Skip if this is a property key in an object
          if (
            j.Property.check(path.parent.value) &&
            path.parent.value.key === path.value
          ) {
            return;
          }

          // Skip if this is a property in a member expression
          if (
            j.MemberExpression.check(path.parent.value) &&
            path.parent.value.property === path.value
          ) {
            return;
          }

          path.value.name = newName;
          markAsChanged();
        }
      });

      // Update JSX element names
      root.find(j.JSXIdentifier).forEach((path: any) => {
        if (path.value.name === oldName) {
          path.value.name = newName;
          markAsChanged();
        }
      });
    });
  },
);

export default migrateContentPartToMessagePart;
