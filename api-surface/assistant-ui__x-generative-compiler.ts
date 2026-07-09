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

declare const DIRECTIVE = "use generative";

declare class GenerativeCompileError extends Error {
  constructor(message: string, filename?: string);
}

type Target = "client" | "server";

type ToolType = "backend" | "frontend" | "human" | "provider";

declare function compileGenerative(code: string, options: CompileOptions): CompileResult;

declare namespace entry_root_exports {
  export { CompileOptions, CompileResult, DIRECTIVE, GenerativeCompileError, Target, ToolType, compileGenerative, isGenerativeModule };
}

declare function isGenerativeModule(code: string): boolean;

export { entry_root_exports as entry_root };
