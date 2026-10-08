export type ProbeDefinition = {
  id: string;
  description: string;
  workstream: string;
};

export const PROBES = [
  {
    id: "bridge-roundtrip",
    description: "Send a fixture prompt; streamed text arrives in order",
    workstream: "Transport bridge",
  },
  {
    id: "abort",
    description: "Cancel mid-stream; host AbortSignal fires",
    workstream: "Transport bridge",
  },
  {
    id: "frontend-tool-hitl",
    description: "Fixture requests approval; probe approves; run continues",
    workstream: "Transport bridge",
  },
  {
    id: "csp-zero",
    description: "Zero securitypolicyviolation events under auiTest.csp=strict",
    workstream: "CSP and bundling",
  },
  {
    id: "theme-follows",
    description:
      "Computed --background equals --vscode-sideBar-background after a theme switch",
    workstream: "Theme preset",
  },
  {
    id: "external-link",
    description:
      "Clicking a Markdown link sends openExternal to the host (stubbed)",
    workstream: "Browser API shims",
  },
  {
    id: "threads-persist",
    description:
      "A created thread is listed after a webview reload and in a new webview",
    workstream: "Browser API shims",
  },
  {
    id: "chat-fixtures",
    description:
      "Every rich fixture streams its parts and renders without errors",
    workstream: "Fixture rendering",
  },
] as const satisfies readonly ProbeDefinition[];

export type Probe = (typeof PROBES)[number];

export type ProbeId = Probe["id"];

export type ProbeState = "pass" | "fail";

export type ProbeResult = { state: ProbeState; detail?: string };
