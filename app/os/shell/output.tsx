import { Component, Suspense, use, useLayoutEffect, type MouseEvent, type ReactNode } from "react";
import { readmePath } from "../../core/fs";
import { projectBySlug } from "../../core/projects";
import { loadReadme, type Block, type Inline } from "../../core/readme";
import type { Line, Segment } from "../../core/shell";
import { useShell } from "./context";

// A plain click runs the name; a click with a modifier (a new tab, a copy of the address) is the browser's.
const plainClick = (event: MouseEvent) => !(event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0);

// A name in the output keeps the prompt's focus: pressing it must not take the focus from the input.
const keepFocus = (event: MouseEvent) => event.preventDefault();

const host = (url: string) => url.replace(/^https?:\/\//, "");

export function CommandButton({ command, children }: { command: string; children: ReactNode }) {
  const { run } = useShell();
  return (
    <button type="button" className="sh-lk" onMouseDown={keepFocus} onClick={() => run(command)}>
      {children}
    </button>
  );
}

function ProjectLink({ slug, children }: { slug: string; children: ReactNode }) {
  const { run } = useShell();
  return (
    <a
      href={`/projects/${slug}`}
      className="sh-lk"
      onMouseDown={keepFocus}
      onClick={(event) => {
        if (!plainClick(event)) return;
        event.preventDefault();
        run(`open ${slug}`);
      }}
    >
      {children}
    </a>
  );
}

function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  const site = href.startsWith("https://");
  return (
    <a href={href} className="sh-lk" {...(site ? { target: "_blank", rel: "noopener" } : {})}>
      {children}
    </a>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="sh-kr">
      <span className="text-phosphor-dim">{label}</span>
      <span>{children}</span>
    </div>
  );
}

const Blank = () => <div>{" "}</div>;

/** The project's card: one line per entry, with the project's own links and the README's path, which pages it. */
function Card({ slug, heading }: { slug: string; heading: boolean }) {
  const project = projectBySlug(slug);
  if (!project) return null;
  const pictures = project.screenshots.length;
  const address = (url: string) => (url === "-" ? "-" : <ExternalLink href={url}>{host(url)}</ExternalLink>);
  return (
    <>
      {heading ? <h1 className="sh-h1">{project.name}</h1> : <div>{project.name}</div>}
      <div className="text-phosphor-dim">{project.kind}</div>
      <Blank />
      <div>{project.description}</div>
      <Blank />
      <Row label="Stack">{project.stack}</Row>
      <Row label="Link">{address(project.link)}</Row>
      <Row label="Source">{address(project.source)}</Row>
      {pictures > 0 && (
        <Row label="Screenshots">
          <CommandButton command={`view ${slug}`}>{`${pictures} picture${pictures === 1 ? "" : "s"}`}</CommandButton>
        </Row>
      )}
      <Row label="README">
        <CommandButton command={`less ${readmePath(project)}`}>{readmePath(project)}</CommandButton>
      </Row>
    </>
  );
}

function Inlines({ content }: { content: readonly Inline[] }) {
  return content.map((part, index) => {
    switch (part.kind) {
      case "text":
        return part.text;
      case "code":
        return <code key={index}>{part.text}</code>;
      case "link":
        return (
          <ExternalLink key={index} href={part.href}>
            {part.text}
          </ExternalLink>
        );
      case "project":
        return (
          <ProjectLink key={index} slug={part.slug}>
            {part.text}
          </ProjectLink>
        );
    }
  });
}

/**
 * A README as `docs/design.md` Readme draws it: real headings, lists and `code`; their marks (`#`, `##`, `-`, the backticks) are
 * drawn dim by the CSS, so the text a crawler or a screen reader gets is the words alone. The title is an `h2` and a heading an
 * `h3`: the page's `h1` is the project's name.
 */
export function ReadmeBlocks({ blocks }: { blocks: readonly Block[] }) {
  return (
    <div className="sh-md">
      {blocks.map((block, index) => {
        switch (block.kind) {
          case "title":
            return <h2 key={index}>{block.text}</h2>;
          case "heading":
            return <h3 key={index}>{block.text}</h3>;
          case "paragraph":
            return (
              <p key={index}>
                <Inlines content={block.content} />
              </p>
            );
          case "list":
            return (
              <ul key={index}>
                {block.items.map((item, at) => (
                  <li key={at}>
                    <span>
                      <Inlines content={item} />
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

function ReadmeLoaded({ slug }: { slug: string }) {
  const { readmes, settled } = useShell();
  const given = readmes[slug];
  const loading = given ? undefined : loadReadme(slug);
  const blocks = given ?? (loading ? use(loading) : undefined);
  useLayoutEffect(settled, [settled]);
  return blocks ? <ReadmeBlocks blocks={blocks} /> : <div>-</div>;
}

class Failed extends Component<{ children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  override render() {
    return this.state.failed ? <div>README: could not be loaded</div> : this.props.children;
  }
}

/** A project's README: the host's blocks, else the chunk, which suspends until it arrives. */
export function Readme({ slug }: { slug: string }) {
  return (
    <Failed>
      <Suspense fallback={null}>
        <ReadmeLoaded slug={slug} />
      </Suspense>
    </Failed>
  );
}

function SegmentView({ segment, heading }: { segment: Segment; heading: boolean }) {
  switch (segment.kind) {
    case "text":
      return segment.text;
    case "dim":
      return <span className="text-phosphor-dim">{segment.text}</span>;
    case "command":
      return <CommandButton command={segment.command}>{segment.text}</CommandButton>;
    case "project":
      return <ProjectLink slug={segment.slug}>{segment.text}</ProjectLink>;
    case "link":
      return <ExternalLink href={segment.href}>{segment.text}</ExternalLink>;
    case "card":
      return <Card slug={segment.slug} heading={heading} />;
    case "readme":
      return <Readme slug={segment.slug} />;
  }
}

/** One line of output; the project's card and a README stand alone, and fill their own lines. */
export function LineView({ line, heading = false }: { line: Line; heading?: boolean }) {
  if (line.length === 1 && (line[0].kind === "card" || line[0].kind === "readme")) return <SegmentView segment={line[0]} heading={heading} />;
  return (
    <div>
      {line.length === 0
        ? " "
        : line.map((segment, index) => <SegmentView key={index} segment={segment} heading={heading} />)}
    </div>
  );
}
