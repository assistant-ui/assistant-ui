#!/usr/bin/env bash
set -euo pipefail

commit_ref="${VERCEL_GIT_COMMIT_REF:-}"
commit_message="${VERCEL_GIT_COMMIT_MESSAGE:-}"

case "$commit_ref" in
  changeset-release/* | chore/update-versions | chore-update-versions | chore-update-versions-*)
    echo "Skipping Vercel build for Changesets version branch: $commit_ref"
    exit 0
    ;;
esac

case "$commit_message" in
  "chore: update versions"*)
    echo "Skipping Vercel build for Changesets version commit."
    exit 0
    ;;
esac

exit 1
