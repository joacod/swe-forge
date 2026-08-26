# Changelog

All notable changes to SWE Forge are documented here.

The project is currently experimental. Compatibility and workflow behavior may
change between alpha releases.

## [Unreleased]

- Public invocation now accepts a ticket with optional `guided` delivery intent;
  topology is selected internally and PR delivery remains the default.
- Routing now defaults to `SOLO` and records only the preferred and effective
  topology, concise decision evidence, and safe native-capability fallback;
  bounded `SUBAGENTS` work remains sequential in one checkout.
- Run state carries a durable continuation snapshot, and the Pi adapter reloads
  that state around host lifecycle events and active-PR shorthand recovery.
- Model/provider/reasoning-mode optimization remains intentionally out of scope
  for this change.
- Final alpha hardening adds schema-v4 run state, machine-valid worker
  results, executable Git/validation safeguards, and release-readiness checks.
- PR runs now let agents choose one or more coherent implementation commits
  during the work while binding final validation and review to the committed
  candidate's Git `HEAD` without requiring process checkpoints.
- PR review recovery now uses one fresh independent review and, only for a
  concrete localized finding, one focused repair with affected validation; it
  does not automatically re-review the repaired candidate.
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

- Portable `SOLO` and `SUBAGENTS` workflow guidance with one writable delivery
  checkout and optional bounded native delegation.
- Separate `GUIDED` and `PR` delivery modes with explicit delivery boundaries.
- First-class Pi, Compatible OpenCode, and Experimental OMP, Claude Code,
  Codex, and Cursor adapters, with no feature-parity requirement.
- Transactional source-link installation and verification with collision and
  rollback checks.
- Executable validation and delivery gates.
- Installer lifecycle inspection and safe update/uninstall support.

### Known limitations

- The planned release is experimental and does not promise stable or
  feature-parity compatibility across harness adapters.
- All harness installations are user-level source links and require a current
  managed manifest for safe update or uninstall. Obsolete installations are
  inspectable, but destructive operations refuse to guess ownership.
- Native delegated execution depends on a demonstrated host capability and
  falls back to root-owned sequential work when unavailable.
- SWE Forge creates pull requests in PR mode but never merges them or publishes
  a release automatically.

[Unreleased]: https://github.com/joacod/swe-forge/compare/v0.1.0-alpha.1...HEAD
[0.1.0-alpha.1]: https://github.com/joacod/swe-forge/releases/tag/v0.1.0-alpha.1
