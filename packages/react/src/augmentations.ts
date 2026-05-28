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
export namespace Assistant {
  export interface Commands {}

  export interface ExternalState {}
}

export type UserCommands = Assistant.Commands[keyof Assistant.Commands];
export type UserExternalState = keyof Assistant.ExternalState extends never
  ? Record<string, unknown>
  : Assistant.ExternalState[keyof Assistant.ExternalState];
