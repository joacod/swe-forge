# SWE Forge

[![CI](https://github.com/joacod/swe-forge/actions/workflows/ci.yml/badge.svg)](https://github.com/joacod/swe-forge/actions/workflows/ci.yml)

Portable, opt-in workflow orchestration for AI coding harnesses.

SWE Forge helps an agent turn a ticket into a bounded, evidence-backed change:
inspect, plan, implement, verify, review, and report. It sits above your
coding harness. It is not a harness, model provider, execution daemon, or
scheduler, and it never activates from ordinary prompts.

For each explicit ticket, it chooses a proportionate execution topology:
`SOLO`, `SUBAGENTS`, or `ISOLATED`. Delivery is a separate choice: `GUIDED` is
the default for reviewable increments, while opt-in `PR` mode can carry a
well-specified ticket through verification and pull-request creation.

`ISOLATED` is used when concurrent writable work requires separate execution
environments. SWE Forge may use native harness worktree agents or Herdr as the
provider. It still produces one integration branch and one final PR. The mode
is portable at the workflow level, but it is not universally available in every
harness; the provider policy records demonstrated capabilities and explicit
fallback.

## Install

The planned first experimental release is `v0.1.0-alpha.1`. It is reserved
but not currently published, so no released tag is available yet. Pin the
source checkout only after the tag and release are published. Until then,
`main` is development-only:

```bash
# Use only after the v0.1.0-alpha.1 tag and release are published:
git clone --branch v0.1.0-alpha.1 --depth 1 \
  https://github.com/joacod/swe-forge.git ~/tools/swe-forge
cd ~/tools/swe-forge
```

For development before publication, clone the repository normally and treat
that checkout as development-only.

For development, a personal checkout may follow `main`, but public
installations should use a release tag. For Pi, install the global prompt
template:

```bash
scripts/swe-forge install pi --global
```

Pi is global-only. Other supported harnesses can be installed for a project or
globally. Link installations follow updates to this checkout. See the
[installation guide](docs/installation.md) for copy mode, verification,
updates, and conflicts.

Installation does not install Herdr. Herdr is an optional execution provider
and may be used only when already available and selected safely by the canonical
provider policy.

See the [compatibility snapshot](docs/compatibility.md) for the pre-release
harness validation snapshot for the planned alpha and the
[changelog](CHANGELOG.md) for known limitations. Run
`scripts/check-release prepare` when preparing a future alpha release; Forge
never creates or publishes the tag or release.

## Installer lifecycle

The dependency-free installer exposes read-only inspection and conservative
lifecycle operations in addition to `install` and `verify`:

```bash
scripts/swe-forge version
scripts/swe-forge status pi --global
scripts/swe-forge doctor pi --global
scripts/swe-forge install pi --global --dry-run
scripts/swe-forge update opencode --target /path/to/project --dry-run
scripts/swe-forge update opencode --target /path/to/project
scripts/swe-forge uninstall opencode --target /path/to/project
```

Installations record an exact managed manifest. `update` and `uninstall` refuse
modified, missing, or ambiguous managed entries rather than guessing. Legacy
installations without a manifest can be inspected and verified, but destructive
lifecycle operations stop until the installation is reviewed and recreated.
`--dry-run` performs planning and conflict checks without creating locks,
files, links, or manifests.

## Use

Installation only makes it available; it does not activate the workflow.
Invoke it explicitly with a ticket. Ordinary prompts continue to use your
harness normally. A clean normal default branch gets one dedicated task
branch automatically, using the conventional
`<type>/<short-kebab-case-description>` form without a project-name prefix. An isolated run instead uses one run-owned integration
worktree and one integration/delivery branch with the same convention; bounded
worker branches are local-only.
Commits, pushes, pull requests, and merges remain separately controlled.

| Harness | Installation | Invocation |
| --- | --- | --- |
| [Pi](.swe-forge/adapters/pi/README.md) | Global only | `/swe-forge <ticket>` or `/swe-forge pr <ticket>` |
| [OpenCode](.swe-forge/adapters/opencode/README.md) | Project or global | `/swe-forge <ticket>` or `/swe-forge pr <ticket>` |
| [Claude Code](.swe-forge/adapters/claude-code/README.md) | Project or global | `/swe-forge <ticket>` or `/swe-forge pr <ticket>` |
| [Codex](.swe-forge/adapters/codex/README.md) | Project or global | `$swe-forge <ticket>` or `$swe-forge pr <ticket>` |
| [Cursor](.swe-forge/adapters/cursor/README.md) | Project or global | `/swe-forge <ticket>` or `/swe-forge pr <ticket>` |

Explicit topology and delivery can be combined:

```text
/swe-forge isolated <ticket>
/swe-forge isolated pr <ticket>
/swe-forge pr isolated <ticket>
```

The canonical topology words are `solo`, `subagents`, and `isolated`. A leading
`herdr` is not a topology alias. The workflow gives migration guidance to use
`isolated` and request Herdr as a separate execution-provider preference.

## How it works

SWE Forge turns an explicit ticket into a bounded, evidence-backed change:

```text
ticket
  → inspect the repository and clarify important decisions
  → define acceptance criteria and the smallest compatible approach
  → choose SOLO, SUBAGENTS, or ISOLATED
  → select NATIVE or optional HERDR only for ISOLATED when demonstrated
  → implement and validate bounded slices or dependency waves
  → centrally integrate isolated results in planned order when applicable
  → verify, independently review, and repair when needed
  → run executable evidence gates and generate a compact receipt when useful
  → report ACCEPTED, BLOCKED, or FAILED
```

The original ticket remains authoritative. When clarification is needed, Forge
asks only questions whose answers could change behavior, scope, compatibility,
safety, or delivery. A temporary working spec may organize the intent,
scenarios, assumptions, and validation, but ticket-specific specs are not
normally added to the repository. Long-running runs also record the active
harness's context capabilities: when a reliable near-limit signal exists, Forge
persists the short state, compacts before the next continuation, and rechecks
state and Git; when no portable signal exists, it uses durable checkpoints
rather than guessing.

Every ticket also records a risk-proportional testing decision: focused
behavioral tests when they add signal, existing coverage or focused manual
evidence when sufficient, and no blanket coverage target or mandatory TDD.

`GUIDED` mode keeps a human checkpoint between reviewable slices. `PR` mode is
an explicit low-touch path that can continue through validation, review, push,
and pull-request creation. Neither mode merges automatically. Commits, pushes,
PR creation, and post-merge synchronization remain separately controlled
actions, and optional specialist skills are loaded only when requested or
clearly useful.

When `ISOLATED` applies, the workflow requires a foundation phase, a dependency
DAG, wave barriers, at most two concurrent writable workers by default, exact
base SHAs, explicit shared-artifact ownership, isolated runtime resources,
worker-level and integrated validation, source-to-integration mappings, and
conservative cleanup. Worker completion order never determines integration
order. Worker branches never receive pushes or PRs.

The detailed lifecycle lives in the [workflow specification](SWE-FORGE.md),
[ticket procedure](.swe-forge/workflows/ticket.md), and
[isolated execution workflow](.swe-forge/workflows/isolated-execution.md). The
canonical ownership/load map and minimal topology load sets are in
[architecture](docs/architecture.md).

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

For explicit `isolated` or automatic isolated routing, the setup checkpoint
shows the worker count, wave, task ownership, provider, worktree plan,
integration order, shared artifacts, and environment resources. `continue`
authorizes only that local setup; `go` authorizes a reviewed integration-branch
commit. The integration branch remains the sole delivery branch.

After reviewing and manually merging the PR, say `merged` (or run
`/git-sync merged`). Forge verifies the PR was actually merged before returning
to the remote default branch and fast-forwarding it. It never merges
automatically.

### PR mode

Use `/swe-forge pr <ticket>` when the change is clear enough for low-touch
execution. Forge performs a short alignment interview only when important
requirements are missing, keeps the working spec temporary, and records an
ordered commit plan before editing. Each meaningful plan step is validated and
committed separately; a one-step ticket is not split artificially. Forge then
runs the full verification and review gates and stops with one PR available to
review. For `ISOLATED`, it central-integrates worker transfer commits into one
integration/delivery branch and still creates exactly one final PR. Its PR
title and description are concise, project-facing, and limited to the outcome,
motivation, relevant validation, and material risks or follow-ups. They never
include receipts or tool/process metadata, including when the target repository
is SWE Forge itself; it still never merges.

The delivery helpers are intentionally atomic: `/git-push` only pushes; use
`/git-pr` separately to create or report the pull request. In PR mode, a compact
SWE Forge receipt can be generated after the PR URL exists as private run
evidence; it is never copied into the PR description. Commit and PR messages
follow the repository delivery policy: concise imperative subjects, clear
subject/body separation, and bodies that preserve what/why context when needed,
without tool attribution or unrelated detail. The final harness output also
starts with a short plain-language work summary of what changed, what improved,
and any material notes, separate from the private receipt. See the harness adapter
documentation for the available
`git-commit`, `git-push`, `git-pr`, and `git-sync` loaders.

## Feedback

Please report friction through the [issue templates](https://github.com/joacod/swe-forge/issues/new/choose):
[installation or adapter problem](https://github.com/joacod/swe-forge/issues/new?template=installation-adapter.md),
[workflow behavior problem](https://github.com/joacod/swe-forge/issues/new?template=workflow-behavior.md),
or [real-run report](https://github.com/joacod/swe-forge/issues/new?template=real-run-report.md).
Redact credentials, private ticket details, transcripts, and personal paths.

## Learn more

- [Workflow specification](SWE-FORGE.md)
- [Installation guide](docs/installation.md)
- [Compatibility snapshot](docs/compatibility.md)
- [Changelog](CHANGELOG.md)
- [Planned v0.1.0-alpha.1 release notes](docs/releases/v0.1.0-alpha.1.md)
- [Architecture](docs/architecture.md)
- [Adapter index](.swe-forge/adapters/README.md)
- [Execution providers](.swe-forge/providers/README.md)
- [Executable evidence and receipts](.swe-forge/policies/evidence.md)
- [Release readiness](scripts/check-release)
- [Adding a harness](docs/adding-a-harness.md)
- [Adding an optional specialist skill](docs/adding-a-skill.md)
- [Contributing](CONTRIBUTING.md)
