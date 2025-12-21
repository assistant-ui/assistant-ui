#!/bin/bash

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$SCRIPT_DIR/.."

echo "Updating shadcn/ui components across all projects..."
echo ""

# Find all directories with components/ui, excluding node_modules
ui_dirs=()
while IFS= read -r -d '' dir; do
    ui_dirs+=("$dir")
done < <(find "$ROOT_DIR" -type d -name "ui" -path "*/components/ui" -not -path "*/node_modules/*" -print0)

echo "Found ${#ui_dirs[@]} projects with components/ui:"
for dir in "${ui_dirs[@]}"; do
    echo "  - $dir"
done
echo ""

# Process each directory
for ui_dir in "${ui_dirs[@]}"; do
    # Get the project root (parent of components/ui or components/src/ui)
    # Handle both components/ui and src/components/ui patterns
    if [[ "$ui_dir" == */src/components/ui ]]; then
        project_dir="$(dirname "$(dirname "$(dirname "$ui_dir")")")"
    else
        project_dir="$(dirname "$(dirname "$ui_dir")")"
    fi

    # Get installed components (tsx files without extension)
    components=()
    while IFS= read -r -d '' file; do
        component_name="$(basename "$file" .tsx)"
        components+=("$component_name")
    done < <(find "$ui_dir" -maxdepth 1 -type f -name "*.tsx" -print0)

    if [[ ${#components[@]} -eq 0 ]]; then
        echo "⏭️  Skipping $project_dir (no components found)"
        continue
    fi

    # Check if project has a components.json (required for shadcn)
    if [[ ! -f "$project_dir/components.json" ]]; then
        echo "⏭️  Skipping $project_dir (no components.json)"
        continue
    fi

    component_list="${components[*]}"
    echo "📦 Updating $project_dir"
    echo "   Components: $component_list"

    # Run shadcn add with --overwrite
    (cd "$project_dir" && pnpm dlx shadcn@latest add $component_list --overwrite)

    echo "   ✅ Done"
    echo ""
done

echo "🔧 Running lint:fix..."
(cd "$ROOT_DIR" && pnpm lint:fix)

echo "🔄 Syncing registry components to examples and docs..."
"$SCRIPT_DIR/sync-registry-components.sh"

echo "🎉 All shadcn/ui components updated!"
