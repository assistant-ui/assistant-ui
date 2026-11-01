import { DocsPageShell as ThemePage } from "@assistant-ui/docs-theme/ui";
import type { ComponentProps } from "react";
import { LegalLinks } from "@/components/shared/legal-links";

export { DocsBody } from "@assistant-ui/docs-theme/ui";

export function DocsPageShell(
  props: Omit<ComponentProps<typeof ThemePage>, "footer">,
) {
  return <ThemePage {...props} footer={<LegalLinks />} />;
}
