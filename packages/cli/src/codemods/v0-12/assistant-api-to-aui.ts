import { createTransformer } from "../utils/createTransformer";

// Map of old hook names to new hook names
const hookRenamingMap: Record<string, string> = {
  useAssistantApi: "useAui",
  useAssistantState: "useAuiState",
  useAssistantEvent: "useAuiEvent",
};

// Map of old component names to new component names
const componentRenamingMap: Record<string, string> = {
  AssistantIf: "AuiIf",
  AssistantProvider: "AuiProvider",
};

const isUseAuiCall = (j: any, node: any): boolean => {
  return (
    node &&
    j.CallExpression.check(node) &&
    j.Identifier.check(node.callee) &&
    (node.callee.name === "useAui" || node.callee.name === "useAssistantApi")
  );
};

// Check if a scope node directly contains an 'api' variable declaration
const scopeHasDirectApiDeclaration = (j: any, scopeNode: any): boolean => {
  // Get the body of the scope
  let body = null;
  if (
    j.FunctionDeclaration.check(scopeNode) ||
    j.FunctionExpression.check(scopeNode)
  ) {
    body = scopeNode.body?.body;
  } else if (j.ArrowFunctionExpression.check(scopeNode)) {
    // Arrow functions might have block or expression body
    if (j.BlockStatement.check(scopeNode.body)) {
      body = scopeNode.body.body;
    }
  } else if (j.BlockStatement.check(scopeNode)) {
    body = scopeNode.body;
  }

  if (!Array.isArray(body)) return false;

  // Check only direct statements in this scope's body
  for (const statement of body) {
    if (j.VariableDeclaration.check(statement)) {
      for (const declarator of statement.declarations) {
        if (j.Identifier.check(declarator.id) && declarator.id.name === "api") {
          // Don't count it as shadowing if it's from useAui
          if (!isUseAuiCall(j, declarator.init)) {
            return true;
          }
        }
      }
    }
  }

  return false;
};

// Check if a path is inside a scope that shadows the api variable
const isInsideShadowingScope = (j: any, identifierPath: any): boolean => {
  let currentPath = identifierPath.parent;

  while (currentPath) {
    const node = currentPath.value;

    // Check if this is a scope-creating node (function, arrow function, block)
    if (
      j.FunctionDeclaration.check(node) ||
      j.FunctionExpression.check(node) ||
      j.ArrowFunctionExpression.check(node) ||
      j.BlockStatement.check(node)
    ) {
      if (scopeHasDirectApiDeclaration(j, node)) {
        return true;
      }
    }

    currentPath = currentPath.parent;
  }

  return false;
};

