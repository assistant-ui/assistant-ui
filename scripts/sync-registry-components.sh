#!/bin/bash

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REGISTRY_DIR="$SCRIPT_DIR/../apps/registry/components/assistant-ui"
EXAMPLES_DIR="$SCRIPT_DIR/../examples"
DOCS_DIR="$SCRIPT_DIR/../apps/docs/components/assistant-ui"

# Files to exclude from syncing (these often have example-specific customizations)
EXCLUDED_FILES=()

echo "Syncing shared components from registry to examples and docs..."
echo "Excluded files: ${EXCLUDED_FILES[*]}"

if [[ ! -d "$REGISTRY_DIR" ]]; then
    echo "Error: Registry directory not found: $REGISTRY_DIR"
    exit 1
fi

if [[ ! -d "$EXAMPLES_DIR" ]]; then
    echo "Error: Examples directory not found: $EXAMPLES_DIR"
    exit 1
fi

# Get all registry files
registry_files=()
while IFS= read -r -d '' file; do
    registry_files+=("$(basename "$file")")
done < <(find "$REGISTRY_DIR" -maxdepth 1 -type f \( -name "*.tsx" -o -name "*.ts" \) -print0)

echo "Found ${#registry_files[@]} files in registry: ${registry_files[*]}"

# Helper function to sync files to a target directory
sync_to_target() {
    local target_dir="$1"
    local target_name="$2"

    echo ""
    echo "Checking $target_name"

    for registry_file in "${registry_files[@]}"; do
        # Check if file is in excluded list
        is_excluded=false
        for excluded in "${EXCLUDED_FILES[@]}"; do
            if [[ "$registry_file" == "$excluded" ]]; then
                is_excluded=true
                break
            fi
        done

        if [[ "$is_excluded" == true ]]; then
            echo "  Skipping $registry_file (excluded)"
            continue
        fi

        registry_path="$REGISTRY_DIR/$registry_file"
        target_path="$target_dir/$registry_file"

        if [[ -f "$target_path" ]]; then
            echo "  Copying $registry_file from registry to $target_name"
            cp "$registry_path" "$target_path"
        fi
    done
}

# Sync to docs
if [[ -d "$DOCS_DIR" ]]; then
    sync_to_target "$DOCS_DIR" "docs"
fi

# Get examples with assistant-ui components
examples=()
for dir in "$EXAMPLES_DIR"/*; do
    if [[ -d "$dir" && -d "$dir/components/assistant-ui" ]]; then
        examples+=("$(basename "$dir")")
    fi
done

echo ""
echo "Found ${#examples[@]} examples with assistant-ui components: ${examples[*]}"

# Sync each example
for example in "${examples[@]}"; do
    sync_to_target "$EXAMPLES_DIR/$example/components/assistant-ui" "example: $example"
done

echo ""
echo "Sync complete!"
