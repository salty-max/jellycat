# Phones: a page instead of the shell

On a phone, Jelly-OS stops being a shell and becomes a scrolling site in the same phosphor: a header, the studio and its
contact, the projects by folder as cards, a page per project with its facts, its screenshots and its README. The desktop
doesn't change, and the shell stays as its Terminal app. The user asked for it on 21 Nov 2026 ("let's drop the shell for the
mobile version and do a more classic layout for mobiles") and picked the phosphor look for it.

This is the plan, written before any code. The mockup is [`mockups/phosphor-phone.html`](../mockups/phosphor-phone.html):
the home, three project pages (Hundo, Gero, Keyring), the viewer, the Control Panel's sheet, the three phosphors, and three
frame sizes. Every word in it
comes from `app/core/` and `app/content/readme/` (a script copied them in), and the pictures load from `public/screenshots/` when
the file is opened from the repo. The user approved it on 21 Nov 2026, with the [answers](#the-users-answers) at the end.
Once it lands, the decisions move into [plan.md](plan.md) and [design.md](design.md), and this file stays as the record,
as [phase-1.md](phase-1.md) does.

## What breaks today

Seen on the production build at Pixel 7 size (412x839) in Chrome, with the keyboard emulated two ways, since Playwright can't
raise a real one. The keyboard is taken as 330px tall (an estimate of Gboard there). The probe's shots (named below) were in
`.cache/phone/probe/` while this was planned and are not in the repo; the numbers here are what they showed.

- **The field you type into isn't the line you see.** The shell's input is a clear 1px box pinned to the screen's bottom edge
  (y 838); the prompt you read is wherever the log ends: y 110 on a fresh home page. Chrome on Android (since 108) and Safari on
  iOS don't shrink the page for the keyboard: they cover its bottom and pan the view to the focused field. The pan goes to the
  1px box, so the view shows the empty bottom of the log and the status bar, and the prompt is pushed off the top: you type
  blind (`03b-visual-panned.png`, the pan emulated). On a project page the prompt starts more than 2,000px down the log, out of
  view until the first key.
- **Where the browser shrinks the page instead** (a viewport meta with `resizes-content`, older Android browsers), the shell
  fits and works: 20 lines above the keyboard, text typed as a phone types it (inserted without key events) runs on Enter. Turned
  sideways, 6 lines are left (`11-landscape-content.png`).
- **A phone keyboard has no Tab, no arrows and no Ctrl**, so completion, history, `^C` and the pager's keys are out of reach. The
  names in the output and the key bar's buttons are what work; typing is the part a phone does worst.
- Not reproduced: Safari on an iPhone (WebKit, not Chrome) and a real Android keyboard, and so which way each pans. The probe that
  settles it: the user's phone on remote debugging (`chrome://inspect`, or Safari's Web Inspector), reading
  `visualViewport.offsetTop` and the prompt's box after a tap.

**On a computer** none of this applies: a hardware keyboard covers nothing. One case touches the desktop: a touch screen at least
768x520 (a tablet sideways) whose browser shrinks the page for its keyboard. Typing in the Terminal takes the page under 520px
tall, the layout swaps, and the Terminal, its windows and the line being typed are gone (`12-tablet-keyboard.png`, emulated).
[The breakpoint](#the-breakpoint) fixes that too.

## What replaces the shell, page by page

The phone layout is a page that scrolls like any site: the document scrolls, not a box inside the screen, so the browser's bars
hide on scroll, the back button restores the position, and nothing on it needs a keyboard. Text 20px on 24px lines, as the shell.

- **Header**, on every page: the desktop's menu bar, sticky, 44px tall. On the left the cat at 2x and `Jellycat Studio`, a link
  home; on the right the Control Panel's icon (the desktop's, at 2x) as a 44px button named Control Panel, the one icon on the
  phone with no label beside it. Pressed, and while its sheet is open, it is inverse video.
