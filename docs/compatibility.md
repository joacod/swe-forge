# Compatibility

SWE Forge is preparing its first alpha release. The table below records the
pre-release validation snapshot for the planned `v0.1.0-alpha.1`; its tag and
release are not yet published. This is evidence of the adapter shape, not a
promise that future harness releases remain compatible without review.

| Harness or provider | Version observed | Installation scope | Validation posture |
| --- | --- | --- | --- |
| Pi | 0.84.1 | Global | Installer and prompt projection validated locally |
| OpenCode | 1.18.16 | Project and global | Installer and command projection validated locally |
| Claude Code | 2.1.37 | Project and global | Installer and skill projection validated locally |
| Codex | Not installed in the validation environment | Project and global | Shared Agent Skill projection; validate with the target Codex release |
| Cursor | Not installed in the validation environment | Project and global | Shared Agent Skill projection; validate with the target Cursor release |
| Herdr (optional provider) | 0.8.0 | Not an installer target | Provider runbook only; never installed by SWE Forge |

## Context-management snapshot

Context behavior is reported separately because there is no common harness API
for usage telemetry, context-window limits, compaction, or overflow recovery.
The canonical policy uses only capabilities demonstrated by the active host:

| Harness | Observed context capability | Adapter consequence |
| --- | --- | --- |
| Pi 0.84.1 | Native usage display, threshold compaction, overflow compact-and-retry once, and manual `/compact` | Use host recovery, but re-read durable state and Git before continuing; the prompt loader cannot call extension APIs. |
| OpenCode 1.18.16 | Not measured by the SWE Forge adapter snapshot | Do not claim proactive detection; rely on documented host behavior or manual checkpoint/resume until revalidated. |
| Claude Code 2.1.37 | Not measured by the SWE Forge adapter snapshot | Do not claim proactive detection; rely on documented host behavior or manual checkpoint/resume until revalidated. |
| Codex | Not installed in the validation environment | Revalidate context telemetry and compaction behavior with the target release. |
| Cursor | Not installed in the validation environment | Revalidate context telemetry and compaction behavior with the target release. |

The adapters intentionally avoid hard-coded model IDs, permissions, or vendor
configuration. Harnesses should be treated as supported when their current
instruction, command, skill, or Agent Skill behavior matches the documented
adapter contract and the installation smoke test succeeds.

The dependency-free core is checked on Ubuntu and macOS in CI, including
shell syntax, structural checks, executable evidence, isolated-worktree
fixtures, release-readiness preparation, and diff formatting. Windows is not a
claimed compatibility target.

For a new harness release, run the repository checks, install the relevant
projection in a disposable target, run `status` and `doctor`, and invoke a
small explicit `/swe-forge <ticket>` (or the harness equivalent) before relying
on it for a real ticket.
