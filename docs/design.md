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
- On a computer the screen has rounded corners, 22px as the mockups' frames (`Crt`), on the black of the page around it. On a phone
  there are none: the page is the screen, its background the tube's black (also where iOS overscrolls and under a short page), and
  its CRT layer is fixed over the viewport (see Phone). The text is never warped: curvature would take it out of the DOM.
- The layout is chosen by screen size: the desktop from 768px wide and 520px tall, the phone's page under that. Both are
  prerendered and the page's CSS shows one before any script; a screen without JavaScript gets the phone's page. While a text field
  has the focus (the Terminal's input) the layout holds, and a change waits for the blur and a second more, so a tablet whose
  browser shrinks the page for its keyboard never swaps the desktop out mid-line.

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
    pattern, Sound (a check item, see Sound), Restart and Shut Down... Window: the open windows in the order they opened, the front one checked.
  - A menu opens on a click and while one is open, hover moves between them; ↑ ↓ ← → move, Enter picks, Esc closes. A checked item has a
    6px square at its left.
  - Restart closes every window and shows the boot screen again; Shut Down... asks first (Cancel, Shut Down), then shows the shut-down
    screen, and a click restarts.
- The desktop is a 1px checker dither of the phosphor at 20% (a Control Panel setting turns it off). Icons stand in a column on
  the right; Trash at the bottom.
- The Control Panel window is 400×196: four rows on a two-column grid (an 84px dim label, then the controls), 32px apart: Phosphor
  (radios), Effects (Scanlines, Glow, Flicker), Desktop (Dither pattern) and Sound (one checkbox, `On`). Phosphor, Effects and Sound
  are the controls the phone's sheet shares (`app/os/controls/settings-controls.tsx`); the dither is the desktop's own.
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
  hidden from screen readers. The desktop's layer stays absolute inside the rounded `Crt`. While a dialog is open the page's layer
  goes, since the dialog brings its own: two would double the scanlines over the dimmed page.
- A column at most 640px wide, centred, with a 16px gutter: a phone sideways or a small tablet gets a centred column, and the header's
  content lines up with it.
- The header, on every page: the desktop's menu bar, sticky, 44px tall with a 1px rule under it. On the left the cat at 2× and
  `Jellycat Studio`, a link home; on the right the Control Panel's button (see Icons). Both are 44px targets.
- The home page: `Jellycat Studio` as the `h1` (40px), the studio Readme's line, and `contact.txt`'s two rows (Email, GitHub) as a
  dim label and an underlined link. Then the folders as tabs that jump to each (`Web 4`, `Addons 11`, `Engines 1`, `Tools 3`: a 36px
  framed link, the count dim; `Link to="#<folder>"`, so back after a tab works as after any move). Each folder is a section with an
  `h2` title bar in inverse video (the folder icon inverted, its name, `11 items` as the folder window's info line says it), 32px
  tall and sticky under the header while its projects scroll by, then the projects as cards in the data's order. Below the folders come
  the sections of `app/os/phone/home-sections.ts`, drawn the same way (a title bar in inverse video with its icon, then cards, without
  an item count): the Lab's is `Lab` (the flask inverted) with one card, `Gero Lab`, its kind line `gero-lab.vercel.app` (dim) and its
  line `Browser playground for the Gero VM.`, the first line of gero-lab's README. The card's name links to `https://gero-lab.vercel.app`
  in a new tab, as every https link does, its hit area the whole card. The Lab itself is the desktop's only. The section's icon is
  drawn at 32px as the folders' are; the phase 2 mockup draws the three at 16px, where `mockups/phosphor-phone.html` and the shipped
  folder bars have 32px.
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
  target). Under it the desktop Control Panel's Phosphor (Green, Amber, White), Effects (Scanlines, Glow, Flicker) and Sound (`On`) in 44px rows;
  the Dither pattern is left out, a phone has no desktop. It is a modal dialog: a 1-bit dither dims the page behind it, and a tap on
  that, Esc, Android's back gesture or the close box closes it; focus goes to the checked phosphor (a frame after it opens, once the
  radio group knows its radios, so the arrows move from the first press) and comes back to the header's button, iOS included,
  where a tap doesn't focus the button. It appears and goes at once, as a window does: no slide. The settings are the desktop's, so a choice holds on both.