- **Home** (`/`):
  - `Jellycat Studio` as the `h1` (40px), the studio Readme's line (`Web apps, World of Warcraft addons, engines and tools.`),
    then `contact.txt`'s two rows (Email, GitHub) as label and link.
  - The four folders as tabs that jump to each: `Web 4`, `Addons 11`, `Engines 1`, `Tools 3`. Each is a `<Link to="#web">`, so
    the router owns the history entry and back after a tab works as after any move.
  - Each folder: a title bar in inverse video (the folder icon, its name, `11 items` as the folder window's info line says it),
    sticky under the header while its projects scroll by. Then its projects as cards in the data's order.
  - A card is a window's frame (1px, the hard 3px shadow in the dim tone): the name (24px) with a pixel arrow, the kind (dim),
    the description, and `3 pictures` (dim) when it has some. The name is the card's one link; its hit area is the whole card.
    Pressed, the card turns to inverse video.
- **A project** (`/projects/<slug>`):
  - `< Web`, a link back to the home page at that folder (`/#web`). Then the name as the `h1`, the kind (dim) and the description.
  - Stack, Link, Source as the Info window lists them, between two rules; an unknown Link or Source is `-`.
  - Screenshots, when it has some: a heading with the count, then the pictures in their own colours, each in a 1px frame with its
    alt text as the caption. A desktop picture takes the column's width, a phone picture half of it. A tap opens the viewer.
  - The README in the shell's double-bordered pane, its path set in the top border (`~/projects/web/hundo/README`), drawn as
    everywhere: the marks (`#`, `##`, `-`, backticks) dim, by CSS. A link to another project moves to its page in the browser.
    The text is the route loader's `blocks`, prerendered at build; on a move in the browser `clientLoader` loads the chunk,
    and when that fails (`blocks: null`) the pane says `README: could not be loaded`, as the shell does.
  - Previous and Next, the neighbouring projects in the data's order, as two framed buttons.
- **The viewer**: full screen, a modal dialog. The name and the count (`2 of 3`) set in the double border, the picture whole with
  its caption right under it, and three buttons: Previous and Next with pixel arrows (dim at the ends), Close. A swipe, ← and →
  move; Esc or Close returns to the page and to the picture that opened it. `showModal()` gives the focus trap, Esc, Android's
  back gesture and the inert page behind it; `overscroll-behavior: contain` keeps iOS from scrolling the page behind it, and
  `touch-action: pan-y` on the picture lets a sideways swipe reach the viewer. The viewer and the sheet share one dialog
  component: `showModal()` on mount, the CRT layer inside it (the existing `crt-overlay` and `crt-flicker` utilities, absolute
  in the dialog), the scroll lock, the focus back on close.
- **The Control Panel's sheet**: a window docked at the bottom of the screen, 8px from its edges (at most 640px wide), with the
  window's 1px frame and hard shadow and its title bar in inverse video: `Control Panel` and a close box (the desktop's glyph
  in a dark square, a 44x32 target). Under it the desktop Control Panel's Phosphor (Green, Amber, White) and Effects (Scanlines,
  Glow, Flicker), each a 44px row; the desktop's Dither pattern is left out, a phone has no desktop. A modal dialog: the page
  behind is dimmed by a 1-bit dither in the backdrop, a tap on it, Esc, Android's back gesture or the close box closes it, the
  focus goes to the checked phosphor and comes back to the header's button. It appears and goes at once, as a window does: no
  slide. The settings store and the head script are the desktop's, so a choice holds on both.
- **Footer**, on every page: `Jelly-OS 1.0` in the dim tone, under a rule.
- **Not found** keeps its one screen.
- Under the breakpoint the page's own background is the tube's black (`--phosphor-bg`), not the `#000` the body has around
  the desktop's rounded screen, so iOS's overscroll and the end of a short page stay in the phosphor.
- On a screen wider than the phone (a phone sideways, a small tablet) the column stops at 640px and centres; the header's
  content lines up with it.

## The prerendered HTML

Every page prerenders the phone layout and the desktop's boot screen, where today it prerenders the shell's session and the
boot screen. The phone layout is real HTML: one `h1`, an `h2` per folder, lists of cards, links to every project, the facts as a
`dl`, the README in headings, paragraphs and lists. Google indexes the phone rendering, and a crawler, a link preview or a phone
without JavaScript now reads a page instead of a terminal's log. The meta tags don't change.

The desktop still mounts without a flash or a shift, by the mechanism D1b built:

