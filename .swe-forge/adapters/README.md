# Harness Adapters

Adapters expose the canonical SWE Forge workflow and its explicit delivery
actions through harness-native features. They are optional integration layers,
not alternate workflow definitions.

## Source of Truth

Always update these canonical files first:

- `../../AGENTS.md`
- `../../SWE-FORGE.md`
- `../../.swe-forge/workflows/`
- `../../.swe-forge/agents/`
- `../../.swe-forge/contracts/`
- `../../.swe-forge/policies/`

An adapter may contain a loader, command, permission mapping, or runbook. It
must point the harness back to those files rather than copying their content.
The OpenCode and Pi delivery loaders expose separate `git-commit`, `git-push`,
`git-pr`, and `git-sync` actions; canonical behavior lives in
`../policies/delivery.md`. The installation source of truth is `registry.tsv`;
it maps harnesses to selected payloads and destinations.

## Shared Workflow Behavior

All adapters load the same canonical workflow and delivery policies. Keep these
rules centralized instead of restating them in host-specific files:

- activation is explicit; ordinary prompts do not activate SWE Forge
- `AUTO` routing and `GUIDED` delivery are the defaults; `PR` is opt-in
- a clean protected default branch gets one dedicated task branch for the run
- `go` commits only the reviewed guided slice; PR mode commits validated slices
  separately before final review, push, and pull-request creation
- pushing never creates a PR, and syncing verifies `MERGED` before changing the
  checkout

Adapter-specific files should document only host syntax, discovery paths,
permissions, and other behavior that cannot be represented by the canonical
files. The canonical workflow, policies, and contracts remain authoritative.

## Installation Boundary

The files in this directory are portable templates and documentation. They are
not discovered automatically by a harness while they remain here. Installation
means copying or linking only the selected adapter projection to a target
repository or user configuration. The adapter catalog itself is never copied
into the target's canonical `.swe-forge/` tree.

For supported harnesses, prefer `scripts/swe-forge install <harness>`
and `scripts/swe-forge verify <harness>`. The installer links selected
artifacts to the canonical checkout by default and accepts `--global` only
when the user explicitly asks for user-level harness access. Each invocation
handles one harness.

Do not modify global harness configuration as part of installing SWE Forge
unless the user explicitly requests it. Prefer project-local files or links
that can be reviewed and versioned.

## Adapters

- [OpenCode](opencode/README.md): project command and optional native-agent
  bridge pattern
- [Claude Code](claude-code/README.md): project skill and `CLAUDE.md` bridge
- [Pi](pi/README.md): global prompt-template bridge
- [Shared Agent Skill](shared/agent-skill/README.md): Codex and Cursor projection
- [Codex](codex/README.md): shared Agent Skill integration notes
- [Cursor](cursor/README.md): shared Agent Skill integration notes
- [Herdr](herdr/README.md): optional isolated execution runbook
