# AUI-Sync Verification Checklist

Run after each template sync:

## File Integrity
- [ ] Changed files exist and are non-empty
- [ ] No syntax errors (lint passes)
- [ ] Imports resolve correctly

## Integration Preservation
- [ ] Template-specific imports still present
- [ ] Component mappings restored (if any)
- [ ] Plugin configurations intact (if any)
- [ ] All integrations identified in template before sync are preserved after sync

## Git State
- [ ] Only expected files modified
- [ ] No unintended deletions
- [ ] Changes are committable

## Build Check (Optional)
- [ ] `pnpm install` succeeds (if deps changed)
- [ ] `pnpm build` succeeds (except expected failures from missing env vars, local servers, etc.)
- [ ] `tsc --noEmit` succeeds

## Commands to Run

```bash
# Per template:
cd <template>
git diff --stat
pnpm lint
tsc --noEmit
```
