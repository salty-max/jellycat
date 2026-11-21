import "./phone.css";

/**
 * The CRT layer of the phone's page: scanlines, vignette and the flicker, fixed over the viewport (not over the page, which scrolls
 * under it), with no rounded corners. It takes no clicks and screen readers skip it. The effects are the `<html data-*>` attributes,
 * as on the desktop (docs/design.md Screen).
 */
export function PhoneCrt() {
  return (
    <>
      <div aria-hidden="true" className="ph-crt crt-flicker" />
      <div aria-hidden="true" className="ph-crt crt-overlay" />
    </>
  );
}
