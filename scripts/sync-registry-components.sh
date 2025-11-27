#!/bin/bash

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REGISTRY_DIR="$SCRIPT_DIR/../apps/registry/components/assistant-ui"
EXAMPLES_DIR="$SCRIPT_DIR/../examples"

echo "Syncing shared components from registry to examples..."

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

# Get examples with assistant-ui components
examples=()
for dir in "$EXAMPLES_DIR"/*; do
    if [[ -d "$dir" && -d "$dir/components/assistant-ui" ]]; then
        examples+=("$(basename "$dir")")
    fi
done

echo "Found ${#examples[@]} examples with assistant-ui components: ${examples[*]}"

# Sync each example
for example in "${examples[@]}"; do
    echo ""
    echo "Checking example: $example"
    example_dir="$EXAMPLES_DIR/$example/components/assistant-ui"
    
    for registry_file in "${registry_files[@]}"; do
        registry_path="$REGISTRY_DIR/$registry_file"
        example_path="$example_dir/$registry_file"
        
        if [[ -f "$example_path" ]]; then
            echo "  Copying $registry_file from registry to $example"
            cp "$registry_path" "$example_path"
        fi
    done
done

echo ""
echo "Sync complete!"