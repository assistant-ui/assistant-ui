import { Direction } from "radix-ui";
import type { FC, ReactNode } from "react";
import * as flavor from "./welcome-suggestions.radix";
import { describeWelcomeSuggestionsContract } from "./welcome-suggestions.contract";

const Rtl: FC<{ children: ReactNode }> = ({ children }) => (
  <Direction.DirectionProvider dir="rtl">
    {children}
  </Direction.DirectionProvider>
);

describeWelcomeSuggestionsContract({
  name: "welcome-suggestions.radix",
  flavor,
  Rtl,
});
