import { Link } from "react-router";
import type { Project } from "../../core/projects";
import { Glyph } from "../icons/icon";
import { pictureCount } from "./text";
import "./phone.css";

/**
 * A project's card on the home page, a window's frame: the name with a pixel arrow, the kind (dim), the description and the number of
 * pictures (dim). The name is the one link and its hit area is the whole card; the description is text outside it.
 */
export function PhoneCard({ project }: { project: Project }) {
  const pictures = project.screenshots.length;
  return (
    <li className="ph-card">
      <h3>
        <Link to={`/projects/${project.slug}`}>{project.name}</Link>
        <Glyph name="next" scale={2} />
      </h3>
      <p className="text-phosphor-dim">{project.kind}</p>
      <p>{project.description}</p>
      {pictures > 0 && <p className="text-phosphor-dim">{pictureCount(pictures)}</p>}
    </li>
  );
}
