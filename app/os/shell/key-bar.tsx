export interface KeyBarEntry {
  /** What the key cap says: `j k`, `Space b`, `q`. */
  key: string;
  label: string;
  /** The key a press of the entry stands for. */
  send: string;
  /** Dim: the key does nothing now (the viewer's previous at the first picture). */
  off?: boolean;
}

/** The key bar under a full-screen view: each entry is a button that does what its key does, so the view works without a keyboard. */
export function KeyBar({ keys, onKey }: { keys: readonly KeyBarEntry[]; onKey: (key: string) => void }) {
  return (
    <div className="sh-keys">
      {keys.map((entry) => (
        <button
          key={entry.key}
          type="button"
          className={entry.off ? "sh-off" : undefined}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => onKey(entry.send)}
        >
          <b>{entry.key}</b>
          {/* The gap on screen is the cap's margin; this space is for the button's name ("j k move", not "j kmove"). */}
          <span className="sr-only"> </span>
          {entry.label}
        </button>
      ))}
    </div>
  );
}