- The server snapshot is `data-layout="unknown"`; `LAYOUT_CSS` shows `[data-os="phone"]` under the breakpoint and
  `[data-os="boot"]` above it, from the first paint, before any script.
- The height stays on `<main>`, but by CSS: `LAYOUT_CSS` sets `main[data-layout="unknown"]` to `100dvh` above the breakpoint and
  leaves it to its content below, and once hydrated `<main>` is `h-dvh` for every layout but the phone's (boot, desktop, the
  shut-down screen). On a wide screen the phone layout is `display: none` from the first byte, so the page is one screen and
  nothing shifts when the desktop replaces the boot screen.
- The phone layout sits outside `Crt`. `Crt`'s `overflow: hidden` makes it a scroll container, and a sticky element sticks to
  its nearest one: inside `Crt`, which grows with the page and never scrolls, the header and the folder bars would scroll away.
  So the phone layout carries its own glow and its own fixed CRT layer, and `Crt` stays as it is for the boot screen and the
  desktop.
- Hydration renders the same markup on both sides: nothing in the phone layout reads the screen, the clock or the date. A phone
  keeps its markup (`unknown` becomes `phone`, the boot screen's wrapper goes); a wide screen boots as now. The
  sheet opens only after hydration, by which time the settings store has read the saved ones, so its radios match the screen,
  whose colour is right from the first paint (the head script).
- A wide screen without JavaScript shows the boot screen forever today. A `<noscript><style>` can show the phone layout there
  instead, centred. Inline styles are already allowed, so the CSP doesn't change.
- `Shell` leaves `layout.tsx`'s imports, so its code (10.7 kB gzipped in today's build, on every page) moves into the desktop's
  chunk with the Terminal. A phone downloads neither.

## The breakpoint

`DESKTOP_QUERY` stays `(min-width: 768px) and (min-height: 520px)`. Where screens fall:

- A phone upright (412x839) and sideways (863x360): the page. Sideways, the column centres.
- A small tablet upright (an iPad mini, 744 wide): the page; sideways (1133x744): the desktop.
- A tablet (820x1180 and up): the desktop either way. A desktop window under 768 wide or 520 tall: the page.

Two guards against the keyboard swap on tablets:

- The layout holds while a text field has the focus, and a change waits for the blur. The hold lives in `getSnapshot`, not in
  `subscribe`: React reads the snapshot on every render, and today's reads `matchMedia` live, so any render while typing (an
  `open` in the Terminal changes the address) would swap the layout anyway. A cached value updates only while no text field has
  the focus, and `subscribe` also listens for `focusout` to deliver a change that waited.
- `interactive-widget=resizes-visual` in the viewport meta says the same to browsers that read it. Chrome on Android already
  defaults to it and Safari ignores it, so it documents the intent; the hold is the guard.

Neither is verified on a real tablet; the e2e test emulates it (shrink the window under 520 while the Terminal has the focus).
The desktop by touch is not verified either: taps select and open icons, but a window's drag may lose its touch to the
browser's pan. The user chose size over a mouse-only rule ([the answers](#the-users-answers)).

## What stays

- The shell, `app/core/shell.ts`, completion and history, as the desktop's Terminal app: `browse` full screen inside the
  window, its pager and its key bar, `less` opening a Readme window, `view` opening the viewer's window.
- The input's 16px and the focus-on-mount check for a fine pointer: a touch tablet gets the desktop, so the Terminal can still
  meet an on-screen keyboard.
- The README renderer. Its pure part (`ReadmeBlocks`, its inlines, its CSS) moves out of `app/os/shell/output.tsx` into
  `app/os/readme/`. Its link to another project stops calling the shell's `run` itself and takes the action from its host: the
  shell and the desktop's Readme window keep `open <slug>` (the window parses it today), the phone page passes the router's
  `navigate`. `Readme`, the wrapper that reads the shell's context, waits for the chunk and says when it failed, stays in
  `output.tsx` for the Terminal, `browse`, the pager and the Readme window. The `sh-lk` and `sh-md` classes and the kept focus
  are the shell's; the phone page brings its own.
