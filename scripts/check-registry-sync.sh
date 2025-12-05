#!/bin/bash

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REGISTRY_DIR="$SCRIPT_DIR/../apps/registry/components/assistant-ui"
EXAMPLES_DIR="$SCRIPT_DIR/../examples"
DOCS_DIR="$SCRIPT_DIR/../apps/docs/components/assistant-ui"

# Files to exclude from checking (these often have example-specific customizations)
EXCLUDED_FILES=()

echo "Checking registry components are in sync with examples and docs..."
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

has_diff=false
diff_files=()

# Helper function to check files in a target directory
check_target() {
    local target_dir="$1"
    local target_name="$2"

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
            continue
        fi

        registry_path="$REGISTRY_DIR/$registry_file"
        target_path="$target_dir/$registry_file"

        if [[ -f "$target_path" ]]; then
            if ! diff -q "$registry_path" "$target_path" > /dev/null 2>&1; then
                echo "❌ Out of sync: $target_name/$registry_file"
                has_diff=true
                diff_files+=("$target_name/$registry_file")
            fi
        fi
    done
}

# Check docs
if [[ -d "$DOCS_DIR" ]]; then
    echo ""
    echo "Checking docs..."
    check_target "$DOCS_DIR" "apps/docs/components/assistant-ui"
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

# Check each example
for example in "${examples[@]}"; do
    echo ""
    echo "Checking example: $example..."
    check_target "$EXAMPLES_DIR/$example/components/assistant-ui" "examples/$example/components/assistant-ui"
done

echo ""

if [[ "$has_diff" == true ]]; then
    echo "============================================"
    echo "❌ Registry components are out of sync!"
    echo ""
    echo "The following files differ from registry:"
    for file in "${diff_files[@]}"; do
        echo "  - $file"
        # GitHub Actions annotation for better visibility in PR UI
        if [[ -n "${GITHUB_ACTIONS:-}" ]]; then
            echo "::error file=$file::File is out of sync with registry. Run: bash scripts/sync-registry-components.sh"
        fi
    done
    echo ""
    echo "Please run: bash scripts/sync-registry-components.sh"
    echo "============================================"
    exit 1
else
    echo "✅ All registry components are in sync!"
fi

