import { lstatSync, readFileSync, realpathSync, statSync } from "node:fs";
import { isStateRecord } from "./type-guards";
import { basename, dirname, isAbsolute, join } from "node:path";
import type {
  Checkout,
  Continuation,
  Delivery,
  DeliveryMode,
  Review,
  Routing,
  RunState,
  TaskState,
  Validation,
} from "./types";

const topFields = [
  "workflow",
  "workflow_version",
  "schema_version",
  "run_id",
  "status",
  "delivery_mode",
  "routing",
  "checkout",
  "continuation",
  "validation",
  "review",
  "delivery",
  "tasks",
] as const;

const routingFields = ["preferred", "current", "reason", "fallback"] as const;
const checkoutFields = ["path", "branch", "base_sha", "head_sha"] as const;
const continuationFields = [
  "workflow_active",
  "workflow",
  "phase",
  "step",
  "awaiting",
  "next_action",
  "safe_boundary",
  "updated_at",
] as const;
const nextActionFields = ["kind", "target", "acceptance"] as const;
const validationFields = ["head_sha", "status", "reference"] as const;
const reviewFields = ["status", "reviewed_head", "repair_used", "blocked_by"] as const;
const deliveryFields = ["status", "pull_request_ref", "pr_number", "pr_state"] as const;
const taskFields = ["status", "dependencies", "accepted_result_ref"] as const;

const runStatuses = ["planning", "running", "blocked", "reviewing", "repairing", "accepted", "failed"] as const;
const topologies = ["SOLO", "SUBAGENTS"] as const;
const deliveryModes = ["GUIDED", "PR"] as const;
const continuationWorkflows = ["ticket", "delivery", "other"] as const;
const continuationPhases = [
  "planning",
  "discovery",
  "implementation",
  "review",
  "delivery",
  "awaiting_merge",
  "recovery",
  "complete",
] as const;
const awaitings = ["none", "user_merge", "user_decision", "recovery"] as const;
const nextActionKinds = ["specify", "discover", "implement", "validate", "review", "verify_and_sync_merge", "recover", "none"] as const;
const validationStatuses = ["pending", "passed", "failed"] as const;
const reviewStatuses = ["pending", "pass", "changes-required", "repaired", "skipped"] as const;
const deliveryStatuses = ["not-applicable", "pending", "complete", "blocked"] as const;
const pullRequestStates = ["DRAFT", "OPEN", "MERGED", "CLOSED", "none"] as const;
const taskStatuses = ["pending", "ready", "running", "blocked", "done", "failed", "skipped"] as const;

export class StateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StateError";
  }
}

interface SurfaceScan {
  rawValues: Map<string, string>;
  sequencePaths: Set<string>;
}

function fail(message: string): never {
  throw new StateError(message);
}


