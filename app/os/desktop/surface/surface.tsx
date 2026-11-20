import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { Icon } from "../../icons/icon";
import { useReportSelection } from "../menubar/selection";
import { DESKTOP_ICONS, type DesktopIcon } from "./desktop-icons";

type SurfaceProps = {
  /** Called with the icon's id: on a second click, a double click or Enter. Opening is the parent's job. */
  onOpen: (id: string) => void;
  icons?: readonly DesktopIcon[];
  /** The windows, drawn over the surface. */
  children?: ReactNode;
};

/** The desktop under the windows: the dither, and the icon column on the right with Trash at the bottom. */
export function DesktopSurface({ onOpen, icons = DESKTOP_ICONS, children }: SurfaceProps) {
  const [selected, setSelected] = useState<string | null>(null);
  useReportSelection("desktop", selected, () => setSelected(null));
  // Whether the click that began this click sequence is the one that selected the icon (so its second click opens).
  const selectedByFirstClick = useRef(false);
  const refs = useRef(new Map<string, HTMLDivElement>());
  // Tab lands on the selected icon, or on the first when none is.
  const tabStop = selected ?? icons[0]?.id;

  const select = (id: string, focus = false) => {
    setSelected(id);
    if (focus) refs.current.get(id)?.focus();
  };

  const onKeyDown = (event: KeyboardEvent, index: number) => {
    const id = icons[index].id;
    if (event.key === "Enter") {
      event.preventDefault();
      if (!event.repeat) onOpen(id);
    } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const next = icons[index + (event.key === "ArrowDown" ? 1 : -1)];
      if (next) select(next.id, true);
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      select(icons[event.key === "Home" ? 0 : icons.length - 1].id, true);
    }
  };

  return (
    <div className="relative size-full overflow-hidden dither" onClick={(event) => event.target === event.currentTarget && setSelected(null)}>
      <div
        role="listbox"
        aria-label="Desktop"
        aria-orientation="vertical"
        className="absolute inset-y-2.5 right-2 flex flex-col items-center gap-2"
      >
        {icons.map((item, index) => {
          const on = selected === item.id;
          return (
            <div
              key={item.id}
              ref={(node) => {
                if (node) refs.current.set(item.id, node);
                else refs.current.delete(item.id);
              }}
              role="option"
              aria-selected={on}
              tabIndex={item.id === tabStop ? 0 : -1}
              data-selected={on}
              className={`flex w-22 flex-col items-center gap-0.5 outline-none focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-phosphor focus-visible:outline-dashed ${item.id === "trash" ? "mt-auto" : ""}`}
              onClick={(event) => {
                // A click selects; a click on the one already selected opens it. A double click is that second click, and
                // a third click, or the second of a double click on an icon the first already opened, does nothing.
                if (event.detail >= 3) return;
                if (event.detail === 2) {
                  if (selectedByFirstClick.current) onOpen(item.id);
                  selectedByFirstClick.current = false;
                  return;
                }
                selectedByFirstClick.current = !on;
                if (on) onOpen(item.id);
                else select(item.id);
              }}
              onKeyDown={(event) => onKeyDown(event, index)}
            >
              <Icon name={item.icon} inverted={on} />
              <span className={`px-1 text-center leading-[18px] ${on ? "inverse" : "bg-screen"}`}>{item.label}</span>
            </div>
          );
        })}
      </div>
      {children}
    </div>
  );
}
