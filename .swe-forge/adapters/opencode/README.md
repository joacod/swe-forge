# OpenCode Adapter

This adapter exposes SWE Forge through current OpenCode project conventions.
OpenCode discovers project agents under `.opencode/agents/` and project
commands under `.opencode/commands/`. Skills can also be discovered under
`.opencode/skills/`, `.agents/skills/`, or compatible project locations.

The adapter does not redefine the workflow. The canonical files remain
`AGENTS.md`, `SWE-FORGE.md`, and `.swe-forge/`.

## Explicit Command

Copy or link `commands/swe-forge.md` to:

```text
.opencode/commands/swe-forge.md
```

The command uses OpenCode's file references and `$ARGUMENTS` substitution to
load the canonical instructions only when the user types `/swe-forge`.

Do not install a command that auto-runs the workflow for ordinary prompts.

The global installer links the global loader to
`~/.config/opencode/commands/swe-forge.md` and exposes the canonical source
through `~/.config/opencode/swe-forge/`. The loader uses OpenCode's supported
home-relative file references, so projects do not need local canonical copies
for `/swe-forge`.

## Native Subagents

OpenCode provides native primary and subagent modes. Use them when the routing
policy selects `SUBAGENTS`. Built-in read-only exploration or general-purpose
workers can receive a bounded task and the relevant canonical role file.

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
invocation control as the Claude Code skill loader. A future skill adapter must
remain a thin loader and must preserve the activation contract.

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