- Pressed, a folder tab, a card, the back link, Previous and Next and the Control Panel's button are inverse video (the dim tone
  inside them turns with it); the other links and the pictures' buttons show nothing. Every tab stop shows its focus on keyboard
  focus only: the desktop's 1px dashed ring, 2px off its edge (a card's, 4px off, around the card). The phone's only text fields are
  the contact page's (see Contact).
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
  what shows. A tap on the screen focuses it. Tab completes a line being typed; on an
  empty line, and with Shift, it moves the focus as anywhere else, so the keyboard can always leave the prompt. ↑ ↓ walk the
  history, Ctrl-C abandons the line (`^C`), Ctrl-L clears the log and Ctrl-U the line.
- Every name in the output is clickable and runs the command it stands for, so the shell works without typing. A project's name
  (in `ls` and `tree`) opens it; a README's name pages it. A command is a `<button>`, a project's name an `<a href="/projects/<slug>">`;
  pressing one keeps the focus where it was. An address (https, the e-mail) and a link in a README's text are underlined; a name
  in a listing and a command aren't. Hover is inverse video.
- The output is `role="log"`. The first paint is the welcome and the prompt; the typed login (banner, `jellycat login: guest`, last
  login, welcome) plays on `logout` and `exit` only, and any key or click skips it, as does `prefers-reduced-motion`.
- `gero` opens the Lab and prints `opened Lab`; `gero run <program>` opens it on that program and runs it (a run still going is
  ended first, as Run does); `gero help` lists the programs, each a name that runs it. A name the Lab doesn't have is
  `gero: no program named <name>`, and the programs' names (fetched the first time `gero` is typed) complete with Tab. A shell
  with no Lab to open (Storybook, the tests) says `gero: the Lab is not available here`.
- The shell fills its box, the Terminal window on the desktop. The host plugs in through props: `onOpenProject`, `onPage`, `onView`,
  `onOpenLab`, `onLabPrograms` and a full-screen slot for `browse`; without one it shows a placeholder that says so. A full-screen view gets every key typed, none reaching the prompt behind it.
