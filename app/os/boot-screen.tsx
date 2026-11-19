/** What the screen shows while Jelly-OS starts. */
export function BootScreen() {
  return (
    <div className="flex size-full flex-col items-center justify-center gap-1 text-2xl">
      <h1 className="m-0 text-4xl font-normal">Jelly-OS 1.0</h1>
      <p className="m-0 text-phosphor-dim">Starting up</p>
    </div>
  );
}
