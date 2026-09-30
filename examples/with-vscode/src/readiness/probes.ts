export type ProbeDefinition = {
  id: string;
  description: string;
  phase: number;
  workstream: string;
};

export const PROBES = [
  {
    id: "bridge-roundtrip",
    description: "Send a fixture prompt; streamed text arrives in order",
    phase: 1,
    workstream: "Transport bridge",
  },
  {
    id: "abort",
    description: "Cancel mid-stream; host AbortSignal fires",
    phase: 1,
    workstream: "Transport bridge",
  },
  {
    id: "frontend-tool-hitl",
    description: "Fixture requests approval; probe approves; run continues",
    phase: 1,
    workstream: "Transport bridge",
  },
  {
    id: "every-runtime",
    description: "bridge-roundtrip passes for every auiTest.runtime value",
    phase: 2,
    workstream: "Transport bridge",
  },
  {
    id: "csp-zero",
    description: "Zero securitypolicyviolation events under auiTest.csp=strict",
    phase: 2,
    workstream: "CSP and bundling",
  },
  {
    id: "theme-follows",
    description:
      "Computed --background equals --vscode-sideBar-background after a theme switch",
    phase: 1,
    workstream: "Theme preset",
  },
  {
    id: "external-link",
    description:
      "Clicking a source link sends openExternal to the host (stubbed)",
    phase: 1,
    workstream: "Browser API shims",
  },
  {
    id: "export-download",
    description:
      "Export Markdown sends a save-dialog request to the host (stubbed)",
    phase: 2,
    workstream: "Browser API shims",
  },
  {
    id: "threads-persist",
    description: "A created thread is listed after Reload Window",
    phase: 1,
    workstream: "Browser API shims",
  },
  {
    id: "stream-survives-hide",
    description: "Hide mid-stream, show again; the reply completes",
    phase: 2,
    workstream: "Transport bridge",
  },
  {
    id: "no-key-conflicts",
    description: "Cmd/Ctrl+B in the webview toggles VS Code's sidebar",
    phase: 2,
    workstream: "Keyboard and focus",
  },
  {
    id: "scaffold-matches",
    description:
      "Fresh create --template vscode matches the test bed's shared files",
    phase: 1,
    workstream: "Scaffolding, template and docs",
  },
  {
    id: "native-extras",
    description:
      "vscode-lm backend answers; active file in model context; stdio MCP tool runs",
    phase: 3,
    workstream: "VS Code-native extras",
  },
] as const satisfies readonly ProbeDefinition[];

export type Probe = (typeof PROBES)[number];

export type ProbeId = Probe["id"];

export type ProbeState = "pass" | "fail" | "not-implemented";

export type ProbeResult = { state: ProbeState; detail?: string };

export const NOT_IMPLEMENTED: ProbeResult = { state: "not-implemented" };