- `Picture` and `usePictures`, which the phone's pages and viewer reuse; `Picture` gains a `loading` prop (lazy by default) for
  the page's first picture. The desktop's viewer window.
- The routes, their loaders, the URL that follows the project, the prerender list, `buildEnd`, the CSP step.

## What goes or moves

- The phone's shell: the `Shell` branch of `OsLayout`, `initialCommand` and `readmes` (the session prerendered on a project
  page, the deep link's README handed to `cat`), the scroll anchored on the `open` line, the card's `h1`.
- The phone's full-screen `view`: the Terminal always takes `view` itself, so `ViewerView`, the `view` kind of the full-screen
  slot and their stories and tests go. The phone's viewer is the new dialog.
- The phone's `browse`: it stays in the Terminal only. Its e2e test moves to the desktop project.
- The key bar: none on the phone. It stays under `browse` and the pager in the Terminal.
- The phone's boot and login: there was no boot on a phone, and the typed login plays on `logout` and `exit` only, now in the
  Terminal only.

## The screenshots on a phone

- `<picture>` as now: AVIF, else WebP, with `width` and `height`, so nothing jumps. The files are 28 to 56 kB as AVIF at
  1440x900 and 780x1688, small enough for a phone without a second size; a `srcset` waits until Lighthouse asks.
- Lazy loaded, except the first picture of a page, which may be in the first screen: Lighthouse flags a lazy LCP image, so it
  loads eagerly (and with `fetchpriority="high"` if it turns out to be the LCP).
- The pictures stay in their colours with the CRT layer over them, as on the desktop. A modal `<dialog>` sits in the top layer,
  above any `z-index`, so the viewer and the sheet each carry their own copy of the CRT layer inside them. (The desktop's alerts
  are Base UI dialogs portaled inside the tube instead; the phone takes the native dialog for Android's back gesture.)

## The CRT layer on a phone

- On a phone the layer is `position: fixed` over the viewport (scanlines, vignette, flicker), `pointer-events: none` and
  `aria-hidden`, so the page scrolls under it. Only on a phone: the desktop's stays absolute inside the rounded `Crt`, since a
  fixed child escapes the rounded clip and would draw scanlines over the black corners. On a phone it has no rounded corners:
  the screen has its own, and the browser's bar sits above it. It takes `100lvh`, so it still covers while iOS hides its toolbar.
- Its cost: one static layer the size of the screen (about 1080x2400 device pixels on a Pixel 7), composited on each frame of a
  scroll and never repainted. The glow is the dearer part: a `text-shadow` on all the text, paid each time a new stretch of a
  long README is drawn. Flicker is an opacity animation, off by default, never under reduced motion.
- Measured, not guessed: a Performance trace of a scroll down the longest README on Chrome's 4x CPU slowdown, and Lighthouse's
  mobile preset (4x slowdown, slow 4G). If frames drop, the fix is in that order: `contain: paint` on the cards and the README,
  then the glow off by default on a phone.
- Scanlines are 1px lines every 3px; at a phone's fractional pixel ratio they can beat into bands. A look on a real phone.

## Accessibility, keyboard and reduced motion

- Landmarks: the header (`banner`), `main`, the footer (`contentinfo`); a `nav` for the folder tabs and one for Previous and
  Next. One `h1` a page; an `h2` per folder and for Screenshots; the README's own title `h2`, its headings `h3`; the sheet's title an
  `h2` inside its dialog.
- A card is one link, named by the project alone; the description is text outside it. The README's pane is a section labelled
  README; its border title is hidden from screen readers.
- Every tab stop shows its focus on keyboard focus only: the desktop's 1px dashed ring (a card shows it around the card). Taps
  never focus a text field: the phone layout has none.
- The viewer and the sheet are modal dialogs, the viewer labelled with the project, the sheet by its title: focus goes in, Tab
  stays in, Esc closes, and the focus goes back to what opened it. The header's button says it opens a dialog
  (`aria-haspopup="dialog"`) and whether it is open (`aria-expanded`).
- The sheet's radios and checkboxes are the desktop Control Panel's (Base UI), in a radio group and a group each labelled by
  its dim label, with 44px rows.
- Reduced motion: no flicker. There is no smooth scrolling at all: on the root it would also animate each page change's jump to
  the top. The phone has no other motion.
- The text stays in the DOM, the marks are CSS with empty alt text, the CRT layer takes no clicks. The page can be zoomed.

## Lighthouse

The phone preset (`lighthouserc.json`, `/` and `/projects/hundo`) stays the gate: 100 in accessibility, best practices and SEO,
0.9 in performance; the desktop preset too. The phone pages should be lighter than today: no shell code, no long log, the same
font preload. What to watch: the LCP on `/projects/hundo` (the first picture or the `h1`), `target-size` on the header's button and the
facts' links (Lighthouse loads the page with the sheet closed), and a hydration warning from anything that reads the screen.

## The e2e phone project

The Pixel 7 project stays. Its tests change spec by spec:

- `layout`: the phone gets the page and asks for neither the desktop's chunk nor the shell's; before scripts, the CSS shows the
  page on a phone and the boot screen on a computer; crossing the breakpoint swaps; the keyboard guard (desktop project: the
  Terminal focused, the window shrunk under 520, the desktop stays; on blur it swaps).
- `smoke`, `pages`: the home page's `h1`, folders and cards; every project page's `h1`, facts and README headings; a card, the
  back link to its folder, Previous and Next; back after a folder tab; the header and a folder bar still at the top after a
  scroll.
- `aria`: the phone's home and project page trees replace the shell's.
- `axe`, `csp`: the same pages, the layout's name changes.
- `focus`, `keyboard`: on the phone, every tab stop shows the ring; a project, the viewer and the sheet (open, change the
  phosphor and an effect, close, the focus back on the button) all work with no pointer.
- `look`: a phosphor and an effect chosen in the sheet hold after a reload, on the phone and then on the desktop.
- `motion`: under reduced motion, no flicker.
- `viewer`: the phone's dialog (open from a picture, the buttons, ← →, a swipe, Esc and Close, the focus back, the CRT layer over
  it). The desktop half doesn't change.
