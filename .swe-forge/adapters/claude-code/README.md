# Claude Code Adapter

Claude Code is an experimental adapter. Installer fixtures cover structure;
that is not live behavioral validation.

Claude reads `CLAUDE.md`, so the repository bridge stays:

```markdown
@AGENTS.md
```

Do not copy Forge workflow into `CLAUDE.md`.

## Skill and native workers

The installer links `skills/swe-forge/SKILL.md` to
`~/.claude/skills/swe-forge/SKILL.md`. `disable-model-invocation: true`
requires explicit `/swe-forge`; natural-language `Use SWE Forge` also works.
The skill only loads the user-level support tree and preserves raw arguments.

A thin `.claude/agents/` bridge may load a canonical role. Validate and pass the
canonical JSON worker brief unchanged with the role and result/review contract.
Read-only roles receive no write tools; writable tasks are bounded and
sequential in one checkout. Root owns integration and delivery.

## Installed projection

```text
~/.claude/skills/swe-forge/SKILL.md
~/.claude/swe-forge/{AGENTS.md,SWE-FORGE.md,.swe-forge/}
```

Project-specific Claude configuration is unchanged. See
[shared adapter behavior](../README.md).

References:

- https://code.claude.com/docs/en/memory
- https://code.claude.com/docs/en/sub-agents
- https://code.claude.com/docs/en/skills
