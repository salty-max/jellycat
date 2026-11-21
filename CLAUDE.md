# Jellycat

Jellycat Studio's portfolio: Jelly-OS on a phosphor CRT, a desktop on computers and a shell on phones. The README has the layout
and the scripts, `docs/plan.md` the decisions and the phases, `docs/design.md` the design rules.

## Rules

- **The check**: `pnpm check` (lint, typecheck, unit tests, build), through the harness: `bun harness/q.ts check -- bun run check`.
  A change to what the browser shows also runs `pnpm e2e`.
- **Words on screen come from the project's own repository: its README, or its code where the README is stale.** No taglines,
  jokes, invented numbers or statuses; an unknown fact is `-`; a placeholder says so. System messages stay plain.
- **Our own OS.** No Fallout, Vault-Tec, RobCo or Pip-Boy names or art; no Apple or Microsoft logos, fonts, icons or sounds.
- **Text stays in the DOM.** The CRT layer is an overlay that takes no clicks and is hidden from screen readers; nothing on screen is
  drawn into a canvas or warped.
- **Look at it before calling it done.** A visual change is screenshotted in the real Chrome (Playwright, `channel: "chrome"`) at
  1:1 and compared with the mockup or the reference, zoomed in. A difference from `docs/design.md` changes that file in the same
  pull request.
- **Versions**: the React Router packages move together, to one exact version; so do the Vitest trio (`vitest`, `@vitest/browser`,
  `@vitest/browser-playwright`). pnpm's minimum release age stays on: no
  `minimumReleaseAgeExclude` entry without the user's go.

<!-- harness:start -->

## Harness

This project runs under a small harness (`harness.toml`, tools in `harness/`). The rules
below are checked by git hooks or by tools, so they are not advice.

- **One task, one session, one card.** A session's first write is its card:
  `bun harness/board.ts add <repo> "<title>" --repos <repo> --try "…" --committed "(none yet)" --left "…"`.
  It names the repositories the task writes. Nothing refuses a commit for want of it
  (`[hooks] lock = false`): keeping it is the session's own rule. Move the card at each
  stop
  (`board.ts set <id> --status waiting-test|waiting-review|ready-to-push|done`).
- **Checks go through q**: `bun harness/q.ts check -- <the check>`. One verdict line,
  the log in `.cache/logs/`, the tree stamped. A push is refused for a tree with no
  passing check. Never pipe a check into `tail`; anything long goes to a file.
- **The board is a list, not a lock.** A `note:` that another card is running in a
  repository only says who else is there: keep to your own files and talk to that
  session by its id, don't wait for it. `board.ts held` shows who runs where. A card
  can still be `blocked --on` another, as a choice.
- **Each child works in a worktree of its own**, on a branch of its own
  (`[session] worktrees = true`): commit there, never in the main checkout. The board,
  its cards and the check stamps are shared by every worktree, and `harness/packet.ts`,
  `review.ts` and `session.ts check` act on the worktree they are run from or asked
  about. The git hooks run from the main checkout (`core.hooksPath` is the absolute
  path `hooks.ts install` wrote there, so a worktree's own copy of the tools is never
  the one that runs) and the tools read `harness.toml` from it: install the hooks
  there (`bun harness/hooks.ts install .`), never from a worktree.
- **Review before the commit**: `bun harness/packet.ts <repo>` on the uncommitted files,
  the `reviewer` helper reads the packet, fix what it finds, then
  `bun harness/review.ts <repo> "<verdict>"`, then one commit. A push is refused for a
  change no review stands behind (docs are waived).
- **Commits**: Conventional Commits, lowercase subjects, no AI co-author or "generated
  with" line (the commit-msg hook refuses them).
- Ask before any push, release or deploy.
- Rules this project keeps beyond these: `CLAUDE.md`.

How sessions work together (behaviour: no hook checks these):

- **A new task asked in a session that has its own is opened as a child** (the `child`
  skill): tell the user its name and where to find it, write nothing for it here. A
  small follow-up of the same thread stays.
- **Every decision is taken in the opener, never in a child**
  (`[session] decisions = "opener"`). A child asks the user nothing: it sends each
  question (a push, a merge, any choice) to its opener with the options and its
  recommendation, and stops. The opener asks the user through the question tool
  (`AskUserQuestion`, or `wrap_up`'s ask), the recommended answer first and marked
  "(Recommended)". Never a question buried in prose.
- **A go is the user's, asked in the opener.** A child never pushes and never asks
  for a go: its report says what is committed and what a push would send
  (repository, sha range, push only). The opener asks the user, then pushes on their
  answer or relays it to the child quoted. A push go never covers a deploy or a
  release: each is asked again.
- **A plan comes to the opener, not to a child in plan mode.** Leaving plan mode asks
  the user in the child's own window, where nothing routes it to the opener, so no
  child starts in it (`--plan` is refused). A task that needs a design settled first
  is a child on the stronger model, without `--plan`, whose task says: take your card,
  write your plan, set the card `waiting-review`, send the plan to your opener and
  stop. The opener asks the user. For a code task it moves the child to the project's
  default model (`set_session_model`) before it relays the answer quoted, because the
  relay wakes the child; a CLI child can't be moved, so its build is a new child on
  the approved plan.
- **Close a finished child yourself**: its work pushed (or dropped) and its card done,
  then `bun harness/session.ts check <local_id>` and archive it (desktop) or
  `session.ts close` (CLI). Never wait to be told. Never one that waits on the user,
  holds an open card or has a follow-up on its way.
- **Pick each child's model from its task**: the project's default for mechanical work
  from a written brief, a stronger model at higher effort for judgment (prose, voice,
  security, design, a plan the user must approve).
  Set it when the child starts and say the choice in one line.
- **Never kill or signal a process another session may share.** A dev server, an e2e
  server or a watcher may be another session's: stop only what this session started,
  by the pid it was given, never `pkill -f` or `killall` by name, nor `lsof … | xargs
  kill` by port. The helpers' Bash is gated on it, a session's is not: this is on you.
- **A problem found along the way gets fixed now**, under its own card, or handed to a
  new session at once. Never only mentioned in the report.
- **Review your own work before saying it is done**: read the diff, grep for leftovers,
  check each claim in the report, see CI's verdict. Chain a commit after the check with
  `&&`, never `;`.
- **"Can't" is a research task first**: the docs, the code that does the same thing, the
  web. Say what was checked, and "not verified" with the probe that would settle it,
  never "impossible" on a guess.

<!-- harness:end -->
