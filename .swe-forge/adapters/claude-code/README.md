# Claude Code Adapter

Claude Code reads `CLAUDE.md`, not `AGENTS.md`, so the repository root includes
the smallest compatible bridge:

```markdown
@AGENTS.md
```

This import keeps `AGENTS.md` as the shared discovery and activation source.
Do not add the Forge workflow to `CLAUDE.md`.

## Explicit Skill

Copy or link `skills/swe-forge/SKILL.md` to:

```text
.claude/skills/swe-forge/SKILL.md
```

The skill creates `/swe-forge` and uses `disable-model-invocation: true`, so
Claude can run it only when the user explicitly invokes it. The skill body is a
loader that reads `AGENTS.md`, `SWE-FORGE.md`, and the V1 workflow; it does not
duplicate them.

In the default link mode, the project `CLAUDE.md` is a relative symlink to the
project `AGENTS.md`. Copy mode writes the equivalent `@AGENTS.md` bridge.

Natural-language activation remains available without installing the skill:

```text
Use SWE Forge.

<ticket>
```

## Native Subagents

Claude Code supports project subagents under `.claude/agents/`. Add a thin
role bridge only when native registration provides a real benefit. Its body
should instruct the subagent to read one canonical file under
`.swe-forge/agents/`, observe the task contract, and return the appropriate
structured result.

Use read-only tool lists for researchers, architects, reviewers, security
reviewers, and performance reviewers. Give write tools only to a bounded task
whose contract authorizes them. Omit model fields unless the user explicitly
chooses a model mapping.

## Global Installation

When the user explicitly requests a global installation, the installer links:

```text
~/.claude/skills/swe-forge/SKILL.md
~/.claude/swe-forge/AGENTS.md
~/.claude/swe-forge/SWE-FORGE.md
~/.claude/swe-forge/.swe-forge/
```

The global skill reads the canonical files through that stable support path, so
`git pull` in the source checkout updates future sessions. Existing global
files are never overwritten.

## References

The adapter follows current Claude Code conventions for:

- project `CLAUDE.md` imports using `@AGENTS.md`
- project skills under `.claude/skills/<name>/SKILL.md`
- user-invoked skills with `disable-model-invocation: true`
- project subagents under `.claude/agents/`

References checked on 2026-08-10:

- https://code.claude.com/docs/en/memory
- https://code.claude.com/docs/en/sub-agents
- https://code.claude.com/docs/en/skills
