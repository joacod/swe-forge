# Example: Early Scope Decision

The scope decision is a semantic root/orchestrator judgment, not a measure of
how much code a ticket may require. The question is:

> Can this request reasonably produce one cohesive reviewable PR with one
> primary outcome and a bounded implementation surface?

Work may be substantial, touch many files, or use several ordered steps and
still be `PROCEED` when those steps serve one primary outcome. The examples
below are intentionally small; they are not a scoring framework or an
exhaustive fixture matrix.

## 1. Small cohesive ticket — PROCEED

Ticket:

```text
Fix the receipt formatter so a missing optional discount renders as "-" while
preserving existing currency formatting.
```

```text
scope_decision: PROCEED
```

Why: one localized behavior change with a clear test seam and one reviewable
outcome. Continue the normal workflow, including automatic topology selection.

## 2. Substantial but cohesive ticket — PROCEED

Ticket:

```text
Replace invocation parsing with deterministic reserved-token handling, update
the affected adapter entry points, and add focused regression coverage for the
new parser behavior.
```

```text
scope_decision: PROCEED
```

Why: this may change several parser, adapter, and test files, but every step
serves one primary outcome: reliable invocation parsing. Size and file count do
not make it `TOO_BROAD`.

## 3. Several independent improvements — TOO_BROAD

Ticket:

```text
Redesign SWE Forge invocation semantics, simplify review, redesign validation,
clean CI, and compress all documentation.
```

```text
scope_decision: TOO_BROAD
reason: The request combines several independently implementable improvements.
submit separately:
- redesign invocation semantics
- simplify review
- redesign validation
- clean CI
- compress documentation
```

Stop before specification, decomposition, implementation, review, or delivery.
Each suggested chunk may still be substantial and should be evaluated on its
own.

## 4. Broad or open-ended rewrite — TOO_BROAD

Ticket:

```text
Rewrite SWE Forge from the ground up, modernize every adapter and workflow,
eliminate all legacy behavior, and make the system simpler, faster, safer, and
fully documented.
```

```text
scope_decision: TOO_BROAD
reason: This is an open-ended project rewrite with no bounded primary outcome.
submit separately:
- define one specific workflow behavior to change
- modernize one bounded adapter surface
- remove one identified legacy behavior
- make one measurable documentation improvement
```

Stop before downstream workflow machinery and ask for one bounded ticket at a
time.
