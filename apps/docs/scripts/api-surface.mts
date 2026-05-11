import {
  Node,
  Project,
  Scope,
  type ExportDeclaration,
  type ExportSpecifier,
  type InterfaceDeclaration,
  type JSDoc,
  type Node as TsNode,
  type SourceFile,
  type Symbol as TsMorphSymbol,
  type Type,
  type TypeAliasDeclaration,
} from "ts-morph";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

export const REPO_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);
const REACT_INDEX = path.join(REPO_ROOT, "packages/react/src/index.ts");
const DOCS_ROOT = path.join(REPO_ROOT, "apps/docs");
const TYPE_DOCS_INPUT = path.join(
  DOCS_ROOT,
  "content/types-to-generate/typeDocs.ts",
);
const TYPE_DOCS_OUTPUT = path.join(DOCS_ROOT, "generated/typeDocs.ts");
export const INTEGRATION_TYPE_DOCS_OUTPUT = path.join(
  DOCS_ROOT,
  "generated/integrationTypeDocs.ts",
);
export const API_REFERENCE_DIR = path.join(
  DOCS_ROOT,
  "content/docs/(reference)/api-reference",
);
export type ApiSection =
  | "tools"
  | "model-context"
  | "transport"
  | "external-store"
  | "voice"
  | "primitives"
  | "hooks"
  | "adapters"
  | "runtimes"
  | "context-providers"
  | "integrations"
  | "utilities";

export type ExportKind =
  | "class"
  | "component"
  | "function"
  | "interface"
  | "namespace"
  | "type"
  | "value";

export type ExportInfo = {
  name: string;
  section: ApiSection;
  kind: ExportKind;
  page: string;
  pageRole: "primary" | "related" | "supporting-type";
  sourcePath?: string;
  jsDoc?: string;
  deprecated?: string;
  signature?: string;
  classificationRule: string;
  classificationConfidence: "strong" | "medium" | "fallback";
  classificationReason: string;
};

type Classification = {
  section: ApiSection;
  page: string;
  role: ExportInfo["pageRole"];
  rule: string;
  confidence: ExportInfo["classificationConfidence"];
  reason: string;
};

type ClassificationInput = {
  name: string;
  kind: ExportKind;
  sourcePath?: string;
};

type ClassificationRule = (
  input: ClassificationInput,
) => Classification | undefined;

type DocPlacement = { page: string; role: ExportInfo["pageRole"] };

type ExportEntry = {
  name: string;
  exportNode: ExportDeclaration;
  specifier?: ExportSpecifier;
};

type ParameterDef = {
  name: string;
  type?: string;
  description?: string;
  required?: boolean;
  default?: string;
  deprecated?: string;
  children?: Array<{ type?: string; parameters: ParameterDef[] }>;
};

export type TypeDoc = {
  type?: string;
  parameters: ParameterDef[];
};

export type TypeDocBindings = Map<string, string>;

const PRIMARY_FEATURE_TYPES = new Set([
  "RealtimeVoiceAdapter",
  "VoiceSessionState",
  "VoiceSessionControls",
  "VoiceSessionHelpers",
  "SpeechSynthesisAdapter",
  "DictationAdapter",
  "DictationState",
  "ExternalStoreAdapter",
  "ExternalThreadQueueAdapter",
  "ExternalThreadProps",
]);

export const SECTION_ORDER = [
  "tools",
  "model-context",
  "transport",
  "external-store",
  "voice",
  "primitives",
  "hooks",
  "adapters",
  "runtimes",
  "context-providers",
  "integrations",
  "utilities",
] as const satisfies readonly ApiSection[];

export const REACT_API_SECTIONS = SECTION_ORDER.filter(
  (section) => section !== "integrations",
);

export const INTEGRATION_PACKAGES = [
  {
    slug: "react-ai-sdk",
    packageName: "@assistant-ui/react-ai-sdk",
    entry: path.join(REPO_ROOT, "packages/react-ai-sdk/src/index.ts"),
  },
  {
    slug: "cloud-ai-sdk",
    packageName: "@assistant-ui/cloud-ai-sdk",
    entry: path.join(REPO_ROOT, "packages/cloud-ai-sdk/src/index.ts"),
  },
] as const;

const IGNORED_EXPORTS = new Set([
  "AssistantEventCallback",
  "AssistantEventName",
  "AssistantEventPayload",
  "AssistantEventScope",
  "AssistantEventSelector",
  "AssistantState",
  "DevToolsProviderApi",
  "FrameMessageType",
  "LanguageModelV1CallSettings",
  "Unstable_UseMentionAdapterOptions",
  "Unstable_UseSlashCommandAdapterOptions",
]);

const RUNTIME_CREATION_HOOKS = new Set([
  "useAssistantTransportRuntime",
  "useCloudThreadListRuntime",
  "useExternalStoreRuntime",
  "useLocalRuntime",
  "useLocalThreadRuntime",
  "useRemoteThreadListRuntime",
  "unstable_useRemoteThreadListRuntime",
]);

const STATE_HOOKS = new Set([
  "useAui",
  "useAuiState",
  "useAuiEvent",
  "useAssistantApi",
  "useAssistantState",
  "useAssistantEvent",
]);

const COMPOSER_TRIGGER_HOOKS = new Set([
  "unstable_useMentionAdapter",
  "unstable_useSlashCommandAdapter",
  "unstable_useTriggerPopoverRootContext",
  "unstable_useTriggerPopoverRootContextOptional",
  "unstable_useTriggerPopoverScopeContext",
  "unstable_useTriggerPopoverScopeContextOptional",
  "unstable_useTriggerPopoverTriggers",
  "unstable_useTriggerPopoverTriggersOptional",
]);

const project = new Project({
  tsConfigFilePath: path.join(DOCS_ROOT, "tsconfig.json"),
  skipAddingFilesFromTsConfig: false,
});
const primitiveSourceFiles = new Map<string, SourceFile>();

function resolveAliasedDeclaration(declaration: TsNode): TsNode {
  if (Node.isExportSpecifier(declaration)) {
    const aliased = declaration.getSymbol()?.getAliasedSymbol();
    const resolved = aliased?.getDeclarations()[0];
    if (resolved) return resolved;
  }
  return declaration;
}

function cleanTypeText(typeText: string): string {
  return typeText
    .replace(/import\(".*?"\)\./g, "")
    .replace(/^\s*\|\s*/, "")
    .replace(/\s*\|\s*undefined$/, "");
}

