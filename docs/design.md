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
- Each effect is a data attribute on `<html>` (`data-phosphor`, `data-scanlines`, `data-glow`, `data-flicker`, `data-dither`), saved
  in the settings store (`app/core/settings.ts`, persisted under `jelly-os:settings`). A script in `<head>` sets them from the saved
  values before first paint, so a saved amber screen never flashes green; the store reads them again in an effect after hydration.
  A missing attribute is the default: full tube, flicker off.
- The glow is `0 0 2px` in the dim tone. The desktop mockup used that and the shell mockup `0 0 3px` in the text's own colour;
  one value now serves both, the softer one, which keeps 18px and 20px text crisp. Inverse video (`inverse`) takes the glow off.
- The dither is the desktop's 2px checkerboard of the phosphor at 20% over the tube's black (`dither` utility); it can be turned off.
- The screen has rounded corners, 22px as the mockups' frames (`Crt`). The text is never warped: curvature would take it out of
  the DOM.

## Type

- VT323, self-hosted (`@fontsource/vt323`), with ligatures off.
- VT323 has no box-drawing characters: trees and frames are drawn in ASCII (`|--`, `` `-- ``) or with CSS borders.
- Desktop UI text 18px, shell text 20px.

## Icons

- 1-bit pixel art, drawn on a 16×16 grid and shown at 2× (32px) on the desktop and in folders, 1× in lists and menus. The title-bar
  glyphs (close, collapse, zoom, previous, next) are 8×8, shown at 1×.
- Two tones: the outline in the phosphor colour (`currentColor`), the inside in the tube's black (so the dithered desktop doesn't show
  through).
- A selected icon is drawn inverted (outline in the black, inside in the phosphor), and its label turns to inverse video.
- They are SVG components (`app/os/icons/`), one square path per pixel, never scaled to a fraction, and hidden from screen readers:
  the label next to an icon names it. Their grids are the mockup's.
- All four project folders (web, addons, engines, tools) use the folder icon.

## Desktop

- A menu bar across the top: the cat menu (About, Control Panel), File, Edit, View, Special, Window, and the clock on the right.
  An item that can't act now is shown dim, not hidden.
- The desktop is a 1px checker dither of the phosphor at 20% (a Control Panel setting turns it off). Icons stand in a column on
  the right; Trash at the bottom.
- Windows: a 1px phosphor frame, a hard 3px shadow in the dim tone, a 22px title bar. The window in front has an inverse title bar.
  Three boxes on the right: collapse to the title bar, zoom, close. In front, a box's outline melts into the inverse bar, so each
  shows as a 14px dark square, as the mockup draws it. A grip in the bottom-right corner resizes.
  - A new window cascades 26px right and 24px down from the one before, clear of the icon column and the bottom edge; a dialog
    stands centred, a little above the middle. A second open of a window brings it to the front.
  - A drag keeps 60px of the window in view across and its title bar on the desktop. The minimum size is 220×120.
  - Zoom fills the desktop less the icon column and an 8px margin; a second zoom puts the window back. Collapse leaves the title bar.
  - Keyboard: arrows on the focused title bar move the window by 8px, Shift+arrows resize it by 8px.
  - A window is a non-modal dialog (`role="dialog"`, `aria-modal="false"`). Focus goes into it when it opens, unless its app has
    already put it inside, and back to what had it before when it closes. Esc is the app's to handle.
- Folder windows have an info line (item count, view) and show their items by icon, in the order the data lists them, or by name, a
  list sorted by name with its kind (View menu). A folder holding more
  than it shows scrolls, with the 1-bit scroll bar (see Readme).
- Dialogs have a 3px double border and no title bar. The default button has a second outline.
  - An alert (Base UI's AlertDialog) is modal, at least 320×140: the icon beside the message, centred in the space above the
    buttons, the first line naming it, buttons at the bottom right.
    Focus is on the default button; Enter presses it. A click outside doesn't close it. It sits in the same place as a dialog window.
- Selection: one click selects, a second click or a double click opens, Enter opens the focused icon.
- Arrows move between icons and select. A click on the bare desktop deselects. The clock is drawn on the
  client only (the page is prerendered); the menu bar's slot stays empty until the menus exist.
- The boot screen is the cat at 4× (64px), the OS name as the page's `h1`, and "Starting up" in the dim tone; the shut-down screen is
  one button, "Click to restart".

## Shell

- Text 20px on 23px lines; the `open` card's rows on 24px lines, so its buttons (Screenshots, README), one above the other, are
  24px targets.
- Prompt `guest@jellycat:<path>$`, a block cursor (hollow when the shell isn't focused), a status bar in inverse video:
  `[jellycat] 0:jsh*` on the left, the path and the clock on the right.
- The input is a real, labelled `<input>`, 1px and clear, with a font size of 16px so iOS doesn't zoom in; the prompt's own text is
  what shows. It is never focused on mount on a phone; a tap on the screen focuses it. Tab completes, ↑ ↓ walk the history, Ctrl-C
  abandons the line (`^C`), Ctrl-L clears the log and Ctrl-U the line.
- Every name in the output is clickable and runs the command it stands for, so the shell works without typing. A project's name
  (in `ls` and `tree`) opens it; a README's name pages it. A command is a `<button>`, a project's name an `<a href="/projects/<slug>">`;
  pressing one keeps the focus where it was. An address (https, the e-mail) and a link in a README's text are underlined; a name
  in a listing and a command aren't. Hover is inverse video.
- The output is `role="log"`. The first paint is the welcome and the prompt; the typed login (banner, `jellycat login: guest`, last
  login, welcome) plays on `logout` and `exit` only, and any key or click skips it, as does `prefers-reduced-motion`.
- The shell fills its box: the screen on a phone, the Terminal window on the desktop. The host plugs in through props: `onOpenProject`,
  `initialCommand` (one line or several, printed at first paint as if typed one after the other, their effects not run) and a full-screen slot for `browse` and the viewer; without one those
  show a placeholder that says so. A full-screen view gets every key typed, none reaching the prompt behind it.
- The status bar's clock is client-only: it is not in the markup the server renders.
- Messages read like a Unix shell's (`jsh: foo: command not found`), never chatty.
- `browse` is full screen: two panes in double borders, titles set in the border, a key bar at the bottom. It opens in the
  directory the prompt was in, and the status bar shows the directory it is in (the slot's `setPath`) until it closes. Enter on a
  README or a file pages it; `q` there comes back to `browse`, and `q` in `browse` returns to the prompt as it was.

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

- Every project has a README, 250 to 500 words: one `#` title, `##` headings, paragraphs, one-level lists, code spans and links.
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
- In the desktop's Terminal, `less` opens the README's window; any other file is printed, as `more` prints a file that fits. From `browse` in the Terminal a README or a file pages inside the window, so `q` comes back to `browse`.
- `/projects/<slug>` prerenders the session with `open <slug>` and `cat ~/projects/<folder>/<slug>/README` already run, each at
  its own prompt, scrolled to the `open` line. That is the text phones, crawlers and link previews read. The project's name is the page's `h1`, the
  README's headings its `h2` and `h3`.

## Words

- Project facts come from the project's own repository: its README, or its code where the README is stale. Unknown is `-`.
  Placeholders say so (`hello@your-domain (placeholder)`).
- No taglines, jokes, invented numbers or statuses. System messages are plain: "Jelly-OS has shut down."
