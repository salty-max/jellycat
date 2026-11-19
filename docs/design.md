# Jelly-OS design rules

What the mockups (`mockups/phosphor-desktop.html`, `mockups/phosphor-shell.html`) settled. A component that breaks one of these
rules changes this file in the same pull request.

## Screen

- One phosphor at a time: a screen colour (`--phosphor-fg`), its dim tone for secondary text (`--phosphor-dim`), and the tube's
  black (`--phosphor-bg`). Green, amber and white are defined in `app/app.css`; each dim tone keeps 4.5:1 against its black.
- No other colours in the OS. Emphasis is the full colour against the dim one, or inverse video (dark text on a phosphor block).
  Bold doesn't exist: VT323 has one weight.
- Screenshots of the projects are the one exception: they are shown in their own colours.
- The CRT layer (scanlines, vignette, a soft glow on text) sits over everything, takes no clicks and is hidden from screen readers.
  Flicker is off by default and never runs under `prefers-reduced-motion`. The Control Panel turns each effect off.
- The screen has rounded corners. The text is never warped: curvature would take it out of the DOM.

## Type

- VT323, self-hosted (`@fontsource/vt323`), with ligatures off.
- VT323 has no box-drawing characters: trees and frames are drawn in ASCII (`|--`, `` `-- ``) or with CSS borders.
- Desktop UI text 18px, shell text 20px.

## Icons

- 1-bit pixel art, drawn on a 16×16 grid and shown at 2× (32px) on the desktop and in folders, 1× in lists and menus.
- Two tones: the outline in the phosphor colour, the inside in the tube's black (so the dithered desktop doesn't show through).
- A selected icon is drawn inverted, and its label turns to inverse video.

## Desktop

- A menu bar across the top: the cat menu (About, Control Panel), File, Edit, View, Special, Window, and the clock on the right.
  An item that can't act now is shown dim, not hidden.
- The desktop is a 1px checker dither of the phosphor at 20% (a Control Panel setting turns it off). Icons stand in a column on
  the right; Trash at the bottom.
- Windows: a 1px phosphor frame, a hard 3px shadow in the dim tone, a 22px title bar. The window in front has an inverse title bar.
  Three boxes on the right: collapse to the title bar, zoom, close. A grip in the bottom-right corner resizes.
- Folder windows have an info line (item count, view) and show their items by icon or by name (View menu). A folder holding more
  than it shows scrolls, with the 1-bit scroll bar (see Readme).
- Dialogs have a 3px double border and no title bar. The default button has a second outline.
- Selection: one click selects, a second click or a double click opens, Enter opens the focused icon.

## Shell

- Prompt `guest@jellycat:<path>$`, a block cursor (hollow when the shell isn't focused), a status bar in inverse video:
  `[jellycat] 0:jsh*` on the left, the path and the clock on the right.
- Every name in the output is clickable and runs the command it stands for, so the shell works without typing. A project's name
  (in `ls` and `tree`) opens it; a README's name pages it.
- Messages read like a Unix shell's (`jsh: foo: command not found`), never chatty.
- `browse` is full screen: two panes in double borders, titles set in the border, a key bar at the bottom. `q` returns to the
  prompt as it was.

## Viewer

- A project's screenshots open in a viewer: a window on the desktop, full screen in the shell (`view <project>`, like `browse`).
- The picture is shown whole, scaled to fit, in its own colours, with the CRT layer on top. Desktop-sized and phone-sized pictures
  share one window (desktop) or one full-screen pane (shell), which keeps its size from one picture to the next. On the desktop the
  picture box is fixed, so the buttons stay put; in the shell the caption sits right under the picture.
- The count (`2 of 3`) is in the window's info line, or set in the top border in the shell. The caption is the picture's alt text,
  kept to two lines.
- Previous and next are buttons with pixel arrows on the desktop and `h`/`l` in the shell's key bar; ← and → work in both. At the
  first or last picture the control is dim. Esc closes the window; `q` or Esc returns the shell to the prompt as it was.
- The Info window and the `open` card list Stack, Link, Source and Screenshots, and the card a README row after them. An unknown
  Link or Source is `-`; a project with no pictures has no Screenshots row.

## Readme

- Every project has a README, 250 to 450 words: one `#` title, `##` headings, paragraphs, one-level lists, code spans and links.
  In the file system a project is a directory holding it, `~/projects/<folder>/<slug>/README`.
- It reads the same everywhere. A heading keeps its `#` or `##`, a list item its `-` and a code span its backticks, drawn dim by
  CSS so the HTML holds only the words, in real headings, lists and `code`. A blank line comes before each heading and between
  blocks; an item's text hangs. An https link opens in a new tab; a link to `/projects/<slug>` opens that project, as its name
  does elsewhere.
- Desktop: the Info window, sized to its content, ends with a default button, Open Readme (Enter works too). It opens
  `<Name> Readme`, a text window that scrolls. Its scroll bar is 1-bit: a track dithered in the dim tone, a hollow thumb, a box at
  the bottom for the grip. Esc closes it. The window takes the focus, shown by its inverse title bar, so the text has no focus
  ring of its own.
- Shell: `cat` prints it. `less` (or `more`) pages it full screen, like `browse`: the path in the top border (cut with `…` when
  long), the position on the right (`top`, a percentage, `end`), the key bar `j k` scroll, `Space b` page, `q` quit; the arrows,
  Page Up/Down, `g` and `G` work too. `q` goes back to where it was opened, the prompt or `browse`.
- The `open` card's README row shows the path and runs `less`. In `browse`, a project's directory shows its card and its README
  the text; Enter on the README pages it.
- In the desktop's Terminal, `less` opens the README's window; any other file is printed, as `more` prints a file that fits.
- `/projects/<slug>` prerenders the session with `open <slug>` and `cat ~/projects/<folder>/<slug>/README` already run, scrolled
  to the `open` line. That is the text phones, crawlers and link previews read. The project's name is the page's `h1`, the
  README's headings its `h2` and `h3`.

## Words

- Project facts come from the project's own README. Unknown is `-`. Placeholders say so (`hello@your-domain (placeholder)`).
- No taglines, jokes, invented numbers or statuses. System messages are plain: "Jelly-OS has shut down."
