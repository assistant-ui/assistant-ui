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
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  export interface Commands {}

  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  export interface ExternalState {}
}

export type UserCommands = Assistant.Commands[keyof Assistant.Commands];
export type UserExternalState = keyof Assistant.ExternalState extends never
  ? Record<string, unknown>
  : Assistant.ExternalState[keyof Assistant.ExternalState];
