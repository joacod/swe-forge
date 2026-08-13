# Changelog

All notable changes to SWE Forge are documented here.

The project is currently experimental. Compatibility and workflow behavior may
change between alpha releases.

## [Unreleased]

- Continue collecting real-run reports across supported harnesses.

## [0.1.0-alpha.1] - 2026-08-12

See the [release notes](docs/releases/v0.1.0-alpha.1.md) for installation,
compatibility, and known limitations.

### Added

- Portable `SOLO`, `SUBAGENTS`, and `ISOLATED` workflow guidance.
- Separate `GUIDED` and `PR` delivery modes with explicit delivery boundaries.
- Registry-driven adapters for Pi, OpenCode, Claude Code, Codex, and Cursor.
- Transactional link/copy installation and verification with collision and
  rollback checks.
- Executable evidence gates and compact run receipts.
- Installer lifecycle inspection and safe update/uninstall support.

### Known limitations

- This release is experimental and does not promise stable compatibility.
- Pi installation is global-only; global installations are source-linked.
- Copy installations require an available managed manifest for safe update or
  uninstall. Legacy installations are inspectable but destructive operations
  refuse to guess ownership.
- Isolated execution depends on demonstrated native worktree capabilities or
  the optional Herdr provider; Herdr is never installed automatically.
- SWE Forge creates pull requests in PR mode but never merges them or publishes
  a release automatically.

[Unreleased]: https://github.com/joacod/swe-forge/compare/v0.1.0-alpha.1...HEAD
[0.1.0-alpha.1]: https://github.com/joacod/swe-forge/releases/tag/v0.1.0-alpha.1
