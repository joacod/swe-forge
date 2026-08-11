# SWE Forge

Portable, opt-in workflow orchestration for AI coding harnesses.

SWE Forge helps an AI coding agent turn a software ticket into a bounded,
evidence-backed change: inspect the repository, choose the smallest useful
execution mode, implement, verify, review, and report.

It is a workflow specification layer, not a coding harness, model provider, or
always-on multi-agent swarm.

## Use It Explicitly

Use the coding harness normally unless the user explicitly invokes SWE Forge:

```text
Fix this typo.
```

```text
Use SWE Forge for this ticket:
<ticket>
```

This natural-language path works in a harness that supports repository
instructions and file access. Installed OpenCode, Claude Code, and Pi
integrations also expose `/swe-forge`.

## Execution Modes

| Mode | Use when |
| --- | --- |
| `SOLO` | The work is localized, tightly coupled, or naturally sequential. |
| `SUBAGENTS` | Independent research, implementation, testing, or review provides real value. |
| `HERDR` | Separate worktrees, harness sessions, or execution environments are needed. |

Automatic routing chooses the smallest useful mode by default. A user may
request one explicitly:

```text
/swe-forge <ticket>
/swe-forge solo <ticket>
/swe-forge subagents <ticket>
/swe-forge herdr <ticket>
```

An explicit mode does not bypass safety, validation, scope, or delivery
authorization. Native subagents are preferred when they are enough; Herdr is
optional and has a documented fallback.

## Quick Start

Keep a stable clone of this repository as the source of truth:

```bash
git clone https://github.com/joacod/swe-forge.git ~/tools/swe-forge
cd ~/tools/swe-forge
git pull
```

Install the integration you use. For a global OpenCode installation:

```bash
scripts/swe-forge install opencode --global
scripts/swe-forge verify opencode --global
```

For a project-local OpenCode installation:

```bash
scripts/swe-forge install opencode --target /path/to/project
scripts/swe-forge verify opencode --target /path/to/project
```

Claude Code is also supported:

```bash
scripts/swe-forge install claude --global
scripts/swe-forge verify claude --global
```

Pi is supported through its global prompt-template directory:

```bash
scripts/swe-forge install pi --global
scripts/swe-forge verify pi --global
```

The `all` harness is an explicit shortcut for installing or verifying both
OpenCode and Claude Code. Pi is installed separately. It does not mean "the
current harness":

```bash
scripts/swe-forge install all --global
scripts/swe-forge verify all --global
```

After installation, run a small smoke test:

```text
/swe-forge <small test ticket>
```

If no native integration is available, use the natural-language activation
request after placing `AGENTS.md`, `SWE-FORGE.md`, and `.swe-forge/` in the
target repository.

See [docs/installation.md](docs/installation.md) for project-local, global,
link, copy, collision, verification, and update details.

## Installation Behavior

- Link mode is the default and follows updates to this source checkout.
- Copy mode creates a reviewed project-local snapshot; global installation is link-only.
- `--target` always means the exact existing directory supplied.
- Existing conflicting files stop the installation instead of being overwritten.
- Global installation adds only the requested command, prompt template, or skill and a private source-linked support directory.
- Global installation does not modify harness settings, models, permissions, credentials, or JSON files.

## Workflow At A Glance

For an explicitly invoked ticket, SWE Forge progressively:

1. inspects the ticket, repository, constraints, and available tooling
2. defines observable acceptance criteria and assumptions
3. chooses and records the smallest useful execution mode
4. performs bounded implementation and proportional validation
5. reviews the result with fresh context when the risk warrants it
6. repairs relevant findings and reports evidence-backed acceptance

Trivial work stays lightweight. The workflow does not require an architect,
delegation, Herdr, or ceremonial test plan when the ticket does not justify it.

## Safety And Delivery

- Writable work uses a dedicated, non-protected branch or worktree.
- Concurrent writing workers never share one checkout.
- Normal completion stops at the reviewed, verified diff.
- Commit, push, pull-request creation, and merge require explicit authorization.
- An instruction to continue through pull-request creation may authorize commit, push, and pull-request creation after review, but never merge.

The complete activation, checkout, authorization, verification, and acceptance
rules live in [SWE-FORGE.md](SWE-FORGE.md).

## Supported Integrations

- **OpenCode:** project and global `/swe-forge` command, with native subagents available to the routing policy.
- **Claude Code:** project and global `/swe-forge` skill with explicit user invocation.
- **Pi:** global `/swe-forge` prompt template with explicit user invocation.
- **Codex and other harnesses:** portable `AGENTS.md` activation; no V1-specific native configuration is required.
- **Herdr:** optional execution isolation for `HERDR` mode, not a replacement for the coding harness.

## Source And Documentation

| Path | Purpose |
| --- | --- |
| `README.md` | Human-facing overview and getting started guide. |
| `AGENTS.md` | Minimal discovery, activation, and installation guidance for agents. |
| `SWE-FORGE.md` | Canonical workflow specification and safety contract. |
| `.swe-forge/` | Workflows, roles, contracts, policies, adapters, examples, and evaluations. |
| `docs/` | Architecture, installation, and extension guidance. |

Adapters are thin projections of the canonical files. They must not become a
second source of workflow truth.

## V1 Scope

V1 implements one general software-ticket workflow. Its depth adapts to the
ticket instead of forcing planning or delegation ceremony onto trivial work.
Future workflows may be added under `.swe-forge/workflows/`, but they are not
part of the V1 contract.

## Contributing

Keep workflow behavior in `SWE-FORGE.md` and `.swe-forge/`; keep `AGENTS.md`
small; and add harness-specific behavior only as a thin adapter. Add roles or
orchestration only when evaluation evidence shows they improve real tickets.

Validate installer and structural changes with:

```bash
sh -n scripts/swe-forge scripts/test-swe-forge
scripts/check-swe-forge
scripts/test-swe-forge
```

See the contributor guides in [docs/](docs/) before extending the repository.
