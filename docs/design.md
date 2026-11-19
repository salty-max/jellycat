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
- Folder windows have an info line (item count, view) and show their items by icon or by name (View menu).
- Dialogs have a 3px double border and no title bar. The default button has a second outline.
- Selection: one click selects, a second click or a double click opens, Enter opens the focused icon.

## Shell

- Prompt `guest@jellycat:<path>$`, a block cursor (hollow when the shell isn't focused), a status bar in inverse video:
  `[jellycat] 0:jsh*` on the left, the path and the clock on the right.
- Every name in the output is clickable and runs the command it stands for, so the shell works without typing.
- Messages read like a Unix shell's (`jsh: foo: command not found`), never chatty.
- `browse` is full screen: two panes in double borders, titles set in the border, a key bar at the bottom. `q` returns to the
  prompt as it was.

## Words

- Project facts come from the project's own README. Unknown is `-`. Placeholders say so (`hello@your-domain (placeholder)`).
- No taglines, jokes, invented numbers or statuses. System messages are plain: "Sending is turned off in this mockup."
