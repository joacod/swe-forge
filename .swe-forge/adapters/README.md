# Harness Adapters

Adapters expose the canonical SWE Forge workflow and its explicit delivery
actions through harness-native features. They are optional integration layers,
not alternate workflow definitions or execution providers.

## Source of Truth

Always update these canonical files first:

- `../../AGENTS.md`
- `../../SWE-FORGE.md`
- `../../.swe-forge/workflows/`
- `../../.swe-forge/agents/`
- `../../.swe-forge/contracts/`
- `../../.swe-forge/policies/`
- `../../.swe-forge/providers/` for optional execution-provider runbooks

An adapter may contain a loader, command, permission mapping, or host capability
documentation. It must point the harness back to canonical files rather than
copying their content. The OpenCode and Pi delivery loaders expose separate
`git-commit`, `git-push`, `git-pr`, and `git-sync` actions; canonical behavior
lives in `../policies/delivery.md`. The installation source of truth is
`registry.tsv`; it maps harnesses to selected payloads and destinations.

An execution provider is not a harness adapter. Providers expose optional
isolated lifecycle capabilities only after canonical routing selects
`ISOLATED`. Provider documentation is canonical support content under
`../providers/`, source-linked with the canonical support tree; it is not an
adapter registry artifact. Herdr documentation lives under
`../providers/herdr/`; it is not installed automatically as a Herdr tool and
has no adapter registry entry.

## Shared Workflow Behavior

All adapters load the same canonical workflow, provider-selection, and delivery
policies. Keep these rules centralized instead of restating them in host-
specific files:

- activation is explicit; ordinary prompts do not activate SWE Forge
- `AUTO` routing and `GUIDED` delivery are the defaults; `PR` is opt-in
- canonical topologies are `SOLO`, `SUBAGENTS`, and `ISOLATED`
- `SUBAGENTS` uses parallel read-only work or sequential bounded writable work
  in one checkout; concurrent writable worktrees are `ISOLATED`
- a clean normal checkout gets one dedicated task branch for the run; an
  isolated ticket has one integration/delivery branch; worker branches are
  local-only and cannot create PRs
- `go` commits only the reviewed guided slice or accepted central integration
  unit; PR mode plans meaningful slices before editing and commits each validated
  slice separately before final review, push, and one pull-request creation
- pushing never creates a PR, and syncing verifies `MERGED` before changing the
  checkout
- context management is capability-negotiated: adapters document observed
  usage telemetry, context-window knowledge, proactive compaction, and
  overflow recovery; they do not assume a universal signal or command. At a
  reliable near-limit boundary, the canonical context policy persists state,
  compacts before continuing, and rechecks the actual checkout.
- when available, `.swe-forge/tools/swe-forge-gate` provides executable
  preflight, checkpoint, validation, delivery, and receipt evidence without
  redefining the canonical workflow

Adapter-specific files should document only host syntax, discovery paths,
permissions, native capabilities, and other behavior that cannot be
represented by the canonical files. The canonical workflow, policies,
contracts, and provider boundary remain authoritative.

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
handles one harness. Providers are not installed as a side effect.

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

Optional execution providers are documented separately under
[`.swe-forge/providers/`](../providers/README.md), including the
[Herdr provider](../providers/herdr/README.md).
