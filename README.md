# SWE Forge

SWE Forge turns an explicit coding ticket into one bounded, evidence-backed,
reviewable delivery. It sits above the coding harness: it does not replace it.
SWE Forge is harness-agnostic, opt-in, and owns one writable delivery checkout
per run.

## What it does

It chooses the smallest useful path—`SOLO` or bounded `SUBAGENTS`—then helps
inspect, implement, validate, independently review, and report the change.
The extra confidence comes from candidate-bound validation and a fresh review;
SWE Forge never merges automatically.

## Harnesses

Pi is first-class. OpenCode is compatible. OMP, Claude Code, Codex, and Cursor
are experimental. Capabilities are intentionally asymmetric; see the
[compatibility snapshot](docs/compatibility.md).

## Install

Until the first public release, install from a stable checkout:

```bash
git clone https://github.com/joacod/swe-forge.git ~/tools/swe-forge
cd ~/tools/swe-forge
HARNESS=pi
scripts/swe-forge install "$HARNESS"
scripts/swe-forge verify "$HARNESS"
```

Use `pi`, `opencode`, `omp`, `claude`, `codex`, or `cursor`. See the
[installation guide](docs/installation.md) for harness-specific locations.

## Use

Give the installed entry point one focused ticket:

```text
/swe-forge <ticket>
```

PR delivery and automatic topology are the defaults. Use the explicit guided
mode when checkpoints are wanted:

```text
/swe-forge guided <ticket>
```

SWE Forge selects `SOLO` or `SUBAGENTS` internally after inspecting the ticket
and repository. Neither mode merges automatically.

## Documentation

- [Workflow specification](SWE-FORGE.md)
- [Architecture](docs/architecture.md)
- [Installation](docs/installation.md)
- [Harness compatibility](docs/compatibility.md)
- [Adapter reference](.swe-forge/adapters/README.md)
- [Contributing](CONTRIBUTING.md)
