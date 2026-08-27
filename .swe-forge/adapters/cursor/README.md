# Cursor Adapter

Cursor uses the shared experimental Agent Skill projection. Installation checks
are structural, not live Cursor validation.

```text
~/.agents/skills/swe-forge/
~/.agents/swe-forge/
```

Invoke `/swe-forge` explicitly. The skill preserves raw arguments and loads the
canonical workflow. Use canonical `SOLO`/`SUBAGENTS` routing; writable work is
sequential in one checkout, with unavailable capabilities falling back to
root-owned sequential work.

References:

- https://cursor.com/docs/skills
- https://cursor.com/docs/rules
