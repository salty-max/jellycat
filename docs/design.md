# Jelly-OS design rules

What the mockups (`mockups/phosphor-desktop.html`, `mockups/phosphor-shell.html`, `mockups/phosphor-phone.html`) settled. A
component that breaks one of these rules changes this file in the same pull request.

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
- The Control Panel's icon is the one icon with no label beside it: in the phone's header it is a 44px button named Control Panel
  (`aria-label`), the 32px icon centred in it, and inverse video (its inside turned with it) while pressed and while its sheet is open.

## Desktop

- A menu bar across the top: the cat menu (About, Control Panel), File, Edit, View, Special, Window, and the clock on the right.
  An item that can't act now is shown dim, not hidden.
  - The cat menu: About (a dialog naming the OS, its version and the studio) and Control Panel. File: Open and Get Info (the selected
    icon; Get Info for a project only) and Close Window (the front window). Edit is all dim. View: by Icon and by Name, the front folder
    window's view checked, dim when no folder is in front. Special: the three phosphors, CRT effects (scanlines and glow on, or every effect off), Dither
    pattern, Restart and Shut Down... Window: the open windows in the order they opened, the front one checked.
  - A menu opens on a click and while one is open, hover moves between them; ↑ ↓ ← → move, Enter picks, Esc closes. A checked item has a
    6px square at its left.
  - Restart closes every window and shows the boot screen again; Shut Down... asks first (Cancel, Shut Down), then shows the shut-down
    screen, and a click restarts.
- The desktop is a 1px checker dither of the phosphor at 20% (a Control Panel setting turns it off). Icons stand in a column on
  the right; Trash at the bottom.
- Windows: a 1px phosphor frame, a hard 3px shadow in the dim tone, a 22px title bar. The window in front has an inverse title bar.
  Three boxes on the right: collapse to the title bar, zoom, close. In front, a box's outline melts into the inverse bar, so each
  shows as a 14px dark square, as the mockup draws it. The boxes stand 0.5rem apart, where the mockup has 3px: their centres are
  1.5rem (24px) apart, so each is a 24px target by its spacing (WCAG's minimum target size, Lighthouse's `target-size`). A grip in
  the bottom-right corner resizes.
  - A new window cascades 26px right and 24px down from the one before, clear of the icon column and the bottom edge; a dialog
    stands centred, a little above the middle. A second open of a window brings it to the front.
  - A drag keeps 60px of the window in view across and its title bar on the desktop. The minimum size is 220×120.
  - Zoom fills the desktop less the icon column and an 8px margin; a second zoom puts the window back. Collapse leaves the title bar.
  - Keyboard: arrows on the focused title bar move the window by 8px, Shift+arrows resize it by 8px.
  - A window is a non-modal dialog (`role="dialog"`, `aria-modal="false"`). Focus goes into it when it opens, unless its app has
    already put it inside, and back to what had it before when it closes. Esc is the app's to handle.
- Folder windows have an info line (item count, view) and show their items by icon, in the order the data lists them, or by name, a
  list sorted by name with its kind (View menu). A folder holding more than it shows scrolls, with the 1-bit scroll bar (see
  Readme). When a folder opens, the focus goes to its first item, so the arrows and Enter work at once.
