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

`PASS` may include explicitly nonblocking findings. Use an empty list when no
findings remain:

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
repair. Apply this blocking matrix consistently:

- every critical finding blocks until resolved or reclassified with evidence
- a high-severity finding with high or medium confidence blocks
- any high-confidence correctness, security, data-integrity, or compatibility
  finding blocks regardless of severity
- medium and low findings outside those rules may remain under `PASS` as
  explicit risks
- low-confidence stylistic opinions do not block acceptance by themselves