function hasOwn(value: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function controlChars(value: string): void {
  if (value.includes("\t") || value.includes("\n")) {
    fail("state values may not contain tabs or newlines");
  }
}

function stripInlineComment(value: string): string {
  return value.replace(/[ \t]+#.*$/, "").trim();
}

// Bun.YAML.parse accepts YAML features that the old line-oriented contract did
// not carry. Scan that narrow surface first, then use Bun for scalar/collection
// decoding and reject any object shape outside schema v5.
function rejectUnsupportedValueSyntax(value: string, path: string): void {
  const withoutComment = stripInlineComment(value);
  if (withoutComment === "") return;
  if (/^["']/.test(withoutComment)) {
    fail("malformed or unsupported YAML run state: quoted scalars are not canonical");
  }
  if (/^(?:\||>)(?:[-+])?$/.test(withoutComment)) {
    fail("malformed or unsupported YAML run state: block scalars are not canonical");
  }
  if (/(?:^|[\[,])\s*(?:&[A-Za-z0-9_-]+|\*[A-Za-z0-9_-]+|!<[^>\s]+>|!!?[A-Za-z][^ \t,}\]]*)/.test(withoutComment)) {
    fail("malformed or unsupported YAML run state: anchors, aliases, and tags are not canonical");
  }
  if (withoutComment.startsWith("{") && !(path === "tasks" && withoutComment === "{}")) {
    fail("malformed or unsupported YAML run state: flow mappings are not canonical");
  }
}

function scanCanonicalSurface(source: string): SurfaceScan {
  const rawValues = new Map<string, string>();
  const sequencePaths = new Set<string>();
  const stack: Array<{ indent: number; path: string }> = [];
  const lines = source.split("\n");

  for (const line of lines) {
    if (line.includes("\t") || line.includes("\r") || line.includes("\0")) {
      fail("malformed or unsupported YAML run state: tabs, carriage returns, and NUL are not canonical");
    }
    const trimmed = line.trim();
    if (trimmed === "" || trimmed.startsWith("#")) continue;
    if (trimmed === "---" || trimmed === "..." || trimmed.startsWith("%")) {
      fail("malformed or unsupported YAML run state: document markers are not canonical");
    }

    const sequence = /^( *)(?:-)(?: +(.*))$/.exec(line);
    if (sequence) {
      const indent = sequence[1].length;
      const item = sequence[2].trim();
      const parent = stack.at(-1);
      if (!parent || indent <= parent.indent || item === "") {
        fail("malformed or unsupported YAML run state: invalid sequence indentation");
      }
      if (parent.path !== "continuation.next_action.acceptance" && !parent.path.endsWith(".dependencies")) {
        fail("malformed or unsupported YAML run state: unexpected sequence");
      }
      const listPath = parent.path;
      sequencePaths.add(listPath);
      rejectUnsupportedValueSyntax(item, listPath);
      continue;
    }

    const mapping = /^( *)([A-Za-z0-9_-]+):(.*)$/.exec(line);
    if (!mapping) {
      fail("malformed or unsupported YAML run state: only canonical mappings and lists are supported");
    }
    const indent = mapping[1].length;
    const key = mapping[2];
    const raw = mapping[3].replace(/^ +/, "");
    while (stack.length > 0 && stack.at(-1)!.indent >= indent) stack.pop();
    const path = stack.length > 0 ? `${stack.at(-1)!.path}.${key}` : key;
    if (rawValues.has(path)) {
      fail("malformed or ambiguous YAML run state: duplicate field");
    }
    rawValues.set(path, raw);
    const valueForSyntax = raw.trim();
    if (indent === 0 && (key === "workflow" || key === "workflow_version" || key === "schema_version") && /[ \t]+#/.test(raw)) {
      fail("malformed or ambiguous YAML run state: top-level identity fields may not have comments");
    }
    if (valueForSyntax !== "") rejectUnsupportedValueSyntax(raw, path);
    if (valueForSyntax === "") stack.push({ indent, path });
  }

  return { rawValues, sequencePaths };
}

function quoteColonScalars(source: string): string {
  return source
    .split("\n")
    .map((line) => {
      const mapping = /^( *)([A-Za-z0-9_-]+):(.*)$/.exec(line);
      if (!mapping) return line;
      const raw = mapping[3].replace(/^ +/, "");
      if (raw.trim() === "" || raw.trim().startsWith("[") || raw.trim() === "{}") return line;
      if (!/:\s/.test(raw)) return line;
      return `${mapping[1]}${mapping[2]}: ${JSON.stringify(raw.trim())}`;
    })
    .join("\n");
}

function parseYaml(source: string): unknown {
  let parsed: unknown;
  try {
    parsed = Bun.YAML.parse(source);
  } catch (firstError) {
    const reparsedSource = quoteColonScalars(source);
    if (reparsedSource === source) {
      const detail = firstError instanceof Error ? `: ${firstError.message}` : "";
      fail(`malformed or unsupported YAML run state${detail}`);
    }
    try {
      parsed = Bun.YAML.parse(reparsedSource);
    } catch (secondError) {
      const detail = secondError instanceof Error ? `: ${secondError.message}` : "";
      fail(`malformed or unsupported YAML run state${detail}`);
    }
  }
  if (Array.isArray(parsed) || !isStateRecord(parsed)) {
    fail("malformed or ambiguous YAML run state: a single mapping document is required");
  }
  return parsed;
}

function rawValue(surface: SurfaceScan, path: string, label: string, topLiteral = false): string {
  const raw = surface.rawValues.get(path);
  if (raw === undefined) fail(`current schema is missing ${label}`);
  const value = topLiteral ? raw : stripInlineComment(raw);
  if (value === "") fail(`current schema has an empty ${label}`);
  return value;
}

function valueAt(root: Record<string, unknown>, path: string): unknown {
  let value: unknown = root;
  for (const part of path.split(".")) {
    if (!isStateRecord(value) || !hasOwn(value, part)) return undefined;
    value = value[part];
  }
  return value;
}

function scalarAt(root: Record<string, unknown>, surface: SurfaceScan, path: string, label: string, topLiteral = false): string {
  const parsed = valueAt(root, path);
  if (parsed !== null && typeof parsed === "object") fail(`${label} must be a scalar`);
  return rawValue(surface, path, label, topLiteral);
}

function objectAt(root: Record<string, unknown>, path: string, label: string): Record<string, unknown> {
  const value = valueAt(root, path);
  if (!isStateRecord(value)) fail(`${label} must be a mapping`);
  return value;
}

function rejectUnknownFields(record: Record<string, unknown>, allowed: readonly string[]): void {
  const allowedSet = new Set(allowed);
  for (const key of Object.keys(record)) {
    if (!allowedSet.has(key)) {
      fail("stale/unsupported run state: unknown or removed state fields; start a fresh run");
    }
  }
}

function requireFields(record: Record<string, unknown>, fields: readonly string[], prefix: string): void {
  for (const field of fields) {
    if (!hasOwn(record, field)) fail(`${prefix} is missing ${field}`);
  }
}

function enumValue<T extends string>(value: string, field: string, allowed: readonly T[]): T {
  if ((allowed as readonly string[]).includes(value)) return value as T;
  fail(`invalid ${field}`);
}

function boolValue(root: Record<string, unknown>, surface: SurfaceScan, path: string, label: string): boolean {
  const raw = scalarAt(root, surface, path, label);
  if (raw !== "true" && raw !== "false") fail(`invalid ${label}`);
  const parsed = valueAt(root, path);
  if (typeof parsed !== "boolean") fail(`invalid ${label}`);
  return parsed;
}

function listValue(root: Record<string, unknown>, surface: SurfaceScan, path: string, label: string): string[] {
  const value = valueAt(root, path);
  if (!Array.isArray(value)) fail(`${label} must be a list`);
  const raw = surface.rawValues.get(path);
  if (raw === undefined && !surface.sequencePaths.has(path)) fail(`current schema is missing ${label}`);
  const result: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") fail(`${label} must contain scalar values`);
    result.push(item);
  }
  return result;
}

function shaValue(value: string, field: string): string {
  if (value === "none" || value === "NONE" || value === "null") return value;
  if (!/^[0-9a-fA-F]{40}$/.test(value)) fail(`${field} is not a hexadecimal SHA`);
  return value;
}

function urlValue(value: string, field: string): string {
  if (value === "none") return value;
  if (value.startsWith("http://") || value.startsWith("https://")) {
    controlChars(value);
    return value;
  }
  fail(`invalid ${field}`);
}

function identifierValue(value: string): string {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(value)) fail(`invalid blocked finding id: ${value}`);
  return value;
}

