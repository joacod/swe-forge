# Claude Code Adapter

Claude Code is an experimental adapter. Installer and skill projection fixtures
show that the files can be installed with the expected structure; they do not
constitute behavioral validation. The maintainer has not actively exercised
SWE Forge through Claude Code.

Claude Code reads `CLAUDE.md`, not `AGENTS.md`, so the repository root includes
the smallest compatible bridge:

```markdown
@AGENTS.md
```

This import keeps `AGENTS.md` as the shared discovery and activation source.
Do not add the Forge workflow to `CLAUDE.md`.

## Explicit Skill

The installer links `skills/swe-forge/SKILL.md` to:

```text
~/.claude/skills/swe-forge/SKILL.md
```

The skill creates `/swe-forge` and uses `disable-model-invocation: true`, so
Claude can run it only when the user explicitly invokes it. The skill body is a
loader that reads the user-level canonical support tree and ticket workflow; it
does not duplicate them.

Natural-language activation remains available without installing the skill:

```text
Use SWE Forge.

<ticket>
```

Claude Code has no verified pre-agent runtime hook in this adapter. The skill
leaves raw arguments untouched and the canonical ticket bootstrap invokes
`~/.claude/swe-forge/.swe-forge/tools/swe-forge-invocation` once before
workflow reasoning. Project-specific `CLAUDE.md` configuration remains the
harness's concern and is not changed by the installer. See [shared adapter
behavior](../README.md).

## Native Subagents

Claude Code supports project subagents under `.claude/agents/`. Add a thin
role bridge only when native registration provides a real benefit. Before
launch, invoke `../../tools/swe-forge-worker-brief render` with root-produced
structured input and pass its validated output unchanged with the relevant
canonical role and result/review contract. The renderer owns inclusion and
dependency rules; this adapter does not construct briefing fields.

Use read-only tool lists for researchers, architects, reviewers, security
reviewers, and performance reviewers. Give write tools only to a bounded task
whose contract authorizes them. Omit model fields unless the user explicitly
chooses a model mapping. Writable native subagents in one checkout run
sequentially; the root orchestrator retains final integration and delivery.

## Installed projection

The installer links:

```text
~/.claude/skills/swe-forge/SKILL.md
~/.claude/swe-forge/AGENTS.md
~/.claude/swe-forge/SWE-FORGE.md
~/.claude/swe-forge/.swe-forge/
```

The skill reads canonical files through that stable support path, so a reviewed
update to the source checkout updates future sessions. Existing files are never
overwritten.

## References

The adapter follows current Claude Code conventions for:

- project `CLAUDE.md` imports using `@AGENTS.md`;
- project skills under `.claude/skills/<name>/SKILL.md`;
- user-invoked skills with `disable-model-invocation: true`; and
- project subagents under `.claude/agents/`.

References checked on 2026-08-10:

- https://code.claude.com/docs/en/memory
- https://code.claude.com/docs/en/sub-agents
- https://code.claude.com/docs/en/skills
