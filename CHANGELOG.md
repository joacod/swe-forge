# Changelog

All notable changes to SWE Forge are documented here.

The project is currently experimental. Compatibility and workflow behavior may
change between alpha releases.

## [Unreleased]

- Context-aware routing now records reducibility, preferred versus effective
  topology, adaptive `SOLO`/`SUBAGENTS` revisions, delegation backends, and
  capability-aware fallbacks while preserving the writable `ISOLATED` gate.
- Run state now carries a compact durable continuation snapshot, and the Pi
  adapter adds lifecycle-based state reinjection, active-PR shorthand recovery,
  and safe-boundary proactive compaction.
- Model/provider/reasoning-mode optimization remains intentionally out of scope
  for this change.
- Final alpha hardening adds exact candidate-content evidence binding,
  schema-v3 run state, machine-valid isolated worker results, executable
  isolated Git conformance, head-bound receipts, and release-readiness checks.
- PR runs now plan meaningful implementation slices before editing, preserve one
  validated commit per slice, and support sequential slice evidence without
  repeating unchanged run-state validation.
- Receipt generation now keeps a run-local copy by default without adding
  workflow metadata to pull requests.
- Continue collecting real-run reports across harness adapters; projection
  fixtures are not a substitute for real harness evidence.
- The planned first alpha, `v0.1.0-alpha.1`, remains unpublished. Its tagged
  installation instructions become usable only after a separate manual
  publication; until then, `main` remains development-only.

## [0.1.0-alpha.1] (planned; not yet published)

These are the candidate changes for the planned first alpha. See the [planned
release notes](docs/releases/v0.1.0-alpha.1.md) for installation,
compatibility, and known limitations.

### Added

- Portable `SOLO`, `SUBAGENTS`, and `ISOLATED` workflow guidance.
- Separate `GUIDED` and `PR` delivery modes with explicit delivery boundaries.
- A first-class/reference Pi adapter, a compatible/secondary OpenCode adapter,
  and experimental OMP, Claude Code, Codex, and Cursor adapters, with no
  feature-parity requirement.
- Transactional source-link installation and verification with collision and
  rollback checks.
- Executable evidence gates and compact run receipts.
- Installer lifecycle inspection and safe update/uninstall support.

### Known limitations

- The planned release is experimental and does not promise stable or
  feature-parity compatibility across harness adapters.
- All harness installations are user-level source links and require a current
  managed manifest for safe update or uninstall. Obsolete installations are
  inspectable, but destructive operations refuse to guess ownership.
- Isolated execution depends on demonstrated native worktree capabilities or
  the optional Herdr provider; Herdr is never installed automatically.
- SWE Forge creates pull requests in PR mode but never merges them or publishes
  a release automatically.

[Unreleased]: https://github.com/joacod/swe-forge/compare/v0.1.0-alpha.1...HEAD
[0.1.0-alpha.1]: https://github.com/joacod/swe-forge/releases/tag/v0.1.0-alpha.1
