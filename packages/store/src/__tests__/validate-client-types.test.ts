import { describe, expectTypeOf, it } from "vitest";
import type { ValidateClient } from "../types/client";

type Schema = { methods: { getState: () => { a: string } } };

describe("ValidateClient", () => {
  it("accepts non-reserved scope names", () => {
    expectTypeOf<ValidateClient<"thread", Schema>>().toEqualTypeOf<Schema>();
  });

  it("rejects reserved scope names", () => {
    expectTypeOf<
      keyof ValidateClient<"optional", Schema>["methods"]
    >().toEqualTypeOf<"ERROR: optional is a reserved scope name">();
    expectTypeOf<
      keyof ValidateClient<"subscribe", Schema>["methods"]
    >().toEqualTypeOf<"ERROR: subscribe is a reserved scope name">();
    expectTypeOf<
      keyof ValidateClient<"on", Schema>["methods"]
    >().toEqualTypeOf<"ERROR: on is a reserved scope name">();
  });

  it("rejects reserved accessor properties in methods", () => {
    expectTypeOf<
      keyof ValidateClient<
        "thread",
        { methods: { source: () => void } }
      >["methods"]
    >().toEqualTypeOf<"ERROR: thread methods declare a reserved accessor property (source/query/name)">();
  });
});
