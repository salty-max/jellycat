import { PRIVACY_NOTICE } from "../../core/privacy";

/**
 * The privacy notice (app/core/privacy.ts, the user's approved words), each line a paragraph in the dim tone, the address a link.
 * On the desktop it sits in a box of its own that scrolls when the words outrun it, so the box is a tab stop (its keys scroll it,
 * and axe wants a scrolling region reachable from the keyboard); on the phone the page scrolls and the notice is plain text.
 */
export function Notice({ scrolls }: { scrolls: boolean }) {
  return (
    <section aria-label="Privacy notice" className="ct-notice text-phosphor-dim" tabIndex={scrolls ? 0 : undefined}>
      {PRIVACY_NOTICE.map((line, index) => (
        <p key={index}>
          {line.map((span, at) =>
            typeof span === "string" ? (
              span
            ) : (
              <a key={at} href={span.href}>
                {span.text}
              </a>
            ),
          )}
        </p>
      ))}
    </section>
  );
}
