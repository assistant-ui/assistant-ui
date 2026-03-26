"use client";

import { useRouter } from "next/navigation";
import {
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectRoot,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/assistant-ui/select";

const ALL = "__all__";

type PackageGroup = {
  label: string;
  packages: string[];
};

function groupPackages(packages: string[]): PackageGroup[] {
  const core: string[] = [];
  const integrations: string[] = [];
  const other: string[] = [];

  for (const pkg of packages) {
    if (
      pkg === "@assistant-ui/react" ||
      pkg === "@assistant-ui/core" ||
      pkg === "@assistant-ui/store" ||
      pkg === "@assistant-ui/tap" ||
      pkg === "@assistant-ui/styles" ||
      pkg === "@assistant-ui/ui" ||
      pkg === "assistant-stream" ||
      pkg === "assistant-ui"
    ) {
      core.push(pkg);
    } else if (pkg.startsWith("@assistant-ui/react-")) {
      integrations.push(pkg);
    } else {
      other.push(pkg);
    }
  }

  const groups: PackageGroup[] = [];
  if (core.length > 0) groups.push({ label: "Core", packages: core });
  if (integrations.length > 0)
    groups.push({ label: "Integrations", packages: integrations });
  if (other.length > 0) groups.push({ label: "Other", packages: other });
  return groups;
}

export function PackageFilter({
  packages,
  value,
}: {
  packages: string[];
  value: string | undefined;
}) {
  const router = useRouter();
  const groups = groupPackages(packages);

  return (
    <SelectRoot
      value={value ?? ALL}
      onValueChange={(v) => {
        router.push(v === ALL ? "/changelog" : `?pkg=${encodeURIComponent(v)}`);
      }}
    >
      <SelectTrigger size="sm" className="w-56 font-mono text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>All packages</SelectItem>
        {groups.map((group, i) => (
          <SelectGroup key={group.label}>
            {i > 0 && <SelectSeparator />}
            <SelectLabel>{group.label}</SelectLabel>
            {group.packages.map((pkg) => (
              <SelectItem key={pkg} value={pkg} className="font-mono text-xs">
                {pkg}
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </SelectRoot>
  );
}
