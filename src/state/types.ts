export type RunStatus =
  | "planning"
  | "running"
  | "blocked"
  | "reviewing"
  | "repairing"
  | "accepted"
  | "failed";

export type DeliveryMode = "GUIDED" | "PR";
export type Topology = "SOLO" | "SUBAGENTS";
export type ContinuationWorkflow = "ticket" | "delivery" | "other";
export type ContinuationPhase =
  | "planning"
  | "discovery"
  | "implementation"
  | "review"
  | "delivery"
  | "awaiting_merge"
  | "recovery"
  | "complete";
export type Awaiting = "none" | "user_merge" | "user_decision" | "recovery";
export type NextActionKind =
  | "specify"
  | "discover"
  | "implement"
  | "validate"
  | "review"
  | "verify_and_sync_merge"
  | "recover"
  | "none";
export type ValidationStatus = "pending" | "passed" | "failed";
export type ReviewStatus = "pending" | "pass" | "changes-required" | "repaired" | "skipped";
export type DeliveryStatus = "not-applicable" | "pending" | "complete" | "blocked";
export type PullRequestState = "DRAFT" | "OPEN" | "MERGED" | "CLOSED" | "none";
export type TaskStatus = "pending" | "ready" | "running" | "blocked" | "done" | "failed" | "skipped";

export interface Routing {
  preferred: Topology;
  current: Topology;
  reason: string;
  fallback: string;
}

export interface Checkout {
  path: string;
  branch: string;
  base_sha: string;
  head_sha: string;
}

export interface NextAction {
  kind: NextActionKind;
  target: string;
  acceptance: string[];
}

export interface Continuation {
  workflow_active: boolean;
  workflow: ContinuationWorkflow;
  phase: ContinuationPhase;
  step: string;
  awaiting: Awaiting;
  next_action: NextAction;
  safe_boundary: boolean;
  updated_at: string;
}

export interface Validation {
  head_sha: string;
  status: ValidationStatus;
  reference: string;
}

export interface Review {
  status: ReviewStatus;
  reviewed_head: string;
  repair_used: boolean;
  blocked_by: string[];
}

export interface Delivery {
  status: DeliveryStatus;
  pull_request_ref: string;
  pr_number: string;
  pr_state: PullRequestState;
}

export interface TaskState {
  status: TaskStatus;
  dependencies: string[];
  accepted_result_ref: string;
}

export interface RunState {
  workflow: "swe-forge";
  workflow_version: 1;
  schema_version: 5;
  run_id: string;
  status: RunStatus;
  delivery_mode: DeliveryMode;
  routing: Routing;
  checkout: Checkout;
  continuation: Continuation;
  validation: Validation;
  review: Review;
  delivery: Delivery;
  tasks?: Record<string, TaskState>;
}

export interface StateProjection {
  schema: "swe-forge-state/v1";
  valid: boolean;
  active: boolean;
  delegation_authorized: boolean;
  reason: string;
  state_file: string;
  run_id: string;
  status: string;
  checkout: string;
  updated_at: string;
  updated_at_ms: number;
  modified_at_ms: number;
  routing: {
    preferred: string;
    current: string;
    reason: string;
    fallback: string;
  };
  delivery_mode: string;
  checkout_state: {
    branch: string;
    base_sha: string;
    head_sha: string;
  };
  validation: {
    head_sha: string;
    status: string;
    reference: string;
  };
  review: {
    status: string;
    reviewed_head: string;
    repair_used: boolean;
  };
  continuation: {
    workflow_active: boolean;
    phase: string;
    step: string;
    awaiting: string;
    next_action: {
      kind: string;
      target: string;
      acceptance: string[];
    };
    safe_boundary: boolean;
  };
  delivery: {
    status: string;
    pull_request_ref: string;
    pr_number: string;
    pr_state: string;
  };
}

export interface InspectionRecord {
  projection: StateProjection;
  statePath: string;
  runId: string;
  updatedEpoch: number;
  modifiedEpoch: number;
}
