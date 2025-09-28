declare global {
  interface Assistant {
    Commands: unknown;
  }
}

type GetAugmentation<
  Key extends keyof Assistant,
  ExpectedType
> = unknown extends Assistant[Key]
  ? ExpectedType
  : Assistant[Key] extends ExpectedType
  ? Assistant[Key]
  : {
      ErrorMessage: `There is an error in the type you provided for Assistant.${Key}`;
    };

type UserCommandsRecord = GetAugmentation<"Commands", Record<string, unknown>>;

export type UserCommands = UserCommandsRecord extends Record<string, infer V> ? V : never;