# SWE Forge

Portable, opt-in workflow orchestration for AI coding harnesses.

SWE Forge helps an agent turn a ticket into a bounded, evidence-backed change:
inspect, plan, implement, verify, review, and report. It sits above your coding
harness. It is not a harness or model provider, and it never activates from
ordinary prompts.

For each explicit ticket, it chooses a proportionate execution topology:
`SOLO`, `SUBAGENTS`, or `HERDR`. Delivery is a separate choice: `GUIDED` is
the default for reviewable increments, while opt-in `PR` mode can carry a
well-specified ticket through verification and pull-request creation.

## Install

Keep a checkout somewhere stable:

```bash
git clone https://github.com/joacod/swe-forge.git ~/tools/swe-forge
cd ~/tools/swe-forge
```

For Pi, install the global prompt template:

```bash
scripts/swe-forge install pi --global
```

Pi is global-only. Other supported harnesses can be installed for a project or
globally. Link installations follow updates to this checkout. See the
[installation guide](docs/installation.md) for copy mode, verification,
updates, and conflicts.

## Use

Installation only makes it available; it does not activate the workflow.
Invoke it explicitly with a ticket. Ordinary prompts continue to use your
harness normally. A clean default branch gets one dedicated task branch
automatically; commits, pushes, pull requests, and merges remain separately
controlled actions.

| Harness | Installation | Invocation |
| --- | --- | --- |
| [Pi](.swe-forge/adapters/pi/README.md) | Global only | `/swe-forge <ticket>` or `/swe-forge pr <ticket>` |
| [OpenCode](.swe-forge/adapters/opencode/README.md) | Project or global | `/swe-forge <ticket>` or `/swe-forge pr <ticket>` |
| [Claude Code](.swe-forge/adapters/claude-code/README.md) | Project or global | `/swe-forge <ticket>` or `/swe-forge pr <ticket>` |
| [Codex](.swe-forge/adapters/codex/README.md) | Project or global | `$swe-forge <ticket>` or `$swe-forge pr <ticket>` |
| [Cursor](.swe-forge/adapters/cursor/README.md) | Project or global | `/swe-forge <ticket>` or `/swe-forge pr <ticket>` |

## Delivery modes

### Guided (default)

Use the normal invocation when you want to steer the work and review smaller
diffs:

```text
/swe-forge <ticket>
  → create or reuse one task branch
  → implement and validate one cohesive slice
  → checkpoint: review the diff
  → say "continue" or "go"; go commits the slice and continues
  → repeat until the feature is complete
  → use /git-commit if needed, then /git-push and /git-pr separately
```

After reviewing and manually merging the PR, say `merged` (or run
`/git-sync merged`). Forge verifies the PR was actually merged before returning
to the remote default branch and fast-forwarding it. It never merges
automatically.

### PR mode

Use `/swe-forge pr <ticket>` when the change is clear enough for low-touch
execution. Forge performs a short alignment interview only when important
requirements are missing, keeps the working spec temporary, commits each
validated implementation slice separately, runs the full verification and
review gates, and stops with a PR available to review. Its PR description is
kept concise and informative; it still never merges.

The delivery helpers are intentionally atomic: `/git-push` only pushes; use
`/git-pr` separately to create or report the pull request. Commit and PR
messages follow the repository delivery policy: concise imperative subjects,
clear subject/body separation, and bodies that preserve what/why context when
needed. See the harness adapter documentation for the available `git-commit`,
`git-push`, `git-pr`, and `git-sync` loaders.

## Learn more

- [Workflow specification](SWE-FORGE.md)
- [Installation guide](docs/installation.md)
- [Architecture](docs/architecture.md)
- [Adapter index](.swe-forge/adapters/README.md)
- [Adding a harness](docs/adding-a-harness.md)
- [Adding an optional specialist skill](docs/adding-a-skill.md)
