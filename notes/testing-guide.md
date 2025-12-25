---
date: 2025-09-29T15:45:00Z
researcher: Claude
git_commit: f04fe696f669db999c848c3058aa37efe351aba1
branch: main
repository: assistant-ui
topic: "Testing Guide for Coding Agents with MCP Access"
tags: [testing, guide, mcp, automation, coding-agent]
status: complete
last_updated: 2025-09-29
last_updated_by: Claude
---

# Testing Guide for Coding Agents with MCP Access

**Date**: 2025-09-29T15:45:00Z
**Researcher**: Claude
**Git Commit**: f04fe696f669db999c848c3058aa37efe351aba1
**Branch**: main
**Repository**: assistant-ui

## Overview

This guide provides comprehensive testing strategies for coding agents working on the assistant-ui monorepo with access to Context7, Linear, and Screenshot MCP servers. The assistant-ui project is a React/TypeScript library for building AI chat interfaces, making visual testing and documentation particularly important.

## Available MCP Servers and Their Testing Applications

### 1. Context7 MCP Server

#### Purpose
Access up-to-date library documentation and code examples.

#### Testing Applications
- **Dependency Updates**: Verify new library versions don't break existing functionality
- **API Changes**: Check library API changes before updating dependencies
- **Best Practices**: Ensure code follows current library patterns
- **Integration Testing**: Verify third-party library integrations work correctly

#### Example Testing Workflows
```bash
# Before updating React version
mcp__context7__resolve-library-id libraryName="react"
mcp__context7__get-library-docs context7CompatibleLibraryID="/facebook/react" topic="hooks"

# Before updating Vitest
mcp__context7__resolve-library-id libraryName="vitest"
mcp__context7__get-library-docs context7CompatibleLibraryID="/vitest-dev/vitest" topic="testing"
```

#### Key Libraries to Monitor
- **React** - Core framework
- **Vitest** - Testing framework
- **Testing Library** - Component testing
- **Radix UI** - Component primitives
- **Tailwind CSS** - Styling
- **TypeScript** - Type safety

### 2. Linear MCP Server

#### Purpose
Manage issues, projects, and documentation in Linear.

#### Testing Applications
- **Test Case Management**: Create and track test cases as Linear issues
- **Bug Reporting**: File bugs with visual evidence (screenshots)
- **Test Planning**: Create test projects and cycles
- **Documentation**: Maintain testing documentation and playbooks

#### Example Testing Workflows
```bash
# Create test project
mcp__linear__create_project title="Visual Testing Suite" team="Engineering" description="Comprehensive visual testing for UI components"

# File visual regression bug
mcp__linear__create_issue title="Chat Bubble Styling Regression" team="Engineering" description="Chat bubbles appear misaligned after recent CSS changes" labels=["bug", "visual-regression", "priority-high"]

# Create test documentation
mcp__linear__create_document title="Visual Testing Playbook" content="# Visual Testing Procedures\n\n## Screenshot Testing\n1. Capture baseline screenshots\n2. Compare after changes\n3. Document differences"
```

#### Linear Integration Strategy
- **Test Projects**: Organize tests by component or feature area
- **Issue Templates**: Standardized bug reports for visual regressions
- **Label Management**: Categorize tests by type (unit, integration, visual)
- **Documentation**: Maintain testing guides and procedures

### 3. Screenshot MCP Server

#### Purpose
Capture screenshots of localhost applications for visual testing.

#### Testing Applications
- **Visual Regression Testing**: Compare before/after screenshots
- **Documentation Updates**: Capture examples for docs and marketing
- **Component Verification**: Verify UI components render correctly
- **Responsive Testing**: Test different viewport sizes
- **Theme Testing**: Verify light/dark mode rendering

#### Example Testing Workflows
```bash
# Capture component screenshots
mcp__screenshot__capture_localhost_screenshot url="http://localhost:3000" filename="chat-interface-desktop" viewportWidth=1920 viewportHeight=1080
mcp__screenshot__capture_localhost_screenshot url="http://localhost:3000" filename="chat-interface-mobile" viewportWidth=375 viewportHeight=667

# Test specific components with wait times
mcp__screenshot__capture_localhost_screenshot url="http://localhost:3000/examples/chatgpt" filename="chatgpt-demo" waitTime=3000

# Capture tool execution states
mcp__screenshot__capture_localhost_screenshot url="http://localhost:3000/examples/langgraph" filename="tool-execution" waitForSelector="[data-tool-running]"
```

#### Screenshot Testing Strategy
- **Baseline Images**: Maintain reference screenshots for key components
- **Automated Capture**: Integrate with CI/CD for visual regression testing
- **Documentation Assets**: Update docs with current screenshots
- **Multi-Viewport**: Test responsive design across device sizes
- **Theme Variations**: Verify all theme combinations

## Comprehensive Testing Strategy

### 1. Pre-Change Testing

#### Before Making Changes
1. **Capture Baseline Screenshots**
   - Document current state of affected components
   - Capture multiple viewport sizes
   - Test all theme variations

2. **Research Dependencies**
   - Check Context7 for library updates
   - Verify API compatibility
   - Review breaking changes

3. **Create Test Plan in Linear**
   - Document what will be tested
   - Define success criteria
   - Assign test tasks

### 2. During Development Testing

#### Real-Time Testing
1. **Watch Mode Testing**
   - Run `pnpm test:watch` in affected packages
   - Use Screenshot MCP to capture iterative changes
   - Verify visual changes as you code

2. **Documentation Updates**
   - Capture new component states
   - Update documentation screenshots
   - Verify examples still work

3. **Integration Testing**
   - Test backend integrations
   - Verify streaming responses
   - Check tool interactions

### 3. Post-Change Testing

