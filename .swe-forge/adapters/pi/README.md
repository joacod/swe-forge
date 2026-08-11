# Pi Adapter

This adapter exposes SWE Forge through Pi's global prompt-template convention.
It does not add an extension, plugin, package manifest, or Pi settings entry.

## Global Installation

Install the source-linked global bridge explicitly:

```bash
scripts/swe-forge install pi --global
scripts/swe-forge verify pi --global
```

The installer creates:

```text
~/.pi/agent/prompts/swe-forge.md
~/.pi/agent/swe-forge/
```

The prompt loader points to the canonical `AGENTS.md`, `SWE-FORGE.md`, and
`.swe-forge/` files in the support directory. Link mode is the default, so
updating the stable SWE Forge checkout updates the installed source after
review. Global copy mode remains unsupported, matching the other global
installations.

## Invocation

Pi derives the prompt-template command from its filename:

```text
/swe-forge <ticket>
/swe-forge solo <ticket>
/swe-forge subagents <ticket>
/swe-forge herdr <ticket>
```

The template uses Pi's `$ARGUMENTS` expansion and is only processed when the
user explicitly types `/swe-forge`. Ordinary prompts remain unchanged.

Pi does not provide native subagents by default. If `SUBAGENTS` is unavailable,
the canonical workflow falls back to `SOLO` or sequential execution according
to its routing and safety rules. Herdr remains optional and is used only when
the required tooling is available.

## References

The adapter was designed against the current Pi documentation for:

- global prompt templates under `~/.pi/agent/prompts/`
- prompt-template arguments and `$ARGUMENTS`
- global settings and resource discovery

References checked on 2026-08-11:

- https://pi.dev/docs/latest/prompt-templates
- https://pi.dev/docs/latest/settings
