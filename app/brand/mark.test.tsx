import { render } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { Icon } from "../os/icons/icon";
import { BRAND_MARK } from "./art";

describe("the shared studio mark", () => {
  test("replaces the cat icon at either slot size and stays decorative", () => {
    for (const scale of [1, 2] as const) {
      const { container, unmount } = render(<Icon name="cat" scale={scale} />);
      const svg = container.querySelector("svg")!;
      expect(svg).toHaveAttribute("aria-hidden", "true");
      expect(svg).toHaveAttribute("focusable", "false");
      expect(svg).toHaveAttribute("width", String(16 * scale));
      expect(svg).toHaveAttribute("viewBox", BRAND_MARK.viewBox);
      expect(svg.querySelectorAll("path")[1]).toHaveAttribute("d", BRAND_MARK.foreground);
      unmount();
    }
  });

  test("paints counters over the dither and swaps both inks for the selected menu", () => {
    const { container, rerender } = render(<Icon name="cat" />);
    const paths = () => container.querySelectorAll("path");
    expect(paths()[0]).toHaveAttribute("fill", "var(--phosphor-bg)");
    expect(paths()[1]).toHaveAttribute("fill", "currentColor");
    rerender(<Icon name="cat" inverted />);
    expect(paths()[0]).toHaveAttribute("fill", "currentColor");
    expect(paths()[1]).toHaveAttribute("fill", "var(--phosphor-bg)");
    rerender(<Icon name="folder" />);
    expect(container.querySelector("svg")).toHaveAttribute("viewBox", "0 0 16 16");
    expect(container.querySelector("[data-brand-mark]")).toBeNull();
  });
});
