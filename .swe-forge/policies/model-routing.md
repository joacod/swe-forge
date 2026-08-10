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

## Selection Rules

- use the strongest available reasoning capability for orchestration and
  architecture when the ticket warrants it
- use a fast capable model for read-only discovery when it preserves evidence
  quality
- use a strong coding capability for bounded implementation and test work
- prefer an independent reasoning context for review
- make cross-model or cross-harness review optional and evidence-driven
- do not hardcode provider names, credentials, or local model identifiers in
  canonical files

## Configuration

A harness adapter may map capabilities per role:

```yaml
implementer:
  harness: user-defined
  model: user-defined

reviewer:
  harness: user-defined
  model: user-defined
```

The values are configuration examples, not dependencies. A user may route all
roles to one model, use different models, or use different harnesses where
the environment supports it.

## Fallbacks

If a preferred capability is unavailable:

1. use the strongest available capability within the same role class
2. reduce worker count and preserve bounded scope
3. serialize work when context or model quality makes parallel execution risky
4. record the substitution and any effect on confidence or verification

Never claim model diversity or stronger reasoning that was not actually used.

## Evaluation

Model routing choices should be measured with the evaluation schema under
`../evals/`. Track correctness, acceptance-test results, defects, cost,
latency, retries, and review catches. Optimize reliability per unit of cost,
not the number of distinct models used.
