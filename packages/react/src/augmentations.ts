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
 *   }
 * }
 * ```
 */
export namespace Assistant {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  export interface Commands {}
}

export type UserCommands = Assistant.Commands[keyof Assistant.Commands];
