#!/bin/bash

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCE_DIR="$SCRIPT_DIR/../packages/ui/src/components/assistant-ui"
EXAMPLES_DIR="$SCRIPT_DIR/../examples"

# Files to exclude from syncing (these often have example-specific customizations)
EXCLUDED_FILES=()

# Example-specific exclusions (format: "example-name:filename")
# These files have custom implementations that should not be overwritten
EXAMPLE_EXCLUSIONS=(
    "with-elevenlabs-scribe:thread.tsx"  # Custom dictation UI
)

echo "Syncing shared components from packages/ui to examples..."
echo "Excluded files: ${EXCLUDED_FILES[*]}"

if [[ ! -d "$SOURCE_DIR" ]]; then
    echo "Error: Source directory not found: $SOURCE_DIR"
    exit 1
fi

if [[ ! -d "$EXAMPLES_DIR" ]]; then
    echo "Error: Examples directory not found: $EXAMPLES_DIR"
    exit 1
fi

# Get all source files
source_files=()
while IFS= read -r -d '' file; do
    source_files+=("$(basename "$file")")
done < <(find "$SOURCE_DIR" -maxdepth 1 -type f \( -name "*.tsx" -o -name "*.ts" \) -print0)

echo "Found ${#source_files[@]} files in packages/ui: ${source_files[*]}"

# Helper function to sync files to a target directory
sync_to_target() {
    local target_dir="$1"
    local target_name="$2"
    local example_name="$3"  # Optional: example name for example-specific exclusions

    echo ""
    echo "Checking $target_name"

    for source_file in "${source_files[@]}"; do
        # Check if file is in global excluded list
        is_excluded=false
        for excluded in "${EXCLUDED_FILES[@]}"; do
            if [[ "$source_file" == "$excluded" ]]; then
                is_excluded=true
                break
            fi
        done

        # Check if file is in example-specific exclusions
        if [[ -n "$example_name" ]]; then
            for exclusion in "${EXAMPLE_EXCLUSIONS[@]}"; do
                if [[ "$exclusion" == "$example_name:$source_file" ]]; then
                    is_excluded=true
                    break
                fi
            done
        fi

        if [[ "$is_excluded" == true ]]; then
            echo "  Skipping $source_file (excluded)"
            continue
        fi

        source_path="$SOURCE_DIR/$source_file"
        target_path="$target_dir/$source_file"

        if [[ -f "$target_path" ]]; then
            echo "  Copying $source_file from packages/ui to $target_name"
            cp "$source_path" "$target_path"
        fi
    done
}

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
    sync_to_target "$EXAMPLES_DIR/$example/components/assistant-ui" "example: $example" "$example"
done

echo ""
echo "Sync complete!"