function validateRouting(root: Record<string, unknown>, surface: SurfaceScan): Routing {
  const object = objectAt(root, "routing", "routing");
  rejectUnknownFields(object, routingFields);
  requireFields(object, routingFields, "routing");
  return {
    preferred: enumValue(scalarAt(root, surface, "routing.preferred", "routing.preferred"), "routing.preferred", topologies),
    current: enumValue(scalarAt(root, surface, "routing.current", "routing.current"), "routing.current", topologies),
    reason: scalarAt(root, surface, "routing.reason", "routing.reason"),
    fallback: scalarAt(root, surface, "routing.fallback", "routing.fallback"),
  };
}

function validateCheckout(root: Record<string, unknown>, surface: SurfaceScan): Checkout {
  const object = objectAt(root, "checkout", "checkout");
  rejectUnknownFields(object, checkoutFields);
  requireFields(object, checkoutFields, "checkout");
  const path = scalarAt(root, surface, "checkout.path", "checkout.path");
  if (!path.startsWith("/")) fail("checkout.path must be absolute");
  return {
    path,
    branch: scalarAt(root, surface, "checkout.branch", "checkout.branch"),
    base_sha: shaValue(scalarAt(root, surface, "checkout.base_sha", "checkout.base_sha"), "checkout.base_sha"),
    head_sha: shaValue(scalarAt(root, surface, "checkout.head_sha", "checkout.head_sha"), "checkout.head_sha"),
  };
}

