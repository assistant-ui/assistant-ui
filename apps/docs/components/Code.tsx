import { FC, PropsWithChildren } from "react";

export const Code: FC<PropsWithChildren<{}>> = ({ children }) => {
  return <pre>{children}</pre>;
};
