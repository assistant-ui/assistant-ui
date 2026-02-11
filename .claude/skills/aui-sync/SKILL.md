---
name: aui-sync
description: Synchronize assistant-ui registry components to templates and examples. Use when syncing registry updates, propagating component changes, or when user mentions template sync.
---

# AUI-Sync Workflow

Sync assistant-ui registry components to downstream templates while preserving template-specific integration points.

## Inputs

| Input | Source | Description |
|-------|--------|-------------|
| Registry | Default or user-specified | Source of truth for components |
| Templates | Default or user-specified | Directory containing template repos |
| Additional Paths | User-specified via /aui-sync args | Cross-template files to propagate |

## Workflow

### Phase 1: Discovery

1. **Identify registry changes**
   - Run `git log --oneline -10` in registry to see recent commits
   - Run `git diff --name-status HEAD~10` to see changed files
   - List affected components

2. **Discover templates**
   - List subdirectories in templates container
   - For each: verify it's a git repo, check `git status` is clean
   - Skip templates with uncommitted changes (warn user)

3. **Check for existing PRs**
   - Run `gh pr list --state open` in each template
   - Note any sync-related PRs already open

### Phase 2: Bucket Synthesis

Group related changes into logical buckets:
- **Bucket**: A thematic grouping of files to sync together
- Name each bucket descriptively (3-5 words)
- Present buckets to user for approval before proceeding

### Phase 3: Apply (Per Template, Per Bucket)

For each template and each bucket:

1. **Extract integration points BEFORE overwrite**
   - Read the template's current component file
   - Read JSDoc comments in registry components for integration guidance
   - Identify template-specific customizations to preserve after sync

2. **Run assistant-ui CLI**
   ```bash
   cd <template-path>
   pnpx assistant-ui add <component> --yes --overwrite
   ```

3. **Format and lint**
   ```bash
   cd <template-path>
   pnpm format
   pnpm lint:fix
   ```

4. **Restore integration points**
   - Re-read the freshly synced file
   - Apply extracted integrations:
     - Add missing imports
     - Restore component mappings
     - Restore plugin configurations
   - Preserve registry changes while adding back template customizations

5. **Lint again after integration restoration**
   ```bash
   cd <template-path>
   pnpm lint:fix
   ```

6. **Update dependencies (separate commit)**
   ```bash
   cd <template-path>
   pnpx npm-check-updates -u
   pnpm install
   ```
   - Run `pnpx npm-check-updates -u` to update package.json dependencies
   - Run `pnpm install` to install and regenerate lockfile
   - Commit separately: `chore(deps): update dependencies`

### Phase 4: Verification

Run verification checklist (see verification.md in this skill folder)

### Phase 5: Summary

Present results:
- Templates synced successfully
- Templates skipped (dirty git state, errors)
- Files changed per template
- Suggest next steps (commit, PR creation)

## Additional Paths Handling

When user specifies additional paths (e.g., "route.ts in assistant-ui-starter-cloud"):

1. Parse the request to identify:
   - Source file/path
   - Source template (canonical version)
   - Target templates

2. For each target template:
   - Determine appropriate destination path
   - Copy file, adjusting imports if needed
   - Run `pnpm format` and `pnpm lint:fix`

## Constraints

- **Never push** - only local changes and commits
- **Never merge unless explicitly requested/approved by the user**
- **Stop on errors** - don't continue to next template if one fails badly
- **Preserve git history** - one commit per bucket per template
- **Ask before destructive ops** - confirm before overwriting files with uncommitted changes

## Success Criteria

- [ ] All targeted templates have synced components
- [ ] Integration points preserved (verified by reading files)
- [ ] `pnpm format` and `pnpm lint:fix` pass on changed templates
- [ ] Git status shows only expected changes
- [ ] User informed of results and next steps

## Post-Workflow Commands

If user explicitly requests merging the PRs after sync completion:
```bash
gh pr merge <pr-url> --squash --delete-branch
```
Run for each open PR created during the sync.
