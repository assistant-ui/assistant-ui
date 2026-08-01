import { createTransformer } from "../utils/createTransformer";

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
    const auiNames = new Set(["aui"]);

    root.find(j.VariableDeclarator).forEach((path: any) => {
      const { id, init } = path.value;
      if (
        j.Identifier.check(id) &&
        init &&
        j.CallExpression.check(init) &&
        j.Identifier.check(init.callee) &&
        AUI_HOOKS.has(init.callee.name)
      ) {
        auiNames.add(id.name);
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
        auiNames.add(param.name);
      }
    };
    for (const fnType of [
      j.FunctionDeclaration,
      j.FunctionExpression,
      j.ArrowFunctionExpression,
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
      if (!auiNames.has(callee.object.name)) return;
      j(path).replaceWith(callee);
      markAsChanged();
    });
  },
);

export default auiAccessorCallsToProperties;
