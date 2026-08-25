# Codex Adapter

Codex uses the shared Agent Skill projection. This adapter is experimental:
projection checks demonstrate installation structure, not behavioral validation
through a live Codex session.

The installer links the shared skill and canonical support tree to:

```text
~/.agents/skills/swe-forge/
~/.agents/swe-forge/
```

Codex exposes the explicit skill as `$swe-forge`. The skill forwards raw
invocation arguments to the canonical ticket workflow, which invokes
`~/.agents/swe-forge/.swe-forge/tools/swe-forge-invocation` exactly once when
the host cannot provide normalized facts. Natural-language activation through
the project's `AGENTS.md` remains the fallback.

Use the canonical `SOLO` or `SUBAGENTS` choice. Native delegated writes remain
sequential in one delivery checkout, and unavailable optional capabilities fall
back to root-owned sequential execution.

References checked on 2026-08-11:

- https://developers.openai.com/learn/codex
- https://learn.chatgpt.com/docs/build-skills
