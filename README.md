# SWE Forge

[![CI](https://github.com/joacod/swe-forge/actions/workflows/ci.yml/badge.svg)](https://github.com/joacod/swe-forge/actions/workflows/ci.yml)

SWE Forge turns explicit coding tickets into bounded, evidence-backed changes.
It sits above your coding harness: it helps inspect, plan, implement, verify,
review, and report without replacing the harness itself.

SWE Forge is harness-agnostic and opt-in. A run takes one ticket toward one
reviewable delivery outcome and owns one writable delivery checkout. Native
harness subagents may assist with bounded work; orchestration of concurrent
mutation of the canonical delivery candidate and fleet management are outside
SWE Forge's scope.

## What it does

```text
ticket → inspect and plan → choose SOLO or SUBAGENTS → implement → validate → one fresh review → optional repair/validate → deliver/report
```

It chooses the smallest useful execution topology:

- `SOLO` for tightly coupled work;
- `SUBAGENTS` when demonstrated native delegation adds value, with writable
  results materialized and accepted sequentially against the canonical delivery
  candidate.

The [workflow specification](SWE-FORGE.md) and
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
needed. See the [installation guide](docs/installation.md) for supported link
locations and optional capabilities.

## Use

Invoke SWE Forge explicitly through the installed harness entry point. Give it
one focused ticket and SWE Forge will take it through validation and one
independent review to a reviewable PR, using `PR` delivery with automatic
topology by default. A concrete localized finding may receive one focused repair
and affected validation; the repaired candidate is not independently re-reviewed:

```text
/swe-forge <ticket>
```

For the exceptional manual-checkpoint flow, opt in explicitly:

```text
/swe-forge guided <ticket>
```

`/swe-forge pr <ticket>` remains a backwards-compatible explicit alias. Use
`solo` or `subagents` before the ticket when you need to override topology.
Neither mode merges automatically. Codex exposes the same explicit
skill as `$swe-forge`; the other listed adapters use `/swe-forge`.

## Documentation

- [Workflow specification](SWE-FORGE.md)
- [Installation](docs/installation.md)
- [Architecture](docs/architecture.md)
- [Harness compatibility](docs/compatibility.md)
- [Adapter documentation](.swe-forge/adapters/README.md)
- [Contributing](CONTRIBUTING.md)

## Status

SWE Forge is pre-alpha. For feedback, [open an issue](https://github.com/joacod/swe-forge/issues/new/choose).
