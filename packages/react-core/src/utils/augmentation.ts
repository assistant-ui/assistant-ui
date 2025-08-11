declare global {
  export interface Assistant {
    [key: string]: unknown;
  }
}

type GetAugmentation<
  Key extends string,
  ExpectedType
> = unknown extends Assistant[Key]
  ? ExpectedType
  : Assistant[Key] extends ExpectedType
  ? Assistant[Key]
  : {
      ErrorMessage: `There is an error in the type you provided for Assistant.${Key}`;
    };

type UITool = {
  input: unknown;
  output: unknown | undefined;
};

export type UserUITools = GetAugmentation<"UITools", Record<string, UITool>>;

export type UserUIToolMetadata = GetAugmentation<
  "UIToolMetadata",
  Record<string, object>
>;

export type UserThreadMetadata = GetAugmentation<
  "ThreadMetadata",
  Record<string, object>
>;
