declare const DIRECTIVE = "use generative";

type Target = "client" | "server";

type ToolType = "frontend" | "backend" | "human" | "provider";

interface CompileOptions {
  target: Target;
  filename?: string;
  sourceMaps?: boolean;
  injectServerOnly?: boolean;
}

interface CompileResult {
  code: string;
  map?: object | null;
}

declare class GenerativeCompileError extends Error {
  constructor(message: string, filename?: string);
}

declare function isGenerativeModule(code: string): boolean;

declare function compileGenerative(code: string, options: CompileOptions): CompileResult;

declare namespace entry_root_exports {
  export { CompileOptions, CompileResult, DIRECTIVE, GenerativeCompileError, Target, ToolType, compileGenerative, isGenerativeModule };
}

export { entry_root_exports as entry_root };
