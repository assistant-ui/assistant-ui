import { fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";
import { useTooltipState } from "../context";
import { Cell } from "./Cell";
import { Grid } from "./Grid";
import { Root } from "./Root";

const TooltipStateProbe = () => {
  const state = useTooltipState();
  return <output>{state?.hoveredCell?.count ?? "none"}</output>;
};

describe("Cell", () => {
  it("preserves tooltip behavior when custom hover handlers are provided", () => {
    const onMouseEnter = vi.fn();
    const onMouseLeave = vi.fn();

    render(
      <Root
        data={[{ date: "2025-01-13", count: 5 }]}
        start="2025-01-13"
        end="2025-01-13"
        weekStart="monday"
      >
        <Grid>
          {() => (
            <Cell
              data-testid="cell"
              onMouseEnter={onMouseEnter}
              onMouseLeave={onMouseLeave}
            />
          )}
        </Grid>
        <TooltipStateProbe />
      </Root>,
    );

    const cell = screen.getByTestId("cell");
    fireEvent.mouseEnter(cell);

    expect(onMouseEnter).toHaveBeenCalledOnce();
    expect(screen.getByRole("status").textContent).toBe("5");

    fireEvent.mouseLeave(cell);

    expect(onMouseLeave).toHaveBeenCalledOnce();
    expect(screen.getByRole("status").textContent).toBe("none");
  });
});
