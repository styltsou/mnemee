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

describe("Button pending behavior", () => {
  it("disables a pending action and preserves its label and accessible busy state", () => {
    const html = renderToStaticMarkup(
      <Button pending disabled={false}>
        Save changes
      </Button>,
    );
    expect(html).toContain('disabled=""');
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain("Save changes");
    expect(html).not.toContain("Saving");
  });

  it("keeps the same spinner and label structure mounted in both states", () => {
    for (const pending of [false, true]) {
      const html = renderToStaticMarkup(
        <Button pending={pending}>Save</Button>,
      );
      expect(html.match(/data-slot="button-spinner"/g)).toHaveLength(1);
      expect(html.match(/data-slot="button-label"/g)).toHaveLength(1);
      expect(html).toContain('aria-hidden="true"');
    }
  });

  it("keeps an idle pending-capable action enabled", () => {
    const html = renderToStaticMarkup(<Button pending={false}>Save</Button>);
    expect(html).not.toContain('disabled=""');
    expect(html).not.toContain('aria-busy="true"');
  });

  it("does not add pending UI to optimistic actions", () => {
    const html = renderToStaticMarkup(<Button>Delete</Button>);
    expect(html).not.toContain("button-spinner");
    expect(html).not.toContain(" aria-busy=");
  });

  it("keeps icon-only actions named while busy", () => {
    const html = renderToStaticMarkup(
      <Button size="icon" pending aria-label="Upload photo">
        +
      </Button>,
    );
    expect(html).toContain('aria-label="Upload photo"');
    expect(html).toContain('aria-busy="true"');
  });
});

describe("Button text alignment", () => {
  it("keeps adjacent text and numbers in one trimmed label", () => {
    const html = renderToStaticMarkup(<Button>Move {3} items</Button>);
    expect(html).toContain("Move 3 items");
    expect(html.match(/data-slot="button-text"/g)).toHaveLength(1);
  });

  it("preserves label content inside fragments and existing spans", () => {
    const html = renderToStaticMarkup(
      <Button pending={false}>
        <>
          <span className="truncate">Save changes</span>
        </>
      </Button>,
    );
    expect(html).toContain("Save changes");
    expect(html).toContain("truncate");
  });
});
