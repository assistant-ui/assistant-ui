type CliSurfaceSnapshot = Record<string, unknown>;

export const cliSurface: CliSurfaceSnapshot = {
  "name": "assistant-ui",
  "description": "add components and dependencies to your project",
  "usage": "[options] [command]",
  "arguments": [],
  "options": [],
  "commands": [
    {
      "name": "add",
      "description": "add a component to your project",
      "usage": "[options] <components...>",
      "arguments": [
        {
          "syntax": "<components...>",
          "description": "the components to add",
          "required": true,
          "variadic": true
        }
      ],
      "options": [
        {
          "flags": "-y, --yes",
          "description": "skip confirmation prompt.",
          "defaultValue": true
        },
        {
          "flags": "-o, --overwrite",
          "description": "overwrite existing files.",
          "defaultValue": false
        },
        {
          "flags": "-c, --cwd <cwd>",
          "description": "the working directory. defaults to the current directory.",
          "required": true,
          "defaultValue": "<cwd>"
        },
        {
          "flags": "-p, --path <path>",
          "description": "the path to add the component to.",
          "required": true
        },
        {
          "flags": "--use-npm",
          "description": "explicitly use npm"
        },
        {
          "flags": "--use-pnpm",
          "description": "explicitly use pnpm"
        },
        {
          "flags": "--use-yarn",
          "description": "explicitly use yarn"
        },
        {
          "flags": "--use-bun",
          "description": "explicitly use bun"
        }
      ],
      "commands": []
    },
    {
      "name": "create",
      "description": "create a new project",
      "usage": "[project-directory] [options]",
      "arguments": [
        {
          "syntax": "[project-directory]",
          "description": "",
          "required": false
        }
      ],
      "options": [
        {
          "flags": "-t, --template <template>",
          "description": "template to use (default, minimal, cloud, cloud-clerk, langchain, mcp, eve)",
          "required": true
        },
        {
          "flags": "-e, --example <example>",
          "description": "create from an example (with-ag-ui, with-google-adk, with-mastra, with-ai-sdk-v7, with-eve, with-artifacts, with-assistant-transport, with-chain-of-thought, with-cloud, with-custom-thread-list, with-elevenlabs-conversational, with-elevenlabs-scribe, with-livekit, with-expo, with-interactables, with-external-store, with-ffmpeg, with-langgraph, with-react-hook-form, with-react-ink, with-react-router, with-tanstack, with-resumable-stream)",
          "required": true
        },
        {
          "flags": "-p, --preset <name-or-url>",
          "description": "preset name or URL (e.g., chatgpt or https://www.assistant-ui.com/playground/init?preset=chatgpt)",
          "required": true
        },
        {
          "flags": "--use-npm",
          "description": "explicitly use npm"
        },
        {
          "flags": "--use-pnpm",
          "description": "explicitly use pnpm"
        },
        {
          "flags": "--use-yarn",
          "description": "explicitly use yarn"
        },
        {
          "flags": "--use-bun",
          "description": "explicitly use bun"
        },
        {
          "flags": "--native",
          "description": "create an Expo / React Native project"
        },
        {
          "flags": "--ink",
          "description": "create a React Ink terminal project"
        },
        {
          "flags": "--skip-install",
          "description": "skip installing packages"
        },
        {
          "flags": "--skills",
          "description": "add assistant-ui agent skills for AI coding assistants"
        },
        {
          "flags": "--no-skills",
          "description": "skip adding assistant-ui agent skills"
        },
        {
          "flags": "--debug-source-root <path>",
          "description": "copy templates/examples from a local assistant-ui repo root",
          "required": true,
          "hidden": true
        }
      ],
      "commands": []
    },
    {
      "name": "init",
      "description": "initialize assistant-ui in an existing project",
      "usage": "[options] [project-directory]",
      "arguments": [
        {
          "syntax": "[project-directory]",
          "description": "directory for the new project",
          "required": false
        }
      ],
      "options": [
        {
          "flags": "-y, --yes",
          "description": "skip confirmation prompt.",
          "defaultValue": false
        },
        {
          "flags": "-o, --overwrite",
          "description": "overwrite existing files.",
          "defaultValue": false
        },
        {
          "flags": "-c, --cwd <cwd>",
          "description": "the working directory. defaults to the current directory.",
          "required": true,
          "defaultValue": "<cwd>"
        },
        {
          "flags": "-p, --preset <name-or-url>",
          "description": "preset name or URL (forwarded to 'assistant-ui create')",
          "required": true,
          "hidden": true
        },
        {
          "flags": "--use-npm",
          "description": "explicitly use npm"
        },
        {
          "flags": "--use-pnpm",
          "description": "explicitly use pnpm"
        },
        {
          "flags": "--use-yarn",
          "description": "explicitly use yarn"
        },
        {
          "flags": "--use-bun",
          "description": "explicitly use bun"
        },
        {
          "flags": "--skip-install",
          "description": "skip installing packages"
        }
      ],
      "commands": []
    },
    {
      "name": "mcp",
      "description": "install assistant-ui MCP docs server for your IDE",
      "usage": "[options]",
      "arguments": [],
      "options": [
        {
          "flags": "--cursor",
          "description": "install for Cursor"
        },
        {
          "flags": "--windsurf",
          "description": "install for Windsurf"
        },
        {
          "flags": "--vscode",
          "description": "install for VSCode"
        },
        {
          "flags": "--zed",
          "description": "install for Zed"
        },
        {
          "flags": "--claude-code",
          "description": "install for Claude Code"
        },
        {
          "flags": "--claude-desktop",
          "description": "install for Claude Desktop"
        }
      ],
      "commands": []
    },
    {
      "name": "codemod",
      "description": "CLI tool for running codemods",
      "usage": "[options] <codemod> <source>",
      "arguments": [
        {
          "syntax": "<codemod>",
          "description": "Codemod to run (e.g., rewrite-framework-imports)",
          "required": true
        },
        {
          "syntax": "<source>",
          "description": "Path to source files or directory to transform",
          "required": true
        }
      ],
      "options": [
        {
          "flags": "-d, --dry",
          "description": "Dry run (no changes are made to files)"
        },
        {
          "flags": "-p, --print",
          "description": "Print transformed files to stdout"
        },
        {
          "flags": "--verbose",
          "description": "Show more information about the transform process"
        },
        {
          "flags": "-j, --jscodeshift <options>",
          "description": "Pass options directly to jscodeshift",
          "required": true
        }
      ],
      "commands": []
    },
    {
      "name": "upgrade",
      "description": "Upgrade ai package dependencies and apply codemods",
      "usage": "[options]",
      "arguments": [],
      "options": [
        {
          "flags": "-d, --dry",
          "description": "Dry run (no changes are made to files)"
        },
        {
          "flags": "-p, --print",
          "description": "Print transformed files to stdout"
        },
        {
          "flags": "--verbose",
          "description": "Show more information about the transform process"
        },
        {
          "flags": "-j, --jscodeshift <options>",
          "description": "Pass options directly to jscodeshift",
          "required": true
        }
      ],
      "commands": []
    },
    {
      "name": "update",
      "description": "Update all '@assistant-ui/*' and 'assistant-*' packages in package.json to latest versions using your package manager.",
      "usage": "[options]",
      "arguments": [],
      "options": [
        {
          "flags": "--dry",
          "description": "Print the package manager command instead of running it."
        },
        {
          "flags": "-c, --cwd <cwd>",
          "description": "the working directory. defaults to the current directory.",
          "required": true,
          "defaultValue": "<cwd>"
        }
      ],
      "commands": []
    },
    {
      "name": "agent",
      "description": "launch Claude Code with assistant-ui skills",
      "usage": "[options] <prompt...>",
      "arguments": [
        {
          "syntax": "<prompt...>",
          "description": "prompt for the agent",
          "required": true,
          "variadic": true
        }
      ],
      "options": [
        {
          "flags": "--dry",
          "description": "print the command instead of running it"
        }
      ],
      "commands": []
    },
    {
      "name": "info",
      "description": "Print environment and package information for bug reports.",
      "usage": "[options]",
      "arguments": [],
      "options": [
        {
          "flags": "-c, --cwd <cwd>",
          "description": "the working directory. defaults to the current directory.",
          "required": true,
          "defaultValue": "<cwd>"
        }
      ],
      "commands": []
    },
    {
      "name": "doctor",
      "description": "Diagnose mismatched or outdated assistant-ui packages (including transitive ones).",
      "usage": "[options]",
      "arguments": [],
      "options": [
        {
          "flags": "-c, --cwd <cwd>",
          "description": "the working directory. defaults to the current directory.",
          "required": true,
          "defaultValue": "<cwd>"
        },
        {
          "flags": "--no-network",
          "description": "Skip the npm registry check for latest versions."
        }
      ],
      "commands": []
    }
  ]
};
