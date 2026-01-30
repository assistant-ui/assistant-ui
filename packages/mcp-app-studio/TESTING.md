# Manual Testing Plan

Step through this checklist to validate the complete user journey.

## Prerequisites

- [x] Node.js >=20.9.0 installed (tested on v25.2.1)
- [x] pnpm installed globally (tested on v10.x)
- [x] Clean test directory (`~/Code/tests/test-scaffold`)

---

## 1. CLI Invocation

### 1.1 With project name argument

```bash
cd ~/Code/tests/test-scaffold
node /path/to/bin/mcp-app-studio.js my-app
```

- [x] Intro banner shows `mcp-app-studio`
- [x] Spinner shows "Creating project..." (implicit, fast)
- [x] Success message "Project created!"
- [x] "Next steps" box shows correct commands
- [x] Export hint displayed at end

**Notes:** Banner displays correctly, all steps shown. Uses npm commands when run with node directly.

### 1.2 Interactive mode (no argument)

- [ ] Prompts for project name _(requires TTY)_
- [ ] Accepts valid name _(requires TTY)_
- [ ] Rejects invalid names with error message _(requires TTY)_
- [ ] Cancel with Ctrl+C exits cleanly _(requires TTY)_

**Notes:** Skipped - requires interactive TTY input.

### 1.3 Overwrite existing directory

- [ ] Prompts "Directory is not empty. Remove existing files?" _(requires TTY)_
- [ ] Selecting "No" cancels without deleting _(requires TTY)_
- [ ] Selecting "Yes" removes contents and scaffolds _(requires TTY)_

**Notes:** Skipped - requires interactive TTY input.

### 1.4 Empty directory with .git

- [x] Does NOT prompt to overwrite (treats as empty)
- [x] Scaffolds successfully

**Notes:** Works correctly. Directory with only `.git` is treated as empty.

### 1.5 Template selection

- [ ] `--template minimal` generates only the Welcome example + wrapper
- [ ] `--template poi-map` generates only the POI Map example + wrapper
- [ ] `mcp-app-studio.config.json` defaults match the selected template:
  - minimal → `lib/workbench/wrappers/welcome-card-sdk.tsx` / `WelcomeCardSDK`
  - poi-map → `lib/workbench/wrappers/poi-map-sdk.tsx` / `POIMapSDK`

### 1.6 Server toggle

- [ ] `--include-server` includes `server/` (default behavior)
- [ ] `--no-server` does not create `server/` and does not attempt server postinstall

---

## 2. Scaffolded Project Structure

### 2.1 Essential files exist

- [x] `package.json`
- [x] `.gitignore` (not `_gitignore`)
- [x] `.env.example`
- [ ] `.env.local` _(optional - user-created, not scaffolded)_
- [x] `tsconfig.json`
- [x] `next.config.ts`
- [x] CSS config (`postcss.config.mjs`)

**Notes:** All files present. Uses PostCSS config for Tailwind v4.

### 2.2 Directories exist

- [x] `app/`
- [x] `components/`
- [x] `lib/`
- [x] `scripts/`

### 2.3 package.json contents

- [x] `name` matches project name (sanitized) → `"my-app"`
- [x] `version` is `0.1.0`
- [x] `private` is `true`
- [x] Has `scripts.dev` → `"tsx scripts/dev.ts"`
- [x] Has `scripts.dev:next` → `"next dev -p 3002"`
- [x] Has `scripts.build` → `"next build"`
- [x] Has `scripts.export` → `"tsx scripts/export.ts"`

### 2.4 Example widget exists

- [ ] For `--template poi-map`: `components/examples/poi-map/` directory exists
- [ ] For `--template poi-map`: contains `index.tsx`, `schema.ts`, `poi-map.tsx`
- [ ] For `--template minimal`: `components/examples/welcome-card/` directory exists
- [ ] For `--template minimal`: contains `index.tsx`, `schema.ts`, `welcome-card.tsx`

---

## 3. Development Flow

### 3.1 Install dependencies

- [x] Completes without errors (5.6s, 637 packages)
- [x] `node_modules/` created
- [x] No blocking peer dependency warnings
- [x] If server included: `server/node_modules/` auto-created via postinstall
- [x] If server included: `@modelcontextprotocol/sdk` installed in server

**Notes:** Warning about ignored build scripts (esbuild, sharp) is expected and non-blocking. `npm audit` warnings may appear depending on your environment.

### 3.2 Start dev server

- [x] Next.js starts (default: `http://localhost:3002`)
- [x] MCP server starts (default: `http://localhost:3001/mcp`, auto-selects a free port if 3001 is in use)
- [x] No console errors on startup
- [x] Ready in 1218ms with Turbopack

**Notes:** The root `dev` script starts both Next.js and the MCP server (when included). The MCP server port is printed on startup and written to `server/.mcp-port` for tooling.

### 3.3-3.5 Workbench UI & POI Map

- [ ] _(Skipped - requires browser automation)_

**Notes:** Page title confirmed: "Create ChatGPT App"

### 3.6 MCP Server (when included)

