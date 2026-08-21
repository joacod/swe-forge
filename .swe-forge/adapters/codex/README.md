# Codex Adapter

Codex uses the shared Agent Skill projection at
[`../shared/agent-skill/`](../shared/agent-skill/). The Codex-specific directory
contains these installation notes; the skill payload lives only in the shared
projection.

Install explicitly:

```bash
scripts/swe-forge install codex
scripts/swe-forge verify codex
```

The skill is installed at `~/.agents/skills/swe-forge/` and reads canonical
support files from `~/.agents/swe-forge/`. The installer does not modify
`~/.codex/AGENTS.md`, `config.toml`, permissions, models, credentials, or other
personal Codex configuration.

Invoke it explicitly with `$swe-forge <ticket>`. For isolated execution,
state "Use `isolated` with Herdr as the execution provider" in the ticket when
that optional provider preference is wanted. Natural-language activation
through the project's `AGENTS.md` remains the fallback.

See the [shared Agent Skill adapter](../shared/agent-skill/README.md) for the
current Codex and Cursor documentation references.
