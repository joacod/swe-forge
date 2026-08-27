import { existsSync, readFileSync, statSync } from "node:fs";
import { canonicalPath, parseStateText, parseTimestampEpoch, stateFile } from "./parse";
import { checkoutIdentityReason } from "./git";
import type { InspectionRecord, RunState, StateProjection } from "./types";

const MAX_PROJECTION_LENGTH = 160;
const MAX_ACCEPTANCE_ITEMS = 8;

function bounded(value: string): string {
  return value.slice(0, MAX_PROJECTION_LENGTH);
}

function defaultProjection(statePath: string): StateProjection {
  return {
    schema: "swe-forge-state/v1",
    valid: false,
    active: false,
    delegation_authorized: false,
    reason: "invalid or unsupported run state",
    state_file: statePath,
    run_id: "",
    status: "",
    checkout: "",
    updated_at: "",
    updated_at_ms: 0,
    modified_at_ms: 0,
    routing: { preferred: "", current: "", reason: "", fallback: "" },
    delivery_mode: "",
    checkout_state: { branch: "", base_sha: "", head_sha: "" },
    validation: { head_sha: "", status: "", reference: "" },
    review: { status: "none", reviewed_head: "none", repair_used: false },
    continuation: {
      workflow_active: false,
      phase: "none",
      step: "none",
      awaiting: "none",
      next_action: { kind: "none", target: "none", acceptance: [] },
      safe_boundary: false,
    },
    delivery: { status: "", pull_request_ref: "none", pr_number: "none", pr_state: "none" },
  };
}

function populatedProjection(statePath: string, state: RunState): StateProjection {
  return {
    schema: "swe-forge-state/v1",
    valid: true,
    active: false,
    delegation_authorized: false,
    reason: "invalid or unsupported run state",
    state_file: statePath,
    run_id: state.run_id,
    status: state.status,
    checkout: canonicalPath(state.checkout.path),
    updated_at: state.continuation.updated_at,
    updated_at_ms: 0,
    modified_at_ms: 0,
    routing: {
      preferred: state.routing.preferred,
      current: state.routing.current,
      reason: state.routing.reason,
      fallback: state.routing.fallback,
    },
    delivery_mode: state.delivery_mode,
    checkout_state: {
      branch: state.checkout.branch,
      base_sha: state.checkout.base_sha,
      head_sha: state.checkout.head_sha,
    },
    validation: {
      head_sha: state.validation.head_sha,
      status: state.validation.status,
      reference: bounded(state.validation.reference),
    },
    review: {
      status: state.review.status,
      reviewed_head: bounded(state.review.reviewed_head),
      repair_used: state.review.repair_used,
    },
    continuation: {
      workflow_active: state.continuation.workflow_active,
      phase: bounded(state.continuation.phase),
      step: bounded(state.continuation.step),
      awaiting: bounded(state.continuation.awaiting),
      next_action: {
        kind: bounded(state.continuation.next_action.kind),
        target: bounded(state.continuation.next_action.target),
        acceptance: state.continuation.next_action.acceptance
          .slice(0, MAX_ACCEPTANCE_ITEMS)
          .map((value) => bounded(value)),
      },
      safe_boundary: state.continuation.safe_boundary,
    },
    delivery: {
      status: state.delivery.status,
      pull_request_ref: bounded(state.delivery.pull_request_ref),
      pr_number: bounded(state.delivery.pr_number),
      pr_state: bounded(state.delivery.pr_state),
    },
  };
}

function fileMtimeMilliseconds(path: string): number | undefined {
  try {
    return Math.floor(statSync(path).mtimeMs / 1000) * 1000;
  } catch {
    return undefined;
  }
}

