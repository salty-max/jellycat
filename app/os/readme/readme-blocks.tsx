import type { MouseEventHandler } from "react";
import type { Block, Inline } from "../../core/readme";
import { plainClick } from "./click";
import "./readme.css";

/** What a README's links need from the layout that draws it: what a link to another project does, and how its links look. */
export interface ReadmeLinks {
  /** A link to another project (`/projects/<slug>`) was pressed: the shell and the Readme window `open` it, the phone's page navigates. The link's address stays for a click with a modifier. */
  onOpenProject: (slug: string) => void;
  /** The layout's own class for every link, project links included. */
  linkClassName?: string;
  /** A mouse press on a link, for a layout that keeps the focus where it was (the shell's prompt). */
  onLinkMouseDown?: MouseEventHandler;
}

function Inlines({ content, links }: { content: readonly Inline[]; links: ReadmeLinks }) {
  const { onOpenProject, linkClassName, onLinkMouseDown } = links;
  return content.map((part, index) => {
    switch (part.kind) {
      case "text":
        return part.text;
      case "code":
        return <code key={index}>{part.text}</code>;
      case "link":
        return (
          <a key={index} href={part.href} className={linkClassName} {...(part.href.startsWith("https://") ? { target: "_blank", rel: "noopener" } : {})}>
            {part.text}
          </a>
        );
      case "project":
        return (
          <a
            key={index}
            href={`/projects/${part.slug}`}
            className={linkClassName}
            onMouseDown={onLinkMouseDown}
            onClick={(event) => {
              if (!plainClick(event)) return;
              event.preventDefault();
              onOpenProject(part.slug);
            }}
          >
            {part.text}
          </a>
        );
    }
  });
}

/**
 * A README as `docs/design.md` Readme draws it: real headings, lists and `code`; their marks (`#`, `##`, `-`, the backticks) are
 * drawn dim by the CSS, so the text a crawler or a screen reader gets is the words alone. The title is an `h2` and a heading an
 * `h3`: the page's `h1` is the project's name. Pure: the host (the shell, the Readme window, the phone's page) says what a link
 * to another project does.
 */
export function ReadmeBlocks({ blocks, ...links }: { blocks: readonly Block[] } & ReadmeLinks) {
  return (
    <div className="rd-md">
      {blocks.map((block, index) => {
        switch (block.kind) {
          case "title":
            return <h2 key={index}>{block.text}</h2>;
          case "heading":
            return <h3 key={index}>{block.text}</h3>;
          case "paragraph":
            return (
              <p key={index}>
                <Inlines content={block.content} links={links} />
              </p>
            );
          case "list":
            return (
              <ul key={index}>
                {block.items.map((item, at) => (
                  <li key={at}>
                    <span>
                      <Inlines content={item} links={links} />
                    </span>
                  </li>
                ))}
              </ul>
            );
        }
      })}
    </div>
  );
}
