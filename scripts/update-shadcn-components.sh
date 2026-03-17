#!/bin/bash

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$SCRIPT_DIR/.."
UI_DIR="$ROOT_DIR/packages/ui"

echo "Updating shadcn/ui components in packages/ui..."
echo ""

# Check if packages/ui has components.json
if [[ ! -f "$UI_DIR/components.json" ]]; then
    echo "Error: packages/ui/components.json not found"
    exit 1
fi

# Write minimal CSS so shadcn's PostCSS plugins don't crash on an empty file
echo '@import "tailwindcss";' > "$UI_DIR/src/globals.css"

if [[ "$1" == "--all" ]]; then
    echo "📦 Installing all shadcn/ui components..."
    echo ""
    (cd "$UI_DIR" && pnpm dlx shadcn@latest add --all --overwrite)
else
    # Get installed components (tsx files without extension)
    components=()
    while IFS= read -r -d '' file; do
        component_name="$(basename "$file" .tsx)"
        components+=("$component_name")
    done < <(find "$UI_DIR/src/components/ui" -maxdepth 1 -type f -name "*.tsx" -print0)

    if [[ ${#components[@]} -eq 0 ]]; then
        echo "No components found in packages/ui/src/components/ui"
        exit 1
    fi

    component_list="${components[*]}"
    echo "📦 Updating ${#components[@]} components:"
    echo "   $component_list"
    echo ""

    (cd "$UI_DIR" && pnpm dlx shadcn@latest add $component_list --overwrite)
fi

# Reset the globals.css — this is a library, consumers provide their own CSS variables
echo '@import "tailwindcss";' > "$UI_DIR/src/globals.css"

echo ""
echo "🔧 Running lint:fix..."
(cd "$ROOT_DIR" && pnpm lint:fix)

echo ""
echo "🎉 All shadcn/ui components updated!"
