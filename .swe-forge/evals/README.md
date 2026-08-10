# SWE Forge Evaluation

SWE Forge should not be assumed to outperform one strong coding agent. Evaluate
the workflow against a normal strong-agent baseline before changing routing
policies or adding roles.

## Benchmark Set

Use approximately 20 to 50 historical, representative tickets. Preserve the
original ticket text, repository revision, acceptance tests, and relevant
repository instructions. Do not use private credentials or commit proprietary
ticket data to this repository.

Segment tickets by:

- trivial
- normal
- complex
- cross-module
- bugfix
- refactor
- architectural
- security-sensitive

Keep the ticket distribution visible. Do not let a workflow look better by
being evaluated only on tasks that match its strengths.

## Conditions

Compare at least:

- `baseline`: one normal strong coding agent using the repository normally
- `swe-forge`: explicit Forge invocation with adaptive routing

Use the same repository revision, ticket, acceptance tests, environment
limits, and time budget where practical. Randomize order or use matched pairs
to reduce learning and environment effects. Review results independently when
possible.

## Measures

Record:

- correct completion rate
- acceptance-test pass rate
- regressions introduced
- human corrections required
- defects caught during independent review
- tokens or equivalent model usage
- elapsed execution time
- agent calls and worker count
- retries and blocked tasks
- worktrees and external orchestration overhead
- final diff size and unrelated modifications

Measure both outcome and cost. A small correctness gain may not justify large
orchestration overhead, while a small cost increase may be justified for
high-risk work if review catches materially more defects.

## Method

1. Freeze the ticket and repository revision.
2. Run the baseline and Forge conditions under the same observable constraints.
3. Capture machine-measurable outcomes using `benchmark-schema.md`.
4. Run acceptance tests and repository quality gates independently of agent
   claims.
5. Have a reviewer classify correctness, regressions, and human corrections.
6. Compare results by ticket segment, not only aggregate average.
7. Track routing decisions, retries, and topology failures.
8. Tune policies only when the evidence supports a change.

## Learning Routing Policies

Use evaluation evidence to learn statements such as:

```text
Tasks of type X usually perform better SOLO.
Tasks of type Y benefit from a fresh reviewer.
Tasks of type Z benefit from isolated worktrees.
```

Keep these as measured policy hypotheses until they are supported by enough
representative tickets. Do not optimize for agent count, model diversity, or
workflow ceremony.

## Reporting

Publish aggregate results with ticket segments, sample size, missing data,
confidence limitations, and orchestration overhead. Keep raw proprietary ticket
data outside this public repository unless it is safe to share.