function validateDelivery(root: Record<string, unknown>, surface: SurfaceScan, deliveryMode: DeliveryMode): Delivery {
  const object = objectAt(root, "delivery", "delivery");
  rejectUnknownFields(object, deliveryFields);
  requireFields(object, deliveryFields, "delivery");
  const status = enumValue(scalarAt(root, surface, "delivery.status", "delivery.status"), "delivery.status", deliveryStatuses);
  const pullRequestRef = urlValue(
    scalarAt(root, surface, "delivery.pull_request_ref", "delivery.pull_request_ref"),
    "delivery.pull_request_ref",
  );
  const prNumber = scalarAt(root, surface, "delivery.pr_number", "delivery.pr_number");
  if (prNumber !== "none" && !/^\d+$/.test(prNumber)) fail("invalid delivery.pr_number");
  const prState = enumValue(scalarAt(root, surface, "delivery.pr_state", "delivery.pr_state"), "delivery.pr_state", pullRequestStates);
  if (deliveryMode === "GUIDED") {
    if (status !== "not-applicable" && status !== "complete") fail("GUIDED delivery must be not-applicable or complete");
    if (pullRequestRef !== "none") fail("GUIDED delivery may not record a pull request");
  } else {
    if (status === "not-applicable") fail("PR delivery must have a delivery status");
  }
  if (status === "complete" && pullRequestRef === "none" && deliveryMode !== "GUIDED") {
    fail("complete PR delivery requires a pull-request reference");
  }
  return { status, pull_request_ref: pullRequestRef, pr_number: prNumber, pr_state: prState };
}

function validateValidation(root: Record<string, unknown>, surface: SurfaceScan): Validation {
  const object = objectAt(root, "validation", "validation");
  rejectUnknownFields(object, validationFields);
  requireFields(object, validationFields, "validation");
  const head = shaValue(scalarAt(root, surface, "validation.head_sha", "validation.head_sha"), "validation.head_sha");
  const status = enumValue(scalarAt(root, surface, "validation.status", "validation.status"), "validation.status", validationStatuses);
  const reference = scalarAt(root, surface, "validation.reference", "validation.reference");
  if (status !== "pending") {
    if (reference === "none") fail(`validation.${status} requires a result reference`);
    if (head === "none") fail(`validation.${status} requires a candidate`);
  }
  return { head_sha: head, status, reference };
}

