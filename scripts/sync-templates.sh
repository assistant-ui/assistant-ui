#!/bin/bash

# Templates and examples alias packages/ui via tsconfig and carry no copies, except the standalone minimal and Nuxt templates.
#
# Usage:
#   bash scripts/sync-templates.sh            # check (CI mode), exits 1 on drift
#   bash scripts/sync-templates.sh --write    # render sources into template copies to fix drift
#
# To allow an intentional divergence (e.g. thread.tsx is a slim variant),
# add `<file>` to the OVERRIDES array below with a comment explaining why.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$SCRIPT_DIR/.."
SOURCE_DIR="$ROOT_DIR/packages/ui/src/components/react/assistant-ui/elements"
VUE_SOURCE_DIR="$ROOT_DIR/packages/ui/src/components/vue/assistant-ui"
UI_BASE_DIR="$ROOT_DIR/packages/ui/src/components/react/ui/base"
HOOKS_SOURCE_DIR="$ROOT_DIR/packages/ui/src/hooks"
LIB_SOURCE_DIR="$ROOT_DIR/packages/ui/src/lib"
TEMPLATES_ROOT="$ROOT_DIR/templates"
UI_SRC_REL="packages/ui/src"

MINIMAL_DIR="$TEMPLATES_ROOT/minimal/components/assistant-ui/elements"
MINIMAL_UI_DIR="$TEMPLATES_ROOT/minimal/components/ui"
MINIMAL_HOOKS_DIR="$TEMPLATES_ROOT/minimal/hooks"
MINIMAL_LIB_DIR="$TEMPLATES_ROOT/minimal/lib"
NUXT_DIR="$TEMPLATES_ROOT/nuxt/app/components/assistant-ui"

# Templates and examples alias packages/ui via tsconfig and carry no copies,
# except `minimal` and `templates/nuxt`, which ship their own. Minimal is a
# Base UI (base-nova) scaffold, so its copies mirror the base install shape:
# the unmarked file in packages/ui/src/components/react/assistant-ui/elements
# is already the Base UI source, so minimal's assistant-ui element copies sync
# from it directly, and `components/ui` copies sync from the vendored
# `ui/base` stand-ins. Base sources already use the scaffold import shape.
# Minimal's `hooks` copies sync from packages/ui/src/hooks, and its `lib`
# copies from packages/ui/src/lib. The Nuxt template's vue kit copies sync
# verbatim from packages/ui/src/components/vue/assistant-ui.
OVERRIDES=(
    # minimal intentionally ships a slim thread.aui.tsx without GroupedParts /
    # reasoning / tool-group, since it doesn't bundle those companion files.
    "thread.aui.tsx"
    # minimal ships without react-shiki, so its markdown-text.tsx omits the
    # SyntaxHighlighter wiring.
    "markdown-text.tsx"
)

MODE="${1:-check}"

annotate() {
    # GitHub Actions error annotation; plain echo elsewhere.
    local file="$1" message="$2"
    if [[ -n "${GITHUB_ACTIONS:-}" ]]; then
        echo "::error file=$file::$message"
    fi
}

resolve_aui_source() {
    local file="$1"
    echo "$SOURCE_DIR/$file"
}

resolve_vue_source() {
    local file="$1"
    echo "$VUE_SOURCE_DIR/$file"
}

# Committed copies and raw sources may disagree on import statement layout.
# The check compares import-normalized forms, which is layout-insensitive but
# content strict; --write formats the rendered output with oxfmt before copying.
RENDER_DIR="$(mktemp -d)"
trap 'rm -rf "$RENDER_DIR"' EXIT
mkdir -p "$RENDER_DIR/assistant-ui" "$RENDER_DIR/vue" "$RENDER_DIR/ui" "$RENDER_DIR/hooks" "$RENDER_DIR/lib"

render_source() {
    local src="$1" out="$2"
    cp "$src" "$out"
}

rendered_aui() {
    local file="$1"
    local out="$RENDER_DIR/assistant-ui/$file"
    [[ -f "$out" ]] || render_source "$(resolve_aui_source "$file")" "$out"
    echo "$out"
}