- The status bar's clock is client-only: it is not in the markup the server renders.
- Messages read like a Unix shell's (`jsh: foo: command not found`), never chatty.
- `browse` is full screen: two panes in double borders, titles set in the border, a key bar at the bottom. It opens in the
  directory the prompt was in, and the status bar shows the directory it is in (the slot's `setPath`) until it closes. Enter on a
  README or a file pages it; `q` there comes back to `browse`, and `q` in `browse` returns to the prompt as it was.

## Viewer

- A project's screenshots open in a viewer: a window on the desktop, a full-screen dialog on a phone (below).
- The picture is shown whole, scaled to fit, in its own colours, with the CRT layer on top. Desktop-sized and phone-sized pictures
  share one window, which keeps its size from one picture to the next. The picture box is fixed, so the buttons stay put.
- The count (`2 of 3`) is in the window's info line. The caption is the picture's alt text, kept to two lines.
- Previous and next are buttons with pixel arrows; ← and → work too. At the first or last picture the control is dim. Esc closes
  the window.
- In the desktop's Terminal, `view <project>` opens the viewer's window and prints `opened <Name> Screenshots`.
- The phone's viewer (`app/os/phone/viewer-dialog.tsx`) is a native modal `<dialog>` that fills the screen, labelled `<Name> screenshots`
  and opened on the picture that was tapped. The pane is a 4px double border with the name set in its top edge on the left and the
  count (`2 of 3`, a polite status) on the right; the picture is shown whole inside it with its caption (the alt text, hidden from
  screen readers, who have it on the picture) right under it. Under the pane, three 44px buttons in a row: Previous and Next with pixel
  arrows, dim (`aria-disabled`, so the focus stays on the button pressed) at the ends, and Close, which has the focus when it opens.
  ← and → work from anywhere in the dialog; a swipe of 40px or more, further across than down, on the picture steps (the box is
  `touch-action: pan-y pinch-zoom`, so a vertical pan and a pinch stay the browser's). Esc, Android's back gesture and Close return to
  the page, with the focus back on the picture that opened it. Back in the browser leaves the page, and the viewer with it. It
  appears and goes at once.
- The phone's dialogs (the viewer and the Control Panel's sheet) share one component, `app/os/phone/dialog.tsx`: `showModal()` on
  mount gives the top layer, the focus trap, the inert page behind, Esc and the back gesture; the page's scroll is locked while one is
  open (`overscroll-behavior: contain` on the dialog keeps iOS from scrolling the page behind it); each carries its own CRT layer
  (`crt-overlay`, `crt-flicker`, over the whole screen, taking no clicks, hidden from screen readers), since the page's layer sits below
  the top layer. The sheet's window is docked inside a full-screen dialog
  (8px from the screen's edges, at most 640px wide, the window's 1px frame and its hard 3px shadow in the dim tone); the dialog's
  background is a 1-bit dither of the tube's black at 72% (a 2px checkerboard), which dims the page behind it. Its title bar is 32px in
  inverse video, with the close box on the right, the desktop's glyph in a 22px dark square inside a 44x32 target. Under it the
  Phosphor, Effects and Sound settings the desktop's Control Panel has, in rows 44px tall with 16px boxes. The viewer and the sheet
  click as they open and as they go (see Sound).
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
- Phone: the project's page shows it in the shell's double-bordered pane (see Phone); a link to another project moves to its page.
- `/projects/<slug>` prerenders the phone's page: the project's facts as a list and the README in the pane, with the desktop's boot
  screen beside it. That is the text phones, crawlers and link previews read. The project's name is the page's `h1`, the README's
  title its `h2` and its headings `h3`.

## Sound

- A few system sounds, generated in the browser with Web Audio (`app/os/sound/`): square and triangle oscillators through short gain
  envelopes, one fixed, moderate level. No audio file, no sample, nothing fetched, no `AudioWorklet`; nothing taken from another
  system's sounds. The cues are data (`cues.ts`) and the synth that plays them a chunk of its own, fetched once sound is on.
- Off by default, saved with the other settings (`sound` in the settings store; no `<html>` attribute, since nothing about it shows at
  first paint). It is switched on in the Control Panel and the phone's sheet (a Sound row, one checkbox `On`) and in Special's `Sound`.
- The cues, each doubling something on screen, so a sound never carries meaning alone:
  - the alert's beep when About or Shut Down... appears;
  - a short high click when a window opens, a lower one when one closes, only when a click or a key came half a second before (the
    browser's Back between two projects is silent; one click that swaps a project's Info window for another's usually clicks twice); none for
    the window the desktop opens by itself at start, nor for the windows Restart and Shut Down clear, which have their own tone;
  - a rising tone on Restart, from the menu or from the shut-down screen's click, a falling one on Shut Down;
  - on the phone, the high click when the viewer or the sheet opens and the lower one when it goes (not when a turned phone swaps
    the layout under it);
  - turning Sound on plays the high click.
- Never autoplaying. The `AudioContext` is made by a click or a key and by nothing else: by the click that turns sound on, or by the
  first click or key after a reload with sound saved on (a finger going down, which may be a scroll, and Esc don't count: they
  don't activate the page for the browser). Until then the page is silent, and nothing a page does by itself (a window
  opened by its address, say) makes one. It is kept, and suspended when sound goes off. Where Safari has `navigator.audioSession`, its
  type is `ambient`: the ring/silent switch mutes the page and its sound never stops the visitor's music.
- Reduced motion doesn't touch it: a sound is not motion.

## Lab

Gero's programs run in the browser (`mockups/phase-2.html`, `#d-lab`; the decisions are in `docs/phase-2.md`). A desktop window
only: it has no address and no phone version, where the home page has one card to Gero Lab (see Phone). Its code is `app/os/lab/`,
a chunk of the desktop's loaded when the window first opens; the module it runs, `gero.wasm`, loads on the first Run (`app/lab/`).

- The icon is a flask (the 16×16 grid the mockup draws), in the icon column under Terminal, and `Lab` in Jelly HD is an
  Application. One window, 532×432, titled `Lab`; opening it again brings it to the front.
- The info line holds the file the editor shows (`fizzbuzz.gr`, or `-` until the programs have come) on the left and
  `gero 0.5.5` on the right. Under it, in the body's 10px padding and 8px gaps: a row, the editor, `Output` with the run's state, and the
  output pane, 121px tall.
- The row: the picker (a button with the program's file, or its name when it is several files (`banks`), and a pixel arrow, 150px wide at least), then Reset and Run, the default
  button. The picker opens a menu drawn as the menu bar's drops: Gero's seven programs, a dashed separator, the five in assembly,
  the open one marked with the 6px square; ↑ ↓ Enter Esc. Picking one shows its text and clears the last run. The Terminal's `gero run <program>` does the same and then runs it, with the program's edit if there is one; the window opens on that program instead of `fizzbuzz`, and a run still going is ended first. Run becomes Stop while the
  program runs, and keeps the focus; Reset puts the program's own text back and clears the output and the state.
- The editor is a `textarea`, the window's 18px VT323, no wrapping, with the 1-bit scroll bars both ways (the Readme's, and a
  box where they meet), labelled `Program`. Spelling, correction and capitals are off. Tab leaves it, so the keyboard can always get out;
  Ctrl+Enter (⌘+Enter) runs from it; Enter on the window itself runs, since the window has the focus when it opens (opened by `gero run`, the focus is on Stop while it runs). An edit lasts while
  the window is open, for each program, whatever page the desktop moves to; nothing is stored.
- The output pane is a `log` that keeps its end in view, its text bottom-aligned while it fits, with the same scroll bars once it
  doesn't. It is not announced as it fills (`aria-live="off"`). The state at the right of `Output` is a polite `status` that is read
  once the run has ended (`halted, 1076 steps`, `stopped after 10000000 steps`, `faulted at $0123`, `build failed`, `gero.wasm stopped`,
  `could not load gero.wasm`, `could not load the programs`); while it loads or runs it is drawn only.
- A build that fails prints its diagnostics in the pane as `gero check` words them: `error: <message> [<code>]`, then
  `  --> <file>:<line>:<column>`. A fetch that failed is tried again by the next Run. The window's own code, if its download fails, leaves one line in it,
  `could not load the Lab`, and the next window to open tries again.
- Differences from the mockup, which is a static frame: the editor opens at its first line, where the mockup shows it scrolled; the
  output pane scrolls, where the mockup clips its overflow; before the programs arrive the picker and the info line say `-` and the
  editor is empty and read-only.

## Link previews

What a chat or a feed shows when the site's address is shared: one image a page, 1200x630 (the size Open Graph and X's
`summary_large_image` both take), drawn at build by `scripts/og.ts` from `app/core/pages.ts` (`mockups/phase-2.html`, `#og-hundo` and
`#og-home`). The image is text drawn as paths, so it follows the type and colour rules above, with these differences: it is always
the default screen, since a preview has no settings.

- The tube's black, the green phosphor and its dim tone (`#031208`, `#33ff66`, `#1a9c40`, as `app/app.css` has them), VT323 at 48px
  on 1.15 lines, and the glow, `0 0 4px` in the dim tone (the desktop's is `0 0 2px`: a preview is shown small).
- Scanlines baked in at twice the screen's pitch, 2px of black at 28% every 6px, so a preview shown at half size still has them. No
  vignette: it darkens the corners a small preview crops. No rounded corners.
- A title bar 80px tall with the cat (the title bar's own grid at 3x) and `Jellycat Studio`, over a 2px rule. Under it, at 56px
  from the edges: the page's name at 128px, shrunk to fit one line when it is longer than 21 characters; its kind dim under it
  (a project's; a page that is no project has none); its description in up to three lines of 56 characters, broken at spaces and
  after a hyphen before a letter as a browser does, the last cut with `...`. The home page has the studio's line, in up to two
  lines, and the four folders as framed tabs with their counts, as the phone's home shows them, in place of a kind.
- At the bottom, 40px from the edge and 40px type, dim: the address (`jellycat.fr/projects/hundo`) on the left and `Jelly-OS 1.0`
  on the right.
- PNG with a 16-colour palette, under 60 KB each (the largest is about 38 KB): one phosphor and its glow need no more, and the
  text stays sharp. Words come from the data, never from the drawing code, and a character VT323 lacks stops the build.

## Contact

The contact form (`app/os/contact/`): one component, two looks (`data-look`), from `mockups/phase-2.html` (`#d-contact`, `#p-contact`).
Its words are the project's: the notice is `app/core/privacy.ts`'s, the user's approved text, rendered and never reworded; the
rest is below.

- Fields: Name (up to 100), Email (`type="email"`, up to 254) and Message (up to 5,000), all required, each with a visible label, the
  limits from `app/core/contact.ts` (which the function checks again). The browser's own validation comes first.
- A honeypot, `jc_trap`: an input off screen (`left: -10000px`), `tabindex="-1"`, `autocomplete="off"`, its wrapper
  `aria-hidden`. The form sends it as it is (empty from a visitor) with `elapsed`, the milliseconds since it opened.
- The state is a polite `status` that exists from the first render, beside Send on the desktop and under it on the phone:
  `Sending...` (Send is `aria-disabled`, a second press does nothing), `Message sent.` (the fields empty), `Could not send the message.
  Try again.` (the form went under two seconds after it opened; the text stays) and `Could not send the message. Write to
  max@jellycat.fr.` with the address a link, for every other failure: a function that isn't configured, a provider that refused,
  a network that dropped, an answer the form doesn't know. A success needs both the 200 and `{ ok: true }`.
- A field the function refuses (`400 invalid`, with `fields`) gets `aria-invalid`, a mark of its own (a second 1px frame inside
  its border: no other colour exists), and its message under it, linked with `aria-describedby`: `Enter a name.`, `Enter a valid
  email address.`, `Enter a message.` The focus goes to the first, in the form's order; editing a field takes its mark away.
- The notice sits under the fields in the dim tone, each of its two lines a paragraph with 8px between, the address a link.
  It is a `section` labelled `Privacy notice`.
- The form needs script (it posts with `fetch`): Send is disabled until the first effect has run, so a native submit never puts a
  message in the address; without script the address is on the page as a link (the phone's rows, the Readme). While a send is on
  its way the fields are read-only.
- Nothing is stored: the fields live in the component, so they stay while the window is open (a move to another address closes
  only Info windows) and go with it.

**Desktop.** A `Contact` icon (a 1-bit envelope, `mail`) under Lab in the icon column and in Jelly HD, and the address
`/contact`, which opens the window over Projects as a project's address opens its Info window; closing the window the address
names goes back to `/`, a window opened from its icon leaves the address as it is. The window is 380x370, the body's 10px padding
around: `To` and `max@jellycat.fr` (text, not a field), Name, Email and Message on a grid of a 64px dim label and the control (24px
fields, Message 104px, 8px apart, a field's message in the control's column), the notice in a box at most 80px tall that scrolls
with the 1-bit scroll bar (a tab stop, so a keyboard can scroll it), and Send, the default button, at the bottom right with the state
at its left. When the messages or a wrapped state outgrow the window the notice gives way (24px at least), then the form scrolls.
The focus goes to Name when the window opens, which shows the 1px dashed ring a text field always shows (the mockup has none), and
Enter in Name or Email sends (in Message it adds a line).

**Phone.** The `/contact` page: `Contact` as the `h1`, the Email and GitHub rows 14px under it as the home page lists them, then the
form: each label above its field (a 14px step between), fields 44px tall at 20px with a 1px frame and 8px 10px of padding (iOS zooms
into less than 16px), Message six lines (160px), the line `A message from this page goes by email to max@jellycat.fr.` (dim), the
notice, Send the column's width less its shadow (56px tall, 1px frame, the hard 3px shadow in the dim tone, inverse video while pressed)
and the state under it (24px tall at least, so the page doesn't jump). The home page ends with a Contact section: a title bar like a
folder's with the envelope inverted, one card (`Contact`, `Email`, the line) linking to `/contact`. `/contact` is prerendered, in the
sitemap and has a preview image like every page.

## Keyboard and motion

- Everything works with no mouse: each app opens and closes from the keyboard on the desktop, its Terminal and the Lab included (the Lab's
  picker, Enter and Ctrl+Enter run), and on the
  phone a project, the viewer and the sheet do too, Esc closing a dialog (`e2e/keyboard.spec.ts`).
- Every tab stop shows its focus, on keyboard focus only (`:focus-visible`): a 1px dashed ring in the phosphor on the desktop,
  dotted in the shell, dashed on the phone. The shell's input is the exception: its cursor shows any focus, a tap's too, solid when focused and hollow
  when not (`e2e/focus.spec.ts`).
- Under `prefers-reduced-motion` the boot screen doesn't wait, the typed login doesn't play and the flicker never runs
  (`e2e/motion.spec.ts`).

## Words

- Project facts come from the project's own repository: its README, or its code where the README is stale. Unknown is `-`.
  Placeholders say so (`hello@your-domain (placeholder)`).
- No taglines, jokes, invented numbers or statuses. System messages are plain: "Jelly-OS has shut down."
