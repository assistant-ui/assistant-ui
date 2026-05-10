#!/bin/bash

# Verifies that shared assistant-ui components in templates/* are byte-equal
# with the canonical source in packages/ui/src/components/assistant-ui.
#
# Usage:
#   bash scripts/sync-templates.sh            # check (CI mode), exits 1 on drift
#   bash scripts/sync-templates.sh --write    # copy source -> templates to fix drift
#
# To allow an intentional divergence (e.g. minimal/thread.tsx is a slim variant),
# add `<tpl>/<file>` to the OVERRIDES array below with a comment explaining why.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$SCRIPT_DIR/.."
SOURCE_DIR="$ROOT_DIR/packages/ui/src/components/assistant-ui"
TEMPLATES_ROOT="$ROOT_DIR/templates"

TEMPLATES=(default minimal cloud cloud-clerk langgraph mcp)

OVERRIDES=(
    # minimal intentionally ships a slim thread.tsx without GroupedParts /
    # reasoning / tool-group, since it doesn't bundle those companion files.
    "minimal/thread.tsx"
)

MODE="${1:-check}"

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

if [[ ${#drift[@]} -eq 0 ]]; then
    echo "✓ all template components are in sync with packages/ui"
    exit 0
fi

if [[ "$MODE" == "--write" ]]; then
    for d in "${drift[@]}"; do
        tpl="${d%%/*}"
        file="${d##*/}"
        cp "$SOURCE_DIR/$file" "$TEMPLATES_ROOT/$tpl/components/assistant-ui/$file"
        echo "synced $d"
    done
    echo ""
    echo "synced ${#drift[@]} file(s)"
    exit 0
fi

echo "✗ drift detected in ${#drift[@]} template file(s) vs packages/ui:"
for d in "${drift[@]}"; do
    echo "    templates/$d"
done
echo ""
echo "to fix, run:    pnpm sync-templates --write"
echo "if the divergence is intentional, add '<tpl>/<file>' to OVERRIDES in scripts/sync-templates.sh"
exit 1
