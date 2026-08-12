# SWE Forge

Portable, opt-in workflow orchestration for AI coding harnesses.

SWE Forge helps an agent turn a ticket into a bounded, evidence-backed change:
inspect, plan, implement, verify, review, and report. It sits above your coding
harness. It is not a harness or model provider, and it never activates from
ordinary prompts.

For each explicit ticket, it chooses a proportionate execution mode: `SOLO`,
`SUBAGENTS`, or `HERDR`. This keeps simple work simple while allowing complex
work to be delegated or isolated.

## Install

Keep a checkout somewhere stable:

```bash
git clone https://github.com/joacod/swe-forge.git ~/tools/swe-forge
cd ~/tools/swe-forge
```

For Pi, install the global prompt template:

```bash
scripts/swe-forge install pi --global
```

Pi is global-only. Other supported harnesses can be installed for a project or
globally. Link installations follow updates to this checkout. See the
[installation guide](docs/installation.md) for copy mode, verification,
updates, and conflicts.

## Use

Installation only makes it available; it does not activate the workflow.
Invoke it explicitly with a ticket. Ordinary prompts continue to use your
harness normally. Commits, pushes, pull requests, and merges require explicit
authorization.

| Harness | Installation | Invocation |
| --- | --- | --- |
| [Pi](.swe-forge/adapters/pi/README.md) | Global only | `/swe-forge <ticket>` |
| [OpenCode](.swe-forge/adapters/opencode/README.md) | Project or global | `/swe-forge <ticket>` |
| [Claude Code](.swe-forge/adapters/claude-code/README.md) | Project or global | `/swe-forge <ticket>` |
| [Codex](.swe-forge/adapters/codex/README.md) | Project or global | `$swe-forge <ticket>` |
| [Cursor](.swe-forge/adapters/cursor/README.md) | Project or global | `/swe-forge <ticket>` |

## Learn more

- [Workflow specification](SWE-FORGE.md)
- [Installation guide](docs/installation.md)
- [Architecture](docs/architecture.md)
- [Adapter index](.swe-forge/adapters/README.md)
- [Adding a harness](docs/adding-a-harness.md)
