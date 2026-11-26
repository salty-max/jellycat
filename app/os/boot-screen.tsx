import { OS_NAME, OS_VERSION } from "../core/site";
import { CatIcon } from "./icons/icon";
import { playCue } from "./sound/sound";

/** What the screen shows while Jelly-OS starts: the cat, the name and a line under it. */
export function BootScreen() {
  return (
    <div className="flex size-full flex-col items-center justify-center gap-1.5 text-lg leading-[1.1]">
      <CatIcon className="size-16" />
      {/* One string: two expressions would prerender as separate text nodes, and e2e/smoke.spec.ts looks for the whole name. */}
      <h1 className="m-0 mt-2.5 text-lg font-normal">{`${OS_NAME} ${OS_VERSION}`}</h1>
      <p className="m-0 text-phosphor-dim">Starting up</p>
    </div>
  );
}

/**
 * The screen after Shut Down. A click, Enter or Space restarts (the button takes focus on mount) with the rising tone, as the menu's
 * Restart does (with sound on); the parent supplies `onRestart`.
 */
export function ShutDownScreen({ onRestart }: { onRestart: () => void }) {
  return (
    <button type="button" autoFocus onClick={() => {
        playCue("up");
        onRestart();
      }}
      className="flex size-full cursor-default flex-col items-center justify-center gap-1.5 text-lg leading-[1.1]">
      <span>{OS_NAME} has shut down.</span>
      <span className="text-phosphor-dim">Click to restart.</span>
    </button>
  );
}
