// Custom oxlint JS plugin: tap-hooks.
//
// Provides the `named-resource` rule: requires `resource()` to wrap a named,
// `use`-prefixed hook rather than an inline function. A resource body *is* a
// hook (it calls React's hooks under the rules of hooks), so the convention is:
//
//   const useFoo = () => { ... };
//   const Foo = resource(useFoo);
//
// Extracting to a `use`-prefixed binding means React's stock `rules-of-hooks`
// and `exhaustive-deps` lint the body directly (they recognize hooks by name),
// and the resource gets a stable `fn.name` for keys/devtools. An inline
// `resource(() => {...})` / `resource(function () {...})` is an anonymous
// callback whose body rules-of-hooks skips entirely.
const USE_PREFIX = /^use[A-Z0-9]/;

const namedResourceRule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "require resource() to wrap a named, use-prefixed hook so React's rules-of-hooks lints its body",
    },
  },
  create(context) {
    return {
      CallExpression(node) {
        const callee = node.callee;
        if (callee.type !== "Identifier" || callee.name !== "resource") return;
        const fn = node.arguments[0];
        if (!fn) return;

        if (
          fn.type === "ArrowFunctionExpression" ||
          fn.type === "FunctionExpression"
        ) {
          context.report({
            node: fn,
            message:
              "resource() must wrap a named `use`-prefixed hook, not an inline function. Extract the body: `const useFoo = () => { ... }; const Foo = resource(useFoo);`",
          });
          return;
        }

        if (fn.type === "Identifier" && !USE_PREFIX.test(fn.name)) {
          context.report({
            node: fn,
            message: `resource() must wrap a \`use\`-prefixed hook so React's rules-of-hooks lints it; "${fn.name}" is not use-prefixed.`,
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