- [x] `server/node_modules/` created automatically via postinstall
- [x] `server/node_modules/@modelcontextprotocol/sdk` exists
- [x] `npm run dev` starts both Next.js AND MCP server
- [x] MCP server responds at `GET http://localhost:<port>/` with 200
- [x] MCP server responds at `http://localhost:<port>/mcp` (note: a bare GET may return 406; use MCP Inspector for full validation)
- [ ] `cd server && npm run inspect` launches MCP inspector
- [ ] Inspector connects successfully to MCP server
- [x] Stopping dev server (Ctrl+C) cleanly kills all child processes
- [x] No zombie processes left on ports 3002 (Next.js) and the resolved MCP port after stopping
- [ ] If inspector was launched: no zombie processes left on ports 6277, 6274 after stopping inspector

**Notes:** `cd server && npm run inspect` reads `PORT` if set; otherwise it uses `server/.mcp-port` written by the running server.

---

## 4. Build Flow

### 4.1 Production build

- [x] Completes without errors (2.4s)
- [x] `.next/` directory created
- [x] No TypeScript errors in output
- [x] No ESLint errors in output

**Notes:** 5 routes generated (2 static, 2 dynamic API routes).

### 4.2 Start production server

- [ ] _(Not tested - requires long-running server)_

---

## 5. Export Flow

### 5.1 Run export

- [x] Completes without errors
- [x] `export/` directory created

### 5.2 Export contents

- [x] `export/manifest.json` exists
- [x] `export/widget/widget.js` exists
- [x] `export/widget/index.html` exists
- [x] `export/widget/widget.css` exists
- [x] `export/README.md` exists
- [x] If using POI Map template: `export/widget/assets/` contains required Leaflet assets

### 5.3 Manifest validation

- [x] Valid JSON
- [x] Contains: `schema_version`, `name`, `widget.url`, `version`
- [ ] Contains recommended: `description`
- [x] Widget URL placeholder present for deployment

### 5.4 Widget bundle validation

- [x] Contains bundled JavaScript (React 19.2.3)
- [x] No source map references to local paths
- [x] Minified production build

---

## 6. Package Manager Detection

### 6.1 With pnpm

- [ ] _(Requires pnpm dlx)_

### 6.2 With npm

- [x] "Next steps" shows `npm install` and `npm run dev`

### 6.3 With yarn

- [ ] _(Requires yarn)_

---

## 7. Name Sanitization

| Input      | Expected  | Actual    | Status |
| ---------- | --------- | --------- | ------ |
| `my app`   | `my-app`  | `my-app`  | ✅     |
| `MyApp`    | `myapp`   | `myapp`   | ✅     |
| `.hidden`  | `hidden`  | `hidden`  | ✅     |
| `_private` | `private` | `private` | ✅     |

- [x] Each tested input produces expected sanitized name

**Notes:** Directory keeps original name; package.json name is sanitized.

---

## 8. Error Scenarios

### 8.1-8.2 Interactive errors

- [ ] _(Requires TTY)_

### 8.3 Port already in use

- [x] MCP server avoids port conflicts by selecting the next available port
- [ ] If Next.js port (3002) is already in use, verify it either auto-selects a new port or exits with a clear message

### 8.4 Missing .env.local values

- [x] App starts without API keys
- [x] Workbench works for mocking

---

## 9. Edge Cases

### 9.1 Very long project name

- [x] Creates successfully with 60-character name

### 9.2 Unicode in project name

- [ ] _(Not tested)_

### 9.3 Current directory scaffold

- [x] Scaffolds in current directory
- [x] Uses directory name for package name (`test-current-dir`)

**Notes:** This was previously broken (empty package name). Now fixed!

---

## 10. Cleanup

```bash
rm -rf ~/Code/tests/test-scaffold/*
```

---

## Issues Found

| Step | Issue | Severity | Status |
| ---- | ----- | -------- | ------ |
| 2.1  | Test plan incorrectly expected `.env.local` to be scaffolded | Low | **FIXED** (docs) |
| 9.3  | Scaffold with `.` set empty package name | Low | **FIXED** |
| 3.1  | Server deps not auto-installed (required manual `cd server && npm install`) | High | **FIXED** |
| 3.2  | `appComponent` import doesn't exist in generated `component-registry.tsx` | Critical | **FIXED** |
| 3.2  | Peer dependency mismatch between assistant-ui packages | High | **FIXED** |
| 3.6  | MCP server crashes on `EADDRINUSE` (port 3001) | Medium | **FIXED** (starter repo) |
| 3.6  | `cd server && npm run inspect` hardcoded port 3001 | Low | **FIXED** (starter repo) |
| 3.6  | Stopping `npm run dev` left child processes on ports 3002 / 300x | High | **FIXED** (starter repo) |
| 5.3  | Export manifest missing recommended `description` field | Low | **FIXED** (starter repo) |

---

## Sign-off

- [ ] All critical paths tested
- [ ] No blocking issues found
- [ ] Ready for release

**Tested by:** _<name>_
**Date:** _YYYY-MM-DD_

---

## Skipped tests

Skipped tests usually require:

- Interactive TTY input (prompts, Ctrl+C)
- Browser validation (workbench UI)
- Specific package managers (yarn, `pnpm dlx`)
