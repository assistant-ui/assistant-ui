#!/usr/bin/env bash
# Generate a changeset for dependency updates.
# Detects which published packages had their package.json modified (staged + unstaged)
# and creates a changeset with patch bumps for each.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

# Find all modified package.json files (staged + unstaged, excluding lockfile)
changed_pkgjsons=$(git diff --name-only HEAD -- '**/package.json' 'package.json' 2>/dev/null || true)
if [ -z "$changed_pkgjsons" ]; then
  changed_pkgjsons=$(git diff --name-only --cached -- '**/package.json' 'package.json' 2>/dev/null || true)
fi
if [ -z "$changed_pkgjsons" ]; then
  echo "No package.json changes detected."
  exit 0
fi

# Collect published package names from modified package.json files
packages=()
while IFS= read -r file; do
  [ -z "$file" ] && continue
  filepath="$REPO_ROOT/$file"
  [ -f "$filepath" ] || continue

  # Skip private packages
  is_private=$(node -e "const p=require('$filepath'); console.log(p.private === true ? 'true' : 'false')")
  [ "$is_private" = "true" ] && continue

  # Get package name
  name=$(node -e "console.log(require('$filepath').name || '')")
  [ -z "$name" ] && continue

  packages+=("$name")
done <<< "$changed_pkgjsons"

if [ ${#packages[@]} -eq 0 ]; then
  echo "No published packages were modified."
  exit 0
fi

# Generate a random changeset filename
slug=$(node -e "
const adj=['bright','calm','cool','dull','fair','fast','flat','fond','free','full','glad','gold','good','gray','half','hard','high','holy','huge','just','keen','kind','last','lean','left','long','loud','main','mild','neat','nice','bold','pale','past','pink','poor','pure','rare','raw','rich','ripe','rude','safe','same','shy','slim','slow','soft','some','sure','tall','thin','tiny','true','ugly','vast','warm','weak','wide','wild','wise','worn','zero'];
const noun=['ants','bats','bees','bugs','cats','cows','cups','dogs','dots','eels','eggs','elms','emus','fans','figs','fish','foes','fox','gems','hats','hens','ices','inks','jams','jars','jets','keys','kits','laws','maps','mice','moms','nets','nuts','oaks','orbs','owls','pans','peas','pens','pigs','pins','pots','rats','rays','rods','rugs','seas','suns','teas','toys','urns','vans','wars','yaks','zoos'];
const verb=['add','aim','ask','beg','bid','bow','buy','cry','cut','dig','dip','eat','end','eye','fan','fit','fix','fly','get','gig','gum','hid','hug','jam','jog','kid','lay','let','lie','log','mix','nap','nod','own','pay','peg','pet','pin','pop','put','ran','rip','rob','rot','rub','run','saw','set','sew','sit','sly','tap','try','tug','use','vow','wag','win','yap','zip'];
const r=a=>a[Math.floor(Math.random()*a.length)];
console.log(r(adj)+'-'+r(noun)+'-'+r(verb));
")

changeset_file="$REPO_ROOT/.changeset/${slug}.md"

# Build changeset content
{
  echo "---"
  for pkg in "${packages[@]}"; do
    echo "\"$pkg\": patch"
  done
  echo "---"
  echo ""
  echo "chore: update dependencies"
} > "$changeset_file"

echo "Created changeset: .changeset/${slug}.md (${#packages[@]} packages)"
printf "  %s\n" "${packages[@]}"
