---
name: Real-run report
about: Share what happened during an actual harness run of a SWE Forge ticket
title: "[Run report] "
labels: ""
assignees: ""
---

## Run details

This template is for actual harness usage. Installer or projection-only checks
belong in the installation/adapter template and should not be reported as real
harness validation.

- Harness and version:
- Model:
- Operating system:
- SWE Forge version or commit:
- Repository type or stack:
- Raw invocation (including mode tokens):
- Ticket size: small / medium / large
- Requested topology: AUTO / SOLO / SUBAGENTS
- Selected topology: SOLO / SUBAGENTS / unknown
- Native subagent capability, if used: available / unavailable / unknown
- Routing fallback or revision, if any:
- Delivery mode: GUIDED / PR
- Final status: ACCEPTED / BLOCKED / FAILED / unknown
- Did it create a delivery branch? yes / no / unknown
- Did it create a PR? yes / no / not applicable
- Was context pressure, compaction, or overflow recovery observed? yes / no / unknown

## What happened?

- What did Forge prevent or catch?
- What evidence or validation was most useful?
- What ceremony felt unnecessary?
- Did the receipt help explain the run? Why or why not?

## Would you use it again?

Would you use SWE Forge for another ticket? What would make that more likely?

## Optional evidence

Paste a redacted receipt or concise summary. Do not include transcripts,
credentials, private ticket details, or personal paths.
