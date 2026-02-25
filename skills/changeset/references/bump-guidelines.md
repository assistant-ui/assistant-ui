# Bump Guidelines

Use one bump per affected package:

## patch

Use for:
- bug fixes
- performance improvements
- internal refactors that do not break API/behavior contracts

## minor

Use for:
- new backward-compatible features
- additive options, props, exports, or helpers

## major

Use for:
- breaking API changes
- behavior changes that require user migration
- removing or renaming public exports/options

When in doubt:
- If users can upgrade without code changes, use `patch` or `minor`.
- If users must change their code/config, use `major`.