function cleanSignatureText(text: string): string {
  return cleanTypeText(text)
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function declarationTypeText(node: TsNode): string {
  if (
    Node.isVariableDeclaration(node) ||
    Node.isParameterDeclaration(node) ||
    Node.isPropertySignature(node) ||
    Node.isPropertyDeclaration(node)
  ) {
    const typeNode = node.getTypeNode();
    if (typeNode) return cleanSignatureText(typeNode.getText());
    return cleanSignatureText(node.getType().getText(node));
  }

  return cleanSignatureText(node.getType().getText(node));
}

function returnTypeText(node: TsNode): string {
  if (Node.isMethodDeclaration(node) || Node.isFunctionDeclaration(node)) {
    const typeNode = node.getReturnTypeNode();
    if (typeNode) return cleanSignatureText(typeNode.getText());
    return cleanSignatureText(node.getReturnType().getText(node));
  }

  return declarationTypeText(node);
}

function parameterSignature(parameter: TsNode): string {
  if (!Node.isParameterDeclaration(parameter)) return parameter.getText();

  const dotDotDot = parameter.isRestParameter() ? "..." : "";
  const name = parameter.getNameNode().getText();
  const optional = parameter.hasQuestionToken() ? "?" : "";
  const type = declarationTypeText(parameter);
  const initializer = parameter.getInitializer()?.getText();
  const defaultValue = initializer ? ` = ${initializer}` : "";

  return `${dotDotDot}${name}${optional}: ${type}${defaultValue}`;
}

function typeParameterText(node: TsNode): string {
  if (
    Node.isClassDeclaration(node) ||
    Node.isFunctionDeclaration(node) ||
    Node.isMethodDeclaration(node)
  ) {
    const params = node.getTypeParameters().map((param) => param.getText());
    return params.length > 0 ? `<${params.join(", ")}>` : "";
  }

  return "";
}

function isPublicClassMember(node: TsNode): boolean {
  if (
    Node.isConstructorDeclaration(node) ||
    Node.isMethodDeclaration(node) ||
    Node.isPropertyDeclaration(node)
  ) {
    const scope = node.getScope();
    return scope !== Scope.Private && scope !== Scope.Protected;
  }

  return false;
}

function classMemberPrefix(node: TsNode): string {
  if (
    (Node.isMethodDeclaration(node) || Node.isPropertyDeclaration(node)) &&
    node.isStatic()
  ) {
    return "static ";
  }

  return "";
}

function propertySignature(node: TsNode): string | undefined {
  if (!Node.isPropertyDeclaration(node) || !isPublicClassMember(node)) {
    return undefined;
  }

  const name = node.getNameNode().getText();
  const optional = node.hasQuestionToken() ? "?" : "";
  return `${classMemberPrefix(node)}${name}${optional}: ${declarationTypeText(node)};`;
}

function methodSignature(node: TsNode): string | undefined {
  if (!Node.isMethodDeclaration(node) || !isPublicClassMember(node)) {
    return undefined;
  }

  const asyncPrefix = node.isAsync() ? "async " : "";
  const params = node.getParameters().map(parameterSignature).join(", ");
  const returnType = returnTypeText(node);
  return `${classMemberPrefix(node)}${asyncPrefix}${node.getName()}${typeParameterText(node)}(${params}): ${returnType};`;
}

function constructorSignature(node: TsNode): string | undefined {
  if (!Node.isConstructorDeclaration(node) || !isPublicClassMember(node)) {
    return undefined;
  }

  const params = node.getParameters().map(parameterSignature).join(", ");
  return `constructor(${params});`;
}

function classSignature(node: TsNode, name: string): string | undefined {
  if (!Node.isClassDeclaration(node)) return undefined;

  const extendsText = node.getExtends()?.getText();
  const implementsText = node.getImplements().map((item) => item.getText());
  const header = [
    `class ${name}${typeParameterText(node)}`,
    extendsText ? `extends ${extendsText}` : undefined,
    implementsText.length > 0
      ? `implements ${implementsText.join(", ")}`
      : undefined,
  ]
    .filter(Boolean)
    .join(" ");

  const members = [
    ...node.getConstructors().map(constructorSignature),
    ...node.getProperties().map(propertySignature),
    ...node.getMethods().map(methodSignature),
  ].filter((line): line is string => Boolean(line));

  if (members.length === 0) return `${header} {}`;
  return [`${header} {`, ...members.map((line) => `  ${line}`), "}"].join("\n");
}

function functionSignature(node: TsNode, name: string): string | undefined {
  if (!Node.isFunctionDeclaration(node)) return undefined;

  const asyncPrefix = node.isAsync() ? "async " : "";
  const params = node.getParameters().map(parameterSignature).join(", ");
  return `function ${asyncPrefix}${name}${typeParameterText(node)}(${params}): ${returnTypeText(node)};`;
}

function localTypeSignature(node: TsNode): string | undefined {
  if (Node.isInterfaceDeclaration(node)) {
    return cleanSignatureText(node.getText()).replace(/^export\s+/, "");
  }

  if (Node.isTypeAliasDeclaration(node)) {
    return `type ${node.getName()} = ${cleanSignatureText(node.getTypeNode().getText())};`;
  }

  return undefined;
}

function namespaceSupportingTypes(node: TsNode, name: string): string[] {
  return node
    .getSourceFile()
    .getModules()
    .filter((module) => module.getName() === name)
    .flatMap((module) => {
      const body = module.getBody();
      if (!Node.isModuleBlock(body)) return [];

      const typeLines = body
        .getStatements()
        .map(localTypeSignature)
        .filter((line): line is string => Boolean(line));

      if (typeLines.length === 0) return [];

      return [
        [
          `namespace ${name} {`,
          ...typeLines.map((line) =>
            line
              .split("\n")
              .map((innerLine) => `  ${innerLine}`)
              .join("\n"),
          ),
          "}",
        ].join("\n"),
      ];
    });
}

function referencedLocalTypes(node: TsNode, typeText: string): string[] {
  const referencedNames = [
    ...new Set(
      typeText.match(/\b[A-Z][A-Za-z0-9_]*(?:Props|Adapters)\b/g) ?? [],
    ),
  ];
  if (referencedNames.length === 0) return [];

  return referencedNames.flatMap((name) =>
    [
      ...(node.getSourceFile().getExportedDeclarations().get(name) ?? []),
      ...node
        .getSourceFile()
        .getImportDeclarations()
        .flatMap((importDecl) => importDecl.getNamedImports())
        .filter((namedImport) => namedImport.getName() === name)
        .flatMap((namedImport) => {
          const symbol = namedImport.getNameNode().getSymbol();
          return symbol?.getAliasedSymbol()?.getDeclarations() ?? [];
        }),
    ]
      .map(resolveAliasedDeclaration)
      .map(localTypeSignature)
      .filter((line): line is string => Boolean(line)),
  );
}

function variableSignature(node: TsNode, name: string): string | undefined {
  if (!Node.isVariableDeclaration(node)) return undefined;
  const typeText = declarationTypeText(node);
  const namespaceTypes = namespaceSupportingTypes(node, name);
  return [
    ...referencedLocalTypes(node, [typeText, ...namespaceTypes].join("\n")),
    ...namespaceTypes,
    `const ${name}: ${typeText};`,
  ].join("\n\n");
}

function bindingElementSignature(
  node: TsNode,
  name: string,
): string | undefined {
  if (!Node.isBindingElement(node)) return undefined;
  return `const ${name}: ${cleanSignatureText(node.getType().getText(node))};`;
}

function typeSignature(node: TsNode, name: string): string | undefined {
  if (Node.isInterfaceDeclaration(node)) {
    return cleanSignatureText(node.getText());
  }

  if (Node.isTypeAliasDeclaration(node)) {
    return `type ${name} = ${cleanSignatureText(node.getTypeNode().getText())};`;
  }

  return undefined;
}

function extractSignature(
  node: TsNode | undefined,
  name: string,
): string | undefined {
  if (!node) return undefined;
  const signature =
    classSignature(node, name) ??
    functionSignature(node, name) ??
    variableSignature(node, name) ??
    bindingElementSignature(node, name) ??
    typeSignature(node, name);

  return signature ? cleanSignatureText(signature) : undefined;
}

function getJsDocCommentText(doc: JSDoc): string | undefined {
  const comment = doc.getComment();
  let text: string | undefined;
  if (typeof comment === "string") {
    text = comment;
  } else if (Array.isArray(comment)) {
    text = comment.map((part) => part.getText()).join("");
  }
  if (!text) return undefined;

  const cleaned = text
    .replace(/^\/\*\*?/, "")
    .replace(/\*\/$/, "")
    .split("\n")
    .map((line) => line.replace(/^\s*\*\s?/, ""))
    .join("\n")
    .replace(
      /\{@link\s+([^}\s]+)(?:\s+([^}]+))?\}/g,
      (_, link, label) => label?.trim() || link,
    )
    .replace(/\s+([.,;:])/g, "$1")
    .trim();

  return cleaned || undefined;
}

