# SWE Forge

[![CI](https://github.com/joacod/swe-forge/actions/workflows/ci.yml/badge.svg)](https://github.com/joacod/swe-forge/actions/workflows/ci.yml)

SWE Forge turns explicit coding tickets into bounded, evidence-backed changes.
It sits above your coding harness: it helps inspect, plan, implement, verify,
review, and report without replacing the harness itself.

SWE Forge is a harness-agnostic, explicitly invoked workflow with a portable
canonical process and adapters for different coding harnesses. It is opt-in,
so ordinary harness prompts remain ordinary prompts.

## What it does

```text
ticket → inspect and plan → choose a topology → implement → verify and review → deliver/report
```

It chooses the smallest useful execution topology:

- `SOLO` for tightly coupled work
- `SUBAGENTS` when bounded delegation adds value
- `ISOLATED` when concurrent writable work needs separate environments

Runs can work directly in one context, use subagents when available and
useful, or use isolated writable workers when the host and provider can support
them safely. The [workflow specification](SWE-FORGE.md) and
[architecture guide](docs/architecture.md) describe the deeper behavior.

## Harnesses

| Harness | Tier |
| --- | --- |
| [Pi](.swe-forge/adapters/pi/README.md) | First-class |
| [OpenCode](.swe-forge/adapters/opencode/README.md) | Compatible |
| [OMP](.swe-forge/adapters/omp/README.md) | Experimental |
| [Claude Code](.swe-forge/adapters/claude-code/README.md) | Experimental |
| [Codex](.swe-forge/adapters/codex/README.md) | Experimental |
| [Cursor](.swe-forge/adapters/cursor/README.md) | Experimental |

Support tiers and available capabilities are asymmetric; feature parity is not
required. See the [compatibility snapshot](docs/compatibility.md) for current
versions and validation evidence.

## Install

SWE Forge has no public release yet; the planned first alpha is
`v0.1.0-alpha.1`. Until publication, `main` is development-only. For
development, clone the repository into a stable user-level checkout and install
the harness projection as links:

```bash
git clone https://github.com/joacod/swe-forge.git ~/tools/swe-forge
cd ~/tools/swe-forge
HARNESS=opencode  # choose any supported harness adapter
scripts/swe-forge install "$HARNESS"
scripts/swe-forge verify "$HARNESS"
```

Set `HARNESS` to `pi`, `opencode`, `omp`, `claude`, `codex`, or `cursor` as
needed. See the
[installation guide](docs/installation.md) for the supported link locations
and optional capabilities.

## Use

Invoke SWE Forge explicitly through the installed harness entry point:

```text
/swe-forge <ticket>
```

The default `GUIDED` mode is reviewable and keeps you in the loop. Use `PR` mode
for the lower-touch path through pull-request creation:

```text
/swe-forge pr <ticket>
```

Neither mode merges automatically. When needed, request the isolated topology
explicitly:

```text
/swe-forge isolated <ticket>
```

Codex exposes the same explicit skill as `$swe-forge`; the other listed
adapters use `/swe-forge`.

## Documentation

- [Workflow specification](SWE-FORGE.md)
- [Installation](docs/installation.md)
- [Architecture](docs/architecture.md)
- [Harness compatibility](docs/compatibility.md)
- [Adapter documentation](.swe-forge/adapters/README.md)
- [Contributing](CONTRIBUTING.md)

## Status

SWE Forge is pre-alpha. For feedback, [open an issue](https://github.com/joacod/swe-forge/issues/new/choose).
