# assistant-ui Makefile
# Simplify common development tasks

.PHONY: help install build build-packages clean clean-all pristine pristine-force dev docs test lint format fix changeset sync-registry check-registry ci-install ci-lint ci-build ci-test ci-version ci-publish

# Default target - show help
help:
	@echo "assistant-ui Development Commands"
	@echo ""
	@echo "Setup & Installation:"
	@echo "  make install          Install all dependencies"
	@echo "  make build            Build all packages and apps"
	@echo "  make build-packages   Build only packages (for publishing)"
	@echo "  make clean            Clean build artifacts (dist, .next, .turbo)"
	@echo "  make clean-all        Clean build artifacts + node_modules"
	@echo "  make pristine         Reset to fresh git clone state (removes ALL untracked files)"
	@echo ""
	@echo "Development:"
	@echo "  make dev              Run docs in development mode"
	@echo "  make docs             Same as 'make dev'"
	@echo "  make dev-registry     Run registry app in dev mode"
	@echo "  make dev-devtools     Run devtools-frame in dev mode"
	@echo ""
	@echo "Examples (use EXAMPLE=name):"
	@echo "  make example          Run an example (e.g., make example EXAMPLE=with-tanstack)"
	@echo "  make list-examples    List all available examples"
	@echo ""
	@echo "Code Quality:"
	@echo "  make lint             Check code with biome"
	@echo "  make format           Format code with biome"
	@echo "  make fix              Fix linting issues with biome"
	@echo "  make test             Run all tests"
	@echo ""
	@echo "Registry:"
	@echo "  make sync-registry    Sync registry components to examples/docs"
	@echo "  make check-registry   Check if registry components are in sync"
	@echo ""
	@echo "Release:"
	@echo "  make changeset        Create a new changeset"
	@echo ""
	@echo "CI (for GitHub Actions):"
	@echo "  make ci-install       Install with frozen lockfile"
	@echo "  make ci-lint          Run linter (non-fix mode)"
	@echo "  make ci-build         Build all packages"
	@echo "  make ci-test          Run all tests"
	@echo "  make ci-version       Version packages"
	@echo "  make ci-publish       Publish packages to npm"
	@echo ""
	@echo "Package-specific:"
	@echo "  make build-PKG        Build specific package (e.g., make build-react)"
	@echo "  make test-PKG         Test specific package (e.g., make test-react)"
	@echo "  make dev-PKG          Dev specific package (e.g., make dev-docs)"

# =============================================================================
# Setup & Installation
# =============================================================================

install:
	pnpm install

build:
	pnpm turbo build

build-packages:
	pnpm turbo build --filter="./packages/*"

clean:
	@echo "Cleaning build artifacts..."
	find . -type d -name "dist" -not -path "*/node_modules/*" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name ".next" -not -path "*/node_modules/*" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name ".turbo" -not -path "*/node_modules/*" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name ".output" -not -path "*/node_modules/*" -exec rm -rf {} + 2>/dev/null || true
	@echo "Clean complete!"

clean-all: clean
	@echo "Cleaning node_modules..."
	find . -type d -name "node_modules" -exec rm -rf {} + 2>/dev/null || true
	@echo "Full clean complete!"

# Reset to pristine git clone state (removes ALL untracked files)
pristine:
	@echo "⚠️  This will remove ALL untracked files and directories!"
	@echo "    Including: node_modules, dist, .next, build artifacts, etc."
	@echo ""
	@read -p "Are you sure? [y/N] " confirm && [ "$$confirm" = "y" ] || { echo "Aborted."; exit 1; }
	git clean -fdx
	@echo ""
	@echo "✅ Repository is now pristine (like a fresh git clone)"
	@echo "   Run 'make setup' or 'make install' to reinstall dependencies"

# Same as pristine but without confirmation prompt (for CI/scripts)
pristine-force:
	git clean -fdx
	@echo "✅ Repository is now pristine"

# =============================================================================
# Development
# =============================================================================

dev: docs

docs:
	pnpm --filter=@assistant-ui/docs dev