function jsDocTag(doc: JSDoc | undefined, name: string): string | undefined {
  return doc
    ?.getTags()
    .find((tag) => tag.getTagName() === name)
    ?.getComment()
    ?.toString()
    .trim();
}

function getJsDocs(node: TsNode | undefined): JSDoc[] {
  if (!node) return [];
  if (
    Node.isInterfaceDeclaration(node) ||
    Node.isTypeAliasDeclaration(node) ||
    Node.isClassDeclaration(node) ||
    Node.isFunctionDeclaration(node) ||
    Node.isVariableStatement(node)
  ) {
    return node.getJsDocs();
  }
  if (Node.isVariableDeclaration(node)) {
    return node.getVariableStatement()?.getJsDocs() ?? [];
  }
  return [];
}

function extractJsDoc(node: TsNode | undefined): {
  jsDoc?: string;
  deprecated?: string;
} {
  const doc = getJsDocs(node)[0];
  return {
    jsDoc: doc ? getJsDocCommentText(doc) : undefined,
    deprecated: jsDocTag(doc, "deprecated"),
  };
}

function propertyJsDocMeta(node: TsNode | undefined): {
  description?: string;
  default?: string;
  deprecated?: string;
} {
  if (!node || !("getJsDocs" in node)) return {};
  const doc = node.getJsDocs?.()[0];
  if (!doc) return {};

  return {
    description: getJsDocCommentText(doc),
    default: jsDocTag(doc, "default"),
    deprecated: jsDocTag(doc, "deprecated"),
  };
}

function propertyDeclarationsJsDocMeta(declarations: TsNode[]): {
  description?: string;
  default?: string;
  deprecated?: string;
} {
  return declarations.reduce<{
    description?: string;
    default?: string;
    deprecated?: string;
  }>((meta, declaration) => {
    const declarationMeta = propertyJsDocMeta(declaration);
    return {
      description: meta.description ?? declarationMeta.description,
      default: meta.default ?? declarationMeta.default,
      deprecated: meta.deprecated ?? declarationMeta.deprecated,
    };
  }, {});
}

function processTypeOrInterface(
  declaration: InterfaceDeclaration | TypeAliasDeclaration,
  typeName: string,
): TypeDoc | undefined {
  return processTypeProperties(declaration.getType(), typeName, declaration);
}

function isInheritedParameterProp(prop: TsMorphSymbol): boolean {
  const declarations = prop.getDeclarations();
  if (declarations.length === 0) return false;

  return declarations.every((decl) => {
    const filePath = decl.getSourceFile().getFilePath();
    return (
      filePath.includes("node_modules/@types/react") ||
      filePath.includes("node_modules/react-textarea-autosize") ||
      filePath.includes("node_modules/csstype") ||
      filePath.includes("node_modules/tw-")
    );
  });
}

function typeDisplayName(type: Type, fallback: string): string {
  const name = type.getAliasSymbol()?.getName() ?? type.getSymbol()?.getName();
  if (!name || name === "__type") return fallback;
  return name;
}

function isInlineObjectTypeText(typeText: string): boolean {
  const text = typeText.trim();
  return text.startsWith("{") || text.startsWith("| {");
}

function parameterTypeLabel(
  typeText: string,
  children: ParameterDef["children"] | undefined,
  fallback: string,
): string {
  if (children && isInlineObjectTypeText(typeText)) return fallback;
  return typeText;
}

function propertyTypePath(ownerTypeName: string, propertyName: string): string {
  return `${ownerTypeName}["${propertyName}"]`;
}

function nonNullableUnionTypes(type: Type): Type[] {
  if (!type.isUnion()) return [type];
  return type
    .getUnionTypes()
    .filter((unionType) => !unionType.isUndefined() && !unionType.isNull());
}

function typeIncludesUndefined(type: Type): boolean {
  return (
    type.isUndefined() || type.getUnionTypes().some((t) => t.isUndefined())
  );
}

function isPrimitiveType(type: Type): boolean {
  return (
    type.isString() ||
    type.isNumber() ||
    type.isBoolean() ||
    type.isStringLiteral() ||
    type.isNumberLiteral() ||
    type.isBooleanLiteral() ||
    type.isUndefined() ||
    type.isNull()
  );
}

function symbolHasNonNeverDeclaration(symbol: TsMorphSymbol): boolean {
  return symbol.getDeclarations().some((declaration) => {
    const typeText =
      Node.isPropertySignature(declaration) ||
      Node.isPropertyDeclaration(declaration)
        ? declarationTypeText(declaration)
        : symbol.getTypeAtLocation(declaration).getText(declaration);
    return cleanTypeText(typeText) !== "never";
  });
}

