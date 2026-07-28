import { buildProgram } from "./program";

export async function runCli(): Promise<void> {
  await buildProgram().parseAsync();
}
