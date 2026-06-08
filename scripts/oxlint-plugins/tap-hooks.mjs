// Custom oxlint JS plugin: tap-hooks.
//
// Provides the `named-resource` rule: requires `resource()` to wrap a *named*
// function so React's rules-of-hooks (which keys on the function name) lints hook
// usage inside resource bodies. Dependency linting uses the built-in
// `react/exhaustive-deps` rule, since the engine hooks use their React names.

// `react/rules-of-hooks` only lints hook calls inside a function it recognizes
// as a component or hook, and it recognizes them *by name*: a PascalCase or
// `use`-prefixed `FunctionDeclaration`/named `FunctionExpression`. A resource
// authored as `resource(() => {...})` or `resource(function () {...})` is an
// anonymous callback to a call expression, so rules-of-hooks skips its body
// entirely. Requiring a named function expression (`resource(function Name()
// {...})`) makes rules-of-hooks kick in (and gives the resource a real
// `fn.name` for keys/devtools).
const PASCAL_OR_USE = /^([A-Z]|use[A-Z0-9])/;

const namedResourceRule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "require resource() to wrap a named function so React's rules-of-hooks lints its body",
    },
  },
  create(context) {
    return {
      CallExpression(node) {
        const callee = node.callee;
        if (callee.type !== "Identifier" || callee.name !== "resource") return;
        const fn = node.arguments[0];
        if (!fn) return;

        const isArrow = fn.type === "ArrowFunctionExpression";
        const isAnonFnExpr = fn.type === "FunctionExpression" && !fn.id;
        if (isArrow || isAnonFnExpr) {
          context.report({
            node: fn,
            message:
              "resource() must wrap a named function expression (e.g. `resource(function MyResource() { ... })`) so React's rules-of-hooks lints hook usage inside it.",
          });
          return;
        }

        if (
          fn.type === "FunctionExpression" &&
          fn.id &&
          !PASCAL_OR_USE.test(fn.id.name)
        ) {
          context.report({
            node: fn.id,
            message: `resource() function name "${fn.id.name}" must be PascalCase or use-prefixed so React's rules-of-hooks recognizes it as a component/hook.`,
          });
        }
      },
    };
  },
};

const plugin = {
  meta: { name: "tap-hooks" },
  rules: {
    "named-resource": namedResourceRule,
  },
};

export default plugin;
