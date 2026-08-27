import { isPositiveIntegerAt, type JsonValue, type StrictJsonDocument } from "./json";
import {
  actionSet,
  enumValue,
  fail,
  hasOwnField,
  objectWithKeys,
  safeString,
  stringList,
} from "./helpers";

const TASK_ID = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const DIGEST_CATEGORIES = [
  "accepted_decisions",
  "relevant_facts",
  "changed_interfaces",
  "paths_symbols",
  "authoritative_assumptions",
  "validation_facts",
  "unresolved_risks",
  "source_refs",
] as const;
const FORBIDDEN_ACTIONS = [
  "delivery",
  "recursive delegation",
  "peer communication",
  "scope expansion",
  "topology decisions",
] as const;

export type BriefProfile = "READ_ONLY" | "WRITABLE" | "REVIEW";
export type WriteAccess = "read-only" | "read-write";

export interface BriefInspection {
  readonly taskId: string;
  readonly profile: BriefProfile;
  readonly writeAccess: WriteAccess;
}

function validateDependencies(value: JsonValue): void {
  const dependencies = objectWithKeys(value, "dependencies", [], ["completed", "pending"]);
  if (Object.keys(dependencies).length === 0) fail("dependencies must contain completed or pending entries");

  const seen = new Set<string>();
  const completed: JsonValue = hasOwnField(dependencies, "completed") ? dependencies.completed : [];
  if (!Array.isArray(completed)) fail("dependencies.completed must be an array");
  completed.forEach((item, index) => {
    const position = index + 1;
    const entry = objectWithKeys(item, `dependencies.completed[${position}]`, ["task_id", "dependency_digest"]);
    const taskId = safeString(entry.task_id, `dependencies.completed[${position}].task_id`);
    if (!TASK_ID.test(taskId)) fail(`dependency task ID contains unsupported characters: ${taskId}`);
    if (seen.has(taskId)) fail(`duplicate dependency task: ${taskId}`);
    seen.add(taskId);

    const digest = objectWithKeys(
      entry.dependency_digest,
      `dependencies.completed[${position}].dependency_digest`,
      [],
      DIGEST_CATEGORIES,
    );
    if (Object.keys(digest).length === 0) fail(`dependencies.completed[${position}] has an empty dependency digest`);
    if (!hasOwnField(digest, "source_refs")) fail(`dependencies.completed[${position}] must include source_refs`);
    for (const [category, facts] of Object.entries(digest)) stringList(facts, `dependency digest ${category}`, 1);
  });

  const pending: JsonValue = hasOwnField(dependencies, "pending") ? dependencies.pending : [];
  if (!Array.isArray(pending)) fail("dependencies.pending must be an array");
  pending.forEach((item, index) => {
    const taskId = safeString(item, `dependencies.pending[${index + 1}]`);
    if (!TASK_ID.test(taskId)) fail(`dependency task ID contains unsupported characters: ${taskId}`);
    if (seen.has(taskId)) fail(`dependency appears more than once: ${taskId}`);
    seen.add(taskId);
  });
  if (seen.size === 0) fail("dependencies must contain a completed or pending dependency");
}

