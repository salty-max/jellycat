# harness

harness is a set of tools for running Claude Code sessions on a software project: a task board, a quiet runner for checks, a review before each commit, and git hooks that hold sessions to them. It comes from the World of Warcraft addons' tooling, made general so that any project can adopt it with one command; Hundo and this site both run under it. The tools are TypeScript run by Bun and the git hooks are shell, with no dependencies.

## How it's built

- The board: one Markdown card per task, written through `board.ts` so no session hand-edits it, naming its session and the repositories it writes. By default the board is a lock: a session's commit is refused unless its running card names the repository and no other card holds it. A project whose sessions each work in a git worktree of their own can turn the lock off, and the board is then a list.
- The quiet runner: `q.ts` keeps a check's output in a log file and prints one verdict line. A passing check stamps the git tree it ran on. An optional queue runs one check at a time on the machine, so parallel sessions don't starve each other's tests.
- The review: `packet.ts` gathers what a review needs into one file, a read-only reviewer agent reads it, and `review.ts` records the verdict against the tree the commit will hold. A file changed afterwards leaves the commit without one.
- The hooks: `commit-msg` refuses an AI co-author or "generated with" line. `pre-push` refuses a tree with no passing check, a change no review stands behind (documentation is waived), and an AI trailer that a rebase carried past `commit-msg`.
- Sessions, a rule rather than a hook: each new task opens in a session of its own (`session.ts`, the `child` skill), which can send its questions, a push among them, to the session that opened it.

`bun init.ts <project>` sets a project up: `harness.toml`, a copy of the tools in `harness/`, the hooks, permission prompts for GitHub and Vercel writes in Claude Code's settings, the reviewer and architect agents, and a rules section in `CLAUDE.md`. It commits nothing. The tools are copied rather than referenced, so CI, a worktree or another machine needs only the repository. Each copy carries a stamp naming the harness commit it came from, and `harness-sync.ts --check` fails on a hand edit. No tool hard-codes a project's folders or repository names: they come from `harness.toml`.

## How it's checked

`bun test` covers the tools, the hooks, setup and the queue; the tests stay in this repository and are never copied into a project. CI runs them on every pull request and every push to `main`. `docs/trial.md` records a trial on a throwaway repository in which each refusal fired in turn (no card, an AI trailer, no review, no passing check) until a fix, a check and a review let the push through.