function validateReview(root: Record<string, unknown>, surface: SurfaceScan): Review {
  const object = objectAt(root, "review", "review");
  rejectUnknownFields(object, reviewFields);
  requireFields(object, reviewFields, "review");
  const status = enumValue(scalarAt(root, surface, "review.status", "review.status"), "review.status", reviewStatuses);
  const reviewedHead = shaValue(
    scalarAt(root, surface, "review.reviewed_head", "review.reviewed_head"),
    "review.reviewed_head",
  );
  const repairUsed = boolValue(root, surface, "review.repair_used", "review.repair_used");
  const blockedBy = listValue(root, surface, "review.blocked_by", "review.blocked_by");
  if (blockedBy.length === 0 && stripInlineComment(surface.rawValues.get("review.blocked_by") ?? "") !== "[]") {
    fail("review.blocked_by must use [] for an empty list");
  }
  const blockedFindings = new Set<string>();
  for (const finding of blockedBy) {
    identifierValue(finding);
    if (blockedFindings.has(finding)) fail(`duplicate blocked finding id: ${finding}`);
    blockedFindings.add(finding);
  }
  switch (status) {
    case "pending":
    case "skipped":
      if (reviewedHead !== "none") fail(`review.${status} must not have a reviewed candidate`);
      if (blockedBy.length !== 0) fail(`review.${status} may not retain blocking findings`);
      if (repairUsed) fail(`review.${status} may not be repaired`);
      break;
    case "pass":
      if (reviewedHead === "none") fail("review.pass requires a reviewed candidate");
      if (blockedBy.length !== 0) fail("review.pass may not retain blocking findings");
      if (repairUsed) fail("review.pass may not be repaired");
      break;
    case "changes-required":
      if (reviewedHead === "none") fail("review.changes-required requires a reviewed candidate");
      if (blockedBy.length === 0) fail("review.changes-required requires a blocking finding");
      if (repairUsed) fail("review.changes-required may not be repaired");
      break;
    case "repaired":
      if (reviewedHead === "none") fail("review.repaired requires a reviewed candidate");
      if (blockedBy.length === 0) fail("review.repaired requires a blocking finding");
      if (!repairUsed) fail("review.repaired requires repair_used: true");
      break;
  }
  return { status, reviewed_head: reviewedHead, repair_used: repairUsed, blocked_by: blockedBy };
}

function validateContinuation(root: Record<string, unknown>, surface: SurfaceScan): Continuation {
  const object = objectAt(root, "continuation", "continuation");
  rejectUnknownFields(object, continuationFields);
  requireFields(object, continuationFields, "continuation");
  const workflowActive = boolValue(root, surface, "continuation.workflow_active", "continuation.workflow_active");
  const workflow = enumValue(
    scalarAt(root, surface, "continuation.workflow", "continuation.workflow"),
    "continuation.workflow",
    continuationWorkflows,
  );
  const phase = enumValue(
    scalarAt(root, surface, "continuation.phase", "continuation.phase"),
    "continuation.phase",
    continuationPhases,
  );
  const step = scalarAt(root, surface, "continuation.step", "continuation.step");
  if (step !== "none" && !/^\d+$/.test(step)) fail("invalid continuation.step");
  const awaiting = enumValue(scalarAt(root, surface, "continuation.awaiting", "continuation.awaiting"), "continuation.awaiting", awaitings);
  const safeBoundary = boolValue(root, surface, "continuation.safe_boundary", "continuation.safe_boundary");
  const updatedAt = scalarAt(root, surface, "continuation.updated_at", "continuation.updated_at");

  const nextAction = objectAt(root, "continuation.next_action", "continuation.next_action");
  rejectUnknownFields(nextAction, nextActionFields);
  requireFields(nextAction, nextActionFields, "continuation.next_action");
  const kind = enumValue(
    scalarAt(root, surface, "continuation.next_action.kind", "continuation.next_action.kind"),
    "continuation.next_action.kind",
    nextActionKinds,
  );
  const target = scalarAt(root, surface, "continuation.next_action.target", "continuation.next_action.target");
  const acceptance = listValue(root, surface, "continuation.next_action.acceptance", "continuation.next_action.acceptance");
  return {
    workflow_active: workflowActive,
    workflow,
    phase,
    step,
    awaiting,
    next_action: { kind, target, acceptance },
    safe_boundary: safeBoundary,
    updated_at: updatedAt,
  };
}

