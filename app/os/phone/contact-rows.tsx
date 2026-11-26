import { Fragment } from "react";
import { CONTACT, type Span } from "../../core/studio";
import { Address } from "./address";
import "./phone.css";

const label = (row: readonly Span[]) => (typeof row[0] === "string" ? row[0].trim() : "");
const link = (row: readonly Span[]) => row.find((span) => typeof span !== "string");

/** `contact.txt`'s rows (Email, GitHub) as a dim label and an underlined link: the home page's and the contact page's. */
export function ContactRows() {
  return (
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
  );
}
