"use client";

import { Button } from "@/components/ui/button";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import { analytics } from "@/lib/analytics";

export const blockInstallCommand = (registryName: string) =>
  `npx shadcn@latest add "@assistant-ui/${registryName}"`;

export function BlockInstallButton({ registryName }: { registryName: string }) {
  const { isCopied, copyToClipboard } = useCopyToClipboard({
    copiedDuration: 2000,
  });
  const command = blockInstallCommand(registryName);

  return (
    <Button
      variant="outline"
      onClick={() => {
        copyToClipboard(command);
        analytics.cta.npmCommandCopied(command, { location: "blocks" });
      }}
    >
      {isCopied ? "Copied" : "Copy install command"}
    </Button>
  );
}