- `browse`: moves to the desktop project, in the Terminal's window.

## Which docs change

- `plan.md`: the opening paragraph and the mockups' line (`phosphor-phone.html` joins the reference); "Desktop on computers,
  shell on phones" becomes "desktop on computers, a page on phones"; "Pages are shell-first" becomes "pages are page-first"
  (every page prerenders the phone layout and the boot screen); the screenshots decision names the phone's viewer.
- `design.md`: a new **Phone** section (from this plan and the mockup, the sheet included); **Screen** (the fixed layer, no
  corners on a phone); **Shell** (the Terminal's only: the phone lines go); **Viewer** (the phone's dialog replaces `view` full
  screen); **Readme** (`/projects/<slug>` prerenders the phone page; the phone's pane); **Keyboard and motion** (the shell on a
  phone becomes the Terminal); **Icons** (the header's Control Panel button, the one icon with no label beside it).
- `CLAUDE.md`'s first line: "a desktop on computers and a page in the same phosphor on phones".
- `README.md`: the first line, `os/layout.tsx`'s description, `os/phone/`, and `browse` tested in the Terminal.
- `phase-1.md` is a record and stays.

## The tasks

Each is one child in its own worktree, one reviewed commit or a short series, `pnpm check` and `pnpm e2e` through the harness,
and a look in Chrome at 1:1 against the mockup: `node scripts/look.mjs --mockup phosphor-phone.html --selector "#ph" --size
412x839`, with `--mockup-run "go('/projects/hundo')"` or `"openPanel()"` for the other screens. Its mockups server serves
`mockups/` alone, so the mockup's pictures show their placeholder there: compare the pictures against the mockup opened as a
file from the repo, where they load.

1. **P1 The phone pages, unwired.** Code; the default model at high effort (a precise mockup to match, at 1:1).
   - `app/os/phone/`: the header (its Control Panel button takes `onOpenPanel()` and opens nothing yet), the home, the project
     page (`blocks: readonly Block[] | null` and `onOpenPicture(index)`, no viewer yet), the card, the pictures, the footer,
     the page's fixed CRT layer, `phone.css`.
   - The README renderer's pure part moved to `app/os/readme/`, its project link taking the action from its host;
     `app/os/shell/output.tsx` imports it back for `Readme`, and the shell and the Readme window pass `open <slug>`.
   - `app/os/viewer/picture.tsx`: the `loading` prop.
   - Stories under each phosphor, unit tests. `design.md`: the opening line (the phone mockup joins the two), the whole Phone
     section, the sheet included, and the Icons line on the header's button.
   - Nothing on the site changes yet.
2. **P2 The phone's dialogs**, at the same time as P1. Code; the default model at high effort (focus, Esc, the top layer).
   - `app/os/phone/dialog.tsx`: the native `<dialog>` both share (`showModal()` on mount, the CRT layer inside it, the scroll lock,
     `overscroll-behavior: contain`, the focus back on close, Esc and Android's back through `cancel`).
   - `app/os/phone/viewer-dialog.tsx`: `PhoneViewer({ slug, start, onClose })`, the buttons, ← →, the swipe.
   - `app/os/phone/control-panel-sheet.tsx`: `ControlPanelSheet({ onClose })`, the docked window, the backdrop's dither, the
     close box. Its Phosphor and Effects controls come out of `app/os/desktop/apps/control-panel.tsx` into a module both use, so
     the desktop's Control Panel keeps the same controls and adds its Dither pattern.
   - `app/os/phone/dialogs.css`, stories under each phosphor, unit tests; `design.md`'s Viewer section.
   - What keeps P1 and P2 apart: P1 owns `phone.css`, `picture.tsx`, the page's CRT layer and design.md's opening line, Phone
     and Icons; P2 owns `dialogs.css`, `control-panel.tsx` and design.md's Viewer, uses `Picture` as it is and the existing
     `crt-*` utilities, and adds nothing to `app/app.css`.
3. **P3 Wire it**, after P1 and P2. Code; Opus at high effort: it carries the no-flash work, the hold in `getSnapshot` and the
   e2e rewrite, where the plan's review found the traps.
   - `app/os/layout.tsx`: the phone layout in place of the shell, outside `Crt`, `data-os="phone"`, the height by CSS and
     class, `LAYOUT_CSS` (the page's background under the breakpoint included), the keyboard hold, the `noscript` style;
     `Shell` out of its imports.
   - The glue: the route's `blocks` to the project page, its `onOpenPicture` opening `PhoneViewer`, the header's `onOpenPanel`
     opening `ControlPanelSheet`, the README's project links to `navigate`.
   - `app/root.tsx`: the viewport meta.
   - The e2e phone project as above; both Lighthouse runs.
   - `plan.md`'s decisions, `CLAUDE.md`'s first line, `README.md`, `design.md`'s Screen, Readme and Keyboard lines.
4. **P4 Remove the phone's shell**, after P3. Code; the default model at medium effort (a cut the plan names line by line).
   - In `app/os/shell/`: `initialCommand`, the card's heading, the shell's `setFull` fallback for `view`, and `readmes` (the
     prop, its field in `context.ts`, its use in `ReadmeLoaded`, and the empty one the Readme window's provider passes).
   - The `view` kind of the full-screen slot, `ViewerView`, their stories and tests, the CSS only they used.
   - `design.md`'s Shell and Viewer lines. P3 leaves all of it unused, so this is a clean cut of its own.

P1 and P2 run at once; P3 then P4 one after the other. Phase 2's Lab and contact form will each want a place on the phone's
home page as well as a window on the desktop; this layout has room for them below the folders.

## The user's answers

Asked on 21 Nov 2026, the recommended option first; the user's words as they picked them.

- **The plan**: "Approve, no corners (Recommended)". Built as planned, and the phone's CRT layer has no rounded corners.
- **The pictures on a project page**: "Stacked in the page (Recommended)". One under another, a tap opens the viewer. (Not
  taken: a strip that swipes sideways.)
- **The phosphor and the effects on a phone**: "Header button + sheet". The Control Panel opens from a button in the header, as
  a sheet. (Not taken: the Control Panel at the foot of every page, which was the recommendation; none at all.)
- **Who gets the desktop**: "By screen size (Recommended)". 768x520 as now, with the keyboard guards. (Not taken: a mouse only.)
