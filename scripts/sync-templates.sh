#!/bin/bash

# Templates and examples alias packages/ui via tsconfig and carry no copies,
# except `minimal`, which ships its own. This keeps minimal's copies byte-equal
# with packages/ui/src/components/assistant-ui (minus the OVERRIDES divergences)
# and flags any redundant byte-equal copy under examples/*.
#
# Usage:
#   bash scripts/sync-templates.sh            # check (CI mode), exits 1 on drift
#   bash scripts/sync-templates.sh --write    # copy source -> minimal to fix drift
#
# To allow an intentional divergence (e.g. minimal/thread.tsx is a slim variant),
# add `<tpl>/<file>` to the OVERRIDES array below with a comment explaining why.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$SCRIPT_DIR/.."
SOURCE_DIR="$ROOT_DIR/packages/ui/src/components/assistant-ui"
TEMPLATES_ROOT="$ROOT_DIR/templates"
EXAMPLES_ROOT="$ROOT_DIR/examples"

# Only minimal carries copies; every other template aliases packages/ui.
TEMPLATES=(minimal)

OVERRIDES=(
    # minimal intentionally ships a slim thread.tsx without GroupedParts /
    # reasoning / tool-group, since it doesn't bundle those companion files.
    "minimal/thread.tsx"
    # minimal ships without react-shiki, so its markdown-text.tsx omits the
    # SyntaxHighlighter wiring.
    "minimal/markdown-text.tsx"
)

MODE="${1:-check}"

annotate() {
    # GitHub Actions error annotation; plain echo elsewhere.
    local file="$1" message="$2"
    if [[ -n "${GITHUB_ACTIONS:-}" ]]; then
        echo "::error file=$file::$message"
    fi
}

drift=()

for tpl in "${TEMPLATES[@]}"; do
    tpl_dir="$TEMPLATES_ROOT/$tpl/components/assistant-ui"
    [[ -d "$tpl_dir" ]] || continue

    while IFS= read -r -d '' tpl_file; do
        file="$(basename "$tpl_file")"
        src_file="$SOURCE_DIR/$file"

        # template-specific file with no packages/ui counterpart, leave alone
        [[ -f "$src_file" ]] || continue

        is_override=0
        for o in "${OVERRIDES[@]}"; do
            if [[ "$tpl/$file" == "$o" ]]; then
                is_override=1
                break
            fi
        done
        [[ "$is_override" -eq 1 ]] && continue

        if ! cmp -s "$src_file" "$tpl_file"; then
            drift+=("$tpl/$file")
        fi
    done < <(find "$tpl_dir" -maxdepth 1 -type f \( -name "*.tsx" -o -name "*.ts" \) -print0)
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

if [[ ${#drift[@]} -eq 0 && ${#redundant[@]} -eq 0 ]]; then
    echo "✓ all template components are in sync with packages/ui"
    echo "✓ no redundant packages/ui copies in examples"
    exit 0
fi

if [[ "$MODE" == "--write" ]]; then
    for d in "${drift[@]}"; do
        tpl="${d%%/*}"
        file="${d##*/}"
        cp "$SOURCE_DIR/$file" "$TEMPLATES_ROOT/$tpl/components/assistant-ui/$file"
        echo "synced $d"
    done
    for r in "${redundant[@]}"; do
        rm "$ROOT_DIR/$r"
        echo "removed redundant copy $r (resolved from packages/ui via tsconfig paths)"
    done
    echo ""
    echo "fixed $(( ${#drift[@]} + ${#redundant[@]} )) file(s)"
    exit 0
fi

if [[ ${#drift[@]} -gt 0 ]]; then
    echo "✗ drift detected in ${#drift[@]} template file(s) vs packages/ui:"
    for d in "${drift[@]}"; do
        echo "    templates/$d"
        annotate "templates/$d/components/assistant-ui/${d##*/}" "out of sync with packages/ui/src/components/assistant-ui/${d##*/}; run 'pnpm sync-templates --write' or add an OVERRIDES entry"
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
echo "if a template divergence is intentional, add '<tpl>/<file>' to OVERRIDES in scripts/sync-templates.sh"
exit 1