dev-registry:
	pnpm --filter=@assistant-ui/shadcn-registry dev

dev-devtools:
	pnpm --filter=devtools-frame dev

# Run a specific example
# Usage: make example EXAMPLE=with-tanstack
EXAMPLE ?= with-langgraph
example:
	@if [ -d "examples/$(EXAMPLE)" ]; then \
		cd examples/$(EXAMPLE) && pnpm dev; \
	else \
		echo "Example '$(EXAMPLE)' not found. Use 'make list-examples' to see available examples."; \
		exit 1; \
	fi

list-examples:
	@echo "Available examples:"
	@ls -1 examples/ | grep -v node_modules | while read dir; do \
		if [ -f "examples/$$dir/package.json" ]; then \
			echo "  - $$dir"; \
		fi \
	done

# =============================================================================
# Code Quality
# =============================================================================

lint:
	pnpm exec biome check

format:
	pnpm exec biome format --write

fix:
	pnpm exec biome check --fix

test:
	pnpm turbo test

# =============================================================================
# Registry Management
# =============================================================================

sync-registry:
	bash scripts/sync-registry-components.sh

check-registry:
	bash scripts/check-registry-sync.sh

build-registry:
	pnpm --filter=@assistant-ui/shadcn-registry build

# =============================================================================
# Release Management
# =============================================================================

changeset:
	pnpm changeset

ci-version:
	pnpm changeset version && pnpm install --no-frozen-lockfile

ci-publish:
	pnpm turbo build --filter="./packages/*" && pnpm changeset publish

# =============================================================================
# Package-specific targets (dynamic)
# =============================================================================

# Build specific package: make build-react, make build-cli, etc.
build-%:
	pnpm turbo build --filter="./packages/$*"

# Test specific package: make test-react, make test-cli, etc.
test-%:
	pnpm turbo test --filter="./packages/$*"

# Dev specific app: make dev-docs, make dev-registry, etc.
dev-%:
	pnpm turbo dev --filter="./apps/$*"

# =============================================================================
# CI Targets (for GitHub Actions)
# =============================================================================

.PHONY: ci-install ci-lint ci-build ci-test

# CI install with frozen lockfile
ci-install:
	pnpm install --frozen-lockfile

# CI lint check
ci-lint:
	pnpm exec biome check

# CI build all
ci-build:
	pnpm turbo build

# CI test all
ci-test:
	pnpm turbo test

# =============================================================================
# Python Development
# =============================================================================

.PHONY: py-install py-test py-lint

py-install:
	cd python/assistant-stream && pip install -e ".[dev,langgraph]"

py-test:
	cd python/assistant-stream && pytest

# =============================================================================
# Utility targets
# =============================================================================

# Show project info
info:
	@echo "Project: assistant-ui"
	@echo "Package Manager: pnpm $(shell pnpm --version 2>/dev/null || echo 'not installed')"
	@echo "Node.js: $(shell node --version 2>/dev/null || echo 'not installed')"
	@echo ""
	@echo "Packages:"
	@ls -1 packages/ | grep -v node_modules | wc -l | xargs echo "  Count:"
	@echo ""
	@echo "Apps:"
	@ls -1 apps/ | grep -v node_modules
	@echo ""
	@echo "Examples:"
	@ls -1 examples/ | grep -v node_modules | wc -l | xargs echo "  Count:"

# Check prerequisites
check-prereqs:
	@echo "Checking prerequisites..."
	@command -v node >/dev/null 2>&1 || { echo "❌ Node.js is not installed"; exit 1; }
	@command -v pnpm >/dev/null 2>&1 || { echo "❌ pnpm is not installed"; exit 1; }
	@echo "✅ Node.js: $(shell node --version)"
	@echo "✅ pnpm: $(shell pnpm --version)"
	@echo "All prerequisites satisfied!"

# Quick setup for new contributors
setup: check-prereqs install build
	@echo ""
	@echo "✅ Setup complete! You can now run:"
	@echo "   make dev          - Start docs development server"
	@echo "   make example      - Run an example project"
	@echo "   make help         - See all available commands"