function validateTasks(root: Record<string, unknown>, surface: SurfaceScan, routing: Routing): Record<string, TaskState> | undefined {
  if (!hasOwn(root, "tasks")) return undefined;
  if (routing.preferred !== "SUBAGENTS" && routing.current !== "SUBAGENTS") {
    fail("delegated task state is only valid when SUBAGENTS routing is selected");
  }
  const taskMap = objectAt(root, "tasks", "tasks");
  const tasks: Record<string, TaskState> = Object.create(null) as Record<string, TaskState>;
  for (const [taskId, taskValue] of Object.entries(taskMap)) {
    if (!isStateRecord(taskValue)) fail(`tasks.${taskId} must be a mapping`);
    rejectUnknownFields(taskValue, taskFields);
    requireFields(taskValue, taskFields, `tasks.${taskId}`);
    const status = enumValue(
      scalarAt(root, surface, `tasks.${taskId}.status`, `tasks.${taskId}.status`),
      `tasks.${taskId}.status`,
      taskStatuses,
    );
    const dependencies = listValue(root, surface, `tasks.${taskId}.dependencies`, `tasks.${taskId}.dependencies`);
    const acceptedResultRef = scalarAt(
      root,
      surface,
      `tasks.${taskId}.accepted_result_ref`,
      `tasks.${taskId}.accepted_result_ref`,
    );
    tasks[taskId] = { status, dependencies, accepted_result_ref: acceptedResultRef };
  }
  return tasks;
}

function validateRoot(root: Record<string, unknown>, surface: SurfaceScan): RunState {
  rejectUnknownFields(root, topFields);
  for (const field of topFields.slice(0, -1)) {
    if (!hasOwn(root, field)) {
      fail(`stale/unsupported run state: schema-v5 state is missing current key: ${field}; start a fresh run`);
    }
  }
  const workflow = scalarAt(root, surface, "workflow", "workflow", true);
  if (workflow !== "swe-forge") fail("workflow must be swe-forge");
  const workflowVersion = scalarAt(root, surface, "workflow_version", "workflow_version", true);
  if (workflowVersion !== "1") fail("workflow_version must be 1");
  const schemaVersion = scalarAt(root, surface, "schema_version", "schema_version", true);
  if (schemaVersion !== "5") {
    fail("stale/unsupported run state: only schema_version: 5 is supported; start a fresh run");
  }

  const runId = scalarAt(root, surface, "run_id", "run_id");
  const status = enumValue(scalarAt(root, surface, "status", "status"), "status", runStatuses);
  const deliveryMode = enumValue(
    scalarAt(root, surface, "delivery_mode", "delivery_mode"),
    "delivery_mode",
    deliveryModes,
  );
  const routing = validateRouting(root, surface);
  const checkout = validateCheckout(root, surface);
  const delivery = validateDelivery(root, surface, deliveryMode);
  const validation = validateValidation(root, surface);
  const review = validateReview(root, surface);
  const continuation = validateContinuation(root, surface);
  if (delivery.status === "complete" && continuation.workflow_active) {
    fail("complete delivery must have inactive continuation");
  }
  const tasks = validateTasks(root, surface, routing);

  return {
    workflow: "swe-forge",
    workflow_version: 1,
    schema_version: 5,
    run_id: runId,
    status,
    delivery_mode: deliveryMode,
    routing,
    checkout,
    continuation,
    validation,
    review,
    delivery,
    ...(tasks === undefined ? {} : { tasks }),
  };
}

export function parseStateText(source: string): RunState {
  const surface = scanCanonicalSurface(source);
  const parsed = parseYaml(source);
  return validateRoot(parsed as Record<string, unknown>, surface);
}

export function stateFile(input: string): string {
  controlChars(input);
  let candidate = input;
  try {
    const info = lstatSync(candidate);
    if (info.isDirectory()) {
      if (info.isSymbolicLink()) fail(`run-state file does not exist: ${join(candidate, "run-state.yaml")}`);
      candidate = join(candidate, "run-state.yaml");
    }
  } catch {
    // The file check below provides the canonical missing-file error.
  }
  try {
    if (!statSync(candidate).isFile()) fail(`run-state file does not exist: ${candidate}`);
  } catch {
    fail(`run-state file does not exist: ${candidate}`);
  }
  return candidate;
}

