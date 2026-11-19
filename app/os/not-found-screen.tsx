/** What the screen shows at an address with no page. */
export function NotFoundScreen() {
  return (
    <div className="flex size-full flex-col items-center justify-center gap-2 px-6 text-center text-2xl">
      <h1 className="m-0 text-4xl font-normal">404</h1>
      <p className="m-0 text-phosphor-dim">There&apos;s no page at this address.</p>
      <a className="text-phosphor underline" href="/">
        Go to the home page
      </a>
    </div>
  );
}