rendered_vue() {
    local file="$1"
    local out="$RENDER_DIR/vue/$file"
    [[ -f "$out" ]] || render_source "$(resolve_vue_source "$file")" "$out"
    echo "$out"
}

rendered_ui() {
    local file="$1"
    local out="$RENDER_DIR/ui/$file"
    [[ -f "$out" ]] || render_source "$UI_BASE_DIR/$file" "$out"
    echo "$out"
}

rendered_hooks() {
    local file="$1"
    local out="$RENDER_DIR/hooks/$file"
    [[ -f "$out" ]] || render_source "$HOOKS_SOURCE_DIR/$file" "$out"
    echo "$out"
}

rendered_lib() {
    local file="$1"
    local out="$RENDER_DIR/lib/$file"
    [[ -f "$out" ]] || render_source "$LIB_SOURCE_DIR/$file" "$out"
    echo "$out"
}

# Squash every import statement to a whitespace-free, trailing-comma-free
# token string so formatter reflow never reads as drift, while any content
# difference still does. Non-import lines pass through byte-exact.
NORMALIZE_JS='
const fs = require("node:fs");
const squash = (stmt) => {
  let out = "";
  let quote = null;
  for (let i = 0; i < stmt.length; i++) {
    const char = stmt[i];
    if (quote) {
      out += char;
      if (char === quote && stmt[i - 1] !== "\\") quote = null;
      continue;
    }
    if (char === "\"" || char === "\x27") {
      quote = char;
      out += char;
      continue;
    }
    if (/\s/.test(char)) continue;
    out += char;
  }
  return out.replace(/,}/g, "}");
};
const lines = fs.readFileSync(process.argv[1], "utf8").split("\n");
const out = [];
let buf = null;
for (const line of lines) {
  if (buf === null && /^import[\s{"]/.test(line)) buf = "";
  if (buf !== null) {
    buf += line + "\n";
    if (/["\x27];?\s*$/.test(line)) {
      out.push(squash(buf));
      buf = null;
    }
    continue;
  }
  out.push(line);
}
if (buf !== null) out.push(squash(buf));
process.stdout.write(out.join("\n"));
'

same_normalized() {
    local a="$1" b="$2"
    cmp -s <(node -e "$NORMALIZE_JS" "$a") <(node -e "$NORMALIZE_JS" "$b")
}

format_rendered() {
    if [[ "$MODE" != "--write" ]]; then
        return 0
    fi
    if ! (cd "$ROOT_DIR" && pnpm exec oxfmt "$RENDER_DIR" > /dev/null 2>&1); then
        echo "✗ oxfmt is required to write template sources; run via 'pnpm sync-templates --write'"
        exit 1
    fi
}

drift=()
ui_drift=()
hooks_drift=()
lib_drift=()
vue_drift=()
vue_missing=()
aui_candidates=()
vue_candidates=()
ui_candidates=()
hooks_candidates=()
lib_candidates=()
ui_missing=()

if [[ -d "$MINIMAL_DIR" ]]; then
    while IFS= read -r -d '' min_file; do
        file="$(basename "$min_file")"
        src_file="$(resolve_aui_source "$file")"

        # minimal-specific file with no packages/ui counterpart, leave alone
        [[ -f "$src_file" ]] || continue

        is_override=0
        for o in "${OVERRIDES[@]}"; do
            if [[ "$file" == "$o" ]]; then
                is_override=1
                break
            fi
        done
        [[ "$is_override" -eq 1 ]] && continue

        aui_candidates+=("$file")
        rendered_aui "$file" > /dev/null
    done < <(find "$MINIMAL_DIR" -maxdepth 1 -type f \( -name "*.tsx" -o -name "*.ts" \) -print0)
fi

if [[ -d "$NUXT_DIR" ]]; then
    while IFS= read -r -d '' nuxt_file; do
        file="$(basename "$nuxt_file")"
        src_file="$(resolve_vue_source "$file")"

        is_override=0
        for o in "${OVERRIDES[@]}"; do
            if [[ "$file" == "$o" ]]; then
                is_override=1
                break
            fi
        done
        [[ "$is_override" -eq 1 ]] && continue

        if [[ ! -f "$src_file" ]]; then
            vue_missing+=("$file")
            continue
        fi

        vue_candidates+=("$file")
        rendered_vue "$file" > /dev/null
    done < <(find "$NUXT_DIR" -maxdepth 1 -type f -name "*.vue" -print0)
fi

if [[ -d "$MINIMAL_UI_DIR" ]]; then
    while IFS= read -r -d '' min_file; do
        file="$(basename "$min_file")"

        if [[ ! -f "$UI_BASE_DIR/$file" ]]; then
            ui_missing+=("$file")
            ui_drift+=("$file")
            continue
        fi

        ui_candidates+=("$file")
        rendered_ui "$file" > /dev/null
    done < <(find "$MINIMAL_UI_DIR" -maxdepth 1 -type f \( -name "*.tsx" -o -name "*.ts" \) -print0)
fi

if [[ -d "$MINIMAL_HOOKS_DIR" ]]; then
    while IFS= read -r -d '' min_file; do
        file="$(basename "$min_file")"

        # minimal-specific file with no packages/ui counterpart, leave alone
        [[ -f "$HOOKS_SOURCE_DIR/$file" ]] || continue

        is_override=0
        for o in "${OVERRIDES[@]}"; do
            if [[ "$file" == "$o" ]]; then
                is_override=1
                break
            fi
        done
        [[ "$is_override" -eq 1 ]] && continue

        hooks_candidates+=("$file")
        rendered_hooks "$file" > /dev/null
    done < <(find "$MINIMAL_HOOKS_DIR" -maxdepth 1 -type f \( -name "*.tsx" -o -name "*.ts" \) -print0)
fi

if [[ -d "$MINIMAL_LIB_DIR" ]]; then
    while IFS= read -r -d '' min_file; do
        file="$(basename "$min_file")"

        # minimal-specific file with no packages/ui counterpart, leave alone
        [[ -f "$LIB_SOURCE_DIR/$file" ]] || continue

        is_override=0
        for o in "${OVERRIDES[@]}"; do
            if [[ "$file" == "$o" ]]; then
                is_override=1
                break
            fi
        done
        [[ "$is_override" -eq 1 ]] && continue

        lib_candidates+=("$file")
        rendered_lib "$file" > /dev/null
    done < <(find "$MINIMAL_LIB_DIR" -maxdepth 1 -type f \( -name "*.tsx" -o -name "*.ts" \) -print0)
fi

format_rendered

for file in "${aui_candidates[@]}"; do
    if ! same_normalized "$RENDER_DIR/assistant-ui/$file" "$MINIMAL_DIR/$file"; then
        drift+=("$file")
    fi
done

for file in "${vue_candidates[@]}"; do
    if ! same_normalized "$RENDER_DIR/vue/$file" "$NUXT_DIR/$file"; then
        vue_drift+=("$file")
    fi
done

for file in "${ui_candidates[@]}"; do
    if ! same_normalized "$RENDER_DIR/ui/$file" "$MINIMAL_UI_DIR/$file"; then
        ui_drift+=("$file")
    fi
done

for file in "${hooks_candidates[@]}"; do
    if ! same_normalized "$RENDER_DIR/hooks/$file" "$MINIMAL_HOOKS_DIR/$file"; then
        hooks_drift+=("$file")
    fi
done

for file in "${lib_candidates[@]}"; do
    if ! same_normalized "$RENDER_DIR/lib/$file" "$MINIMAL_LIB_DIR/$file"; then
        lib_drift+=("$file")
    fi
done

# Examples, templates and apps must NOT hold byte-equal copies of any
# packages/ui source: their tsconfig aliases already resolve the canonical
# file, so a local copy is only justified as an intentional fork (which
# diverges by definition) or as a scaffold copy the checks above keep in sync.
# A byte-equal copy anywhere else means someone duplicated instead of aliasing.
redundant=()

# templates/minimal and templates/nuxt ship real files on purpose, and
# globals.d.ts declares an ambient module, which is not resolvable through a
# path alias and has to sit in every TypeScript project's own scope. CSS is
# excluded from the scan above for the same reason: an @import does not go
# through tsconfig paths, so a byte-equal stylesheet is never redundant.
is_exempt_copy() {
    case "$1" in
    templates/minimal/* | templates/nuxt/* | */globals.d.ts) return 0 ;;
    *) return 1 ;;
    esac
}

# A copy is only redundant where a tsconfig alias actually resolves the
# canonical file. A project that never points at packages/ui (apps/social-media,
# templates/minimal) has nothing to fall back on, so its file is a real
# dependency. This gate reads the tsconfig as text rather than resolving the
# candidate path against each alias pattern, so it can still admit a file that
# only a catch-all like apps/docs' `"@/*": ["./*"]` covers; that imprecision is
# why the findings are reported for a human to act on rather than deleted.
in_scope_project() {
    local rel="$1" tail name
    tail="${rel#*/}"
    name="${tail%%/*}"
    grep -q "packages/ui" "$ROOT_DIR/${rel%%/*}/$name/tsconfig.json" 2>/dev/null
}

# Both sides come from the index rather than a filesystem walk, so build
# output never enters the comparison: apps/docs/generated/.repo-source alone
# holds a copy of every tracked file in the repo once the docs have been built.
UI_SRC_LIST="$RENDER_DIR/ui-src-list"
git -C "$ROOT_DIR" ls-files -- "$UI_SRC_REL" >"$UI_SRC_LIST"

while IFS= read -r rel; do
    case "$rel" in
    *.ts | *.tsx | *.vue) ;;
    *) continue ;;
    esac
    is_exempt_copy "$rel" && continue
    in_scope_project "$rel" || continue

    while IFS= read -r src_rel; do
        if cmp -s "$ROOT_DIR/$src_rel" "$ROOT_DIR/$rel"; then
            redundant+=("$rel")
            break
        fi
    done < <(awk -F/ -v base="${rel##*/}" '$NF == base' "$UI_SRC_LIST")