function documentableProperties(type: Type): TsMorphSymbol[] {
  const directProperties = type.getProperties();
  if (!type.isUnion() || directProperties.length > 0) return directProperties;

  const types = nonNullableUnionTypes(type);
  if (types.length > 3) return directProperties;

  const properties = new Map<string, TsMorphSymbol>();

  for (const currentType of types) {
    for (const prop of currentType.getProperties()) {
      const name = prop.getName();
      const existing = properties.get(name);
      if (
        !existing ||
        (!symbolHasNonNeverDeclaration(existing) &&
          symbolHasNonNeverDeclaration(prop))
      ) {
        properties.set(name, prop);
      }
    }
  }

  if (properties.size > 30) return directProperties;

  return [...properties.values()];
}

function shouldExpandChildType(type: Type, typeText: string): boolean {
  if (type.isArray() || type.isTuple()) {
    return false;
  }

  const candidateTypes = nonNullableUnionTypes(type);
  if (candidateTypes.length === 0) return false;

  if (candidateTypes.every(isPrimitiveType)) {
    return false;
  }

  if (
    type.isUnion() &&
    candidateTypes.some((unionType) => isPrimitiveType(unionType))
  ) {
    return false;
  }

  if (type.getCallSignatures().length > 0) return false;
  if (typeText.includes("ReactNode") || typeText.startsWith("React.")) {
    return false;
  }

  const childProps = documentableProperties(type)
    .filter((childProp) => !isInheritedParameterProp(childProp))
    .filter((childProp) => !childProp.getName().startsWith("__"));

  return childProps.length > 0 && childProps.length <= 30;
}

function processTypeChildren(
  type: Type,
  typeName: string,
  location: TsNode,
  depth: number,
): ParameterDef["children"] | undefined {
  if (depth >= 3) return undefined;
  const childDoc = processTypeProperties(type, typeName, location, depth + 1);
  if (!childDoc || childDoc.parameters.length === 0) return undefined;
  return [childDoc];
}

function parameterFromProperty(
  prop: TsMorphSymbol,
  location: TsNode,
  depth: number,
  ownerTypeName: string,
): ParameterDef | undefined {
  if (isInheritedParameterProp(prop)) return undefined;

  const name = prop.getName();
  if (name.startsWith("__")) return undefined;
  if (name === "tw") return undefined;

  const declarations = prop.getDeclarations();
  const decl =
    declarations.find((declaration) => {
      const typeText =
        Node.isPropertySignature(declaration) ||
        Node.isPropertyDeclaration(declaration)
          ? declarationTypeText(declaration)
          : prop.getTypeAtLocation(declaration).getText(declaration);
      return cleanTypeText(typeText) !== "never";
    }) ?? declarations[0];
  if (
    name === "children" &&
    decl?.getSourceFile().getFilePath().includes("node_modules/")
  ) {
    return undefined;
  }
  const propType = decl
    ? prop.getTypeAtLocation(decl)
    : prop.getTypeAtLocation(location);
  const typeText = cleanTypeText(
    decl && (Node.isPropertySignature(decl) || Node.isPropertyDeclaration(decl))
      ? declarationTypeText(decl)
      : propType.getText(decl ?? location),
  );
  const childTypeName = typeDisplayName(
    propType,
    propertyTypePath(ownerTypeName, name),
  );
  const children = shouldExpandChildType(propType, typeText)
    ? processTypeChildren(propType, childTypeName, decl ?? location, depth)
    : undefined;
  const param: ParameterDef = {
    name,
    type: parameterTypeLabel(typeText, children, childTypeName),
  };

  if (prop.isOptional() || typeIncludesUndefined(propType)) {
    param.required = false;
  } else if (
    decl &&
    ((Node.isPropertySignature(decl) && !decl.hasQuestionToken()) ||
      (Node.isPropertyDeclaration(decl) && !decl.hasQuestionToken()))
  ) {
    param.required = true;
  } else {
    param.required = !prop.isOptional();
  }

  const jsDoc = propertyDeclarationsJsDocMeta(declarations);
  if (jsDoc.description) param.description = jsDoc.description;
  if (jsDoc.default) param.default = jsDoc.default;
  if (jsDoc.deprecated) param.deprecated = jsDoc.deprecated;

  if (children) param.children = children;

  return param;
}

function processTypeProperties(
  type: Type,
  typeName: string,
  location: TsNode,
  depth = 0,
): TypeDoc | undefined {
  const properties = documentableProperties(type)
    .map((prop) => parameterFromProperty(prop, location, depth, typeName))
    .filter((param): param is ParameterDef => Boolean(param));
  if (properties.length === 0) return undefined;

  return {
    type: typeName,
    parameters: properties,
  };
}

function parameterFromSignatureParameter(
  parameter: TsMorphSymbol,
  location: TsNode,
  depth: number,
): ParameterDef | undefined {
  const decl = parameter.getDeclarations()[0];
  const parameterType = decl
    ? parameter.getTypeAtLocation(decl)
    : parameter.getTypeAtLocation(location);
  const typeText = cleanTypeText(parameterType.getText(decl ?? location));
  let name = parameter.getName();
  if (decl && Node.isParameterDeclaration(decl)) {
    const nameNode = decl.getNameNode();
    if (Node.isObjectBindingPattern(nameNode)) {
      name = typeText.endsWith("Props") ? "props" : "options";
    }
  }
  const param: ParameterDef = {
    name,
    type: typeText,
    required: !parameter.isOptional(),
  };

  if (decl && Node.isParameterDeclaration(decl)) {
    param.required =
      !decl.hasQuestionToken() &&
      !decl.hasInitializer() &&
      !decl.isRestParameter();
  }

  const jsDoc = propertyJsDocMeta(decl);
  if (jsDoc.description) param.description = jsDoc.description;
  if (jsDoc.default) param.default = jsDoc.default;
  if (jsDoc.deprecated) param.deprecated = jsDoc.deprecated;

  if (shouldExpandChildType(parameterType, typeText)) {
    param.children = processTypeChildren(
      parameterType,
      typeDisplayName(parameterType, typeText),
      decl ?? location,
      depth,
    );
  }

  return param;
}

function processCallableDeclaration(
  declaration: TsNode,
  typeName: string,
): TypeDoc | undefined {
  const signature = declaration.getType().getCallSignatures()[0];
  if (!signature) return undefined;

  const parameters = signature
    .getParameters()
    .map((parameter) =>
      parameterFromSignatureParameter(parameter, declaration, 0),
    )
    .filter((param): param is ParameterDef => Boolean(param));

  if (parameters.length === 0) return undefined;
  return { type: typeName, parameters };
}

function getComponentPropsType(declaration: TsNode): Type | undefined {
  const type = declaration.getType();
  const parameter = type.getCallSignatures()[0]?.getParameters()[0];
  const parameterDeclaration = parameter?.getDeclarations()[0];
  if (parameterDeclaration) {
    return parameter.getTypeAtLocation(parameterDeclaration);
  }

  return undefined;
}

