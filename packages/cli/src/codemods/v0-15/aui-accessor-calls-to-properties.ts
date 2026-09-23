import { createTransformer } from "../utils/createTransformer";
import { resolveBinding } from "../utils/resolveBinding";

// Nullary scope accessors that became properties in v0.15. Parameterized
// lookups (e.g. `aui.thread.message({ id })`) stay as real calls.
const NULLARY_SCOPES = new Set([
  "threads",
  "threadListItem",
  "thread",
  "message",
  "part",
  "composer",
  "attachment",
  "modelContext",
  "suggestions",
  "suggestion",
  "chainOfThought",
  "queueItem",
  "tools",
  "dataRenderers",
  "interactables",
  "unstable_interactables",
  "mcp",
  "mcpServer",
  "span",
]);

const AUI_HOOKS = new Set(["useAui", "useAssistantApi"]);

const auiAccessorCallsToProperties = createTransformer(
  ({ j, root, markAsChanged }) => {
    const auiBindings = new Set<any>();
    const hookBindings = new Set<any>();
    root.find(j.ImportDeclaration).forEach((path) => {
      if (!String(path.value.source.value).startsWith("@assistant-ui/")) return;
      for (const specifier of path.value.specifiers ?? []) {
        if (
          j.ImportSpecifier.check(specifier) &&
          j.Identifier.check(specifier.imported) &&
          AUI_HOOKS.has(specifier.imported.name)
        ) {
          hookBindings.add(specifier.local);
        }
      }
    });

    root.find(j.VariableDeclarator).forEach((path: any) => {
      const { id, init } = path.value;
      if (
        j.Identifier.check(id) &&
        init &&
        j.CallExpression.check(init) &&
        j.Identifier.check(init.callee) &&
        (() => {
          const binding = resolveBinding(
            j,
            path.get("init", "callee"),
            init.callee.name,
          );
          return binding
            ? hookBindings.has(binding)
            : AUI_HOOKS.has(init.callee.name);
        })()
      ) {
        auiBindings.add(id);
      }
    });

    const collectParam = (param: any) => {
      const annotation = param?.typeAnnotation?.typeAnnotation;
      if (
        j.Identifier.check(param) &&
        annotation &&
        j.TSTypeReference.check(annotation) &&
        j.Identifier.check(annotation.typeName) &&
        annotation.typeName.name === "AssistantClient"
      ) {
        auiBindings.add(param);
      } else if (
        j.Identifier.check(param) &&
        param.name === "aui" &&
        !annotation
      ) {
        auiBindings.add(param);
      }
    };
    for (const fnType of [
      j.FunctionDeclaration,
      j.FunctionExpression,
      j.ArrowFunctionExpression,
      j.ObjectMethod,
      j.ClassMethod,
    ] as const) {
      root.find(fnType as typeof j.FunctionDeclaration).forEach((path: any) => {
        path.value.params.forEach(collectParam);
      });
    }

    root.find(j.CallExpression).forEach((path: any) => {
      const node = path.value;
      if (node.arguments.length !== 0) return;
      const callee = node.callee;
      if (!j.MemberExpression.check(callee) || callee.computed) return;
      if (!j.Identifier.check(callee.property)) return;
      if (!NULLARY_SCOPES.has(callee.property.name)) return;
      if (!j.Identifier.check(callee.object)) return;
      const binding = resolveBinding(
        j,
        path.get("callee", "object"),
        callee.object.name,
      );
      if (binding ? !auiBindings.has(binding) : callee.object.name !== "aui")
        return;
      j(path).replaceWith(callee);
      markAsChanged();
    });
  },
);

export default auiAccessorCallsToProperties;
