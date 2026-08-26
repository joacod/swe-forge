# Example: Early Scope Decision

The decision is semantic, not a size or file-count limit:

> Can this request produce one cohesive reviewable PR with one primary outcome
> and a bounded implementation surface?

## 1. Small cohesive ticket — PROCEED

```text
Fix the receipt formatter so a missing optional discount renders as "-" while
preserving existing currency formatting.

scope_decision: PROCEED
```

One behavior and one test seam; continue the normal workflow.

## 2. Substantial but cohesive ticket — PROCEED

```text
Replace invocation parsing, update its adapter entry points, and add focused
regression coverage.

scope_decision: PROCEED
```

Several files and ordered steps still serve one outcome.

## 3. Several independent improvements — TOO_BROAD

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

Stop before downstream workflow machinery.

## 4. Broad or open-ended rewrite — TOO_BROAD

```text
Rewrite every adapter and workflow to be simpler, faster, safer, and fully
documented.

scope_decision: TOO_BROAD
reason: This is an open-ended rewrite without one bounded outcome.
submit separately:
- one workflow behavior
- one adapter surface
- one measurable documentation change
```
