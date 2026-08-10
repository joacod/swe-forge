# Codex Adapter

V1 does not require Codex-specific configuration. Use the portable discovery
path directly:

1. place `AGENTS.md`, `SWE-FORGE.md`, and `.swe-forge/` in the repository
2. explicitly write `Use SWE Forge` or reference `SWE-FORGE.md`
3. let the available harness choose the smallest supported topology

This directory is reserved for a future thin Codex adapter if a native command,
skill, agent, or permission mechanism provides a useful projection. Such an
adapter must reference the canonical files and must not duplicate the
workflow.

Reference checked on 2026-08-10:

- https://agents.md/
