import { Fragment } from "react";
import { Link } from "react-router";
import { FOLDERS, FOLDER_NAMES, PROJECTS } from "../../core/projects";
import { CONTACT, STUDIO_NAME, type Span } from "../../core/studio";
import { FOLDER_ICONS } from "../icons/names";
import { Icon } from "../icons/icon";
import { Address } from "./address";
import { PhoneCard } from "./card";
import { itemCount, STUDIO_LINE } from "./text";
import "./phone.css";

const label = (row: readonly Span[]) => (typeof row[0] === "string" ? row[0].trim() : "");
const link = (row: readonly Span[]) => row.find((span) => typeof span !== "string");

/**
 * The home page: the studio's name, its line and its contact (`contact.txt`'s rows), the folders as tabs that jump to each, and each
 * folder with its title bar (sticky under the header) and its projects as cards, in the data's order.
 */
export function PhoneHome() {
  return (
    <div className="ph-wrap">
      <section aria-labelledby="ph-studio">
        <h1 id="ph-studio" className="ph-h1">
          {STUDIO_NAME}
        </h1>
        <p>{STUDIO_LINE}</p>
        <dl className="ph-kv">
          {CONTACT.map((row) => {
            const target = link(row);
            return (
              <Fragment key={label(row)}>
                <dt className="text-phosphor-dim">{label(row)}</dt>
                <dd>{target && typeof target !== "string" ? <Address href={target.href} text={target.text} /> : "-"}</dd>
              </Fragment>
            );
          })}
        </dl>
      </section>
      <nav aria-label="Folders" className="ph-tabs">
        {FOLDERS.map((folder) => (
          <Link key={folder} to={{ hash: `#${folder}` }}>
            {FOLDER_NAMES[folder]} <span className="text-phosphor-dim">{PROJECTS.filter((project) => project.folder === folder).length}</span>
          </Link>
        ))}
      </nav>
      {FOLDERS.map((folder) => {
        const projects = PROJECTS.filter((project) => project.folder === folder);
        return (
          <section key={folder} id={folder} aria-labelledby={`${folder}-title`} className="ph-fold">
            <h2 id={`${folder}-title`} className="ph-fh inverse">
              <Icon name={FOLDER_ICONS[folder]} inverted />
              <span>{FOLDER_NAMES[folder]}</span>
              <span className="ph-fh-n">{itemCount(projects.length)}</span>
            </h2>
            <ul className="ph-cards">
              {projects.map((project) => (
                <PhoneCard key={project.slug} project={project} />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
