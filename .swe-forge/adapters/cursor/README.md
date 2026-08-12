# Cursor Adapter

Cursor uses the shared Agent Skill projection at
[`../shared/agent-skill/`](../shared/agent-skill/). The Cursor-specific
directory contains these installation notes; the skill payload lives only in
the shared projection.

Install explicitly:

```bash
scripts/swe-forge install cursor --target /path/to/project
scripts/swe-forge verify cursor --target /path/to/project
scripts/swe-forge install cursor --global
scripts/swe-forge verify cursor --global
```

The project skill is installed at `.agents/skills/swe-forge/`. The global skill
is installed at `~/.agents/skills/swe-forge/` and reads canonical support files
from `~/.agents/swe-forge/`. The installer does not modify Cursor settings,
CLI configuration, permissions, models, credentials, or team configuration.

Invoke it explicitly with `/swe-forge <ticket>`. A clean protected default
branch gets one dedicated task branch automatically. In guided mode, `go`
commits the reviewed slice and continues; PR mode keeps validated slices as
separate commits before final review and PR creation. Natural-language
activation through the project's `AGENTS.md` remains the fallback.

See the [shared Agent Skill adapter](../shared/agent-skill/README.md) for the
current Codex and Cursor documentation references.
