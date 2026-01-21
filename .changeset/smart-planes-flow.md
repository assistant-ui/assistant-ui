---
"assistant-ui": minor
---

feat(cli): add `mcp` command for installing MCP docs server

New CLI command to easily install the assistant-ui MCP docs server for various IDEs:

```bash
npx assistant-ui mcp              # Interactive prompt
npx assistant-ui mcp --cursor     # Install for Cursor
npx assistant-ui mcp --windsurf   # Install for Windsurf
npx assistant-ui mcp --vscode     # Install for VSCode
npx assistant-ui mcp --zed        # Install for Zed
npx assistant-ui mcp --claude-code     # Install for Claude Code
npx assistant-ui mcp --claude-desktop  # Install for Claude Desktop
```

The command automatically creates or merges the appropriate MCP configuration file for each IDE.
