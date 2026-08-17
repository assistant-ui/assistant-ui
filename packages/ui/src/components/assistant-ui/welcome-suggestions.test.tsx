import { DirectionProvider } from "@base-ui/react/direction-provider";
import type { FC, ReactNode } from "react";
import * as flavor from "./welcome-suggestions";
import { describeWelcomeSuggestionsContract } from "./welcome-suggestions.contract";

const Rtl: FC<{ children: ReactNode }> = ({ children }) => (
  <DirectionProvider direction="rtl">{children}</DirectionProvider>
);

describeWelcomeSuggestionsContract({
  name: "welcome-suggestions",
  flavor,
  Rtl,
});
