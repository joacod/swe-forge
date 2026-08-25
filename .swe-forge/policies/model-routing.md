# Model Routing Policy

## Principle

SWE Forge is model-agnostic. Canonical files name capability classes only.
Harness adapters or user configuration map those classes to available models,
providers, or harnesses.

## Capability Classes

```yaml
orchestrator:
  capability: strongest-reasoning
architect:
  capability: strongest-reasoning
researcher:
  capability: fast-capable
implementer:
  capability: strong-coding
test-engineer:
  capability: strong-coding
reviewer:
  capability: strong-independent-reasoning
  prefer_different_model_from_implementer: configurable
debugger:
  capability: strongest-reasoning
refactor-specialist:
  capability: strong-coding
security-reviewer:
  capability: strongest-reasoning
performance-reviewer:
  capability: strongest-reasoning
```

## Default worker runtime

Unless an explicit user or project routing configuration says otherwise,
delegated workers inherit the active root runtime configuration:

```yaml
worker_runtime:
  strategy: inherit
```

Inheritance covers the selected harness/runtime, model provider, model, and
reasoning or thinking configuration. It applies consistently to early
`DELEGATED_RESEARCH`, standard `SUBAGENTS` workers, review workers,
implementation workers, and native subagents. A worker does not receive an
automatic role-based model change merely because it has a different capability
class.

## Selection Rules

- use the active root runtime by default for every delegated worker
- honor an explicit user or project worker-routing override when one exists
- treat capability classes as descriptions for explicit configuration and
  future opt-in optimization, not as automatic role-based selection today
- do not hardcode provider names, credentials, or local model identifiers in
  canonical files

## Configuration and explicit overrides

A harness adapter may map capabilities per role when the user or project
explicitly selects that routing:

```yaml
worker_runtime:
  strategy: override
  roles:
    implementer:
      harness: user-defined
      model: user-defined
    reviewer:
      harness: user-defined
      model: user-defined
```

The values are configuration examples, not dependencies. An explicit override
wins over inheritance; omitted role mappings leave the worker on the active
root runtime. Capability-based choices such as a fast researcher or a stronger
reviewer remain useful future/explicit options, but automatic provider, model,
or reasoning optimization is not enabled by the current default.

## Fallbacks

For an explicitly selected capability override, if a preferred capability is
unavailable:

1. use the strongest available capability within the same role class
2. reduce worker count and preserve bounded scope
3. serialize work when context or model quality makes parallel execution risky
4. record the substitution and any effect on confidence or verification

Inherited workers do not enter role-capability fallback merely because they
have a different role. Never claim model diversity or stronger reasoning that
was not actually used.
