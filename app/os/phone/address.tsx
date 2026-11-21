/** The host an address is shown as: no scheme, no `mailto:`. */
const addressHost = (url: string) => url.replace(/^(https?:\/\/|mailto:)/, "");

/** An address (a project's link or source, the e-mail, GitHub), underlined; an unknown one is `-`. `text` replaces the host as the link's words. */
export function Address({ href, text }: { href: string; text?: string }) {
  if (href === "-") return "-";
  return (
    <a href={href} className="ph-lk" {...(href.startsWith("https://") ? { target: "_blank", rel: "noopener" } : {})}>
      {text ?? addressHost(href)}
    </a>
  );
}
