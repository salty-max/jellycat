import { act } from "@testing-library/react";

/**
 * Fires an event that makes a component suspend (`use()` on a README's chunk) inside an awaited act, so React finishes that
 * render instead of stranding it. It takes a `fireEvent` call (which returns a boolean), not user-event: user-event turns act's
 * environment off inside an outer act.
 *
 * Why not user-event alone: it wraps each event in a synchronous `act()`. When a component suspends while that act flushes, React
 * drops the rest of act's queue ("A component suspended inside an `act` scope, but the `act` call was not awaited") and the root
 * keeps act's placeholder as its scheduled task. When the chunk resolves, outside act, React sees a task of the same priority
 * already scheduled and adds none, so the boundary stays on its fallback until an unrelated update arrives outside act (the
 * clock's tick). A browser has no act queue, so this never happens there. An awaited act keeps a render that suspended in its
 * queue and runs it again until it is done, so nothing is stranded; the README can still show a moment after it, so a test waits
 * for it with a `findBy`.
 */
export const settle = (fire: () => boolean) =>
  act(async () => {
    fire();
  });
