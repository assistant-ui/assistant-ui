---
date: 2025-09-29T15:30:00Z
researcher: Claude
git_commit: f04fe696f669db999c848c3058aa37efe351aba1
branch: main
repository: assistant-ui
topic: "How automated tests can be run after each change"
tags: [research, testing, automation, ci-cd, development]
status: complete
last_updated: 2025-09-29
last_updated_by: Claude
---

# Research: How Automated Tests Can Be Run After Each Change

**Date**: 2025-09-29T15:30:00Z
**Researcher**: Claude
**Git Commit**: f04fe696f669db999c848c3058aa37efe351aba1
**Branch**: main
**Repository**: assistant-ui

## Research Question
How can automated tests be run after each change in the assistant-ui monorepo?

## Summary
The assistant-ui monorepo has comprehensive testing infrastructure but lacks local development automation. Currently, tests are automated in CI/CD but require manual execution during development. The codebase uses Vitest for testing with watch mode capabilities, Turbo for monorepo orchestration, and has GitHub Actions for CI/CD automation. To run tests automatically after each change, developers need to implement pre-commit hooks and IDE integrations.

## Detailed Findings

### Current Testing Infrastructure

#### Test Framework and Configuration
- **Primary Framework**: Vitest v3.2.4 used consistently across all packages
- **Environments**: Node.js for utilities, jsdom for React components
- **Monorepo Orchestration**: Turbo manages test execution across packages
- **Test Dependencies**: Testing Library for React components, Stryker for mutation testing

#### Available Test Commands
**Root Level (`package.json:10`)**:
- `pnpm test` - Runs tests across all packages via Turbo

**Package Level (most packages)**:
- `pnpm test` or `pnpm test:run` - Single test execution (`vitest run`)
- `pnpm test:watch` - Interactive watch mode (`vitest`)
- `pnpm test:mutation` - Mutation testing (`stryker run`) - available in core packages

#### CI/CD Automation
**GitHub Actions Workflows**:
- **Code Quality Workflow** (`.github/workflows/code-quality.yaml`): Runs on push/PR to main
- **Changesets Workflow** (`.github/workflows/changeset.yaml`): Versioning and publishing
- **TestDriver Workflow** (`.github/workflows/testdriver.yml`): End-to-end testing

**CI Test Execution**:
1. ESLint check (`pnpm eslint`)
2. Prettier formatting check (`pnpm prettier`)
3. Test suite (`pnpm test` - runs `turbo test`)

### Current State of Local Automation

#### ❌ Missing Local Automation
- **No pre-commit hooks** configured
- **No git hooks** set up
- **No Husky or lint-staged** integration
- **No IDE automation** configured

#### ✅ Available Watch Mode Testing
Each package supports watch mode testing:
- Core packages: `cd packages/react && pnpm test:watch`
- Utility packages: `cd packages/tap && pnpm test`
- Integration packages: `cd packages/react-langgraph && pnpm test:watch`

### Package-Level Testing Coverage

#### Fully Tested Packages
- **`@assistant-ui/react`** - Comprehensive testing with setup files, mutation testing
- **`assistant-stream`** - Unit tests with watch mode
- **`@assistant-ui/tap`** - Advanced testing utilities with Vitest UI
- **`@assistant-ui/react-langgraph`** - React component testing with jsdom
- **`@assistant-ui/react-markdown`** - React component testing

#### Packages Without Test Configuration
- **`@assistant-ui/react-ai-sdk`** - No test scripts configured
- **`@assistant-ui/react-hook-form`** - No test scripts configured

## Code References

### Configuration Files
- `package.json:10` - Root test script using Turbo
- `turbo.json:20-22` - Test task configuration with build dependencies
- `packages/react/package.json` - Core package test scripts
- `packages/assistant-stream/vitest.config.ts:5` - Basic Node.js test environment
- `packages/react-langgraph/vitest.config.ts:5` - React/jsdom test environment

### Test Utilities
- `packages/react/src/tests/setup.ts` - Global test setup with Date mocking
- `packages/tap/src/__tests__/test-utils.ts` - Comprehensive testing utilities
- `packages/react/src/tests/MessageRepository.test.ts:33` - Example test structure

### CI/CD Workflows
- `.github/workflows/code-quality.yaml` - Main CI/CD pipeline
- `.github/workflows/changeset.yaml` - Versioning and publishing
- `.github/workflows/testdriver.yml` - End-to-end testing

## Architecture Insights

### Testing Patterns
1. **Tiered Testing Approach**: Core packages have comprehensive testing, integration packages have focused testing
2. **Environment Selection**: Node.js for utilities, jsdom for React components requiring DOM
3. **Monorepo Orchestration**: Turbo handles test dependencies and parallel execution
4. **Quality Assurance**: Mutation testing available for critical packages

### Build Pipeline Integration
- Tests depend on builds (`"dependsOn": ["^build"]` in `turbo.json:21`)
- Comprehensive caching strategy (pnpm, Turbo, GitHub Actions)
- Environment variable support for various API configurations

## Implementation Recommendations

### Option 1: Manual Development Workflow (Current)
```bash
# During development
cd packages/your-package
pnpm test:watch     # Run tests in watch mode

# Before commit
pnpm prettier       # Check formatting
pnpm prettier:fix   # Fix formatting issues
pnpm test           # Run all tests
```

### Option 2: Automated Pre-commit Setup (Recommended)
Add to `package.json`:
```json
{
  "devDependencies": {
    "husky": "^9.0.0",
    "lint-staged": "^15.0.0"
  },
  "scripts": {
    "prepare": "husky",
    "lint-staged": "lint-staged"
  },
  "lint-staged": {
    "*.{js,jsx,ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{md,json}": [
      "prettier --write"
    ]
  }
}
```

### Option 3: IDE Integration
Create `.vscode/settings.json`:
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  }
}
```

## Open Questions

1. Should all integration packages have test suites, or rely on integration testing?
2. What is the preferred approach for local development automation?
3. Should the missing ESLint script in CI workflow be fixed to use `turbo lint`?
4. Is mutation testing required for all packages or just core packages?

## Next Steps

1. **Immediate**: Set up pre-commit hooks for formatting and linting
2. **Short-term**: Add IDE integrations for auto-formatting
3. **Medium-term**: Standardize testing across all packages
4. **Long-term**: Implement comprehensive local development automation