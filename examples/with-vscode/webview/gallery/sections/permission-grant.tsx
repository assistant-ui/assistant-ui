import { useState } from "react";
import {
  PermissionGrant,
  type GrantScope,
} from "@assistant-ui/ui/components/assistant-ui/elements/permission-grant.tsx";
import { defineSections } from "../types";
import { State, States } from "./_states";

const REACH = [
  "Read and write files under the workspace",
  "Run commands you have already approved",
  "No network access",
];

const GRANT = {
  capability: "Filesystem access",
  requester: "filesystem-mcp",
  reach: REACH,
};

function InteractiveGrant() {
  const [scope, setScope] = useState<GrantScope | "pending">("pending");
  return <PermissionGrant {...GRANT} scope={scope} onGrant={setScope} />;
}

export default defineSections([
  {
    id: "permission-grant",
    title: "Permission grant",
    category: "agents",
    notes: "Pending: Deny, This session and Always settle the grant.",
    render: () => <InteractiveGrant />,
  },
  {
    id: "permission-grant-states",
    title: "Permission grant states",
    category: "agents",
    notes:
      "Pending without a handler, granted for the session, granted always, denied, and a long requester.",
    render: () => (
      <States>
        <State label="pending, read-only">
          <PermissionGrant {...GRANT} scope="pending" />
        </State>
        <State label="granted · session">
          <PermissionGrant {...GRANT} scope="session" />
        </State>
        <State label="granted · always">
          <PermissionGrant {...GRANT} scope="always" />
        </State>
        <State label="denied">
          <PermissionGrant {...GRANT} scope="denied" />
        </State>
        <State label="long names">
          <PermissionGrant
            capability="Read and write access to every repository in the organization"
            requester="github-enterprise-mcp.internal.example.com"
            reach={[
              "Create branches, push commits and open pull requests on behalf of the signed-in user",
            ]}
            scope="pending"
            onGrant={() => {}}
          />
        </State>
      </States>
    ),
  },
]);
