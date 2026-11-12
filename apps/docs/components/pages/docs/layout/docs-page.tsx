import { DocsPageShell as ThemePage } from "@assistant-ui/docs-theme/ui";
import type { ComponentProps } from "react";
import { MAIN_CONTENT_PROPS } from "@/components/shared/skip-link";
import { LegalLinks } from "@/components/shared/legal-links";

export { DocsBody } from "@assistant-ui/docs-theme/ui";

export function DocsPageShell(
  props: Omit<ComponentProps<typeof ThemePage>, "footer">,
) {
  return (
    <ThemePage
      {...props}
      mainProps={MAIN_CONTENT_PROPS}
      footer={<LegalLinks />}
    />
  );
}
