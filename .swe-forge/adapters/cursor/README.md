# Cursor Adapter

Cursor uses the shared Agent Skill projection at
[`../shared/agent-skill/`](../shared/agent-skill/). The Cursor-specific
directory contains these installation notes; the skill payload lives only in
the shared projection.

Install explicitly:

```bash
scripts/swe-forge install cursor
scripts/swe-forge verify cursor
```

The skill is installed at `~/.agents/skills/swe-forge/` and reads canonical
support files from `~/.agents/swe-forge/`. The installer does not modify Cursor
settings, CLI configuration, permissions, models, credentials, or team
configuration.

Invoke it explicitly with `/swe-forge <ticket>`. For isolated execution,
state "Use `isolated` with Herdr as the execution provider" in the ticket when
that optional provider preference is wanted. Natural-language activation
through the project's `AGENTS.md` remains the fallback.

See the [shared Agent Skill adapter](../shared/agent-skill/README.md) for the
current Codex and Cursor documentation references.
