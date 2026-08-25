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

const migrateAssistantApiToAui = createTransformer(
  ({ j, root, markAsChanged }) => {
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

    // 2. Collect `api` declarators initialized from useAui / useAssistantApi.
    // References are renamed by binding resolution, so an `api` bound
    // elsewhere (function params, `const { api } = other()`) is never touched.
    const renamedDeclaratorIds = new Set<any>();
    root.find(j.VariableDeclarator).forEach((path: any) => {
      if (
        isUseAuiCall(j, path.value.init) &&
        j.Identifier.check(path.value.id) &&
        path.value.id.name === "api"
      ) {
        renamedDeclaratorIds.add(path.value.id);
      }
    });

    // 3. Rename references governed by one of those declarators. Resolution
    // is lexical (nearest enclosing declaration wins) rather than via
    // ast-types scopes, which have no block granularity: a block-scoped
    // `const api = other()` inside the same function must shadow.
    if (renamedDeclaratorIds.size > 0) {
      const patternBindsApi = (id: any): boolean => {
        if (
          id &&
          (id.type === "TSParameterProperty" ||
            j.TSParameterProperty?.check?.(id))
        ) {
          return patternBindsApi(id.parameter);
        }
        if (j.Identifier.check(id)) return id.name === "api";
        if (j.ObjectPattern.check(id)) {
          return id.properties.some((prop: any) =>
            patternBindsApi(prop.value ?? prop.argument ?? prop),
          );
        }
        if (j.ArrayPattern.check(id)) {
          return id.elements.some((el: any) => el && patternBindsApi(el));
        }
        if (j.AssignmentPattern.check(id)) return patternBindsApi(id.left);
        if (j.RestElement.check(id)) return patternBindsApi(id.argument);
        return false;
      };

      // What a statement-level node declares for `api`: the declarator id
      // node when it is a plain `const/let/var api = ...`, "foreign" for any
      // other binding of the name (patterns, functions, classes, enums), or
      // undefined when it does not bind `api` at all.
      const declaredApi = (statement: any): any => {
        if (!statement) return undefined;
        if (
          j.ExportNamedDeclaration.check(statement) ||
          j.ExportDefaultDeclaration.check(statement)
        ) {
          return declaredApi(statement.declaration);
        }
        if (j.VariableDeclaration.check(statement)) {
          for (const declarator of statement.declarations) {
            if (
              j.Identifier.check(declarator.id) &&
              declarator.id.name === "api"
            )
              return declarator.id;
            if (patternBindsApi(declarator.id)) return "foreign";
          }
          return undefined;
        }
        // Type-only declarations do not shadow the value binding.
        if (
          statement.type === "TSTypeAliasDeclaration" ||
          statement.type === "TSInterfaceDeclaration" ||
          statement.type === "TSDeclareFunction"
        )
          return undefined;
        // FunctionDeclaration, ClassDeclaration, TS enums/namespaces, …
        if (
          statement.id &&
          j.Identifier.check(statement.id) &&
          statement.id.name === "api"
        )
          return "foreign";
        return undefined;
      };

      const scanStatements = (statements: any[]): any => {
        for (const statement of statements) {
          const found = declaredApi(statement);
          if (found !== undefined) return found;
        }
        return undefined;
      };

      // Returns the declarator id node governing `api` here, or "foreign"
      // when any other binding of the name shadows it first.
      const governingApiBinding = (path: any): any => {
        let current = path.parent;
        while (current) {
          const node = current.value;

          // Anything function-like (declarations, expressions, arrows,
          // object/class methods) binds its params.
          if (Array.isArray(node.params) && node.params.some(patternBindsApi))
            return "foreign";
          // A named function/class expression binds its own name in its body.
          if (
            (j.FunctionExpression.check(node) ||
              j.ClassExpression.check(node)) &&
            node.id?.name === "api"
          )
            return "foreign";
          if (
            j.CatchClause.check(node) &&
            node.param &&
            patternBindsApi(node.param)
          )
            return "foreign";

          let found: any;
          if (j.BlockStatement.check(node) || j.Program.check(node)) {
            found = scanStatements(node.body);
          } else if (j.ForStatement.check(node)) {
            found = declaredApi(node.init);
          } else if (
            j.ForOfStatement.check(node) ||
            j.ForInStatement.check(node)
          ) {
            found = declaredApi(node.left);
          } else if (j.SwitchStatement.check(node)) {
            found = scanStatements(
              node.cases.flatMap((c: any) => c.consequent),
            );
          } else if (j.StaticBlock?.check?.(node)) {
            found = scanStatements(node.body);
          }
          if (found !== undefined) return found;

          current = current.parent;
        }
        return undefined;
      };

      const bindsToRenamedApi = (path: any): boolean => {
        const governing = governingApiBinding(path);
        return governing !== "foreign" && renamedDeclaratorIds.has(governing);
      };

      const referencePaths: any[] = [];
      root.find(j.Identifier, { name: "api" }).forEach((path: any) => {
        const parent = path.parent.value;
        if (j.ImportSpecifier.check(parent)) return;
        // Declaration names (variable, function, class, type alias,
        // interface) and TS type positions are not value references.
        if (parent.id === path.value) return;
        if (j.TSTypeReference?.check?.(parent)) return;
        if (j.TSQualifiedName?.check?.(parent)) return;
        // Any non-computed key position is a name, not a reference: object
        // properties, object/class methods, class properties, TS signatures.
        // Esprima-style shorthand reuses one node as key and value, so the
        // value position must survive the guard.
        if (
          parent.key === path.value &&
          !parent.computed &&
          parent.value !== path.value
        )
          return;
        if (
          j.MemberExpression.check(parent) &&
          parent.property === path.value &&
          !parent.computed
        )
          return;
        // JSXIdentifier extends Identifier, so JSX positions land here too:
        // member properties (<config.api/>), namespace names, and lowercase
        // element names (<api/> is an intrinsic tag) are not references.
        if (
          j.JSXMemberExpression?.check?.(parent) &&
          parent.property === path.value
        )
          return;
        if (j.JSXNamespacedName?.check?.(parent)) return;
        if (
          (j.JSXOpeningElement?.check?.(parent) ||
            j.JSXClosingElement?.check?.(parent)) &&
          parent.name === path.value
        )
          return;
        if (j.JSXAttribute.check(parent)) return;
        // The exported name of `export { api }` is the public alias, not a
        // reference; only the local side is renamed (to `aui as api`). A
        // source-bearing re-export binds in the other module, never here.
        if (j.ExportSpecifier.check(parent)) {
          const grandparent = path.parent.parent?.value;
          if (
            j.ExportNamedDeclaration.check(grandparent) &&
            grandparent.source != null
          )
            return;
          if (
            grandparent?.exportKind === "type" ||
            parent.exportKind === "type"
          )
            return;
          if (parent.exported === path.value && parent.local !== path.value)
            return;
        }
        if (!bindsToRenamedApi(path)) return;
        referencePaths.push(path);
      });

      for (const path of referencePaths) {
        const parent = path.parent.value;
        if (
          (j.Property.check(parent) || j.ObjectProperty.check(parent)) &&
          parent.shorthand &&
          parent.value === path.value
        ) {
          // `{ api }` in an object literal: keep the key, rename the value
          parent.shorthand = false;
          parent.key = j.identifier("api");
          parent.value = j.identifier("aui");
        } else if (
          j.ExportSpecifier.check(parent) &&
          parent.local === path.value
        ) {
          // `export { api }` / `export { api as name }`: rename the local
          // binding, keep the public name. Replaced wholesale — recast keeps
          // the shorthand form (dropping the alias) when only the fields of
          // the original node change.
          path.parent.replace(
            j.exportSpecifier.from({
              local: j.identifier("aui"),
              exported: j.Identifier.check(parent.exported)
                ? j.identifier(parent.exported.name)
                : parent.exported,
            }),
          );
        } else {
          path.value.name = "aui";
        }
        markAsChanged();
      }
      for (const idNode of renamedDeclaratorIds) {
        idNode.name = "aui";
        markAsChanged();
      }
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