- Dialogs have a 3px double border and no title bar. The default button has a second outline; focused, it turns dashed, as every
  focus ring is.
  - An alert (Base UI's AlertDialog) is modal, at least 320×140: the icon beside the message, centred in the space above the
    buttons, the first line naming it, buttons at the bottom right.
    Focus is on the default button; Enter presses it. A click outside doesn't close it. It sits in the same place as a dialog window.
- Selection: one click selects, a second click or a double click opens, Enter opens the focused icon.
- Arrows move between icons and select. A click on the bare desktop deselects. The clock is drawn on the
  client only (the page is prerendered).
- The boot screen is the cat at 4× (64px), the OS name as the page's `h1`, and "Starting up" in the dim tone; the shut-down screen is
  one button, "Click to restart".

## Phone

On a phone Jelly-OS is a page that scrolls like any site, in the same phosphor (`mockups/phosphor-phone.html`; the decisions are in
`docs/phone-plan.md`). The document scrolls, not a box inside the screen, so the browser's bars hide on scroll and back restores the
position. Nothing on it needs a keyboard. Its code is `app/os/phone/`; the README's text is the shared `app/os/readme/`.

- Text 20px on 24px lines, as the shell. The page is the tube's black (`--phosphor-bg`), the text the phosphor, the glow on all of it.
  It sits outside `Crt`: `Crt`'s `overflow: hidden` makes it a scroll container, and a sticky header sticks to its nearest one.
- The page's CRT layer (scanlines, vignette, flicker) is `position: fixed` over the viewport, `100lvh` tall so it still covers while
  iOS hides its toolbar, so the page scrolls under it. It has no rounded corners (the screen has its own), takes no clicks and is
  hidden from screen readers. The desktop's layer stays absolute inside the rounded `Crt`.
- A column at most 640px wide, centred, with a 16px gutter: a phone sideways or a small tablet gets a centred column, and the header's
  content lines up with it.
- The header, on every page: the desktop's menu bar, sticky, 44px tall with a 1px rule under it. On the left the cat at 2× and
  `Jellycat Studio`, a link home; on the right the Control Panel's button (see Icons). Both are 44px targets.
- The home page: `Jellycat Studio` as the `h1` (40px), the studio Readme's line, and `contact.txt`'s two rows (Email, GitHub) as a
  dim label and an underlined link. Then the folders as tabs that jump to each (`Web 4`, `Addons 11`, `Engines 1`, `Tools 3`: a 36px
  framed link, the count dim; `Link to="#<folder>"`, so back after a tab works as after any move). Each folder is a section with an
  `h2` title bar in inverse video (the folder icon inverted, its name, `11 items` as the folder window's info line says it), 32px
  tall and sticky under the header while its projects scroll by, then the projects as cards in the data's order.
- A card is a window's frame (1px, the hard 3px shadow in the dim tone): the name (24px) with a pixel arrow, the kind (dim), the
  description, and `3 pictures` (dim) when it has some. The name is the card's one link, its hit area the whole card; the description
  is text outside it. Pressed, the card is inverse video; keyboard focus draws the dashed ring around the card.
- A project's page: `< Web`, a 40px-tall link back to the home page at that folder (`/#web`); the name as the `h1`, the kind (dim),
  the description. Stack, Link and Source as the Info window lists them, between two 1px rules; an unknown Link or Source is `-`.
  Screenshots, when it has some: an `h2` with the count at the right, then the pictures stacked, each in its own colours in a 1px frame
  with its alt text as the caption (three lines at most, hidden from screen readers, since the picture's button carries it). A
  desktop picture takes the column's width, a phone picture half of it, centred. Pressing one opens the viewer (see Viewer). The
  first picture loads eagerly, the rest when they are near.
- The README in the shell's double-bordered pane (`border: 4px double`), its path (`~/projects/web/hundo/README`) set in the top
  border and hidden from screen readers, the pane a section labelled README. It is drawn as everywhere (see Readme); a link to
  another project moves to its page in the browser. When the README's chunk could not be loaded the pane says `README: could not
  be loaded`.
- Previous and Next: the neighbouring projects in the data's order, two framed buttons (1px, the hard 3px shadow, 56px tall at
  least), Previous with its arrow at the left and Next at the right; at the ends the missing one is left empty.
- The footer, on every page: `Jelly-OS 1.0` in the dim tone under a 1px rule.
- The Control Panel's sheet: a window docked at the bottom, 8px from the screen's edges and at most 640px wide, with the window's
  1px frame, hard shadow and an inverse title bar (`Control Panel`, and a close box: the desktop's glyph in a dark square, a 44×32
  target). Under it the desktop Control Panel's Phosphor (Green, Amber, White) and Effects (Scanlines, Glow, Flicker) in 44px rows;
  the Dither pattern is left out, a phone has no desktop. It is a modal dialog: a 1-bit dither dims the page behind it, and a tap on
  that, Esc, Android's back gesture or the close box closes it; focus goes to the checked phosphor and comes back to the header's
  button. It appears and goes at once, as a window does: no slide. The settings are the desktop's, so a choice holds on both.
- Pressed, a folder tab, a card, the back link, Previous and Next and the Control Panel's button are inverse video (the dim tone
  inside them turns with it); the other links and the pictures' buttons show nothing. Every tab stop shows its focus on keyboard
  focus only: the desktop's 1px dashed ring, 2px off its edge (a card's, 4px off, around the card). The phone has no text field.
- Landmarks: the header, `main`, the footer, a `nav` for the folder tabs and one for Previous and Next. One `h1` a page; an `h2` per
  folder and for Screenshots; the README's own title is an `h2` and its headings `h3`.
- No smooth scrolling, and no motion but the flicker, which is off by default and never runs under `prefers-reduced-motion`.

## Shell

- Text 20px on 24px lines (a line height of 1.2, so the pitch follows the font), where the mockup has 23px: names one above the other
  (`ls`, `tree`, browse's rows, the `open` card's buttons) are then 24px targets. A name on a line of several (`ls`, the welcome's
  `Try:`) never breaks over two lines.
- Prompt `guest@jellycat:<path>$`, a block cursor (hollow when the shell isn't focused), a status bar in inverse video:
  `[jellycat] 0:jsh*` on the left, the path and the clock on the right.
- The input is a real, labelled `<input>`, 1px and clear, with a font size of 16px so iOS doesn't zoom in; the prompt's own text is
  what shows. It is never focused on mount on a phone; a tap on the screen focuses it. Tab completes a line being typed; on an
  empty line, and with Shift, it moves the focus as anywhere else, so the keyboard can always leave the prompt. ↑ ↓ walk the
  history, Ctrl-C abandons the line (`^C`), Ctrl-L clears the log and Ctrl-U the line.
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
- In the desktop's Terminal, `view <project>` opens the viewer's window and prints `opened <Name> Screenshots`; it is not full screen there.
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
  the bottom for the grip. Esc closes it. The window takes the focus, shown by its inverse title bar; opened by a click, the text
  has no focus ring of its own. Reached by the keyboard (Tab, or opened with Enter), it shows a 1px dashed ring inside it, where
  the mockup has none: the window's own boxes are tab stops too, and without it the step from them to the text showed nothing.
- Shell: `cat` prints it. `less` (or `more`) pages it full screen, like `browse`: the path in the top border (cut with `…` when
  long), the position on the right (`top`, a percentage, `end`), the key bar `j k` scroll, `Space b` page, `q` quit; the arrows,
  Page Up/Down, `g` and `G` work too. `q` goes back to where it was opened, the prompt or `browse`.
- The `open` card's README row shows the path and runs `less`. In `browse`, a project's directory shows its card and its README
  the text; Enter on the README pages it.
- In the desktop's Terminal, `less` opens the README's window; any other file is printed, as `more` prints a file that fits. From `browse` in the Terminal a README or a file pages inside the window, so `q` comes back to `browse`.
- `/projects/<slug>` prerenders the session with `open <slug>` and `cat ~/projects/<folder>/<slug>/README` already run, each at
  its own prompt, scrolled to the `open` line. That is the text phones, crawlers and link previews read. The project's name is the page's `h1`, the
  README's headings its `h2` and `h3`.

## Keyboard and motion

- Everything works with no mouse: each app opens and closes from the keyboard, on the desktop and in the shell (`e2e/keyboard.spec.ts`).
- Every tab stop shows its focus, on keyboard focus only (`:focus-visible`): a 1px dashed ring in the phosphor on the desktop,
  dotted in the shell. The shell's input is the exception: its cursor shows any focus, a tap's too, solid when focused and hollow
  when not (`e2e/focus.spec.ts`).
- Under `prefers-reduced-motion` the boot screen doesn't wait, the typed login doesn't play and the flicker never runs
  (`e2e/motion.spec.ts`).

## Words

- Project facts come from the project's own repository: its README, or its code where the README is stale. Unknown is `-`.
  Placeholders say so (`hello@your-domain (placeholder)`).
- No taglines, jokes, invented numbers or statuses. System messages are plain: "Jelly-OS has shut down."
