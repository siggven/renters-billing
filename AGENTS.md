# AGENTS.md — Operating manual for any AI agent working in this repo

> **Read this before touching code.** This file encodes the rules every AI session must follow when implementing this project. It is project-scoped and ships with the repo so the conventions travel across providers (Kiro, Claude Code, Codex, Cursor, etc.).

The methodology comes from `C:\Users\nelvi\Documents\Obsidian\aiagents_workflow\` (the user's `aiagents-workflow` knowledge base). Read those notes for the *why*; this file is the *what to do*.

---

## 1. Definition of "implement"

For every task in `PLAN.md`, "implement" means **all five** of the following — not just the first:

1. **Code change** — the actual diff that satisfies the task's objective.
2. **Tests** — new tests for new behaviour, updated tests for changed behaviour. The pure `calculateBill()` calculator MUST be TDD (tests first).
3. **Quality gates pass** — `npm run lint && npm run typecheck && npm run test && npm run build` all green.
4. **Docs** — inline comments where non-obvious, plus `README.md` / `docs/` updates when behaviour or setup changes.
5. **Plan update** — `PLAN.md` reflects the new state and a one-line entry is appended to the Decision log.

If only #1 is done, the task is **not** complete. Do not mark it done.

## 2. PLAN.md update protocol

After every meaningful step you MUST:

1. Move the current task's state — `todo` → `in-progress` → `done` (or `blocked` with a reason).
2. Tick off `- [ ]` checklist items as you complete them.
3. If `blocked`, write *why* and *what would unblock it*.
4. If you discover a new task, append it under the parent (or as a new T-X if independent).
5. If scope changes, update `docs/SPEC.md` in the same commit.
6. Append a one-liner to `## Decision log` with timestamp + decision + rationale (≤2 lines).

## 3. Stop after each task — never auto-chain

When a task's all-five definition is complete:

- Update `PLAN.md` and Decision log.
- Commit (Conventional Commits, see § 9).
- **Trigger the reviewer** — see § 3a below.
- Surface to the user: (a) the diff summary (filenames + what changed), (b) the reviewer's report, (c) what's next.
- **STOP.** Do not start the next task without explicit user "go".

The single exception: trivial follow-ups discovered mid-task (e.g., a typo in a sibling file) can be folded into the same diff if they are clearly part of the same change.

## 3a. Auto-review protocol

After every task commit, the executor MUST invoke the **reviewer agent** before stopping. The reviewer is a separate, read-only agent defined globally at `~/.kiro/agents/reviewer.json` (system prompt at `~/.kiro/agents/reviewer.prompt.md`).

**How to invoke from inside an executor session:**

Use the `subagent` tool with role `kiro_default`, naming the stage `review-T<N>`, and pass a `prompt_template` that:

1. Tells the subagent it is acting as the reviewer for this turn.
2. Points it at `C:\Users\nelvi\.kiro\agents\reviewer.prompt.md` (read this first to learn the reviewer's job and output format).
3. Tells it the working directory of the project.
4. Tells it which task ID (T0, T1, …) just completed and which commit SHA to audit.

Example:

```text
You are acting as the reviewer agent for one turn. Read your role and required
output format from C:\Users\nelvi\.kiro\agents\reviewer.prompt.md before doing
anything else.

Working directory: C:\Users\nelvi\Projects\renters-billing
Task just completed: T1 — Vite + React + TS + Tailwind scaffold + GitHub Pages deploy
Commit to audit: HEAD (use `git log -1` to see SHA)

Read AGENTS.md, docs/SPEC.md, PLAN.md (in that order), then the diff, then run
the project quality gates. Return your verdict in the strict format defined in
the reviewer prompt.
```

The reviewer is read-only — it cannot mutate files, install packages, or commit.

**The user can also invoke the reviewer manually** at any time via `/agent swap reviewer` (keyboard shortcut `Ctrl+Shift+R`) to ask follow-up questions about the latest review or do an off-cycle audit.

## 4. Stopping conditions — pause and ask

Stop and ask the user when any of these occur:

- A quality gate fails 3 times in a row on the same task.
- An ambiguity arises that the spec should answer but doesn't.
- A destructive or irreversible action is needed (`rm -rf`, `git push --force`, dropping tables, deleting Supabase data).
- Credentials or secrets are required (Supabase URL/anon key, GitHub PAT, etc.).
- The user's local environment needs a manual step (creating a GitHub repo, enabling Pages, creating Supabase users).

Do not guess credentials, do not invent acceptance criteria, do not skip tests because "it should work."

## 5. Quality gates

Run these on every commit:

```
npm run lint
npm run typecheck
npm run test
npm run build
```

The CI workflow at `.github/workflows/deploy.yml` enforces the same gates before deploying to GitHub Pages. Failing any gate locally must be fixed before the commit is made.

## 6. Context discipline

- Use `glob` and `grep` to navigate. Do **not** dump the whole repo into context.
- Read files one at a time, on demand.
- For large outputs (test logs, query results), summarise — do not paste raw.
- When a task is done, treat its tool outputs as noise from that point on.

## 7. Sub-agent / parallel work

For day-to-day implementation: **single agent, one task at a time.** That is the default.

Reach for `subagent` only when:

- A task requires reading >5 files of read-only research (sub-agent has its own context window).
- Two genuinely independent sub-tasks can run in parallel (frontend + DB migration).
- Exploratory research that should not pollute the main session's context.

Most tasks in this plan do **not** need sub-agents.

## 8. Tooling preferences

- **File edits:** use the `write` tool (`create`, `strReplace`, `insert`). Never use `sed` / `awk` / shell redirection for files.
- **File reads:** use the `read` tool. Never use `cat` / `Get-Content` for routine reads.
- **Code search:** use the `code` tool's AST features (`search_symbols`, `pattern_search`) for code; use `grep` only for plain text.
- **Web research:** use `firecrawl_search` first, `firecrawl_scrape` for known URLs, browser automation last.
- **Self-doc:** use `introspect` when asked about Kiro's own features.
- **Long-term memory:** use `knowledge` (`/knowledge add`, `/knowledge search`).

## 9. Git hygiene

- Commits are made by the agent only when the user explicitly approves a task's diff. Do not auto-commit between tasks.
- Commit messages: Conventional Commits format (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`).
- One task = one commit (or one focused branch + PR for larger tasks).
- Never `--force` push. Never `git reset --hard` without explicit consent.
- Never amend a pushed commit.

## 10. Secrets

Secrets that ever live on disk:

- `.env.local` — Supabase URL + anon key. **Gitignored.** Never committed.
- GitHub Actions secrets — same Supabase values for the build. Set in repo settings.

Never echo secret values back in tool outputs or commit messages. Reference by key name (`VITE_SUPABASE_URL`) not value.

## 11. Where to find things

- `docs/SPEC.md` — what to build (requirements, data model, acceptance criteria).
- `PLAN.md` — how we're building it (tasks, state, dependencies, decision log).
- `AGENTS.md` — this file, how to behave while building.
- `README.md` — user-facing setup + usage guide.
- `src/` — application code.
- `supabase/migrations/` — SQL schema migrations.
- `.github/workflows/` — CI / deploy.

## 12. Onboarding sequence for a fresh agent

1. Read this file (`AGENTS.md`).
2. Read `docs/SPEC.md` (full).
3. Read `PLAN.md` (full).
4. If new to this user's methodology, also read `C:\Users\nelvi\Documents\Obsidian\aiagents_workflow\05 Phase — Implement.md` (the canonical Implement-phase note).
5. Pick the first `todo` task whose dependencies are all `done`.
6. Begin.
