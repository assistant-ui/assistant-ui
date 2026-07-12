#!/bin/bash

# Templates and examples alias packages/ui via tsconfig and carry no copies,
# except `minimal`, which ships its own. Minimal is a Base UI (base-nova)
# scaffold, so its copies mirror the base install shape: a component with a
# `<name>.base.tsx` sibling syncs from that sibling, everything else syncs
# from the shared source, and `components/ui` copies sync from the vendored
# `ui/base` stand-ins. Base sources already use the scaffold import shape.
#
# Usage:
#   bash scripts/sync-templates.sh            # check (CI mode), exits 1 on drift
#   bash scripts/sync-templates.sh --write    # render source -> minimal to fix drift
#
# To allow an intentional divergence (e.g. thread.tsx is a slim variant),
# add `<file>` to the OVERRIDES array below with a comment explaining why.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$SCRIPT_DIR/.."
SOURCE_DIR="$ROOT_DIR/packages/ui/src/components/assistant-ui"
UI_BASE_DIR="$ROOT_DIR/packages/ui/src/components/ui/base"
TEMPLATES_ROOT="$ROOT_DIR/templates"
EXAMPLES_ROOT="$ROOT_DIR/examples"

# Only minimal carries copies; every other template aliases packages/ui.
MINIMAL_DIR="$TEMPLATES_ROOT/minimal/components/assistant-ui"
MINIMAL_UI_DIR="$TEMPLATES_ROOT/minimal/components/ui"

OVERRIDES=(
    # minimal intentionally ships a slim thread.tsx without GroupedParts /
    # reasoning / tool-group, since it doesn't bundle those companion files.
    "thread.tsx"
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

# The base install shape uses the base variant when one exists.
resolve_aui_source() {
    local file="$1"
    local base_src="$SOURCE_DIR/${file%.tsx}.base.tsx"
    if [[ -f "$base_src" ]]; then
        echo "$base_src"
    else
        echo "$SOURCE_DIR/$file"
    fi
}

# Committed copies and raw sources may disagree on import statement layout.
# The check compares import-normalized forms, which is layout-insensitive but
# content strict; --write formats the rendered output with oxfmt before copying.
RENDER_DIR="$(mktemp -d)"
trap 'rm -rf "$RENDER_DIR"' EXIT
mkdir -p "$RENDER_DIR/assistant-ui" "$RENDER_DIR/ui"

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

rendered_ui() {
    local file="$1"
    local out="$RENDER_DIR/ui/$file"
    [[ -f "$out" ]] || render_source "$UI_BASE_DIR/$file" "$out"
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
aui_candidates=()
ui_candidates=()
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

format_rendered

for file in "${aui_candidates[@]}"; do
    if ! same_normalized "$RENDER_DIR/assistant-ui/$file" "$MINIMAL_DIR/$file"; then
        drift+=("$file")
    fi
done

for file in "${ui_candidates[@]}"; do
    if ! same_normalized "$RENDER_DIR/ui/$file" "$MINIMAL_UI_DIR/$file"; then
        ui_drift+=("$file")
    fi
done

# Examples must NOT hold byte-equal copies of packages/ui components: their
# tsconfig already aliases `@/components/assistant-ui/*` to packages/ui, so a
# local file is only justified as an intentional fork (which diverges by
# definition). A byte-equal copy means someone duplicated instead of aliasing.
redundant=()

while IFS= read -r -d '' ex_file; do
    file="$(basename "$ex_file")"
    src_file="$SOURCE_DIR/$file"
    [[ -f "$src_file" ]] || continue

    if cmp -s "$src_file" "$ex_file"; then
        redundant+=("${ex_file#"$ROOT_DIR"/}")
    fi
done < <(find "$EXAMPLES_ROOT" -path "*/components/assistant-ui/*" -maxdepth 4 -type f \( -name "*.tsx" -o -name "*.ts" \) -not -path "*/node_modules/*" -print0)

if [[ ${#drift[@]} -eq 0 && ${#ui_drift[@]} -eq 0 && ${#redundant[@]} -eq 0 ]]; then
    echo "✓ all template components are in sync with packages/ui"
    echo "✓ no redundant packages/ui copies in examples"
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
    for file in "${ui_drift[@]}"; do
        cp "$RENDER_DIR/ui/$file" "$MINIMAL_UI_DIR/$file"
        echo "synced minimal ui/$file"
    done
    for r in "${redundant[@]}"; do
        rm "$ROOT_DIR/$r"
        echo "removed redundant copy $r (resolved from packages/ui via tsconfig paths)"
    done
    echo ""
    echo "fixed $(( ${#drift[@]} + ${#ui_drift[@]} + ${#redundant[@]} )) file(s)"
    exit 0
fi

if [[ ${#drift[@]} -gt 0 ]]; then
    echo "✗ drift detected in ${#drift[@]} minimal file(s) vs packages/ui:"
    for file in "${drift[@]}"; do
        echo "    templates/minimal/components/assistant-ui/$file"
        annotate "templates/minimal/components/assistant-ui/$file" "out of sync with the base install shape of packages/ui/src/components/assistant-ui/$file; run 'pnpm sync-templates --write' or add an OVERRIDES entry"
    done
fi

if [[ ${#ui_drift[@]} -gt 0 ]]; then
    echo "✗ drift detected in ${#ui_drift[@]} minimal ui file(s) vs packages/ui ui/base:"
    for file in "${ui_drift[@]}"; do
        echo "    templates/minimal/components/ui/$file"
        annotate "templates/minimal/components/ui/$file" "out of sync with the rendered packages/ui/src/components/ui/base/$file; run 'pnpm sync-templates --write'"
    done
fi

if [[ ${#redundant[@]} -gt 0 ]]; then
    echo "✗ ${#redundant[@]} redundant packages/ui copy(ies) in examples (use the @/components/assistant-ui tsconfig alias instead):"
    for r in "${redundant[@]}"; do
        echo "    $r"
        annotate "$r" "byte-equal copy of the packages/ui component; delete it and rely on the tsconfig path alias"
    done
fi

echo ""
echo "to fix, run:    pnpm sync-templates --write"
echo "if a minimal divergence is intentional, add '<file>' to OVERRIDES in scripts/sync-templates.sh"
exit 1