const migrateAssistantApiToAui = createTransformer(
  ({ j, root, markAsChanged }) => {
    let hasApiFromUseAui = false;

    // 1. Update imports
    root.find(j.ImportDeclaration).forEach((path: any) => {
      const source = path.value.source.value;

      // Only process imports from @assistant-ui packages
      if (typeof source === "string" && source.startsWith("@assistant-ui/")) {
        path.value.specifiers?.forEach((specifier: any) => {
          if (j.ImportSpecifier.check(specifier)) {
            const oldName = specifier.imported.name as string;

            // Rename hooks
            if (hookRenamingMap[oldName]) {
              const newName = hookRenamingMap[oldName];
              specifier.imported.name = newName;
              if (specifier.local && specifier.local.name === oldName) {
                specifier.local.name = newName;
              }
              markAsChanged();
            }

            // Rename components
            if (componentRenamingMap[oldName]) {
              const newName = componentRenamingMap[oldName];
              specifier.imported.name = newName;
              if (specifier.local && specifier.local.name === oldName) {
                specifier.local.name = newName;
              }
              markAsChanged();
            }
          }
        });
      }
    });

    // 2. Find and rename variable declarations from useAui (or useAssistantApi)
    root.find(j.VariableDeclarator).forEach((path: any) => {
      const init = path.value.init;

      // Check if this is a call to useAui or useAssistantApi
      if (isUseAuiCall(j, init)) {
        if (j.Identifier.check(path.value.id)) {
          const oldVarName = path.value.id.name;

          // Only rename if it's called 'api'
          if (oldVarName === "api") {
            path.value.id.name = "aui";
            hasApiFromUseAui = true;
            markAsChanged();
          }
        }
      }
    });

    // 3. Rename all references to 'api' if we found it from useAui
    if (hasApiFromUseAui) {
      root.find(j.Identifier).forEach((path: any) => {
        if (path.value.name === "api") {
          // Skip if this is part of an import
          if (j.ImportSpecifier.check(path.parent.value)) {
            return;
          }

          // Skip if this is a variable declarator id
          if (j.VariableDeclarator.check(path.parent.value)) {
            const declarator = path.parent.value;
            if (declarator.id === path.value) {
              return;
            }
          }

          // Skip if this is a property key in an object (e.g., { api: true })
          if (j.Property.check(path.parent.value)) {
            const prop = path.parent.value;
            if (prop.key === path.value && !prop.shorthand && !prop.computed) {
              return;
            }
          }

          if (j.ObjectProperty.check(path.parent.value)) {
            const prop = path.parent.value;
            if (prop.key === path.value && !prop.shorthand && !prop.computed) {
              return;
            }
          }

          // Skip if this is a property in a member expression (e.g., foo.api)
          if (
            j.MemberExpression.check(path.parent.value) &&
            path.parent.value.property === path.value &&
            !path.parent.value.computed
          ) {
            return;
          }

          // Skip if this is a JSX attribute name
          if (j.JSXAttribute.check(path.parent.value)) {
            return;
          }

          // Skip if this identifier is inside a scope that shadows the api variable
          if (isInsideShadowingScope(j, path)) {
            return;
          }

          // Update the reference
          path.value.name = "aui";
          markAsChanged();
        }
      });

      // Also handle JSX identifiers
      root.find(j.JSXIdentifier).forEach((path: any) => {
        if (path.value.name === "api") {
          if (!isInsideShadowingScope(j, path)) {
            path.value.name = "aui";
            markAsChanged();
          }
        }
      });
    }

    // 4. Update hook call references (in case they're used as values)
    Object.entries(hookRenamingMap).forEach(([oldName, newName]) => {
      root.find(j.Identifier).forEach((path: any) => {
        if (path.value.name === oldName) {
          // Skip if already handled in imports
          if (j.ImportSpecifier.check(path.parent.value)) {
            return;
          }

          // This might be a reference to the hook as a value
          path.value.name = newName;
          markAsChanged();
        }
      });
    });

    // 5. Update JSX component names
    Object.entries(componentRenamingMap).forEach(([oldName, newName]) => {
      // Update JSX opening elements
      root.find(j.JSXOpeningElement).forEach((path: any) => {
        if (
          j.JSXIdentifier.check(path.value.name) &&
          path.value.name.name === oldName
        ) {
          path.value.name.name = newName;
          markAsChanged();
        }
      });

      // Update JSX closing elements
      root.find(j.JSXClosingElement).forEach((path: any) => {
        if (
          j.JSXIdentifier.check(path.value.name) &&
          path.value.name.name === oldName
        ) {
          path.value.name.name = newName;
          markAsChanged();
        }
      });

      // Update regular identifier references (for component references)
      root.find(j.Identifier).forEach((path: any) => {
        if (path.value.name === oldName) {
          // Skip if already handled in imports
          if (j.ImportSpecifier.check(path.parent.value)) {
            return;
          }

          // Skip JSX identifiers (already handled above)
          if (j.JSXIdentifier.check(path.value)) {
            return;
          }

          // This might be a reference to the component as a value
          path.value.name = newName;
          markAsChanged();
        }
      });
    });
  },
);

export default migrateAssistantApiToAui;
