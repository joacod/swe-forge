# OpenCode Adapter

This adapter exposes SWE Forge through current OpenCode user-level
conventions. OpenCode is a Compatible adapter with prior successful use. Its
demonstrated capabilities may differ from other adapters while the canonical
workflow remains portable and no parity requirement follows.

OpenCode discovers user commands under `~/.config/opencode/commands/`.
Project agents and commands may still be used for unrelated harness
configuration. The adapter does not redefine the workflow; canonical files
remain `AGENTS.md`, `SWE-FORGE.md`, and `.swe-forge/`.

## Explicit Command

The installer links `commands/swe-forge.md` to:

```text
~/.config/opencode/commands/swe-forge.md
```

The command uses OpenCode's file references and `$ARGUMENTS` substitution to
load canonical instructions only when the user types `/swe-forge`. The
canonical ticket bootstrap invokes
`~/.config/opencode/swe-forge/.swe-forge/tools/swe-forge-invocation` exactly
once and passes normalized facts to the agent; this adapter does not copy
grammar into the command body.

The delivery helpers are separate explicit commands:

```text
/git-commit [paths|message]
/git-push [force|-f]
/git-pr [draft]
/git-sync
```

They load `.swe-forge/policies/delivery.md` rather than copying its procedure.
`/git-pr draft` is an explicit draft request; plain `/git-pr` retains
normal/open behavior. See [shared adapter behavior](../README.md).

Do not install a command that auto-runs the workflow for ordinary prompts.

## Native Subagents

OpenCode provides native primary and subagent modes. Use them when the routing
policy selects `SUBAGENTS`. Before launch, invoke
`../../tools/swe-forge-worker-brief render` with root-produced structured input
and pass its validated output unchanged with the relevant canonical role and
result/review contract. The renderer owns inclusion and dependency rules; this
adapter does not construct briefing fields.

Writable native subagents in one checkout must run sequentially. Non-overlapping
file scope alone does not make concurrent writes safe. The root orchestrator
keeps final integration and delivery under its own checkout.

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

## Runtime and Permissions

OpenCode runtime and permission mappings are configuration choices. Keep them in
the target project's OpenCode configuration or user configuration, never in
canonical role files.

The adapter does not require a particular runtime, permission mode, or MCP
server.

## Skills

The explicit command is the default integration because current OpenCode skill
discovery is agent-visible and does not provide the same explicit-only
invocation control as the command loader. A future skill adapter should remain
a small host projection and preserve the activation contract.

## References

The adapter was designed against current OpenCode documentation for:

- project agents in `.opencode/agents/`;
- project commands in `.opencode/commands/`;
- `$ARGUMENTS` and file references in command templates; and
- permission-based agent tool control.

References checked on 2026-08-10:

- https://opencode.ai/docs/agents/
- https://opencode.ai/docs/commands/
- https://opencode.ai/docs/skills/
- https://opencode.ai/docs/rules/
