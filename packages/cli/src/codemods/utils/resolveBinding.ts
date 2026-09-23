import type { JSCodeshift } from "jscodeshift";

const patternBinding = (node: any, name: string): any => {
  switch (node?.type) {
    case "Identifier":
      return node.name === name ? node : undefined;
    case "TSParameterProperty":
      return patternBinding(node.parameter, name);
    case "AssignmentPattern":
      return patternBinding(node.left, name);
    case "RestElement":
      return patternBinding(node.argument, name);
    case "ObjectPattern":
      return node.properties
        .map((p: any) => patternBinding(p.value ?? p.argument, name))
        .find(Boolean);
    case "ArrayPattern":
      return node.elements
        .map((p: any) => patternBinding(p, name))
        .find(Boolean);
  }
};

const declarationBinding = (node: any, name: string): any => {
  switch (node?.type) {
    case "ExportNamedDeclaration":
    case "ExportDefaultDeclaration":
      return declarationBinding(node.declaration, name);
    case "VariableDeclaration":
      return node.declarations
        .map((d: any) => patternBinding(d.id, name))
        .find(Boolean);
    case "ImportDeclaration":
      if (node.importKind === "type") return;
      return node.specifiers
        ?.filter((s: any) => s.importKind !== "type")
        .map((s: any) => patternBinding(s.local, name))
        .find(Boolean);
    case "TSTypeAliasDeclaration":
    case "TSInterfaceDeclaration":
    case "TSDeclareFunction":
      return;
    default:
      return patternBinding(node?.id, name);
  }
};

const hoistedBinding = (j: JSCodeshift, body: any, name: string): any => {
  let binding: any;
  j.types.visit(body, {
    visitFunction() {
      return false;
    },
    visitClassDeclaration() {
      return false;
    },
    visitClassExpression() {
      return false;
    },
    visitTSModuleBlock(path) {
      if (path.node !== body) return false;
      this.traverse(path);
      return undefined;
    },
    visitVariableDeclaration(path) {
      if (path.node.kind === "var")
        binding ??= declarationBinding(path.node, name);
      this.traverse(path);
    },
  });
  return binding;
};

// ast-types scopes do not distinguish block-scoped declarations.
export const resolveBinding = (
  j: JSCodeshift,
  path: any,
  name: string,
): any => {
  let child = path;
  for (
    let current = path.parent;
    current;
    child = current, current = current.parent
  ) {
    const node = current.value;
    let binding: any;
    if (Array.isArray(node.params)) {
      binding =
        node.params.map((p: any) => patternBinding(p, name)).find(Boolean) ??
        patternBinding(node.id, name) ??
        (child.value === node.body
          ? hoistedBinding(j, node.body, name)
          : undefined);
    } else if (node.type === "CatchClause") {
      binding = patternBinding(node.param, name);
    } else if (node.type === "ClassExpression") {
      binding = patternBinding(node.id, name);
    } else if (node.type === "ForStatement") {
      binding = declarationBinding(node.init, name);
    } else if (
      node.type === "ForInStatement" ||
      node.type === "ForOfStatement"
    ) {
      binding = declarationBinding(node.left, name);
    } else {
      const statements =
        node.type === "SwitchStatement" && child.value !== node.discriminant
          ? node.cases.flatMap((c: any) => c.consequent)
          : [
                "BlockStatement",
                "Program",
                "StaticBlock",
                "TSModuleBlock",
              ].includes(node.type)
            ? node.body
            : [];
      binding = statements
        .map((s: any) => declarationBinding(s, name))
        .find(Boolean);
      if (
        !binding &&
        ["Program", "StaticBlock", "TSModuleBlock"].includes(node.type)
      ) {
        binding = hoistedBinding(j, node, name);
      }
    }
    if (binding) return binding;
  }
};
