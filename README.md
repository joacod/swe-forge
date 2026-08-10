# SWE Forge

Portable, harness-agnostic software-engineering orchestration for AI coding
agents.

SWE Forge is an explicitly invoked workflow. It helps a coding agent inspect a
ticket, choose the smallest useful execution topology, implement bounded work,
review the result with fresh context, and verify the final change.

It is a specification layer, not a replacement for a coding harness.

## Normal Use Stays Normal

Without an explicit request, use the coding harness normally:

```text
You -> coding agent -> solution
```

SWE Forge never activates merely because a task appears difficult. A user must
explicitly request it with language such as:

```text
Use SWE Forge for this ticket:
<ticket>
```

The universal invocation is natural language, so the workflow also works in a
harness that supports only repository instructions and file access.

Harnesses that support custom commands may expose:

```text
/swe-forge <ticket>
/swe-forge solo <ticket>
/swe-forge subagents <ticket>
/swe-forge herdr <ticket>
```

The first form is automatic: the existing orchestrator inspects the ticket and
repository, then selects the smallest useful topology. The other forms request
a topology explicitly. Explicit selection does not bypass safety or validation,
and any fallback is reported.

## With SWE Forge

```text
You
  |
  v
SWE Forge
  |
  +--> inspect and specify the ticket
  +--> choose the minimum useful topology
  |       SOLO | SUBAGENTS | HERDR
  +--> implement bounded work
  +--> verify and independently review
  `--> report the accepted result
```

The goal is not to maximize agent usage. The goal is higher engineering
reliability per unit of cost and complexity.

## Choose the Smallest Topology

- `SOLO`: use one strong agent when the work is localized, tightly coupled, or
  naturally sequential.
- `SUBAGENTS`: use native subagents when independent research, analysis,
  implementation, testing, or review provides real value.
- `HERDR`: use isolated worktrees and harness sessions when execution
  environments or concurrent writers genuinely need separation.

Native subagents are preferred over external orchestration when they are
enough. Herdr is optional and SWE Forge falls back when it is unavailable.

## Safe Working And Handoff

Writable work must use a dedicated, non-protected branch or worktree. SWE Forge
does not edit or commit on repository-protected branches, the locally known
remote default branch, `main`, or `master`. If the current checkout is not safe
for writing, it asks the user to provide one or authorize creating one.

A normal invocation stops after implementation, verification, independent
review when the canonical risk trigger applies, and final diff inspection. A
trivial localized `SOLO` run may record why fresh review was skipped. It does
not commit, push, create a pull request, or merge without explicit user
authorization. An explicit instruction
to continue through pull-request creation may authorize commit, branch push,
and pull-request creation after review, but never merge. Merge always requires
a separate explicit instruction.

## Canonical Source

`SWE-FORGE.md` is the canonical workflow specification. The portable role
definitions, contracts, policies, examples, and adapters live under
`.swe-forge/`.

Harness adapters are thin projections of the canonical files. They may expose
native agents, commands, skills, permissions, or model mappings, but they must
not redefine the workflow or become a second source of truth.

## Quick Start

1. Place `AGENTS.md`, `SWE-FORGE.md`, and `.swe-forge/` in a repository.
2. Open that repository in a capable coding harness.
3. Explicitly write `Use SWE Forge` and provide the ticket.
4. Let automatic routing choose `SOLO`, `SUBAGENTS`, or `HERDR`, or request one
   of those modes explicitly.

## Install Into A Harness

Keep a stable clone of this repository as the source of truth. The installer
links the canonical files by default, so updating this checkout with `git pull`
updates project and global installations without copying the workflow again.

When using an agent from this checkout, an explicit request such as:

```text
Install SWE Forge for OpenCode in /path/to/project.
```

causes the agent to ask for a target when none is supplied, install only the
requested harness bridge, and verify the result. The direct commands are:

```bash
scripts/swe-forge install opencode --target /path/to/project
scripts/swe-forge install claude --target /path/to/project
scripts/swe-forge install all --global
scripts/swe-forge verify opencode --target /path/to/project
```

Use `--mode copy` for a reviewed project snapshot instead of source-linked
files. Global installation is link-only. `--target` is always the exact folder
supplied and is never widened to an enclosing Git root. A global installation
only adds the harness command or skill and a private
source-linked support directory; it does not edit model, permission, or JSON
configuration.

For a normal task, do not invoke SWE Forge:

```text
Fix this typo.
```

That request should continue to behave like ordinary harness usage.

## Installation Modes

- Standalone: clone and version this repository independently.
- Project-local: use the installer to link `AGENTS.md`, `SWE-FORGE.md`, and
  `.swe-forge/` into a software repository.
- Global or personal: use the installer to add a harness command or skill that
  references the stable canonical checkout without changing model or permission
  configuration.

See [installation.md](docs/installation.md) for the full installation
guidance.

## V1 Scope

Version 1 implements one workflow: a general software ticket. It adapts its
depth to the task instead of forcing planning or delegation ceremony onto
trivial changes.

The workflow includes:

- repository discovery and evidence gathering
- concrete acceptance criteria and assumption tracking
- architecture and bounded task decomposition when useful
- explicit execution-mode selection
- targeted testing and repository quality gates
- fresh-context review
- repair and final acceptance
- concise evidence-based reporting

Future workflows can be added under `.swe-forge/workflows/`, but they are not
part of the V1 contract.

## Repository Layout

```text
SWE-FORGE.md                 Canonical workflow and activation behavior
AGENTS.md                    Minimal portable discovery entry point
CLAUDE.md                    Optional Claude Code compatibility shim
.swe-forge/
  agents/                    Harness-neutral role specifications
  workflows/                 Workflow definitions
  contracts/                 Task, result, review, and run-state formats
  policies/                  Routing, delegation, model, verification, and recovery
  adapters/                  Thin harness and environment integrations
  examples/                  Complete workflow examples
  evals/                     Evaluation methodology and schemas
docs/                        Architecture and extension guidance
```

## Design Boundaries

SWE Forge is:

- harness-agnostic
- model-agnostic
- explicitly invoked
- Git-friendly
- portable between repositories
- compatible with native subagents
- able to use Herdr when isolation is justified

SWE Forge is not:

- an always-on multi-agent swarm
- a provider-specific prompt library
- a replacement for a coding harness
- a requirement for Herdr
- permission to modify global harness configuration

## Contributing

Keep the canonical workflow in `SWE-FORGE.md` and keep `AGENTS.md` small. Add
new harness behavior only as an adapter. Add a role only when a bounded
specialization is useful in real tickets. Prefer evidence from evaluation over
more orchestration.

Validate installer changes with:

```bash
sh -n scripts/swe-forge scripts/test-swe-forge
scripts/check-swe-forge
scripts/test-swe-forge
```

See the contributor guides in [docs/](docs/) before extending the repository.
