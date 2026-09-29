import { createTransformer } from "../utils/createTransformer";

type ConditionFragment = {
  expression: string;
  negated: boolean;
};

// Map ThreadPrimitive.If props to condition expressions
const threadPropMap: Record<
  string,
  (value: unknown) => ConditionFragment | null
> = {
  empty: (v) => ({
    expression: "s.thread.isEmpty",
    negated: v === false,
  }),
  running: (v) => ({
    expression: "s.thread.isRunning",
    negated: v === false,
  }),
  disabled: (v) => ({
    expression: "s.thread.isDisabled",
    negated: v === false,
  }),
};

// Map MessagePrimitive.If props to condition expressions
const messagePropMap: Record<
  string,
  (value: unknown) => ConditionFragment | null
> = {
  user: () => ({ expression: 's.message.role === "user"', negated: false }),
  assistant: () => ({
    expression: 's.message.role === "assistant"',
    negated: false,
  }),
  system: () => ({
    expression: 's.message.role === "system"',
    negated: false,
  }),
  hasBranches: () => ({
    expression: "s.message.branchCount >= 2",
    negated: false,
  }),
  copied: (v) => ({
    expression: "s.message.isCopied",
    negated: v === false,
  }),
  last: (v) => ({
    expression: "s.message.isLast",
    negated: v === false,
  }),
  lastOrHover: () => ({
    expression: "s.message.isHovering || s.message.isLast",
    negated: false,
  }),
  speaking: (v) => ({
    expression: "s.message.speech != null",
    negated: v === false,
  }),
  hasAttachments: (v) =>
    v === true
      ? {
          expression:
            's.message.role === "user" && !!s.message.attachments?.length',
          negated: false,
        }
      : {
          expression:
            's.message.role !== "user" || !s.message.attachments?.length',
          negated: false,
        },
  hasContent: (v) => ({
    expression: "s.message.parts.length > 0",
    negated: v === false,
  }),
  submittedFeedback: (v) => {
    if (v === null) {
      return {
        expression:
          "(s.message.metadata.submittedFeedback?.type ?? null) === null",
        negated: false,
      };
    }
    return {
      expression: `s.message.metadata.submittedFeedback?.type === "${v}"`,
      negated: false,
    };
  },
};

// Map ComposerPrimitive.If props to condition expressions
const composerPropMap: Record<
  string,
  (value: unknown) => ConditionFragment | null
> = {
  editing: (v) => ({
    expression: "s.composer.isEditing",
    negated: v === false,
  }),
  dictation: (v) => ({
    expression: "s.composer.dictation != null",
    negated: v === false,
  }),
};

const primitiveMap: Record<
  string,
  Record<string, (value: unknown) => ConditionFragment | null>
> = {
  ThreadPrimitive: threadPropMap,
  MessagePrimitive: messagePropMap,
  ComposerPrimitive: composerPropMap,
};

// Map of XPrimitive.Component → fixed condition (no props needed)
const fixedConditionMap: Record<string, Record<string, string>> = {
  ThreadPrimitive: {
    Empty: "s.thread.isEmpty",
  },
};

// A prop value the maps cannot faithfully express as a static condition
// (dynamic expressions, `{undefined}`); elements carrying one are skipped
// so runtime behavior is never silently changed.
const UNSUPPORTED_VALUE: unique symbol = Symbol("unsupported");

/**
 * Extract the value of a JSX attribute.
 * - Boolean prop (no value): `<X.If user>` → `true`
 * - `{true}` / `{false}`: → `true` / `false`
 * - `{"positive"}`: → `"positive"`
 * - `{null}`: → `null`
 * - anything else (dynamic expressions): → UNSUPPORTED_VALUE
 */
const getAttrValue = (j: any, attr: any): unknown => {
  // Boolean attribute (no value), e.g. `<X.If user>`
  if (attr.value === null || attr.value === undefined) {
    return true;
  }

  // JSX expression container: `{true}`, `{false}`, `{"positive"}`, `{null}`
  if (j.JSXExpressionContainer.check(attr.value)) {
    const expr = attr.value.expression;
    if (j.BooleanLiteral.check(expr)) return expr.value;
    // NullLiteral bases Literal in ast-types but carries no `value` field,
    // so it must be recognized before the generic Literal branch.
    if (j.NullLiteral.check(expr)) return null;
    if (j.Literal.check(expr)) {
      if (expr.value === null) return null;
      return expr.value;
    }
    return UNSUPPORTED_VALUE;
  }

  // String literal
  if (j.StringLiteral.check(attr.value) || j.Literal.check(attr.value)) {
    return attr.value.value;
  }

  return UNSUPPORTED_VALUE;
};

// Composed as a syntax tree so the printer parenthesizes by precedence;
// concatenated text lets `!` and `&&` reassociate a fragment's own operators.
const buildConditionString = (
  j: any,
  fragments: ConditionFragment[],
): string => {
  const parseExpression = (source: string) =>
    j(`${source};`).find(j.ExpressionStatement).nodes()[0]!.expression;

  const condition = fragments
    .map((f) => {
      const expression = parseExpression(f.expression);
      return f.negated ? j.unaryExpression("!", expression) : expression;
    })
    .reduce((left: any, right: any) => j.logicalExpression("&&", left, right));

  return j(condition).toSource();
};

