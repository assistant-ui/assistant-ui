#!/usr/bin/env bash
set -euo pipefail

dir=$1
name=$2
version=$3
dist_name="${name//-/_}-${version}"

cd "$dir"
shopt -s nullglob dotglob
files=( * )
wheels=( "${dist_name}"-*.whl )

if [ ! -f "${dist_name}.tar.gz" ] || [ "${#wheels[@]}" -eq 0 ]; then
  echo "::error::Expected an sdist and a wheel for ${dist_name}; found: ${files[*]:-nothing}"
  exit 1
fi

for file in "${files[@]}"; do
  if [ "$file" != "${dist_name}.tar.gz" ] && [[ "$file" != "${dist_name}"-*.whl ]]; then
    echo "::error::Unexpected file in the distributions: $file"
    exit 1
  fi
  if [ -L "$file" ] || [ ! -f "$file" ]; then
    echo "::error::Not a regular file: $file"
    exit 1
  fi
done

echo "Checked ${#files[@]} distributions for ${dist_name}."
