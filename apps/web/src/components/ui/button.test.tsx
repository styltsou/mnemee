import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Button } from "./button";
import { ButtonGroup, ButtonGroupSeparator } from "./button-group";

describe("Button interaction styling", () => {
  it("provides subtle press feedback with motion and input guards", () => {
    const html = renderToStaticMarkup(<Button>Save</Button>);

    expect(html).toContain("touch-manipulation");
    expect(html).toContain(
      "transition-[background,color,border-color,box-shadow,scale]",
    );
    expect(html).toContain("motion-reduce:transition-none");
    expect(html).toContain("duration-100");
    expect(html).toContain("ease-[cubic-bezier(0.23,1,0.32,1)]");
    expect(html).toContain(
      "motion-safe:active:not-disabled:not-aria-disabled:not-focus-visible:scale-[0.985]",
    );
  });

  it("gives icon buttons the same subtle press feedback", () => {
    const html = renderToStaticMarkup(
      <Button size="icon" aria-label="Add item">
        +
      </Button>,
    );

    expect(html).toContain("scale-[0.985]");
  });

  it("includes link buttons while keeping joined groups visually stable", () => {
    const linkHtml = renderToStaticMarkup(<Button variant="link">Help</Button>);
    const groupHtml = renderToStaticMarkup(
      <ButtonGroup>
        <Button variant="ghost" aria-pressed="true">
          Previous
        </Button>
        <ButtonGroupSeparator />
        <Button variant="ghost">Next</Button>
      </ButtonGroup>,
    );

    expect(linkHtml).toContain("scale-[0.985]");
    expect(groupHtml).toContain(
      "in-data-[slot=button-group]:active:scale-100!",
    );
    expect(groupHtml).toContain("aria-pressed:bg-secondary");
    expect(groupHtml).toContain("bg-border/60");
  });
});
