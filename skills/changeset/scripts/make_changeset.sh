#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Create a non-interactive Changeset file.

Usage:
  make_changeset.sh --release "<package>:<bump>" --summary "<text>" [options]

Required:
  --release "<package>:<bump>"    Repeatable. bump: patch|minor|major
  --summary "<text>"              Short user-facing summary line

Optional:
  --details "<text>"              Additional markdown details
  --details-file <path>           Read additional markdown details from file
  --outfile <path>                Output file path (default: .changeset/<slug>-<ts>.md)
  --dry-run                       Print output instead of writing file
  -h, --help                      Show this help text
EOF
}

error() {
  echo "Error: $*" >&2
  exit 1
}

releases=()
summary=""
details=""
details_file=""
outfile=""
dry_run=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --release)
      [[ $# -ge 2 ]] || error "--release requires a value"
      releases+=("$2")
      shift 2
      ;;
    --summary)
      [[ $# -ge 2 ]] || error "--summary requires a value"
      summary="$2"
      shift 2
      ;;
    --details)
      [[ $# -ge 2 ]] || error "--details requires a value"
      details="$2"
      shift 2
      ;;
    --details-file)
      [[ $# -ge 2 ]] || error "--details-file requires a value"
      details_file="$2"
      shift 2
      ;;
    --outfile)
      [[ $# -ge 2 ]] || error "--outfile requires a value"
      outfile="$2"
      shift 2
      ;;
    --dry-run)
      dry_run=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      error "Unknown argument: $1"
      ;;
  esac
done

[[ -d ".changeset" ]] || error "Run from repo root containing .changeset/"
[[ ${#releases[@]} -gt 0 ]] || error "At least one --release is required"
[[ -n "$summary" ]] || error "--summary is required"

if [[ -n "$details_file" ]]; then
  [[ -f "$details_file" ]] || error "--details-file not found: $details_file"
  details="$(cat "$details_file")"
fi

for entry in "${releases[@]}"; do
  pkg="${entry%%:*}"
  bump="${entry##*:}"

  [[ "$pkg" != "$entry" ]] || error "Invalid --release format: $entry"

  case "$bump" in
    patch|minor|major) ;;
    *) error "Invalid bump '$bump' in --release '$entry' (use patch|minor|major)" ;;
  esac
done

if [[ -z "$outfile" ]]; then
  slug="$(
    printf "%s" "$summary" |
      tr '[:upper:]' '[:lower:]' |
      sed -E 's/[^a-z0-9]+/-/g; s/^-+//; s/-+$//;' |
      cut -c1-36
  )"
  [[ -n "$slug" ]] || slug="changeset"
  outfile=".changeset/${slug}-$(date +%Y%m%d%H%M%S).md"
fi

tmpfile="$(mktemp)"
{
  echo "---"
  for entry in "${releases[@]}"; do
    pkg="${entry%%:*}"
    bump="${entry##*:}"
    echo "\"$pkg\": $bump"
  done
  echo "---"
  echo
  echo "$summary"
  if [[ -n "$details" ]]; then
    echo
    printf "%s\n" "$details"
  fi
} > "$tmpfile"

if [[ "$dry_run" -eq 1 ]]; then
  cat "$tmpfile"
  rm -f "$tmpfile"
  exit 0
fi

if [[ -e "$outfile" ]]; then
  base="${outfile%.md}"
  outfile="${base}-${RANDOM}.md"
fi

mv "$tmpfile" "$outfile"
echo "Created $outfile"
