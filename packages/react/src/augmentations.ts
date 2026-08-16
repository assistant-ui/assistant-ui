/**
 * Module augmentation namespace for assistant-ui type extensions.
 *
 * @example
 * ```typescript
 * declare module "@assistant-ui/react" {
 *   namespace Assistant {
 *     interface Commands {
 *       myCustomCommand: {
 *         type: "my-custom-command";
 *         data: string;
 *       };
 *     }
 *
 *     interface ExternalState {
 *       myCustomState: {
 *         foo: string;
 *       };
 *     }
 *   }
 * }
 * ```
 */
import type { Assistant as CoreAssistant } from "@assistant-ui/core";

export namespace Assistant {
  export interface Commands extends CoreAssistant.Commands {}

  export interface ExternalState extends CoreAssistant.ExternalState {}
}

export type UserCommands = Assistant.Commands[keyof Assistant.Commands];
export type UserExternalState = keyof Assistant.ExternalState extends never
  ? Record<string, unknown>
  : Assistant.ExternalState[keyof Assistant.ExternalState];
