# Example: Simple Ticket

This example shows a small change where delegation would add overhead without
adding useful independence.

## Ticket

```text
Fix the receipt formatter so a missing optional discount renders as "-" instead
of the string "undefined". Keep existing currency formatting unchanged.
```

## Ingest and Discovery

Observed repository evidence:

- `src/receipts/format-total.ts` formats the optional discount value.
- `src/receipts/format-total.test.ts` covers currency and zero-value discounts.
- The repository uses the existing unit-test command for receipt tests.

Acceptance criteria:

- missing discount renders as `-`
- zero discount still renders as the formatted zero value
- non-zero discounts retain existing currency formatting
- unrelated receipt fields are unchanged

Assumption: the display token `-` is required only for the missing value, not
for zero or invalid input. This is safe because the ticket explicitly
distinguishes a missing optional field from existing numeric cases.

## Architecture and Route

```text
requested_mode: AUTO
execution_mode: SOLO
requested_delivery: DEFAULT
delivery_mode: GUIDED
reason: One localized formatter change with tightly coupled tests and no useful independent ownership.
```

No architect, security reviewer, performance reviewer, or Herdr workspace is
needed. The active agent performs lightweight orchestration, implementation,
verification, and final review in one context.

## Test Strategy

Add or update focused cases for missing, zero, and non-zero discounts. Run the
receipt test file and inspect the final diff. A full repository build is not
justified unless repository instructions require it for formatter changes.

## Guided Checkpoint

After the formatter slice passes its focused checks, stop and report the diff
boundary. The user can reply `continue`, `revise: ...`, or `commit and continue`.
The checkpoint is not a final acceptance result until the whole ticket is done.

## Implementation Result

The following is hypothetical expected output. Replace the command placeholder
with the repository command and run it before returning `DONE`:

```text
STATUS: DONE
TASK_ID: receipt-discount-placeholder
SUMMARY: Added an explicit missing-value branch without changing numeric formatting.
FILES_TOUCHED:
- src/receipts/format-total.ts
- src/receipts/format-total.test.ts
TESTS_RUN:
- command: <receipt test command>
  requirement: required
  condition: always
  result: passed
TEST_RESULTS: Missing, zero, and non-zero discount cases pass.
EVIDENCE:
- The formatter now distinguishes absent discount from numeric zero.
- The diff contains no unrelated changes.
ASSUMPTIONS:
- The existing repository test command is the authoritative focused check.
RISKS: none identified.
FOLLOWUPS: none.
```

## Final Acceptance

The acceptance gate passes because all ticket criteria are covered, the focused
tests pass, and the final diff was inspected. The report records
`review: skipped` because this is a trivial localized `SOLO` change below the
independent-review trigger.
