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

    // 3. Rename references whose binding is one of those declarators
    if (renamedDeclaratorIds.size > 0) {
      const bindsToRenamedApi = (path: any): boolean => {
        const scope = path.scope?.lookup("api");
        if (!scope) return false;
        const bindings = scope.getBindings()["api"] ?? [];
        return bindings.some((binding: any) =>
          renamedDeclaratorIds.has(binding.value),
        );
      };

      const referencePaths: any[] = [];
      root.find(j.Identifier, { name: "api" }).forEach((path: any) => {
        const parent = path.parent.value;
        if (j.ImportSpecifier.check(parent)) return;
        if (j.VariableDeclarator.check(parent) && parent.id === path.value)
          return;
        if (
          (j.Property.check(parent) || j.ObjectProperty.check(parent)) &&
          parent.key === path.value &&
          !parent.computed &&
          !parent.shorthand
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
