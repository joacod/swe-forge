import { existsSync, mkdirSync } from "node:fs";
import { basename, join } from "node:path";
import {
  normalizeShaOrNone,
  requireBoolArg,
  requireEnumArg,
  requireIdentifier,
  requireScalarArg,
  stateDirectoryForInit,
  validateSha,
  validateUrl,
  StateError,
} from "./parse";
import { assertRecordedHead, checkoutRootForInit, gitOutput, gitSucceeds } from "./git";
import { atomicallyReplaceState, updateState, withStateLock } from "./persistence";
import type { RunState } from "./types";

function optionValue(args: readonly string[], index: number, message: string): string {
  if (index + 1 >= args.length) throw new StateError(message);
  return args[index + 1];
}

function nowUtcSecond(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

function validateStep(value: string): string {
  if (value !== "none" && !/^\d+$/.test(value)) throw new StateError("invalid continuation.step");
  return value;
}

function validatePrNumber(value: string): string {
  if (value !== "none" && !/^\d+$/.test(value)) throw new StateError("invalid delivery.pr_number");
  return value;
}


function baseState(
  runId: string,
  status: RunState["status"],
  deliveryMode: RunState["delivery_mode"],
  checkoutPath: string,
  branch: string,
  baseSha: string,
  headSha: string,
  preferred: RunState["routing"]["preferred"],
  current: RunState["routing"]["current"],
  reason: string,
  fallback: string,
): RunState {
  const state: RunState = {
    workflow: "swe-forge",
    workflow_version: 1,
    schema_version: 5,
    run_id: runId,
    status,
    delivery_mode: deliveryMode,
    routing: { preferred, current, reason, fallback },
    checkout: { path: checkoutPath, branch, base_sha: baseSha, head_sha: headSha },
    continuation: {
      workflow_active: true,
      workflow: "ticket",
      phase: "planning",
      step: "0",
      awaiting: "none",
      next_action: { kind: "specify", target: "working-spec", acceptance: [] },
      safe_boundary: true,
      updated_at: nowUtcSecond(),
    },
    validation: { head_sha: "none", status: "pending", reference: "validations.tsv" },
    review: { status: "pending", reviewed_head: "none", repair_used: false, blocked_by: [] },
    delivery: {
      status: deliveryMode === "PR" ? "pending" : "not-applicable",
      pull_request_ref: "none",
      pr_number: "none",
      pr_state: "none",
    },
  };
  if (current === "SUBAGENTS") state.tasks = {};
  return state;
}

export function initializeStateCommand(args: readonly string[]): string {
  let stateArg = "";
  let checkoutArg = ".";
  let runId = "";
  let baselineRef = "HEAD";
  let status: RunState["status"] = "running";
  let deliveryMode: RunState["delivery_mode"] = "PR";
  let reason = "initial routing decision";
  let fallback = "no";
  let preferred: RunState["routing"]["preferred"] | "" = "";
  let current: RunState["routing"]["current"] | "" = "";

  for (let index = 0; index < args.length; ) {
    const option = args[index];
    switch (option) {
      case "--state":
        stateArg = optionValue(args, index, "--state requires a directory");
        index += 2;
        break;
      case "--checkout":
        checkoutArg = optionValue(args, index, "--checkout requires a path");
        index += 2;
        break;
      case "--run-id":
        runId = optionValue(args, index, "--run-id requires an ID");
        index += 2;
        break;
      case "--baseline-ref":
      case "--base":
      case "--base-sha":
        baselineRef = optionValue(args, index, `${option} requires a Git revision`);
        index += 2;
        break;
      case "--status":
        status = optionValue(args, index, "--status requires a lifecycle status") as RunState["status"];
        index += 2;
        break;
      case "--delivery-mode":
        deliveryMode = optionValue(args, index, "--delivery-mode requires GUIDED or PR") as RunState["delivery_mode"];
        index += 2;
        break;
      case "--reason":
        reason = optionValue(args, index, "--reason requires text");
        index += 2;
        break;
      case "--fallback-used":
        fallback = optionValue(args, index, "--fallback-used requires text");
        index += 2;
        break;
      case "--routing-preferred":
        preferred = optionValue(args, index, "--routing-preferred requires a topology") as RunState["routing"]["preferred"];
        index += 2;
        break;
      case "--routing-current":
        current = optionValue(args, index, "--routing-current requires a topology") as RunState["routing"]["current"];
        index += 2;
        break;
      default:
        throw new StateError(`unknown init option: ${option}`);
    }
  }

  if (stateArg === "") throw new StateError("--state is required");
  const stateDirectory = stateDirectoryForInit(stateArg);
  mkdirSync(stateDirectory, { recursive: true });
  const statePath = join(stateDirectory, "run-state.yaml");
  return withStateLock(statePath, () => {
    if (existsSync(statePath)) throw new StateError(`run state is already initialized: ${statePath}`);
    for (const obsolete of ["meta.env", "review.env", "run-state.valid", "validations.tsv"]) {
      if (existsSync(join(stateDirectory, obsolete))) {
        throw new StateError(`state contains obsolete persisted data: ${obsolete}; start with a fresh state directory`);
      }
    }
    const checkoutRoot = checkoutRootForInit(checkoutArg);
    const branch = gitOutput(checkoutRoot, ["symbolic-ref", "--quiet", "--short", "HEAD"]);
    if (branch === undefined) throw new StateError("checkout is detached");
    const head = gitOutput(checkoutRoot, ["rev-parse", "HEAD"]);
    if (head === undefined) throw new StateError("checkout has no commit baseline");
    const baseSha = gitOutput(checkoutRoot, ["rev-parse", baselineRef]);
    if (baseSha === undefined) throw new StateError(`baseline revision does not resolve: ${baselineRef}`);
    if (!gitSucceeds(checkoutRoot, ["merge-base", "--is-ancestor", baseSha, head])) {
      throw new StateError(`baseline revision is not an ancestor of the checkout: ${baselineRef}`);
    }

    if (runId === "") runId = basename(stateDirectory);
    requireScalarArg("run_id", runId);
    status = requireEnumArg("status", status, ["planning", "running", "blocked", "reviewing", "repairing", "accepted", "failed"] as const);
    deliveryMode = requireEnumArg("delivery_mode", deliveryMode, ["GUIDED", "PR"] as const);
    if (preferred === "") preferred = "SOLO";
    if (current === "") current = preferred;
    preferred = requireEnumArg("routing.preferred", preferred, ["SOLO", "SUBAGENTS"] as const);
    current = requireEnumArg("routing.current", current, ["SOLO", "SUBAGENTS"] as const);
    requireScalarArg("routing.reason", reason);
    requireScalarArg("routing.fallback", fallback);

    const state = baseState(runId, status, deliveryMode, checkoutRoot, branch, baseSha, head, preferred, current, reason, fallback);
    atomicallyReplaceState(statePath, state);
    return statePath;
  });
}

export function setRoutingCommand(args: readonly string[]): string {
  let stateArg = "";
  let preferred = "";
  let current = "";
  let reason = "";
  let fallback = "";
  for (let index = 0; index < args.length; ) {
    const option = args[index];
    switch (option) {
      case "--state":
        stateArg = optionValue(args, index, "--state requires a file or directory");
        index += 2;
        break;
      case "--preferred":
        preferred = optionValue(args, index, "--preferred requires a topology");
        index += 2;
        break;
      case "--current":
        current = optionValue(args, index, "--current requires a topology");
        index += 2;
        break;
      case "--reason":
        reason = optionValue(args, index, "--reason requires text");
        index += 2;
        break;
      case "--fallback-used":
        fallback = optionValue(args, index, "--fallback-used requires text");
        index += 2;
        break;
      default:
        throw new StateError(`unknown set-routing option: ${option}`);
    }
  }
  if (stateArg === "") throw new StateError("--state is required");
  if (preferred === "") throw new StateError("--preferred is required");
  if (current === "") throw new StateError("--current is required");
  if (reason === "") throw new StateError("--reason is required");
  if (fallback === "") throw new StateError("--fallback-used is required");
  const preferredValue = requireEnumArg("routing.preferred", preferred, ["SOLO", "SUBAGENTS"] as const);
  const currentValue = requireEnumArg("routing.current", current, ["SOLO", "SUBAGENTS"] as const);
  requireScalarArg("routing.reason", reason);
  requireScalarArg("routing.fallback", fallback);
  return updateState(stateArg, (state) => ({ ...state, routing: { preferred: preferredValue, current: currentValue, reason, fallback } }));
}

export function setContinuationCommand(args: readonly string[]): string {
  let stateArg = "";
  let workflowActive = "";
  let workflow = "";
  let phase = "";
  let step = "";
  let awaiting = "";
  let nextKind = "";
  let nextTarget = "";
  let safeBoundary = "";
  const acceptance: string[] = [];
  let prNumber = "";
  let prState = "";
  let prNumberSupplied = false;
  let prStateSupplied = false;

  for (let index = 0; index < args.length; ) {
    const option = args[index];
    switch (option) {
      case "--state":
        stateArg = optionValue(args, index, "--state requires a file or directory");
        index += 2;
        break;
      case "--workflow-active":
        workflowActive = optionValue(args, index, "--workflow-active requires true or false");
        index += 2;
        break;
      case "--workflow":
        workflow = optionValue(args, index, "--workflow requires a workflow name");
        index += 2;
        break;
      case "--phase":
        phase = optionValue(args, index, "--phase requires a phase");
        index += 2;
        break;
      case "--step":
        step = optionValue(args, index, "--step requires a step");
        index += 2;
        break;
      case "--awaiting":
        awaiting = optionValue(args, index, "--awaiting requires a value");
        index += 2;
        break;
      case "--next-action-kind":
        nextKind = optionValue(args, index, "--next-action-kind requires a kind");
        index += 2;
        break;
      case "--next-action-target":
        nextTarget = optionValue(args, index, "--next-action-target requires a target");
        index += 2;
        break;
      case "--next-action-acceptance":
      case "--acceptance": {
        const value = optionValue(args, index, `${option} requires a check`);
        if (value !== "") requireScalarArg("acceptance", value);
        acceptance.push(value);
        index += 2;
        break;
      }
      case "--safe-boundary":
        safeBoundary = optionValue(args, index, "--safe-boundary requires true or false");
        index += 2;
        break;
      case "--pr-number":
        prNumber = optionValue(args, index, "--pr-number requires a number or none");
        prNumberSupplied = true;
        index += 2;
        break;
      case "--pr-state":
        prState = optionValue(args, index, "--pr-state requires a state or none");
        prStateSupplied = true;
        index += 2;
        break;
      default:
        throw new StateError(`unknown set-continuation option: ${option}`);
    }
  }
  if (stateArg === "") throw new StateError("--state is required");
  if (workflowActive === "") throw new StateError("--workflow-active is required");
  if (workflow === "") throw new StateError("--workflow is required");
  if (phase === "") throw new StateError("--phase is required");
  if (step === "") throw new StateError("--step is required");
  if (awaiting === "") throw new StateError("--awaiting is required");
  if (nextKind === "") throw new StateError("--next-action-kind is required");
  if (nextTarget === "") throw new StateError("--next-action-target is required");
  if (safeBoundary === "") throw new StateError("--safe-boundary is required");
  requireScalarArg("continuation.workflow", workflow);
  requireScalarArg("continuation.phase", phase);
  requireScalarArg("continuation.step", step);
  requireScalarArg("continuation.awaiting", awaiting);
  requireScalarArg("continuation.next_action.kind", nextKind);
  requireScalarArg("continuation.next_action.target", nextTarget);
  const workflowActiveValue = requireBoolArg("continuation.workflow_active", workflowActive);
  const workflowValue = requireEnumArg("continuation.workflow", workflow, ["ticket", "delivery", "other"] as const);
  const phaseValue = requireEnumArg(
    "continuation.phase",
    phase,
    ["planning", "discovery", "implementation", "review", "delivery", "awaiting_merge", "recovery", "complete"] as const,
  );
  const stepValue = validateStep(step);
  const awaitingValue = requireEnumArg("continuation.awaiting", awaiting, ["none", "user_merge", "user_decision", "recovery"] as const);
  const nextKindValue = requireEnumArg(
    "continuation.next_action.kind",
    nextKind,
    ["specify", "discover", "implement", "validate", "review", "verify_and_sync_merge", "recover", "none"] as const,
  );
  const safeBoundaryValue = requireBoolArg("continuation.safe_boundary", safeBoundary);
  const acceptanceValues = acceptance.filter((value) => value !== "");

  return updateState(stateArg, (state) => {
    const nextPrNumber = prNumberSupplied ? validatePrNumber(prNumber) : state.delivery.pr_number;
    const nextPrState = prStateSupplied
      ? requireEnumArg("delivery.pr_state", prState, ["DRAFT", "OPEN", "MERGED", "CLOSED", "none"] as const)
      : state.delivery.pr_state;
    return {
      ...state,
      continuation: {
        workflow_active: workflowActiveValue,
        workflow: workflowValue,
        phase: phaseValue,
        step: stepValue,
        awaiting: awaitingValue,
        next_action: { kind: nextKindValue, target: nextTarget, acceptance: acceptanceValues },
        safe_boundary: safeBoundaryValue,
        updated_at: nowUtcSecond(),
      },
      delivery: { ...state.delivery, pr_number: nextPrNumber, pr_state: nextPrState },
    };
  });
}

export function setDeliveryCheckoutCommand(args: readonly string[]): string {
  let stateArg = "";
  let head = "";
  for (let index = 0; index < args.length; ) {
    const option = args[index];
    switch (option) {
      case "--state":
        stateArg = optionValue(args, index, "--state requires a file or directory");
        index += 2;
        break;
      case "--head-sha":
        head = optionValue(args, index, "--head-sha requires a SHA");
        index += 2;
        break;
      default:
        throw new StateError(`unknown set-delivery-checkout option: ${option}`);
    }
  }
  if (stateArg === "") throw new StateError("--state is required");
  if (head === "") throw new StateError("--head-sha is required");
  validateSha(head, "checkout.head_sha");
  return updateState(stateArg, (state) => {
    assertRecordedHead(head, state.checkout);
    return { ...state, checkout: { ...state.checkout, head_sha: head } };
  });
}

export function setValidationCommand(args: readonly string[]): string {
  let stateArg = "";
  let head = "";
  let status = "";
  let reference = "";
  for (let index = 0; index < args.length; ) {
    const option = args[index];
    switch (option) {
      case "--state":
        stateArg = optionValue(args, index, "--state requires a file or directory");
        index += 2;
        break;
      case "--head-sha":
        head = optionValue(args, index, "--head-sha requires a SHA");
        index += 2;
        break;
      case "--status":
        status = optionValue(args, index, "--status requires pending, passed, or failed");
        index += 2;
        break;
      case "--reference":
      case "--ref":
        reference = optionValue(args, index, "--reference requires a value");
        index += 2;
        break;
      default:
        throw new StateError(`unknown set-validation option: ${option}`);
    }
  }
  if (stateArg === "") throw new StateError("--state is required");
  if (head === "") throw new StateError("--head-sha is required");
  if (status === "") throw new StateError("--status is required");
  if (reference === "") throw new StateError("--reference is required");
  const statusValue = requireEnumArg("validation.status", status, ["pending", "passed", "failed"] as const);
  const headValue = normalizeShaOrNone(head, "validation.head_sha");
  requireScalarArg("validation.reference", reference);
  return updateState(stateArg, (state) => {
    if (headValue !== "none") assertRecordedHead(headValue, state.checkout);
    if (statusValue !== "pending" && headValue === "none") {
      throw new StateError("validation status and candidate identity do not match");
    }
    return { ...state, validation: { head_sha: headValue, status: statusValue, reference } };
  });
}

export function setReviewCommand(args: readonly string[]): { statePath: string; result: "PASS" | "CHANGES_REQUIRED" } {
  let stateArg = "";
  let head = "";
  let result = "";
  const blockedBy: string[] = [];
  const seen = new Set<string>();
  for (let index = 0; index < args.length; ) {
    const option = args[index];
    switch (option) {
      case "--state":
        stateArg = optionValue(args, index, "--state requires a file or directory");
        index += 2;
        break;
      case "--head-sha":
        head = optionValue(args, index, "--head-sha requires a SHA");
        index += 2;
        break;
      case "--result":
        result = optionValue(args, index, "--result requires PASS or CHANGES_REQUIRED");
        index += 2;
        break;
      case "--blocked-by": {
        const id = optionValue(args, index, "--blocked-by requires an ID");
        requireIdentifier(id);
        if (seen.has(id)) throw new StateError(`duplicate blocked finding id: ${id}`);
        seen.add(id);
        blockedBy.push(id);
        index += 2;
        break;
      }
      default:
        throw new StateError(`unknown set-review option: ${option}`);
    }
  }
  if (stateArg === "") throw new StateError("--state is required");
  if (head === "") throw new StateError("--head-sha is required");
  if (result !== "PASS" && result !== "CHANGES_REQUIRED") throw new StateError(`invalid review result: ${result || "<missing>"}`);
  if (result === "CHANGES_REQUIRED" && blockedBy.length === 0) {
    throw new StateError("CHANGES_REQUIRED review must identify at least one blocking finding");
  }
  if (result === "PASS" && blockedBy.length > 0) throw new StateError("PASS review may not identify blocking findings");
  validateSha(head, "review.reviewed_head");
  const statePath = updateState(stateArg, (state) => {
    assertRecordedHead(head, state.checkout);
    if (state.review.status !== "pending") throw new StateError(`review has already been recorded: ${state.review.status}`);
    return {
      ...state,
      status: result === "CHANGES_REQUIRED" ? "repairing" : state.status,
      review: {
        status: result === "CHANGES_REQUIRED" ? "changes-required" : "pass",
        reviewed_head: head,
        repair_used: false,
        blocked_by: blockedBy,
      },
    };
  });
  return { statePath, result: result as "PASS" | "CHANGES_REQUIRED" };
}

export function setReviewRepairCommand(args: readonly string[]): string {
  let stateArg = "";
  let head = "";
  for (let index = 0; index < args.length; ) {
    const option = args[index];
    switch (option) {
      case "--state":
        stateArg = optionValue(args, index, "--state requires a file or directory");
        index += 2;
        break;
      case "--head-sha":
        head = optionValue(args, index, "--head-sha requires a SHA");
        index += 2;
        break;
      default:
        throw new StateError(`unknown set-review-repair option: ${option}`);
    }
  }
  if (stateArg === "") throw new StateError("--state is required");
  if (head === "") throw new StateError("--head-sha is required");
  validateSha(head, "review.reviewed_head");
  return updateState(stateArg, (state) => {
    assertRecordedHead(head, state.checkout);
    if (state.review.status !== "changes-required") {
      throw new StateError(`review repair requires an unresolved changes-required review: ${state.review.status}`);
    }
    if (state.review.repair_used) throw new StateError("review repair has already been used");
    if (state.review.blocked_by.length !== 1) throw new StateError("review repair requires exactly one blocking finding");
    if (state.review.reviewed_head === head) throw new StateError("review repair must produce a new candidate");
    return {
      ...state,
      status: "running",
      review: { ...state.review, status: "repaired", repair_used: true },
    };
  });
}

export function setPullRequestCommand(args: readonly string[]): string {
  let stateArg = "";
  let url = "";
  for (let index = 0; index < args.length; ) {
    const option = args[index];
    switch (option) {
      case "--state":
        stateArg = optionValue(args, index, "--state requires a file or directory");
        index += 2;
        break;
      case "--url":
        url = optionValue(args, index, "--url requires a URL");
        index += 2;
        break;
      default:
        throw new StateError(`unknown set-pull-request option: ${option}`);
    }
  }
  if (stateArg === "") throw new StateError("--state is required");
  if (url === "") throw new StateError("--url is required");
  if (!(url.startsWith("http://") || url.startsWith("https://"))) {
    throw new StateError("pull-request URL must use http:// or https://");
  }
  validateUrl(url, "delivery.pull_request_ref");
  return updateState(stateArg, (state) => {
    if (state.delivery_mode !== "PR") throw new StateError("pull-request completion is only valid in PR mode");
    if (state.delivery.pull_request_ref !== "none" && state.delivery.pull_request_ref !== url) {
      throw new StateError("pull-request completion URL does not match the recorded PR");
    }
    if (state.delivery.status !== "complete" && state.delivery.status !== "pending" && state.delivery.status !== "blocked") {
      throw new StateError(`pull-request completion is not valid from delivery status: ${state.delivery.status}`);
    }
    return {
      ...state,
      continuation: { ...state.continuation, workflow_active: false },
      delivery: { ...state.delivery, status: "complete", pull_request_ref: url },
    };
  });
}