export function inspectStateData(stateInput: string, checkoutInput: string): InspectionRecord {
  const statePath = canonicalPath(stateFile(stateInput));
  const requestedCheckout = canonicalPath(checkoutInput);
  let projection = defaultProjection(statePath);
  let state: RunState;
  try {
    state = parseStateText(readFileSync(statePath, "utf8"));
  } catch {
    return { projection, statePath, runId: "", updatedEpoch: 0, modifiedEpoch: 0 };
  }

  projection = populatedProjection(statePath, state);
  const identityReason = checkoutIdentityReason(state.checkout, requestedCheckout);
  if (identityReason !== undefined) {
    projection.reason = identityReason;
    return { projection, statePath, runId: state.run_id, updatedEpoch: 0, modifiedEpoch: 0 };
  }
  if (projection.checkout !== requestedCheckout) {
    projection.reason = "checkout mismatch";
    return { projection, statePath, runId: state.run_id, updatedEpoch: 0, modifiedEpoch: 0 };
  }

  const updatedEpoch = parseTimestampEpoch(state.continuation.updated_at);
  if (updatedEpoch === undefined) {
    projection.reason = "stale or malformed continuation timestamp";
    return { projection, statePath, runId: state.run_id, updatedEpoch: 0, modifiedEpoch: 0 };
  }
  const modifiedAtMilliseconds = fileMtimeMilliseconds(statePath);
  if (modifiedAtMilliseconds === undefined) {
    projection.reason = "state file modification time is unavailable";
    return { projection, statePath, runId: state.run_id, updatedEpoch, modifiedEpoch: 0 };
  }
  projection.updated_at_ms = updatedEpoch * 1000;
  projection.modified_at_ms = modifiedAtMilliseconds;

  if (!state.continuation.workflow_active) {
    projection.reason = "inactive workflow continuation";
    return { projection, statePath, runId: state.run_id, updatedEpoch, modifiedEpoch: modifiedAtMilliseconds / 1000 };
  }
  switch (state.status) {
    case "planning":
    case "running":
    case "blocked":
    case "reviewing":
    case "repairing":
      projection.active = true;
      break;
    case "accepted":
    case "failed":
      projection.reason = "terminal or inactive run state";
      return { projection, statePath, runId: state.run_id, updatedEpoch, modifiedEpoch: modifiedAtMilliseconds / 1000 };
  }
  if (state.status === "blocked") {
    projection.reason = "active continuation without delegation authorization";
    return { projection, statePath, runId: state.run_id, updatedEpoch, modifiedEpoch: modifiedAtMilliseconds / 1000 };
  }
  projection.delegation_authorized = true;
  projection.reason = "eligible";
  return { projection, statePath, runId: state.run_id, updatedEpoch, modifiedEpoch: modifiedAtMilliseconds / 1000 };
}

export function resolveActiveStates(
  checkoutInput: string,
  candidates: readonly string[],
  includeAll: boolean,
): { schema: "swe-forge-state/v1"; checkout: string; states: StateProjection[] } {
  const checkout = canonicalPath(checkoutInput);
  const seenPaths = new Set<string>();
  const records: InspectionRecord[] = [];
  for (const candidate of candidates) {
    if (!existsSync(candidate)) continue;
    let record: InspectionRecord;
    try {
      record = inspectStateData(candidate, checkout);
    } catch {
      continue;
    }
    if (!record.projection.active || seenPaths.has(record.statePath)) continue;
    seenPaths.add(record.statePath);
    records.push(record);
  }

  const runCounts = new Map<string, number>();
  for (const record of records) runCounts.set(record.runId, (runCounts.get(record.runId) ?? 0) + 1);
  records.sort((left, right) => {
    if (left.updatedEpoch !== right.updatedEpoch) return right.updatedEpoch - left.updatedEpoch;
    if (left.modifiedEpoch !== right.modifiedEpoch) return right.modifiedEpoch - left.modifiedEpoch;
    return Buffer.from(left.statePath).compare(Buffer.from(right.statePath));
  });
  const states: StateProjection[] = [];
  for (const record of records) {
    if (runCounts.get(record.runId)! > 1) continue;
    if (!includeAll && states.length > 0) break;
    states.push(record.projection);
  }
  return { schema: "swe-forge-state/v1", checkout, states };
}

export function serializeProjection(value: unknown): string {
  return JSON.stringify(value);
}