function processComponentDeclaration(
  declaration: TsNode,
  typeName: string,
): TypeDoc | undefined {
  const propsType = getComponentPropsType(declaration);
  if (!propsType) return undefined;
  return processTypeProperties(propsType, `${typeName} props`, declaration);
}

function classTypeDoc(
  declaration: TsNode,
  typeName: string,
): TypeDoc | undefined {
  if (!Node.isClassDeclaration(declaration)) return undefined;

  const parameters: ParameterDef[] = [];

  for (const ctor of declaration.getConstructors()) {
    if (!isPublicClassMember(ctor)) continue;
    parameters.push({
      name: "constructor",
      type: `(${ctor.getParameters().map(parameterSignature).join(", ")}) => ${typeName}`,
      description: "",
    });
  }

  for (const property of declaration.getProperties()) {
    if (!isPublicClassMember(property)) continue;
    parameters.push({
      name: `${classMemberPrefix(property)}${property.getName()}`,
      type: declarationTypeText(property),
      description: "",
    });
  }

  for (const method of declaration.getMethods()) {
    if (!isPublicClassMember(method)) continue;
    parameters.push({
      name: `${classMemberPrefix(method)}${method.getName()}`,
      type: `(${method.getParameters().map(parameterSignature).join(", ")}) => ${returnTypeText(method)}`,
      description: "",
    });
  }

  if (parameters.length === 0) return undefined;
  return { type: typeName, parameters };
}

function processExportDeclaration(
  declaration: TsNode | undefined,
  item: ExportInfo,
): TypeDoc | undefined {
  if (!declaration) return undefined;
  if (
    Node.isInterfaceDeclaration(declaration) ||
    Node.isTypeAliasDeclaration(declaration)
  ) {
    return processTypeOrInterface(declaration, item.name);
  }
  if (item.kind === "component") {
    return processComponentDeclaration(declaration, item.name);
  }
  if (item.kind === "function") {
    return processCallableDeclaration(declaration, item.name);
  }
  return classTypeDoc(declaration, item.name);
}

function addTypeDocsFromSourceFile(
  typeDocs: Map<string, TypeDoc>,
  sourceFilePath: string,
): void {
  const sourceFile =
    project.getSourceFile(sourceFilePath) ??
    project.addSourceFileAtPath(sourceFilePath);

  sourceFile.getExportedDeclarations().forEach((declarations, name) => {
    for (const rawDeclaration of declarations) {
      const declaration = resolveAliasedDeclaration(rawDeclaration);
      if (
        Node.isInterfaceDeclaration(declaration) ||
        Node.isTypeAliasDeclaration(declaration)
      ) {
        const typeInfo = processTypeOrInterface(declaration, name);
        if (typeInfo) typeDocs.set(name, typeInfo);
      }
    }
  });
}

export function primitivePartTypeDocName(
  primitiveName: string,
  part: string,
): string {
  return `${primitiveName}${part}Props`;
}

