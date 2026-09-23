import { createTransformer } from "../utils/createTransformer";
import { resolveBinding } from "../utils/resolveBinding";

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
    root.find(j.ImportDeclaration).forEach((path: any) => {
      const source = path.value.source.value;
      if (typeof source !== "string" || !source.startsWith("@assistant-ui/"))
        return;
      path.value.specifiers?.forEach((specifier: any, index: number) => {
        if (
          !j.ImportSpecifier.check(specifier) ||
          !j.Identifier.check(specifier.imported)
        )
          return;
        const oldName = specifier.imported.name;
        const importKind = (specifier as { importKind?: string }).importKind;
        const newName =
          hookRenamingMap[oldName] ?? componentRenamingMap[oldName];
        if (!newName) return;
        if (
          specifier.local?.name === oldName &&
          path.value.importKind !== "type" &&
          importKind !== "type"
        ) {
          const references = [
            ...root.find(j.Identifier, { name: oldName }).paths(),
            ...root.find(j.JSXIdentifier, { name: oldName }).paths(),
          ].filter((reference: any) => {
            const parent = reference.parent.value;
            const node = reference.value;
            if (parent.type.startsWith("Import") || parent.id === node)
              return false;
            if (
              parent.key === node &&
              !parent.computed &&
              parent.value !== node
            )
              return false;
            if (parent.property === node && !parent.computed) return false;
            if (
              j.JSXAttribute.check(parent) ||
              j.JSXNamespacedName.check(parent)
            )
              return false;
            if (j.ExportSpecifier.check(parent)) {
              if (reference.parent.parent.value.source || parent.local !== node)
                return false;
            }
            return resolveBinding(j, reference, oldName) === specifier.local;
          });
          const canRename =
            !resolveBinding(j, path, newName) &&
            references.every(
              (reference: any) => !resolveBinding(j, reference, newName),
            );
          if (canRename) {
            for (const reference of references) {
              const parent = reference.parent.value;
              if (
                (j.Property.check(parent) || j.ObjectProperty.check(parent)) &&
                parent.shorthand
              ) {
                parent.shorthand = false;
                parent.key = j.identifier(oldName);
                parent.value = j.identifier(newName);
              } else if (j.ExportSpecifier.check(parent)) {
                reference.parent.replace(
                  j.exportSpecifier.from({
                    local: j.identifier(newName),
                    exported: j.Identifier.check(parent.exported)
                      ? j.identifier(parent.exported.name)
                      : parent.exported,
                  }),
                );
              } else {
                reference.value.name = newName;
              }
            }
            specifier.local.name = newName;
          }
        }
        const replacement: any = j.importSpecifier(
          j.identifier(newName),
          j.Identifier.check(specifier.local)
            ? j.identifier(specifier.local.name)
            : null,
        );
        replacement.importKind = importKind;
        replacement.comments = specifier.comments;
        path.get("specifiers", index).replace(replacement);
        markAsChanged();
      });
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
      const bindsToRenamedApi = (path: any): boolean =>
        renamedDeclaratorIds.has(resolveBinding(j, path, "api"));

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
          // Babel emits exportKind on ExportSpecifier for inline
          // `export { type api }`; ast-types' typings omit it.
          if (
            grandparent?.exportKind === "type" ||
            (parent as { exportKind?: string }).exportKind === "type"
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
  },
);

export default migrateAssistantApiToAui;
