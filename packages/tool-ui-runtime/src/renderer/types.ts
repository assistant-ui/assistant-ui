import { SandboxOption } from "safe-content-frame";

export type ToolUIRenderOutput =
  | ToolUIHtmlOutput
  | ToolUIReactOutput
  | ToolUIEmptyOutput;

export type ToolUIHtmlOutput = {
  readonly kind: "html";
  readonly html: string;
  readonly height?: number;
  readonly sandbox?: readonly SandboxOption[];
};

export type ToolUIReactOutput = {
  readonly kind: "react";
  readonly element: unknown;
};

export type ToolUIEmptyOutput = {
  readonly kind: "empty";
};