function primitiveModuleSourceFile(primitiveName: string) {
  const cached = primitiveSourceFiles.get(primitiveName);
  if (cached) return cached;

  const index =
    project.getSourceFile(REACT_INDEX) ??
    project.addSourceFileAtPath(REACT_INDEX);
  const exportDecl = index
    .getExportDeclarations()
    .find((decl) => decl.getNamespaceExport()?.getName() === primitiveName);
  const moduleSpec = exportDecl?.getModuleSpecifierValue();
  if (!moduleSpec) return undefined;

  const modulePath = path.join(
    REPO_ROOT,
    "packages/react/src",
    moduleSpec.replace(/^\.\//, ""),
  );
  const sourcePath = [`${modulePath}.ts`, `${modulePath}.tsx`].find((file) =>
    fs.existsSync(file),
  );
  if (!sourcePath) return undefined;

  const sourceFile =
    project.getSourceFile(sourcePath) ??
    project.addSourceFileAtPath(sourcePath);
  primitiveSourceFiles.set(primitiveName, sourceFile);
  return sourceFile;
}

function primitivePartTypeDoc(
  primitiveName: string,
  part: string,
): TypeDoc | undefined {
  const sourceFile = primitiveModuleSourceFile(primitiveName);
  const declaration = chooseDeclaration(
    sourceFile?.getExportedDeclarations().get(part) ?? [],
  );
  if (!declaration) return undefined;

  const localName =
    declaration.getSymbol()?.getName() ??
    ("getName" in declaration ? declaration.getName?.() : undefined);
  if (!localName) return undefined;

  const namespace = declaration
    .getSourceFile()
    .getModules()
    .find((module) => module.getName() === localName);
  const propsType = namespace
    ?.getTypeAliases()
    .find((typeAlias) => typeAlias.getName() === "Props");
  const typeName = primitivePartTypeDocName(primitiveName, part);

  if (propsType) {
    return processTypeOrInterface(propsType, typeName);
  }

  const componentDoc = processComponentDeclaration(declaration, typeName);
  return componentDoc ? { ...componentDoc, type: typeName } : undefined;
}

function addPrimitivePartTypeDocs(
  typeDocs: Map<string, TypeDoc>,
  item: ExportInfo,
): void {
  if (item.section !== "primitives") return;

  for (const part of readPrimitiveParts(item.name)) {
    const name = primitivePartTypeDocName(item.name, part);
    if (typeDocs.has(name)) continue;
    const typeInfo = primitivePartTypeDoc(item.name, part);
    if (typeInfo) typeDocs.set(name, typeInfo);
  }
}

export function writeTypeDocs(exports: ExportInfo[]): Set<string> {
  const typeDocs = new Map<string, TypeDoc>();

  addTypeDocsFromSourceFile(typeDocs, TYPE_DOCS_INPUT);
  for (const item of exports) {
    addPrimitivePartTypeDocs(typeDocs, item);
    if (!item.sourcePath) continue;
    if (typeDocs.has(item.name)) continue;
    const filePath = path.join(REPO_ROOT, item.sourcePath);
    if (!fs.existsSync(filePath)) continue;
    const sourceFile =
      project.getSourceFile(filePath) ?? project.addSourceFileAtPath(filePath);
    const declaration = chooseDeclaration(
      sourceFile.getExportedDeclarations().get(item.name) ?? [],
    );
    const typeInfo = processExportDeclaration(declaration, item);
    if (typeInfo) {
      typeDocs.set(item.name, typeInfo);
    } else {
      addTypeDocsFromSourceFile(typeDocs, filePath);
    }
  }

  writeTypeDocsFile(TYPE_DOCS_OUTPUT, typeDocs, (name) => name);
  return new Set(typeDocs.keys());
}

export function typeDocBindingForIntegration(
  slug: string,
  name: string,
): string {
  return `${slug.replace(/-([a-z])/g, (_, char: string) => char.toUpperCase())}_${name}`;
}

export function writeTypeDocsFile(
  outputPath: string,
  typeDocs: Map<string, TypeDoc>,
  bindingForName: (name: string) => string,
): void {
  const output = [
    "// AUTO-GENERATED by scripts/generate-docs.mts",
    "// Do not edit manually.",
    "",
    ...[...typeDocs.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(
        ([name, type]) =>
          `export const ${bindingForName(name)} = ${JSON.stringify(type, null, 2)};\n`,
      ),
  ].join("\n");

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, output);
}

export function collectExportTypeDocs(
  exports: ExportInfo[],
): Map<string, TypeDoc> {
  const typeDocs = new Map<string, TypeDoc>();

  for (const item of exports) {
    if (!item.sourcePath) continue;
    if (typeDocs.has(item.name)) continue;
    const filePath = path.join(REPO_ROOT, item.sourcePath);
    if (!fs.existsSync(filePath)) continue;
    const sourceFile =
      project.getSourceFile(filePath) ?? project.addSourceFileAtPath(filePath);
    const declaration = chooseDeclaration(
      sourceFile.getExportedDeclarations().get(item.name) ?? [],
    );
    if (
      Node.isTypeAliasDeclaration(declaration) &&
      nonNullableUnionTypes(declaration.getType()).every(isPrimitiveType)
    ) {
      continue;
    }

    const typeInfo = processExportDeclaration(declaration, item);
    if (typeInfo) {
      typeDocs.set(item.name, typeInfo);
    }
  }

  return typeDocs;
}

function getExportEntries(decl: ExportDeclaration): ExportEntry[] {
  const namespaceExport = decl.getNamespaceExport();
  if (namespaceExport) {
    return [{ name: namespaceExport.getName(), exportNode: decl }];
  }

  return decl.getNamedExports().map((specifier) => ({
    name: specifier.getAliasNode()?.getText() ?? specifier.getName(),
    exportNode: decl,
    specifier,
  }));
}

function kebabCase(value: string): string {
  return value
    .replace(/^unstable_/, "unstable-")
    .replace(/Primitive$/, "")
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1-$2")
    .toLowerCase();
}

function supportingTypeRole(kind: ExportKind): ExportInfo["pageRole"] {
  return kind === "interface" || kind === "type"
    ? "supporting-type"
    : "primary";
}

function pageForToolExport(name: string): string {
  if (name === "DataRenderers") {
    return "rendering";
  }
  if (
    name.includes("ToolArgs") ||
    name.includes("ToolExecution") ||
    name.includes("ToolCall")
  ) {
    return "status";
  }
  if (
    name.includes("ToolUI") ||
    name.includes("DataUI") ||
    name === "makeAssistantDataUI" ||
    name === "useAssistantDataUI"
  ) {
    return "rendering";
  }
  return "definition";
}

function classification(
  section: ApiSection,
  page: string,
  role: ExportInfo["pageRole"],
  rule: string,
  confidence: Classification["confidence"],
  reason: string,
): Classification {
  return { section, page, role, rule, confidence, reason };
}

function toolsRule(input: ClassificationInput): Classification | undefined {
  const { name, kind } = input;
  if (
    name === "tool" ||
    name === "Tool" ||
    name === "Toolkit" ||
    name === "ToolDefinition" ||
    name === "makeAssistantTool" ||
    name === "makeAssistantToolUI" ||
    name === "makeAssistantDataUI" ||
    name === "useAssistantTool" ||
    name === "useAssistantToolUI" ||
    name === "useAssistantDataUI" ||
    name === "useToolArgsStatus" ||
    name === "Tools" ||
    name === "DataRenderers" ||
    name.includes("AssistantTool") ||
    name.includes("AssistantDataUI") ||
    name.includes("ToolArgs") ||
    name.includes("ToolExecution") ||
    name.includes("ToolCall")
  ) {
    return classification(
      "tools",
      pageForToolExport(name),
      name === "Toolkit" || name === "ToolDefinition"
        ? "primary"
        : supportingTypeRole(kind),
      "feature:tools",
      "strong",
      "tool definition, toolkit, rendering, or status export",
    );
  }
}

function transportRule(input: ClassificationInput): Classification | undefined {
  const { name } = input;
  if (
    name.includes("AssistantTransport") ||
    name.includes("SendCommands") ||
    name.includes("Frame") ||
    name.startsWith("Serialized") ||
    name === "FRAME_MESSAGE_CHANNEL"
  ) {
    return classification(
      "transport",
      name.includes("Frame") ||
        name.startsWith("Serialized") ||
        name === "FRAME_MESSAGE_CHANNEL"
        ? "frame"
        : "assistant-transport",
      "primary",
      "feature:transport",
      "strong",
      "assistant transport, frame, or protocol export",
    );
  }
}

function externalStoreRule(
  input: ClassificationInput,
): Classification | undefined {
  const { name, kind } = input;
  if (
    name.includes("ExternalStore") ||
    name.includes("ExternalThread") ||
    name.includes("ExternalMessage") ||
    name.includes("MessageConverter") ||
    name === "getExternalStoreMessages" ||
    name === "bindExternalStoreMessage" ||
    name === "unstable_convertExternalMessages" ||
    name === "unstable_createMessageConverter"
  ) {
    return classification(
      "external-store",
      name.includes("Message") || name.includes("Converter")
        ? "message-conversion"
        : "runtime",
      PRIMARY_FEATURE_TYPES.has(name) ? "primary" : supportingTypeRole(kind),
      "feature:external-store",
      "strong",
      "external store runtime or message conversion export",
    );
  }
}

function modelContextRule(
  input: ClassificationInput,
): Classification | undefined {
  const { name, kind } = input;
  if (
    name.includes("ModelContext") ||
    name.includes("AssistantContext") ||
    name.includes("AssistantInstructions") ||
    name.includes("InlineRender") ||
    name === "mergeModelContexts" ||
    name === "ModelContextRegistry"
  ) {
    return classification(
      "model-context",
      name.includes("Registry") ? "registry" : "context",
      supportingTypeRole(kind),
      "feature:model-context",
      "strong",
      "model context, instructions, context, or registry export",
    );
  }
}

function voiceRule(input: ClassificationInput): Classification | undefined {
  const { name, kind } = input;
  if (
    name.includes("Voice") ||
    name.includes("Speech") ||
    name.includes("Dictation") ||
    name === "createVoiceSession"
  ) {
    return classification(
      "voice",
      name.includes("Speech") || name.includes("Dictation")
        ? "speech-dictation"
        : "session",
      PRIMARY_FEATURE_TYPES.has(name) ? "primary" : supportingTypeRole(kind),
      "feature:voice",
      "strong",
      "voice, speech, or dictation export",
    );
  }
}

function kindRule(input: ClassificationInput): Classification | undefined {
  const { name, sourcePath } = input;
  let section: ApiSection | undefined;
  let forcedPrimary = false;
  if (
    name === "AuiIf" ||
    name === "AssistantIf" ||
    name.endsWith("Primitive")
  ) {
    section = "primitives";
  } else if (/^(unstable_)?use[A-Z]/.test(name)) {
    section = "hooks";
  } else if (name.endsWith("Provider")) {
    section = "context-providers";
  } else if (/Adapter(s)?$/.test(name)) {
    section = "adapters";
  } else if (/(Runtime|State)$/.test(name)) {
    section = "runtimes";
  } else if (
    [
      "ChatModelRunOptions",
      "ChatModelRunResult",
      "ChatModelRunUpdate",
      "CreateStartRunConfig",
      "CreateResumeRunConfig",
      "LanguageModelConfig",
    ].includes(name)
  ) {
    section = "adapters";
    forcedPrimary = true;
  }

  if (!section) return undefined;
  const placement = inferKindDocPlacement(name, section, sourcePath);
  if (!placement) return undefined;
  return classification(
    section,
    placement.page,
    forcedPrimary ? "primary" : placement.role,
    `kind:${section}`,
    "medium",
    `${section} export matched by public API shape`,
  );
}

function fallbackRule(input: ClassificationInput): Classification {
  return classification(
    "utilities",
    "miscellaneous",
    supportingTypeRole(input.kind),
    "fallback:utilities",
    "fallback",
    "no feature or kind rule matched",
  );
}

const CLASSIFICATION_RULES: ClassificationRule[] = [
  toolsRule,
  transportRule,
  externalStoreRule,
  modelContextRule,
  voiceRule,
  kindRule,
];

function classifyExport(input: ClassificationInput): Classification {
  for (const rule of CLASSIFICATION_RULES) {
    const result = rule(input);
    if (result) return result;
  }
  return fallbackRule(input);
}

function inferKindDocPlacement(
  name: string,
  section: ApiSection,
  sourcePath?: string,
): DocPlacement | undefined {
  const source = (sourcePath ?? "").replaceAll("\\", "/");
  if (section === "primitives") {
    if (name === "AuiIf") return { page: "assistant-if", role: "primary" };
    if (name === "AssistantIf")
      return { page: "assistant-if", role: "related" };
    return { page: kebabCase(name), role: "primary" };
  }

  if (section === "hooks") {
    if (STATE_HOOKS.has(name)) {
      return { page: "state", role: "primary" };
    }
    if (RUNTIME_CREATION_HOOKS.has(name)) {
      return { page: "runtimes", role: "primary" };
    }
    if (COMPOSER_TRIGGER_HOOKS.has(name)) {
      return { page: "composer-triggers", role: "primary" };
    }
    if (source.includes("assistant-transport")) {
      return { page: "assistant-transport", role: "primary" };
    }
    if (source.includes("voice") || name.includes("Voice")) {
      return { page: "voice", role: "primary" };
    }
    if (
      name.includes("AssistantTool") ||
      name.includes("AssistantData") ||
      name.includes("AssistantInstructions") ||
      name.includes("AssistantContext") ||
      name.includes("InlineRender") ||
      name.includes("Interactable") ||
      name.includes("ToolArgs") ||
      source.includes("model-context")
    ) {
      return { page: "model-context", role: "primary" };
    }
    if (
      source.includes("/primitives/") ||
      source.includes("/legacy-runtime/hooks/") ||
      source.includes("/runtimes/cloud/") ||
      name.includes("Attachment") ||
      name.includes("Composer") ||
      name.includes("Message") ||
      name.includes("Quote") ||
      name.includes("RuntimeAdapters") ||
      name.includes("Scroll") ||
      name.includes("Thread") ||
      name.includes("Viewport")
    ) {
      return { page: "primitives", role: "primary" };
    }
    return undefined;
  }

  if (section === "adapters") {
    if (
      name === "ChatModelAdapter" ||
      name.includes("ChatModel") ||
      name.includes("LanguageModel") ||
      name.includes("RunConfig")
    ) {
      return { page: "model", role: "primary" };
    }
    if (name === "FeedbackAdapter") {
      return { page: "feedback-speech", role: "primary" };
    }
    if (name.includes("Attachment"))
      return { page: "attachments", role: "primary" };
    if (
      name.includes("Thread") ||
      name.includes("History") ||
      name.includes("ExternalStore") ||
      name.includes("MessageFormat")
    ) {
      return { page: "persistence", role: "primary" };
    }
    if (name.includes("Voice")) return { page: "voice", role: "primary" };
    if (name.includes("Suggestion"))
      return { page: "suggestions", role: "primary" };
    if (name.includes("RuntimeAdapter"))
      return { page: "runtime", role: "primary" };
    return undefined;
  }

  if (section === "context-providers") {
    if (name === "AssistantRuntimeProvider") {
      return { page: "assistant-runtime-provider", role: "primary" };
    }
    if (name === "AuiProvider") {
      return { page: "assistant-runtime-provider", role: "related" };
    }
    if (name.includes("Frame"))
      return { page: "assistant-frame-provider", role: "primary" };
    if (name.includes("ModelContext")) {
      return { page: "model-context-provider", role: "primary" };
    }
    return { page: "scoped-providers", role: "primary" };
  }

  if (section === "runtimes") {
    if (name === "PartState" || name === "EnrichedPartState") {
      return { page: "message-part-runtime", role: "primary" };
    }
    if (name.includes("Assistant"))
      return { page: "assistant-runtime", role: "primary" };
    if (name.includes("ThreadListItem")) {
      return { page: "thread-list-item-runtime", role: "primary" };
    }
    if (name.includes("ThreadList")) {
      return { page: "thread-list-runtime", role: "primary" };
    }
    if (name.includes("Thread"))
      return { page: "thread-runtime", role: "primary" };
    if (name.includes("Composer"))
      return { page: "composer-runtime", role: "primary" };
    if (name.includes("MessagePart")) {
      return { page: "message-part-runtime", role: "primary" };
    }
    if (name.includes("Message"))
      return { page: "message-runtime", role: "primary" };
    if (name.includes("Attachment")) {
      return { page: "attachment-runtime", role: "primary" };
    }
    if (name.includes("Voice")) return { page: "voice-state", role: "primary" };
    if (name.includes("Dictation"))
      return { page: "dictation-state", role: "primary" };
    if (name.includes("Queue")) return { page: "queue-state", role: "primary" };
  }

  return undefined;
}

function classifyKind(node: TsNode | undefined, name: string): ExportKind {
  if (!node) return "value";
  if (Node.isClassDeclaration(node)) return "class";
  if (name.endsWith("Provider")) return "component";
  if (Node.isInterfaceDeclaration(node)) return "interface";
  if (Node.isTypeAliasDeclaration(node)) return "type";
  if (Node.isFunctionDeclaration(node)) return "function";
  if (Node.isModuleDeclaration(node)) return "namespace";
  if (Node.isVariableDeclaration(node)) {
    if (/^[A-Z]/.test(name)) return "component";
    if (/^(unstable_)?use[A-Z]/.test(name)) return "function";
  }
  if (Node.isBindingElement(node) && /^(unstable_)?use[A-Z]/.test(name)) {
    return "function";
  }
  return "value";
}

function declarationPriority(node: TsNode): number {
  if (Node.isBindingElement(node)) return 0;
  if (Node.isVariableDeclaration(node)) return 0;
  if (Node.isClassDeclaration(node)) return 1;
  if (Node.isFunctionDeclaration(node)) return 2;
  if (Node.isInterfaceDeclaration(node)) return 3;
  if (Node.isTypeAliasDeclaration(node)) return 4;
  if (Node.isModuleDeclaration(node)) return 5;
  return 6;
}

function chooseDeclaration(declarations: TsNode[]): TsNode | undefined {
  return declarations
    .map(resolveAliasedDeclaration)
    .sort((a, b) => declarationPriority(a) - declarationPriority(b))[0];
}

function resolveDeclaration(entry: ExportEntry): TsNode | undefined {
  const symbols = [
    entry.specifier?.getSymbol()?.getAliasedSymbol(),
    entry.specifier?.getSymbol(),
    entry.exportNode.getNamespaceExport()?.getSymbol()?.getAliasedSymbol(),
    entry.exportNode.getNamespaceExport()?.getSymbol(),
  ];

  for (const symbol of symbols) {
    const declaration = chooseDeclaration(symbol?.getDeclarations() ?? []);
    if (declaration) return declaration;
  }

  return undefined;
}

function getLeadingCommentText(node: TsNode): string {
  return node
    .getLeadingCommentRanges()
    .map((range) => range.getText())
    .join("\n");
}

function exportEntryDeprecated(entry: ExportEntry): string | undefined {
  const comments = [
    entry.specifier ? getLeadingCommentText(entry.specifier) : "",
    getLeadingCommentText(entry.exportNode),
  ].join("\n");
  if (!comments.includes("@deprecated")) return undefined;
  return comments.match(/@deprecated\s+([^*\n]+)/)?.[1]?.trim() || "true";
}

function relativeToRepo(filePath: string | undefined): string | undefined {
  if (!filePath) return undefined;
  return path.relative(REPO_ROOT, filePath);
}

function discoverExports(): ExportInfo[] {
  const sourceFile = project.addSourceFileAtPath(REACT_INDEX);
  const seen = new Set<string>();
  const exports: ExportInfo[] = [];

  const addExport = (
    name: string,
    resolved: TsNode | undefined,
    deprecated?: string,
  ) => {
    if (seen.has(name) || IGNORED_EXPORTS.has(name)) return;

    const sourcePath = relativeToRepo(resolved?.getSourceFile().getFilePath());
    const docs = extractJsDoc(resolved);
    const kind = classifyKind(resolved, name);
    const placement = classifyExport({ name, kind, sourcePath });
    const signature = extractSignature(resolved, name);

    seen.add(name);
    exports.push({
      name,
      section: placement.section,
      kind,
      page: placement.page,
      pageRole: placement.role,
      sourcePath,
      jsDoc: docs.jsDoc,
      deprecated: deprecated ?? docs.deprecated,
      signature,
      classificationRule: placement.rule,
      classificationConfidence: placement.confidence,
      classificationReason: placement.reason,
    });
  };

  for (const decl of sourceFile.getExportDeclarations()) {
    for (const entry of getExportEntries(decl)) {
      addExport(
        entry.name,
        resolveDeclaration(entry),
        exportEntryDeprecated(entry),
      );
    }
  }

  for (const [name, declarations] of sourceFile.getExportedDeclarations()) {
    addExport(name, chooseDeclaration(declarations));
  }

  return exports.sort((a, b) => a.name.localeCompare(b.name));
}

export function discoverIntegrationExports(
  entryPath: string,
  page: string,
): ExportInfo[] {
  const sourceFile =
    project.getSourceFile(entryPath) ?? project.addSourceFileAtPath(entryPath);
  const seen = new Set<string>();
  const exports: ExportInfo[] = [];

  const addExport = (
    name: string,
    resolved: TsNode | undefined,
    deprecated?: string,
  ) => {
    if (seen.has(name) || IGNORED_EXPORTS.has(name)) return;

    const sourcePath = relativeToRepo(resolved?.getSourceFile().getFilePath());
    const docs = extractJsDoc(resolved);
    const kind = classifyKind(resolved, name);
    if (kind === "interface" || kind === "type") return;

    const signature = extractSignature(resolved, name);

    seen.add(name);
    exports.push({
      name,
      section: "integrations",
      kind,
      page,
      pageRole: "primary",
      sourcePath,
      jsDoc: docs.jsDoc,
      deprecated: deprecated ?? docs.deprecated,
      signature,
      classificationRule: "integration:package",
      classificationConfidence: "strong",
      classificationReason: "package-level integration export",
    });
  };

  for (const decl of sourceFile.getExportDeclarations()) {
    for (const entry of getExportEntries(decl)) {
      addExport(
        entry.name,
        resolveDeclaration(entry),
        exportEntryDeprecated(entry),
      );
    }
  }
  for (const [name, declarations] of sourceFile.getExportedDeclarations()) {
    addExport(name, chooseDeclaration(declarations));
  }

  return exports.sort((a, b) => a.name.localeCompare(b.name));
}

export function readPrimitiveParts(primitiveName: string): string[] {
  const sourceFile = primitiveModuleSourceFile(primitiveName);
  if (!sourceFile) return [];

  const isPrimitivePart = (name: string) =>
    (/^[A-Z]/.test(name) || /^Unstable_[A-Z]/.test(name)) &&
    !name.includes("Primitive");
  const orderedParts = sourceFile
    .getExportDeclarations()
    .flatMap((decl) =>
      decl.getNamedExports().map((specifier) => {
        return specifier.getAliasNode()?.getText() ?? specifier.getName();
      }),
    )
    .filter(isPrimitivePart);
  const fallbackParts = [...sourceFile.getExportedDeclarations().keys()]
    .filter(isPrimitivePart)
    .filter((name) => !orderedParts.includes(name))
    .sort((a, b) => a.localeCompare(b));

  return [...new Set([...orderedParts, ...fallbackParts])].sort((a, b) => {
    if (a === "Root") return -1;
    if (b === "Root") return 1;
    return 0;
  });
}

export type ApiSurface = { exports: ExportInfo[] };

export function analyzeApiSurface(): ApiSurface {
  return { exports: discoverExports() };
}
