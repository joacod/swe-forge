# Review Contract

Use this contract for independent review after implementation and verification.
Reviewers should receive the original ticket, acceptance criteria, relevant
architecture decisions, final diff, and validation evidence, not the full
implementer transcript.

## Template

```yaml
status: PASS | CHANGES_REQUIRED

findings:
  - id: R1
    severity: critical | high | medium | low
    confidence: high | medium | low
    location: path/to/file.ts:42
    issue: >
      Explain the concrete problem and affected behavior.
    evidence: >
      Cite the code, diff, test, reproduction, or missing requirement.
    recommended_action: >
      Describe the smallest safe repair or validation needed.
```

Use an empty `findings` list for a passing review:

```yaml
status: PASS
findings: []
```

## Severity

- `critical`: security, data integrity, compatibility, or correctness failure
  that makes acceptance unsafe
- `high`: likely correctness or regression issue that should be repaired before
  acceptance
- `medium`: meaningful risk, missing coverage, or maintainability issue that
  may require repair depending on scope and evidence
- `low`: limited impact or optional improvement

## Confidence

- `high`: directly demonstrated by code, tests, reproduction, or clear
  requirement mismatch
- `medium`: well-supported inference with a plausible affected path
- `low`: uncertain suggestion requiring confirmation

Critical and high-severity findings with high confidence normally require
repair. Low-confidence stylistic opinions do not block acceptance by
themselves.