export function validateBrief(document: StrictJsonDocument): BriefInspection {
  const outer = objectWithKeys(document.value, "brief", ["worker_briefing"]);
  const brief = objectWithKeys(
    outer.worker_briefing,
    "worker_briefing",
    [
      "schema",
      "task_id",
      "worker",
      "objective",
      "acceptance",
      "repository",
      "architecture_decisions",
      "validation",
      "permissions",
      "return",
    ],
    ["dependencies"],
  );
  if (brief.schema !== "worker-brief/v1") fail("schema must be worker-brief/v1");

  const taskId = safeString(brief.task_id, "task_id");
  if (!TASK_ID.test(taskId)) fail("task_id contains unsupported characters");

  const worker = objectWithKeys(brief.worker, "worker", ["role", "mode", "depth", "recursive_delegation"]);
  safeString(worker.role, "worker.role");
  if (worker.mode !== "delegated_worker") fail("worker.mode must be delegated_worker");
  if (!isPositiveIntegerAt(document, worker.depth, ["worker_briefing", "worker", "depth"])) {
    fail("worker.depth must be a positive integer");
  }
  if (worker.recursive_delegation !== false) fail("worker.recursive_delegation must be false");

  safeString(brief.objective, "objective");
  stringList(brief.acceptance, "acceptance", 1);

  const repository = objectWithKeys(brief.repository, "repository", ["instructions", "allowed_reads", "allowed_writes"]);
  stringList(repository.instructions, "repository.instructions");
  stringList(repository.allowed_reads, "repository.allowed_reads", 1);
  const writes = stringList(repository.allowed_writes, "repository.allowed_writes", 1);

  stringList(brief.architecture_decisions, "architecture_decisions");

  if (!Array.isArray(brief.validation) || brief.validation.length === 0) {
    fail("validation must contain at least one check");
  }
  brief.validation.forEach((item, index) => {
    const position = index + 1;
    const check = objectWithKeys(
      item,
      `validation[${position}]`,
      ["command", "requirement", "condition", "side_effects"],
    );
    safeString(check.command, `validation[${position}].command`);
    enumValue(check.requirement, ["required", "conditional", "informational"], `validation[${position}].requirement`);
    safeString(check.condition, `validation[${position}].condition`);
    enumValue(check.side_effects, ["local-only", "external-read", "external-write", "destructive"], `validation[${position}].side_effects`);
  });

  const permissions = objectWithKeys(
    brief.permissions,
    "permissions",
    ["write_access", "topology", "allowed_actions", "forbidden_actions"],
  );
  const writeAccess = enumValue(permissions.write_access, ["read-only", "read-write"], "permissions.write_access");
  if (permissions.topology !== "SUBAGENTS") fail("permissions.topology must be SUBAGENTS");
  const allowedActions = stringList(permissions.allowed_actions, "permissions.allowed_actions", 1);
  const forbiddenActions = stringList(permissions.forbidden_actions, "permissions.forbidden_actions", 1);
  actionSet(forbiddenActions, FORBIDDEN_ACTIONS, "permissions.forbidden_actions");

  if (writeAccess === "read-only") {
    if (JSON.stringify(writes) !== JSON.stringify(["none"])) fail("read-only workers must have allowed_writes [none]");
  } else {
    if (writes.includes("none")) fail("read-write workers may not have an allowed write named none");
    if (writes.length === 0) fail("read-write workers must declare an allowed write");
  }

  const result = objectWithKeys(brief.return, "return", ["profile", "contract", "expected_output"]);
  const profile = enumValue(result.profile, ["READ_ONLY", "WRITABLE", "REVIEW"], "return.profile");
  stringList(result.expected_output, "return.expected_output", 1);

  const role = worker.role as JsonValue;
  if (role === "reviewer") {
    if (writeAccess !== "read-only" || profile !== "REVIEW") fail("review workers must be read-only and use the REVIEW profile");
    if (result.contract !== ".swe-forge/contracts/review.md") fail("REVIEW workers must use contracts/review.md");
    actionSet(allowedActions, ["read"], "review workers' allowed actions");
  } else if (writeAccess === "read-only") {
    if (profile !== "READ_ONLY") fail("read-only workers must use the READ_ONLY profile");
    if (result.contract !== ".swe-forge/contracts/result.md") fail("ordinary workers must use contracts/result.md");
    actionSet(allowedActions, ["read", "validation"], "read-only ordinary workers' allowed actions");
  } else {
    if (profile !== "WRITABLE") fail("read-write workers must use the WRITABLE profile");
    if (result.contract !== ".swe-forge/contracts/result.md") fail("ordinary workers must use contracts/result.md");
    actionSet(allowedActions, ["read", "edit", "validation"], "read-write workers' allowed actions");
  }

  if (hasOwnField(brief, "dependencies")) validateDependencies(brief.dependencies);
  return { taskId, profile, writeAccess };
}
