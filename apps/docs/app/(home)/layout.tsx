import { ReactNode } from "react";
import { Layout } from "fumadocs-ui/layout";
import { baseOptions } from "../docs/layout.config";

export default function HomeLayout({
  children,
}: {
  children: ReactNode;
}): React.ReactElement {
  return <Layout {...baseOptions}>{children}</Layout>;
}
