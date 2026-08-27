import { isJsonObject, type JsonValue, type StrictJsonDocument } from "./json";
import {
  enumValue,
  fail,
  hasOwnField,
  optionalStringArray,
  requiredStringArray,
  safeString,
  unknownFields,
} from "./helpers";

const TASK_ID = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const SHA = /^[0-9A-Fa-f]{40}$/;
const COMMON_FIELDS = ["RESULT_PROFILE", "STATUS", "TASK_ID", "FINDINGS", "EVIDENCE", "RISKS", "RECOMMENDED_ACTION"] as const;
const WRITABLE_FIELDS = [
  ...COMMON_FIELDS,
  "BASE_SHA",
  "HEAD_SHA",
  "BRANCH",
  "FILES_CHANGED",
  "GIT_STATE",
  "DELIVERABLE_COMMITS",
  "VALIDATION",
  "SCOPE_EXCEPTIONS",
] as const;
const VALIDATION_FIELDS = ["command", "requirement", "condition", "applies", "result", "evidence"] as const;

export type ResultProfile = "READ_ONLY" | "WRITABLE" | "REVIEW";
export type OrdinaryResultProfile = "READ_ONLY" | "WRITABLE";
export type ResultStatus = "DONE" | "BLOCKED" | "FAILED";
export type ValidationRequirement = "required" | "conditional" | "informational";
export type ValidationResult = "passed" | "failed" | "unavailable" | "not-applicable";

export interface ValidatedResult {
  readonly taskId: string;
  readonly status: ResultStatus;
}

export type JsonSchema = Record<string, unknown>;

function validateValidation(records: JsonValue, status: ResultStatus): void {
  if (!Array.isArray(records) || records.length === 0) fail("VALIDATION must contain at least one record");
  records.forEach((value, index) => {
    const position = index + 1;
    const record = requireValidationRecord(value, position);
    const requirement = enumValue(record.requirement, ["required", "conditional", "informational"], `VALIDATION[${position}].requirement`);
    const applies = record.applies;
    if (typeof applies !== "boolean") fail(`VALIDATION[${position}].applies must be boolean`);
    const result = enumValue(
      record.result,
      ["passed", "failed", "unavailable", "not-applicable"],
      `VALIDATION[${position}].result`,
    );
    safeString(record.evidence, `VALIDATION[${position}].evidence`);
    if (requirement === "required" && !applies) fail("required validation must apply");
    if (requirement === "conditional" && !applies && result !== "not-applicable") {
      fail("non-applicable conditional validation must be not-applicable");
    }
    if (status === "DONE" && requirement === "required" && result !== "passed") {
      fail(`DONE result has a non-passing required validation: ${record.command}`);
    }
    if (status === "DONE" && requirement === "conditional" && applies && result !== "passed") {
      fail(`DONE result has a non-passing applicable validation: ${record.command}`);
    }
  });
}

function requireValidationRecord(value: JsonValue, position: number): Record<string, JsonValue> {
  if (!isJsonObject(value)) fail(`VALIDATION[${position}] must be an object`);
  const unknown = unknownFields(value, VALIDATION_FIELDS);
  if (unknown.length > 0) fail(`VALIDATION[${position}] contains unknown field: ${unknown[0]}`);
  for (const field of VALIDATION_FIELDS) {
    if (!hasOwnField(value, field)) fail(`VALIDATION[${position}] is missing ${field}`);
  }
  safeString(value.command, `VALIDATION[${position}].command`);
  safeString(value.condition, `VALIDATION[${position}].condition`);
  return value;
}