const migratePrimitiveIfToAuiIf = createTransformer(
  ({ j, root, markAsChanged }) => {
    let needsAuiIfImport = false;

    // Track which primitive namespaces are imported
    const importedPrimitives = new Set<string>();
    root.find(j.ImportDeclaration).forEach((path: any) => {
      const source = path.value.source.value;
      if (typeof source === "string" && source.startsWith("@assistant-ui/")) {
        path.value.specifiers?.forEach((specifier: any) => {
          if (j.ImportSpecifier.check(specifier)) {
            const name = String(
              specifier.local?.name ?? specifier.imported.name,
            );
            if (primitiveMap[name] || fixedConditionMap[name]) {
              importedPrimitives.add(name);
            }
          }
        });
      }
    });

    if (importedPrimitives.size === 0) return;

    // Opening and closing tags are rewritten together per element, so a
    // skipped element can never be left with a mismatched closing tag.
    const convertElementToAuiIf = (elementPath: any, conditionBody: string) => {
      const arrowFnAst = j(`(s) => ${conditionBody}`)
        .find(j.ArrowFunctionExpression)
        .paths()[0]!.value;

      const opening = elementPath.value.openingElement;
      opening.name = j.jsxIdentifier("AuiIf");
      opening.attributes = [
        j.jsxAttribute(
          j.jsxIdentifier("condition"),
          j.jsxExpressionContainer(arrowFnAst),
        ),
      ];
      if (elementPath.value.closingElement) {
        elementPath.value.closingElement.name = j.jsxIdentifier("AuiIf");
      }

      needsAuiIfImport = true;
      markAsChanged();
    };

    // Process fixed-condition components: <ThreadPrimitive.Empty> → <AuiIf condition={...}>
    root.find(j.JSXElement).forEach((path: any) => {
      const name = path.value.openingElement.name;
      if (!j.JSXMemberExpression.check(name)) return;
      if (!j.JSXIdentifier.check(name.object)) return;
      if (!j.JSXIdentifier.check(name.property)) return;

      const primitiveName = name.object.name as string;
      const propertyName = name.property.name as string;
      const conditionBody = fixedConditionMap[primitiveName]?.[propertyName];
      if (!conditionBody) return;
      if (!importedPrimitives.has(primitiveName)) return;

      // Only transform if there are no props (other than children, which are implicit)
      const attrs: any[] = path.value.openingElement.attributes || [];
      if (attrs.length > 0) return;

      convertElementToAuiIf(path, conditionBody);
    });

    // Process JSX elements: <ThreadPrimitive.If ...> → <AuiIf condition={...}>
    root.find(j.JSXElement).forEach((path: any) => {
      const name = path.value.openingElement.name;

      // Check for `<XPrimitive.If ...>`
      if (!j.JSXMemberExpression.check(name)) return;
      if (!j.JSXIdentifier.check(name.object)) return;
      if (!j.JSXIdentifier.check(name.property)) return;
      if (name.property.name !== "If") return;

      const primitiveName = name.object.name;
      const propMap = primitiveMap[primitiveName];
      if (!propMap) return;
      if (!importedPrimitives.has(primitiveName)) return;

      // Extract props
      const attrs: any[] = path.value.openingElement.attributes || [];
      const fragments: ConditionFragment[] = [];
      let hasUnknownProp = false;

      for (const attr of attrs) {
        if (!j.JSXAttribute.check(attr)) {
          // JSX spread attributes — can't migrate
          hasUnknownProp = true;
          continue;
        }
        const propName =
          typeof attr.name.name === "string" ? attr.name.name : null;
        if (!propName) {
          // e.g. JSXNamespacedName — not expressible as a condition
          hasUnknownProp = true;
          continue;
        }

        const mapper = propMap[propName];
        if (!mapper) {
          hasUnknownProp = true;
          continue;
        }

        const value = getAttrValue(j, attr);
        if (value === UNSUPPORTED_VALUE) {
          hasUnknownProp = true;
          continue;
        }
        const fragment = mapper(value);
        if (fragment) {
          fragments.push(fragment);
        }
      }

      // If we couldn't map all props, skip this element
      if (hasUnknownProp || fragments.length === 0) return;

      convertElementToAuiIf(path, buildConditionString(j, fragments));
    });

    // Add AuiIf import if needed
    if (needsAuiIfImport) {
      let hasAuiIfImport = false;
      let assistantUiImport: any = null;

      root.find(j.ImportDeclaration).forEach((path: any) => {
        const source = path.value.source.value;
        if (typeof source === "string" && source.startsWith("@assistant-ui/")) {
          assistantUiImport = path;
          path.value.specifiers?.forEach((specifier: any) => {
            if (
              j.ImportSpecifier.check(specifier) &&
              (specifier.imported.name === "AuiIf" ||
                specifier.local?.name === "AuiIf")
            ) {
              hasAuiIfImport = true;
            }
          });
        }
      });

      if (!hasAuiIfImport && assistantUiImport) {
        assistantUiImport.value.specifiers.push(
          j.importSpecifier(j.identifier("AuiIf")),
        );
        markAsChanged();
      }
    }
  },
);

export default migratePrimitiveIfToAuiIf;
