# Codex Adapter

Codex is an experimental adapter. Its shared Agent Skill projection and
installer fixture can be checked structurally, but Codex has not been
installed or behaviorally exercised in the current validation environment.

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

Invoke it explicitly with `$swe-forge <ticket>`. The shared skill keeps the
raw request unchanged; because this adapter has no verified pre-agent runtime
hook, the canonical ticket bootstrap invokes
`~/.agents/swe-forge/.swe-forge/tools/swe-forge-invocation` once before
reasoning about the software task. For isolated execution, state "Use
`isolated` with Herdr as the execution provider" in the ticket when that
optional provider preference is wanted. Natural-language activation through
the project's `AGENTS.md` remains the fallback.

See the [shared Agent Skill adapter](../shared/agent-skill/README.md) for the
current Codex and Cursor documentation references.