export function readState(input: string): { path: string; source: string; state: RunState } {
  const path = stateFile(input);
  let source: string;
  try {
    source = readFileSync(path, "utf8");
  } catch {
    fail(`run-state file could not be read: ${path}`);
  }
  return { path, source, state: parseStateText(source) };
}

export function validateStateFile(input: string): { path: string; state: RunState } {
  const result = readState(input);
  return { path: result.path, state: result.state };
}

export function absolutePath(input: string): string {
  controlChars(input);
  return isAbsolute(input) ? input : `${process.cwd()}/${input}`;
}

export function canonicalPath(input: string): string {
  controlChars(input);
  const candidate = absolutePath(input);
  try {
    const info = statSync(candidate);
    if (info.isDirectory()) return realpathSync(candidate);
    if (info.isFile()) return `${realpathSync(dirname(candidate))}/${basename(candidate)}`;
  } catch {
    // Preserve the old helper's unresolved absolute candidate for missing paths.
  }
  return candidate;
}

export function stateDirectoryForInit(input: string): string {
  const candidate = absolutePath(input);
  try {
    const info = lstatSync(candidate);
    if (!info.isDirectory() || info.isSymbolicLink()) {
      fail(`state path must be a real directory: ${candidate}`);
    }
    return realpathSync(candidate);
  } catch (error) {
    if (error instanceof StateError) throw error;
  }
  const parent = dirname(candidate);
  try {
    const parentInfo = lstatSync(parent);
    if (!parentInfo.isDirectory() || parentInfo.isSymbolicLink()) {
      fail(`state parent is not a real directory: ${parent}`);
    }
    return `${realpathSync(parent)}/${basename(candidate)}`;
  } catch (error) {
    if (error instanceof StateError) throw error;
    fail(`state parent is not a real directory: ${parent}`);
  }
}

export function normalizeShaOrNone(value: string, field: string): string {
  return shaValue(value, field);
}

export function validateSha(value: string, field: string): void {
  if (!/^[0-9a-fA-F]{40}$/.test(value)) fail(`${field} is not a hexadecimal SHA`);
}

export function validateUrl(value: string, field: string): void {
  if (!(value.startsWith("http://") || value.startsWith("https://"))) fail(`invalid ${field}`);
  controlChars(value);
}

export function requireEnumArg<T extends string>(field: string, value: string, allowed: readonly T[]): T {
  return enumValue(value, field, allowed);
}

export function requireBoolArg(field: string, value: string): boolean {
  if (value !== "true" && value !== "false") fail(`invalid ${field}`);
  return value === "true";
}

export function requireScalarArg(field: string, value: string): void {
  if (value === "") fail(`${field} is required`);
  controlChars(value);
}

export function requireIdentifier(value: string): void {
  identifierValue(value);
}

export const schemaEnums = {
  runStatuses,
  topologies,
  deliveryModes,
  continuationWorkflows,
  continuationPhases,
  awaitings,
  nextActionKinds,
  validationStatuses,
  reviewStatuses,
  deliveryStatuses,
  pullRequestStates,
} as const;

export function parseTimestampEpoch(value: string): number | undefined {
  const normalized = value.replace(/\.[0-9]+([Z+-])/, "$1").replace(/([+-][0-9]{2}):([0-9]{2})$/, "$1$2");
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(Z|([+-])(\d{2})(\d{2}))$/.exec(normalized);
  if (!match) return undefined;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6]);
  const offsetHour = match[9] === undefined ? 0 : Number(match[9]);
  const offsetMinute = match[10] === undefined ? 0 : Number(match[10]);
  if (month < 1 || month > 12 || day < 1 || day > new Date(Date.UTC(year, month, 0)).getUTCDate()) return undefined;
  if (hour > 23 || minute > 59 || second > 59 || offsetHour > 23 || offsetMinute > 59) return undefined;
  const millis = Date.parse(normalized);
  return Number.isFinite(millis) ? Math.floor(millis / 1000) : undefined;
}


export function isStateError(error: unknown): error is StateError {
  return error instanceof StateError;
}
