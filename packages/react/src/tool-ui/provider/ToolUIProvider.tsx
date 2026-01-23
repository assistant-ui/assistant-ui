"use client";

import { FC, PropsWithChildren, useMemo } from "react";
import { ToolUIContext } from "../context/ToolUIContext";
import { ToolUIController } from "../ToolUIController";
import { useToolUISync } from "../hooks/useToolUISync";

export type ToolUIProviderProps = PropsWithChildren<{
  controller?: ToolUIController;
}>;

export const ToolUIProvider: FC<ToolUIProviderProps> = ({
  children,
  controller: externalController,
}) => {
  const controller = useMemo(
    () => externalController ?? new ToolUIController(),
    [externalController],
  );

  useToolUISync(controller);

  return (
    <ToolUIContext.Provider value={controller.runtime}>
      {children}
    </ToolUIContext.Provider>
  );
};
