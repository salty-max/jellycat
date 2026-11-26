import { describe, expect, test } from "vitest";
import { pageImagePath, pageMeta } from "./site";

describe("pageImagePath", () => {
  test("the home page's image is index.png, any other page's is its address under /og", () => {
    expect(pageImagePath("/")).toBe("/og/index.png");
    expect(pageImagePath("/projects/hundo")).toBe("/og/projects/hundo.png");
    expect(pageImagePath("/contact")).toBe("/og/contact.png");
  });
});

describe("pageMeta", () => {
  const tags = pageMeta({ title: "Hundo · Jellycat Studio", description: "A description.", path: "/projects/hundo" });
  const content = (key: "property" | "name", value: string) => tags.find((tag) => Object.entries(tag).some(([name, text]) => name === key && text === value));

  test("carries the preview image, absolute, with its size and type, and the title as its alt", () => {
    expect(content("property", "og:image")).toEqual({ property: "og:image", content: "https://jellycat.fr/og/projects/hundo.png" });
    expect(content("property", "og:image:width")).toEqual({ property: "og:image:width", content: "1200" });
    expect(content("property", "og:image:height")).toEqual({ property: "og:image:height", content: "630" });
    expect(content("property", "og:image:type")).toEqual({ property: "og:image:type", content: "image/png" });
    expect(content("property", "og:image:alt")).toEqual({ property: "og:image:alt", content: "Hundo · Jellycat Studio" });
  });

  test("names the site and a card that shows the image large", () => {
    expect(content("property", "og:type")).toEqual({ property: "og:type", content: "website" });
    expect(content("property", "og:site_name")).toEqual({ property: "og:site_name", content: "Jellycat Studio" });
    expect(content("name", "twitter:card")).toEqual({ name: "twitter:card", content: "summary_large_image" });
  });
});
