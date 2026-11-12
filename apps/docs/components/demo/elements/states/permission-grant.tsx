"use client";

import { PermissionGrant } from "@/components/assistant-ui/elements/permission-grant";
import { defineStates } from "./types";

const noop = () => {};

const base = {
  capability: "Filesystem access",
  requester: "filesystem-mcp",
  reach: [
    "Read and write files under the workspace",
    "Run commands you have already approved",
    "No network access",
  ],
};

export const states = defineStates([
  { key: "default", label: "Default" },
  {
    key: "session",
    label: "This session",
    note: "Granted until the session ends, then it asks again.",
    Component: () => (
      <PermissionGrant {...base} scope="session" onGrant={noop} />
    ),
  },
  {
    key: "always",
    label: "Always",
    note: "Granted permanently, so it will not ask again.",
    Component: () => (
      <PermissionGrant {...base} scope="always" onGrant={noop} />
    ),
  },
  {
    key: "denied",
    label: "Denied",
    note: "The user refused, so the server never gets the capability.",
    Component: () => (
      <PermissionGrant {...base} scope="denied" onGrant={noop} />
    ),
  },
  {
    key: "read-only",
    label: "Read only",
    note: "Without a grant handler the request shows as pending with no buttons.",
    Component: () => <PermissionGrant {...base} scope="pending" />,
  },
  {
    key: "long-content",
    label: "Wide reach",
    note: "A long capability name and a long list of what it grants.",
    Component: () => (
      <PermissionGrant
        capability="Google Workspace read and write access for the whole organization"
        requester="google-workspace-mcp.internal.acme.dev"
        reach={[
          "Read every email in your inbox, including archived threads",
          "Send email in your name",
          "Create, edit, and delete calendar events",
          "Read and edit any Drive file shared with you",
          "List members of every group you belong to",
          "Keeps working after you close this tab",
        ]}
        scope="pending"
        onGrant={noop}
      />
    ),
  },
]);
