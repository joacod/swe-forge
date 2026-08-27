# Claude Code Adapter

Claude Code is an experimental adapter. Installation structure is covered by
fixtures; that is not live behavioral validation.

Claude reads `CLAUDE.md`, so the repository's bridge remains only:

```markdown
@AGENTS.md
```

Do not copy the Forge workflow into `CLAUDE.md`.

## Explicit skill

The installer links `skills/swe-forge/SKILL.md` to
`~/.claude/skills/swe-forge/SKILL.md`. Its
`disable-model-invocation: true` setting requires an explicit `/swe-forge`;
natural-language `Use SWE Forge` also remains valid. The skill is a thin loader
for the user-level canonical support tree and preserves raw arguments. The
canonical bootstrap invokes the shared parser once when the host supplies no
normalized facts.

## Native subagents

A thin `.claude/agents/` bridge may load a canonical role when useful. Before
launch, create and validate the canonical JSON worker brief and pass it
unchanged with the role and result/review contract. Read-only roles receive no
write tools; writable scope comes from the task contract. Native writes are
sequential in one delivery checkout; the root owns integration and delivery.

## Installed projection

```text
~/.claude/skills/swe-forge/SKILL.md
~/.claude/swe-forge/{AGENTS.md,SWE-FORGE.md,.swe-forge/}
```

Project-specific Claude configuration is not changed. See
[shared adapter behavior](../README.md).

References:

- https://code.claude.com/docs/en/memory
- https://code.claude.com/docs/en/sub-agents
- https://code.claude.com/docs/en/skills