done < <(git -C "$ROOT_DIR" ls-files -- examples templates apps)

if [[ ${#drift[@]} -eq 0 && ${#vue_drift[@]} -eq 0 && ${#vue_missing[@]} -eq 0 && ${#ui_drift[@]} -eq 0 && ${#hooks_drift[@]} -eq 0 && ${#lib_drift[@]} -eq 0 && ${#redundant[@]} -eq 0 ]]; then
    echo "✓ all template components, hooks, and lib files are in sync with packages/ui"
    echo "✓ no redundant packages/ui copies in examples, templates or apps"
    exit 0
fi

if [[ "$MODE" == "--write" ]]; then
    for file in "${ui_missing[@]}"; do
        echo "✗ cannot sync minimal ui/$file: no ui/base source to render"
        exit 1
    done
    for file in "${drift[@]}"; do
        cp "$RENDER_DIR/assistant-ui/$file" "$MINIMAL_DIR/$file"
        echo "synced minimal/$file"
    done
    for file in "${vue_missing[@]}"; do
        rm "$NUXT_DIR/$file"
        echo "removed nuxt/$file (no canonical source)"
    done
    for file in "${vue_drift[@]}"; do
        cp "$RENDER_DIR/vue/$file" "$NUXT_DIR/$file"
        echo "synced nuxt/$file"
    done
    for file in "${ui_drift[@]}"; do
        cp "$RENDER_DIR/ui/$file" "$MINIMAL_UI_DIR/$file"
        echo "synced minimal ui/$file"
    done
    for file in "${hooks_drift[@]}"; do
        cp "$RENDER_DIR/hooks/$file" "$MINIMAL_HOOKS_DIR/$file"
        echo "synced minimal hooks/$file"
    done
    for file in "${lib_drift[@]}"; do
        cp "$RENDER_DIR/lib/$file" "$MINIMAL_LIB_DIR/$file"
        echo "synced minimal lib/$file"
    done
    echo ""
    echo "fixed $(( ${#drift[@]} + ${#vue_drift[@]} + ${#vue_missing[@]} + ${#ui_drift[@]} + ${#hooks_drift[@]} + ${#lib_drift[@]} )) file(s)"
    drift=()
    vue_drift=()
    vue_missing=()
    ui_drift=()
    hooks_drift=()
    lib_drift=()
    [[ ${#redundant[@]} -eq 0 ]] && exit 0
fi

if [[ ${#drift[@]} -gt 0 ]]; then
    echo "✗ drift detected in ${#drift[@]} minimal file(s) vs packages/ui:"
    for file in "${drift[@]}"; do
        echo "    templates/minimal/components/assistant-ui/elements/$file"
        annotate "templates/minimal/components/assistant-ui/elements/$file" "out of sync with the base install shape of packages/ui/src/components/react/assistant-ui/elements/$file; run 'pnpm sync-templates --write' or add an OVERRIDES entry"
    done
fi

if [[ ${#vue_missing[@]} -gt 0 ]]; then
    echo "✗ ${#vue_missing[@]} Nuxt Vue kit file(s) have no canonical source in packages/ui:"
    for file in "${vue_missing[@]}"; do
        echo "    templates/nuxt/app/components/assistant-ui/$file"
        annotate "templates/nuxt/app/components/assistant-ui/$file" "canonical packages/ui/src/components/vue/assistant-ui/$file is gone; run 'pnpm sync-templates --write' to remove the copy or add an OVERRIDES entry"
    done
fi

if [[ ${#vue_drift[@]} -gt 0 ]]; then
    echo "✗ drift detected in ${#vue_drift[@]} Nuxt Vue kit file(s) vs packages/ui:"
    for file in "${vue_drift[@]}"; do
        echo "    templates/nuxt/app/components/assistant-ui/$file"
        annotate "templates/nuxt/app/components/assistant-ui/$file" "out of sync with packages/ui/src/components/vue/assistant-ui/$file; run 'pnpm sync-templates --write' or add an OVERRIDES entry"
    done
fi

if [[ ${#ui_drift[@]} -gt 0 ]]; then
    echo "✗ drift detected in ${#ui_drift[@]} minimal ui file(s) vs packages/ui ui/base:"
    for file in "${ui_drift[@]}"; do
        echo "    templates/minimal/components/ui/$file"
        annotate "templates/minimal/components/ui/$file" "out of sync with the rendered packages/ui/src/components/react/ui/base/$file; run 'pnpm sync-templates --write'"
    done
fi

if [[ ${#hooks_drift[@]} -gt 0 ]]; then
    echo "✗ drift detected in ${#hooks_drift[@]} minimal hooks file(s) vs packages/ui:"
    for file in "${hooks_drift[@]}"; do
        echo "    templates/minimal/hooks/$file"
        annotate "templates/minimal/hooks/$file" "out of sync with packages/ui/src/hooks/$file; run 'pnpm sync-templates --write' or add an OVERRIDES entry"
    done
fi

if [[ ${#lib_drift[@]} -gt 0 ]]; then
    echo "✗ drift detected in ${#lib_drift[@]} minimal lib file(s) vs packages/ui:"
    for file in "${lib_drift[@]}"; do
        echo "    templates/minimal/lib/$file"
        annotate "templates/minimal/lib/$file" "out of sync with packages/ui/src/lib/$file; run 'pnpm sync-templates --write' or add an OVERRIDES entry"
    done
fi

if [[ ${#redundant[@]} -gt 0 ]]; then
    echo "✗ ${#redundant[@]} redundant packages/ui copy(ies) (use a tsconfig path alias instead):"
    for r in "${redundant[@]}"; do
        echo "    $r"
        annotate "$r" "byte-equal copy of a packages/ui source; delete it and rely on the tsconfig path alias, or add the alias that resolves it"
    done
fi

echo ""
if [[ $(( ${#drift[@]} + ${#vue_drift[@]} + ${#vue_missing[@]} + ${#ui_drift[@]} + ${#hooks_drift[@]} + ${#lib_drift[@]} )) -gt 0 ]]; then
    echo "to fix, run:    pnpm sync-templates --write"
    echo "if a template divergence is intentional, add '<file>' to OVERRIDES in scripts/sync-templates.sh"
fi
if [[ ${#redundant[@]} -gt 0 ]]; then
    echo "redundant copies are reported, never deleted: remove each one by hand, or add the tsconfig alias that resolves it"
fi
exit 1
