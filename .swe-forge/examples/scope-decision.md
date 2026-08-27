# Example: Early Scope Decision

Decide semantically, not by size or file count:

> Can this request produce one cohesive reviewable PR with one primary outcome
> and a bounded implementation surface?

## Cohesive — `PROCEED`

```text
Fix the receipt formatter so a missing optional discount renders as "-" while
preserving existing currency formatting.

scope_decision: PROCEED
```

One behavior and one test seam; continue.

A substantial request can also proceed when its ordered steps serve one outcome:

```text
Replace invocation parsing, update its adapter entry points, and add focused
regression coverage.

scope_decision: PROCEED
```

## Independent or open-ended — `TOO_BROAD`

```text
Redesign invocation, review, validation, CI, and documentation independently.

scope_decision: TOO_BROAD
reason: The request bundles independent outcomes.
submit separately:
- invocation semantics
- review and validation
- CI
- documentation
```

Stop before downstream workflow. Use the same result for an open-ended rewrite;
name the smallest separate tickets instead of accepting an unbounded outcome.
