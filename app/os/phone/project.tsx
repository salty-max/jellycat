import { Link, useNavigate } from "react-router";
import { readmePath } from "../../core/fs";
import { FOLDER_NAMES, PROJECTS, type Project } from "../../core/projects";
import type { Block } from "../../core/readme";
import { Glyph } from "../icons/icon";
import { ReadmeBlocks } from "../readme/readme-blocks";
import { Address } from "./address";
import { PhonePictures } from "./pictures";
import "./phone.css";

function Neighbour({ project, side }: { project: Project | undefined; side: "previous" | "next" }) {
  if (!project) return <span />;
  const next = side === "next";
  return (
    <Link to={`/projects/${project.slug}`} rel={next ? "next" : "prev"} className={next ? "ph-nx" : "ph-pv"}>
      <span className="ph-lb text-phosphor-dim">
        {!next && <Glyph name="prev" />}
        {next ? "Next" : "Previous"}
        {next && <Glyph name="next" />}
      </span>
      <span>{project.name}</span>
    </Link>
  );
}

/**
 * A project's page: a link back to its folder on the home page, the name as the `h1`, the kind (dim) and the description, the facts
 * (Stack, Link and Source; an unknown one is `-`), the screenshots, the README in the shell's double-bordered pane with its path set
 * in the border, and the neighbouring projects. `blocks` is the route loader's README, or null when its chunk could not be loaded.
 */
export function PhoneProject({ project, blocks, onOpenPicture }: { project: Project; blocks: readonly Block[] | null; onOpenPicture: (index: number, opener: HTMLElement) => void }) {
  const navigate = useNavigate();
  const at = PROJECTS.findIndex((each) => each.slug === project.slug);
  return (
    <article aria-labelledby="ph-title" className="ph-wrap ph-pj">
      <Link to={{ pathname: "/", hash: `#${project.folder}` }} className="ph-back">
        <Glyph name="prev" scale={2} />
        {FOLDER_NAMES[project.folder]}
      </Link>
      <h1 id="ph-title" className="ph-h1">
        {project.name}
      </h1>
      <p className="text-phosphor-dim">{project.kind}</p>
      <p>{project.description}</p>
      <dl className="ph-kv ph-facts">
        <dt className="text-phosphor-dim">Stack</dt>
        <dd>{project.stack}</dd>
        <dt className="text-phosphor-dim">Link</dt>
        <dd>
          <Address href={project.link} />
        </dd>
        <dt className="text-phosphor-dim">Source</dt>
        <dd>
          <Address href={project.source} />
        </dd>
      </dl>
      <PhonePictures project={project} onOpenPicture={onOpenPicture} />
      <section aria-label="README" className="ph-pane">
        <span aria-hidden="true" className="ph-pt">
          {readmePath(project)}
        </span>
        {blocks ? <ReadmeBlocks blocks={blocks} onOpenProject={(slug) => void navigate(`/projects/${slug}`)} linkClassName="ph-lk" /> : <p>README: could not be loaded</p>}
      </section>
      <nav aria-label="Projects" className="ph-pn">
        <Neighbour project={PROJECTS[at - 1]} side="previous" />
        <Neighbour project={PROJECTS[at + 1]} side="next" />
      </nav>
    </article>
  );
}
