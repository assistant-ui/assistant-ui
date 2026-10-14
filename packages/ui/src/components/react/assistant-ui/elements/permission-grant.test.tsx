import { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { PermissionGrant } from "./permission-grant";

afterEach(cleanup);

describe("PermissionGrant", () => {
  it("focuses the receipt after the focused answer settles", () => {
    function Grant() {
      const [scope, setScope] = useState<"pending" | "session">("pending");
      return (
        <PermissionGrant
          capability="Read files"
          requester="Agent"
          reach={["Project"]}
          scope={scope}
          onGrant={() => setScope("session")}
        />
      );
    }

    render(<Grant />);
    const answer = screen.getByRole("button", { name: "This session" });
    answer.focus();
    fireEvent.click(answer);

    expect(document.activeElement).toBe(screen.getByText("granted · session"));
  });
});