#### Comprehensive Verification
1. **Visual Regression Testing**
   - Compare before/after screenshots
   - Document any visual differences
   - File issues for regressions

2. **Full Test Suite**
   - Run `pnpm test` across all packages
   - Verify CI/CD pipeline passes
   - Check mutation testing results

3. **Documentation Verification**
   - Update documentation with new screenshots
   - Verify examples work correctly
   - Create Linear issues for any documentation gaps

## Testing Automation Workflows

### Workflow 1: Component Development

```bash
# 1. Setup test project in Linear
mcp__linear__create_project title="New Chat Component Testing" team="Engineering"

# 2. Capture before screenshots
mcp__screenshot__capture_localhost_screenshot url="http://localhost:3000" filename="before-chat-component"

# 3. Research dependencies
mcp__context7__resolve-library-id libraryName="react"
mcp__context7__get-library-docs context7CompatibleLibraryID="/facebook/react" topic="components"

# 4. Make changes and test
# ... development work ...

# 5. Capture after screenshots
mcp__screenshot__capture_localhost_screenshot url="http://localhost:3000" filename="after-chat-component"

# 6. File test results
mcp__linear__create_issue title="Chat Component Testing Complete" team="Engineering" description="Visual testing completed successfully. Screenshot comparisons show no regressions."
```

### Workflow 2: Dependency Updates

```bash
# 1. Check for breaking changes
mcp__context7__resolve-library-id libraryName="vitest"
mcp__context7__get-library-docs context7CompatibleLibraryID="/vitest-dev/vitest" topic="breaking-changes"

# 2. Create test plan
mcp__linear__create_project title="Vitest Update Testing" team="Engineering"

# 3. Update dependencies and test
# ... dependency update ...

# 4. Run comprehensive tests
mcp__screenshot__capture_localhost_screenshot url="http://localhost:3000/examples" filename="vitest-update-results"

# 5. Document results
mcp__linear__create_issue title="Vitest Update Results" team="Engineering" description="Testing completed. All tests pass. No visual regressions detected."
```

### Workflow 3: Documentation Updates

```bash
# 1. Capture current documentation
mcp__screenshot__capture_localhost_screenshot url="http://localhost:3000/docs" filename="docs-before-update"

# 2. Update documentation
# ... documentation changes ...

# 3. Capture updated documentation
mcp__screenshot__capture_localhost_screenshot url="http://localhost:3000/docs" filename="docs-after-update"

# 4. Create documentation issue
mcp__linear__create_issue title="Documentation Screenshots Updated" team="Documentation" description="Updated documentation screenshots reflect latest UI changes."
```

## Best Practices

### 1. Screenshot Testing
- **Consistent Viewports**: Use standard viewport sizes for consistency
- **Wait Times**: Allow sufficient time for components to render
- **Selectors**: Use specific selectors to capture precise states
- **File Naming**: Use descriptive filenames for easy comparison

### 2. Linear Integration
- **Consistent Labels**: Use standardized labels for different test types
- **Detailed Descriptions**: Include specific steps and expected results
- **Visual Evidence**: Attach screenshots to issues for visual regressions
- **Project Organization**: Organize tests by component or feature area

### 3. Context7 Usage
- **Version Awareness**: Always check for breaking changes before updates
- **API Verification**: Verify new APIs are compatible with existing code
- **Best Practices**: Follow current library patterns and conventions

### 4. Testing Frequency
- **Before Changes**: Capture baseline state
- **During Development**: Test iteratively
- **After Changes**: Comprehensive verification
- **Before Merge**: Final validation

## Testing Checklist

### Pre-Change Checklist
- [ ] Capture baseline screenshots of affected components
- [ ] Research library dependencies for breaking changes
- [ ] Create test plan in Linear
- [ ] Document expected changes and success criteria

### During Development Checklist
- [ ] Run watch mode tests during development
- [ ] Capture screenshots of iterative changes
- [ ] Verify integrations work correctly
- [ ] Test multiple viewport sizes and themes

### Post-Change Checklist
- [ ] Compare before/after screenshots for regressions
- [ ] Run full test suite across all packages
- [ ] Verify documentation examples work correctly
- [ ] Update documentation screenshots if needed
- [ ] Create Linear issues for any found problems
- [ ] Document testing results and learnings

## Tools and Commands Reference

### MCP Commands
```bash
# Context7
mcp__context7__resolve-library-id libraryName="library-name"
mcp__context7__get-library-docs context7CompatibleLibraryID="/org/project" topic="specific-topic"

# Linear
mcp__linear__create_issue title="Issue Title" team="Team Name" description="Issue description"
mcp__linear__create_project title="Project Title" team="Team Name" description="Project description"
mcp__linear__create_document title="Document Title" content="Document content"

# Screenshot
mcp__screenshot__capture_localhost_screenshot url="http://localhost:3000" filename="screenshot-name"
mcp__screenshot__list_screenshots
```

### Assistant UI Testing Commands
```bash
# Root level testing
pnpm test              # Run all tests
pnpm prettier          # Check formatting
pnpm prettier:fix      # Fix formatting

# Package level testing
cd packages/react && pnpm test:watch    # Watch mode testing
cd packages/react && pnpm test:mutation # Mutation testing
cd packages/react && pnpm test          # Single run

# Development servers
pnpm docs:dev         # Start documentation server
cd examples/with-ai-sdk-v5 && pnpm dev  # Start example app
```

## Conclusion

This comprehensive testing guide leverages the available MCP servers to provide thorough testing coverage for the assistant-ui project. By combining automated screenshot capture, library documentation research, and structured issue tracking, coding agents can ensure high-quality changes while maintaining visual consistency and documentation accuracy.

The key is to integrate testing throughout the development process, not just as a final validation step. Use the MCP servers to capture baseline states, research changes, test iteratively, and document results comprehensively.