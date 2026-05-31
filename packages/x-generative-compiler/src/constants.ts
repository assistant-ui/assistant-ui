/** The directive a module uses to opt into generative compilation. */
export const DIRECTIVE = "use generative";

/** Build target a generative module is compiled for. */
export type Target = "client" | "server";
