import { expectTypeOf } from "vitest";
import { PartPrimitiveMessages } from "./PartMessages";

const checkPartMessagesProps = () => {
  <PartPrimitiveMessages>{() => null}</PartPrimitiveMessages>;
  <PartPrimitiveMessages components={{ Message: () => null }} />;

  // @ts-expect-error neither components nor children is allowed
  <PartPrimitiveMessages />;
  // @ts-expect-error components must be defined, not undefined
  <PartPrimitiveMessages components={undefined} />;
  // @ts-expect-error components and children are mutually exclusive
  <PartPrimitiveMessages components={{ Message: () => null }}>
    {() => null}
  </PartPrimitiveMessages>;
};
expectTypeOf(checkPartMessagesProps).toEqualTypeOf<() => void>();