export function validateResult(
  document: StrictJsonDocument,
  expectedProfile: OrdinaryResultProfile,
  expectedTask: string | undefined,
): ValidatedResult {
  if (!isJsonObject(document.value)) fail("result must be a JSON object");
  const result = document.value;
  const allowed = expectedProfile === "READ_ONLY" ? COMMON_FIELDS : WRITABLE_FIELDS;
  const unknown = unknownFields(result, allowed);
  if (unknown.length > 0) fail(`result contains unknown or profile-incompatible field: ${unknown[0]}`);
  for (const field of ["RESULT_PROFILE", "STATUS", "TASK_ID", "FINDINGS", "EVIDENCE"] as const) {
    if (!hasOwnField(result, field)) fail(`result is missing ${field}`);
  }
  if (result.RESULT_PROFILE !== expectedProfile) fail("result profile does not match expected profile");
  const taskId = safeString(result.TASK_ID, "TASK_ID");
  if (!TASK_ID.test(taskId)) fail("TASK_ID contains unsupported characters");
  if (expectedTask !== undefined && taskId !== expectedTask) fail("TASK_ID does not match the requested task");
  const status = enumValue(result.STATUS, ["DONE", "BLOCKED", "FAILED"], "STATUS");
  requiredStringArray(result.FINDINGS, "FINDINGS");
  requiredStringArray(result.EVIDENCE, "EVIDENCE");
  if (hasOwnField(result, "RISKS")) optionalStringArray(result.RISKS, "RISKS");
  if (hasOwnField(result, "RECOMMENDED_ACTION")) optionalStringArray(result.RECOMMENDED_ACTION, "RECOMMENDED_ACTION");
  if (status === "BLOCKED" || status === "FAILED") {
    if (
      !hasOwnField(result, "RECOMMENDED_ACTION") ||
      !Array.isArray(result.RECOMMENDED_ACTION) ||
      result.RECOMMENDED_ACTION.length === 0
    ) {
      fail(`${status} result must include RECOMMENDED_ACTION`);
    }
  }

  if (expectedProfile === "READ_ONLY") return { taskId, status };

  for (const field of ["BASE_SHA", "HEAD_SHA", "BRANCH", "FILES_CHANGED", "GIT_STATE", "VALIDATION"] as const) {
    if (!hasOwnField(result, field)) fail(`result is missing ${field}`);
  }
  const baseSha = safeString(result.BASE_SHA, "BASE_SHA");
  const headSha = safeString(result.HEAD_SHA, "HEAD_SHA");
  safeString(result.BRANCH, "BRANCH");
  if (!SHA.test(baseSha)) fail("BASE_SHA must be a full 40-character SHA");
  if (headSha !== "none" && !SHA.test(headSha)) fail("HEAD_SHA must be a full 40-character SHA or none");
  const changed = requiredStringArray(result.FILES_CHANGED, "FILES_CHANGED");
  requiredStringArray(result.GIT_STATE, "GIT_STATE");
  validateValidation(result.VALIDATION, status);
  for (const path of changed) {
    if (path === "none" && status === "DONE") fail("DONE WRITABLE result cannot report no changed files");
    if (path !== "none" && path.startsWith("/")) fail("FILES_CHANGED paths must be repository-relative");
    if (path !== "none" && (path === ".." || path.startsWith("../") || path.includes("/../"))) {
      fail("FILES_CHANGED paths may not escape the repository");
    }
  }
  if (hasOwnField(result, "DELIVERABLE_COMMITS")) optionalStringArray(result.DELIVERABLE_COMMITS, "DELIVERABLE_COMMITS");
  if (hasOwnField(result, "SCOPE_EXCEPTIONS")) optionalStringArray(result.SCOPE_EXCEPTIONS, "SCOPE_EXCEPTIONS");
  return { taskId, status };
}

function stringArraySchema(minimum = 1): JsonSchema {
  const schema: JsonSchema = { type: "array", items: { type: "string", minLength: 1 } };
  schema.minItems = minimum;
  return schema;
}

function nullableArraySchema(): JsonSchema {
  return { anyOf: [stringArraySchema(1), { type: "null" }] };
}

export function resultSchema(profile: ResultProfile, taskId: string | undefined): JsonSchema {
  const commonProperties: JsonSchema = {
    RESULT_PROFILE: { type: "string", enum: [profile] },
    STATUS: { type: "string", enum: ["DONE", "BLOCKED", "FAILED"] },
    TASK_ID: taskId === undefined ? { type: "string" } : { type: "string", const: taskId },
    FINDINGS: stringArraySchema(1),
    EVIDENCE: stringArraySchema(1),
    RISKS: nullableArraySchema(),
    RECOMMENDED_ACTION: nullableArraySchema(),
  };
  const required = ["RESULT_PROFILE", "STATUS", "TASK_ID", "FINDINGS", "EVIDENCE"];
  const schema: JsonSchema = {
    type: "object",
    properties: commonProperties,
    required,
    additionalProperties: false,
  };
  if (profile === "WRITABLE") {
    const validationItem: JsonSchema = {
      type: "object",
      properties: {
        command: { type: "string", minLength: 1 },
        requirement: { type: "string", enum: ["required", "conditional", "informational"] },
        condition: { type: "string", minLength: 1 },
        applies: { type: "boolean" },
        result: { type: "string", enum: ["passed", "failed", "unavailable", "not-applicable"] },
        evidence: { type: "string", minLength: 1 },
      },
      required: ["command", "requirement", "condition", "applies", "result", "evidence"],
      additionalProperties: false,
    };
    (schema.properties as JsonSchema).BASE_SHA = { type: "string", pattern: SHA.source };
    (schema.properties as JsonSchema).HEAD_SHA = {
      anyOf: [{ type: "string", pattern: SHA.source }, { type: "string", const: "none" }],
    };
    (schema.properties as JsonSchema).BRANCH = { type: "string", minLength: 1 };
    (schema.properties as JsonSchema).FILES_CHANGED = stringArraySchema(1);
    (schema.properties as JsonSchema).GIT_STATE = stringArraySchema(1);
    (schema.properties as JsonSchema).DELIVERABLE_COMMITS = nullableArraySchema();
    (schema.properties as JsonSchema).VALIDATION = { type: "array", items: validationItem, minItems: 1 };
    (schema.properties as JsonSchema).SCOPE_EXCEPTIONS = nullableArraySchema();
    required.push("BASE_SHA", "HEAD_SHA", "BRANCH", "FILES_CHANGED", "GIT_STATE", "VALIDATION");
  } else if (profile === "REVIEW") {
    return {
      type: "object",
      properties: {
        status: { type: "string", enum: ["PASS", "CHANGES_REQUIRED"] },
        scope: { type: "object", additionalProperties: true },
        review_focus: { type: "object", additionalProperties: true },
        findings: { type: "array", items: { type: "object", additionalProperties: true } },
        deferred_followups: { type: "array", items: { type: "object", additionalProperties: true } },
      },
      required: ["status", "scope", "review_focus", "findings", "deferred_followups"],
      additionalProperties: false,
    };
  } else if (profile !== "READ_ONLY") {
    fail(`unknown result profile: ${profile}`);
  }
  return schema;
}
