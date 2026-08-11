# Cursor Adapter

Cursor supports repository `AGENTS.md` instructions and Agent Skills. This
adapter keeps the canonical workflow in `AGENTS.md`, `SWE-FORGE.md`, and
`.swe-forge/`, then exposes an explicit `/swe-forge` skill without copying the
workflow into Cursor-specific rules or settings.

## Project installation

Install the source-linked adapter into a project:

```bash
scripts/swe-forge install cursor --target /path/to/project
scripts/swe-forge verify cursor --target /path/to/project
```

The installer provides:

```text
AGENTS.md                         canonical project instructions
SWE-FORGE.md                      canonical workflow specification
.swe-forge/                       canonical roles, contracts, policies, and workflow
.cursor/skills/swe-forge/         explicit Cursor skill loader
```

Cursor discovers project instructions from the repository's `AGENTS.md` and
project skills from `.cursor/skills/`. The skill sets
`disable-model-invocation: true`, so ordinary prompts do not activate SWE
Forge. Invoke it explicitly with `/swe-forge <ticket>` or use the natural
language activation contract from `AGENTS.md`.

## Global installation

Install the source-linked user adapter explicitly:

```bash
scripts/swe-forge install cursor --global
scripts/swe-forge verify cursor --global
```

The global installation uses:

```text
~/.cursor/swe-forge/         source-linked canonical support files
~/.cursor/skills/swe-forge/  source-linked user skill
```

It does not modify Cursor settings, CLI configuration, permissions, models,
credentials, or team configuration. The global skill reads the canonical files
through the stable `~/.cursor/swe-forge/` support path.

## Native capabilities

Cursor provides native skills, subagents, models, permissions, and worktree
support. SWE Forge leaves those choices to Cursor and the canonical routing and
safety policies; it does not install a model, permission, or custom subagent
configuration. If a requested topology is unavailable, the workflow uses its
documented fallback rules.

## References

The adapter follows current Cursor guidance for:

- [Cursor documentation](https://cursor.com/docs)
- [Rules and AGENTS.md](https://cursor.com/docs/rules)
- [Agent Skills](https://cursor.com/docs/skills)
- [Subagents](https://cursor.com/docs/subagents)

References checked on 2026-08-11.
