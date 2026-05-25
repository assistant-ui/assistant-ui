// Custom oxlint JS plugin: tap-aware exhaustive-deps.
//
// Wraps `eslint-plugin-react-hooks`'s `exhaustive-deps` rule and filters out
// warnings whose "missing dependency" refers to a value returned by a tap hook
// that's known to be stable across renders:
//   - `tapRef`         → entire return is stable (like `useRef`)
//   - `tapConst`       → entire return is stable
//   - `tapEffectEvent` → entire return is stable (like React's `useEffectEvent`)
//   - `tapState`       → the setter (element 1 of the tuple) is stable (like `useState`)
//
// Why this exists: Biome supported these via `useExhaustiveDependencies`
// `stableResult` config; the upstream React hooks plugin has no equivalent.

import reactHooksPlugin from "eslint-plugin-react-hooks";

const innerRule = reactHooksPlugin.rules["exhaustive-deps"];

const STABLE_TAP_HOOKS_WHOLE = new Set([
  "tapRef",
  "tapConst",
  "tapEffectEvent",
]);
const STABLE_TAP_HOOKS_SETTER = new Set(["tapState"]);

// Pull dep names from the rule's message strings:
//   "has a missing dependency: 'foo'"
//   "has missing dependencies: 'foo' and 'bar'"
//   "has missing dependencies: 'foo', 'bar', and 'baz'"
// Returns [] if the message isn't a missing-deps message.
function extractMissingDeps(message) {
  const match = message.match(/missing depend\w+:\s*(.+?)(?:\.|$)/);
  if (!match) return [];
  const list = match[1];
  return Array.from(list.matchAll(/'([^']+)'/g), (m) => m[1]);
}

function rootIdentifier(depName) {
  const dot = depName.indexOf(".");
  return dot === -1 ? depName : depName.slice(0, dot);
}

function isStableDep(depName, scope) {
  const root = rootIdentifier(depName);
  const variable = findVariable(scope, root);
  if (!variable || !variable.defs || variable.defs.length === 0) return false;

  const def = variable.defs[0];
  const defNode = def.node;
  if (defNode.type !== "VariableDeclarator") return false;

  let init = defNode.init;
  if (!init) return false;
  while (init.type === "TSAsExpression" || init.type === "AsExpression") {
    init = init.expression;
  }
  if (init.type !== "CallExpression") return false;

  const callee = init.callee;
  if (callee.type !== "Identifier") return false;
  const calleeName = callee.name;

  if (STABLE_TAP_HOOKS_WHOLE.has(calleeName)) return true;

  if (STABLE_TAP_HOOKS_SETTER.has(calleeName)) {
    const id = defNode.id;
    // tapState returns [value, setter]; only the setter (index 1) is stable.
    if (
      id.type === "ArrayPattern" &&
      id.elements.length === 2 &&
      id.elements[1] &&
      id.elements[1].type === "Identifier" &&
      id.elements[1].name === root
    ) {
      return true;
    }
  }

  return false;
}

function findVariable(scope, name) {
  for (let s = scope; s; s = s.upper) {
    const v = s.variables.find((v) => v.name === name);
    if (v) return v;
  }
  return null;
}

const wrappedRule = {
  meta: innerRule.meta,
  create(context) {
    // `context.report` is a non-configurable, non-writable data property, so
    // neither a Proxy nor plain assignment on a prototype-derived object can
    // shadow it (strict-mode invariant). `defineProperty` skips that check by
    // defining a fresh own property directly.
    const wrapped = Object.create(context);
    Object.defineProperty(wrapped, "report", {
      value: (descriptor) => {
        const message =
          typeof descriptor.message === "string" ? descriptor.message : "";
        const deps = extractMissingDeps(message);
        if (deps.length > 0) {
          const node = descriptor.node;
          const scope = node
            ? context.sourceCode.getScope(node)
            : context.getScope();
          if (deps.every((d) => isStableDep(d, scope))) return;
        }
        return context.report(descriptor);
      },
      writable: true,
      configurable: true,
      enumerable: true,
    });
    return innerRule.create(wrapped);
  },
};

const plugin = {
  meta: { name: "tap-hooks" },
  rules: {
    "exhaustive-deps": wrappedRule,
  },
};

export default plugin;
