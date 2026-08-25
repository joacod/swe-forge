# OpenCode Adapter

This adapter exposes SWE Forge through current OpenCode user-level
conventions. OpenCode is a Compatible adapter with prior successful use. Its
demonstrated capabilities may differ from other adapters while the canonical
workflow remains portable and no parity requirement follows. OpenCode discovers
user commands under
`~/.config/opencode/commands/`; project agents and commands may still be used
for unrelated harness configuration. Skills can also be discovered under
`.opencode/skills/`, `.agents/skills/`, or compatible project locations.

The adapter does not redefine the workflow. The canonical files remain
`AGENTS.md`, `SWE-FORGE.md`, and `.swe-forge/`.

## Explicit Command

The installer links `commands/swe-forge.md` to:

```text
~/.config/opencode/commands/swe-forge.md
```

The command uses OpenCode's file references and `$ARGUMENTS` substitution to
load the canonical instructions only when the user types `/swe-forge`. The
canonical ticket bootstrap invokes
`~/.config/opencode/swe-forge/.swe-forge/tools/swe-forge-invocation` exactly
once and passes its normalized result to the agent; this adapter does not copy
grammar into the command body. OpenCode's template shell interpolation does not
provide a verified safe raw-argv boundary for arbitrary multiline ticket text,
so the bootstrap path is the portable integration point rather than an inline
adapter parser.

The delivery helpers are separate explicit commands:

```text
/git-commit [paths|message]
/git-push [force|-f]
/git-pr [draft]
/git-sync
```

The canonical command accepts automatic, explicit, and orthogonal delivery
forms such as `/swe-forge isolated <ticket>`, `/swe-forge isolated pr
<ticket>`, and `/swe-forge pr isolated <ticket>`. `herdr` is not a topology
alias; users who want Herdr request it as the provider for `ISOLATED`, for
example in ticket text: "Use `isolated` with Herdr as the execution provider."

They load `.swe-forge/policies/delivery.md` rather than copying its procedure.
`/git-pr draft` is an explicit draft request; plain `/git-pr` retains
normal/open behavior. See [shared adapter behavior](../README.md) for the
workflow and delivery rules.

Do not install a command that auto-runs the workflow for ordinary prompts.

The installer links the loader and four atomic delivery commands to
`~/.config/opencode/commands/` and exposes the canonical source through
`~/.config/opencode/swe-forge/`. The loaders use OpenCode's supported
home-relative file references, so projects do not need local SWE Forge files
for `/swe-forge` or the delivery actions.

## Native Subagents

OpenCode provides native primary and subagent modes. Use them when the routing
policy selects `SUBAGENTS`. Before launch, invoke
`../../tools/swe-forge-worker-brief render` with the root-produced structured
input and pass its validated output unchanged with the relevant canonical role
and result/review contract. The renderer owns inclusion and dependency rules;
this adapter does not construct briefing fields. If OpenCode can demonstrably create concurrent writable workers in
dedicated worktrees from one exact integration SHA, those workers satisfy the
`NATIVE` provider contract and the topology is `ISOLATED`; otherwise keep
writable subagents sequential in one checkout.

For a custom native role, create a thin project agent in `.opencode/agents/`
that contains only:

```markdown
---
description: Read-only independent SWE Forge review
mode: subagent
permission:
  edit: deny
  bash: deny
---

Read `.swe-forge/agents/reviewer.md` and follow that canonical role. Return
findings using `.swe-forge/contracts/review.md`. Do not duplicate the role
instructions here.
```

Choose permissions for each role deliberately. Read-only researchers and
reviewers should not receive edit access. Writable implementers need explicit
scope from a task contract.
Writable native subagents in one checkout must run sequentially. Concurrent
writers require separate dedicated, classified worktrees and are classified as
`ISOLATED`; non-overlapping file scope alone does not make a shared checkout
safe. The root orchestrator keeps final integration and delivery under its own
checkout.

## Models and Permissions

OpenCode model and permission mappings are configuration choices. Keep them in
the target project's OpenCode configuration or user configuration, never in
the canonical role files. Map the capability classes in
`../../policies/model-routing.md` to user-selected models.

The adapter does not require a particular provider, model ID, permission mode,
or MCP server.

## Skills

The explicit command is the default integration because the current OpenCode
skill discovery is agent-visible and does not provide the same explicit-only
invocation control as the Claude Code skill loader. A future skill adapter
should remain a small host projection and must preserve the activation
contract.

## References

The adapter was designed against the current OpenCode documentation for:

- project agents in `.opencode/agents/`
- project commands in `.opencode/commands/`
- `$ARGUMENTS` and file references in command templates
- permission-based agent tool control

References checked on 2026-08-10:

- https://opencode.ai/docs/agents/
- https://opencode.ai/docs/commands/
- https://opencode.ai/docs/skills/
- https://opencode.ai/docs/rules/
