import { appendFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";

export type ValidationRequirement = "required" | "conditional" | "informational";
export type ValidationResult = "passed" | "failed" | "unavailable" | "not-applicable";
export type FinalRun = "yes" | "no";

export interface ValidationRecord {
  id: number;
  name: string;
  requirement: ValidationRequirement;
  condition: string;
  result: ValidationResult;
  code: string;
  evidence: string;
  command: string;
  headBefore: string;
  headAfter: string;
  reason: string;
  finalRun: FinalRun;
}

export interface ValidationStatusRecord {
  status: ValidationResult | "missing";
  reason: string;
  requirement: ValidationRequirement | "";
}

function ledgerPath(stateDirectory: string): string {
  return join(stateDirectory, "validations.tsv");
}

function sourceLines(source: string): string[] {
  if (source === "") return [];
  const lines = source.split("\n");
  if (lines[lines.length - 1] === "") lines.pop();
  return lines;
}

function parseLine(line: string): ValidationRecord | undefined {
  if (line.length === 0) return undefined;
  const fields = line.split("\t");
  if (fields.length !== 12) throw new Error("evidence state is stale or unsupported; validation ledger has an invalid format");
  const [id, name, requirement, condition, result, code, evidence, command, headBefore, headAfter, reason, finalRun] = fields;
  if (
    !/^\d+$/.test(id) ||
    name === "" ||
    (requirement !== "required" && requirement !== "conditional" && requirement !== "informational") ||
    (result !== "passed" && result !== "failed" && result !== "unavailable" && result !== "not-applicable") ||
    !/^[0-9A-Fa-f]{40}$/.test(headBefore) ||
    !/^[0-9A-Fa-f]{40}$/.test(headAfter) ||
    (finalRun !== "yes" && finalRun !== "no")
  ) {
    throw new Error("evidence state is stale or unsupported; validation ledger has an invalid format");
  }
  return {
    id: Number(id),
    name,
    requirement,
    condition,
    result,
    code,
    evidence,
    command,
    headBefore,
    headAfter,
    reason,
    finalRun,
  };
}

function readLedger(stateDirectory: string): ValidationRecord[] {
  let source: string;
  try {
    source = readFileSync(ledgerPath(stateDirectory), "utf8");
  } catch {
    throw new Error("evidence state is stale or unsupported; validation ledger has an invalid format");
  }
  return sourceLines(source).flatMap((line) => {
    const record = parseLine(line);
    return record === undefined ? [] : [record];
  });
}

export function ensureValidationLedger(stateDirectory: string): void {
  const path = ledgerPath(stateDirectory);
  if (!existsSync(path)) writeFileSync(path, "");
  validateValidationLedger(stateDirectory);
}

export function validateValidationLedger(stateDirectory: string): void {
  readLedger(stateDirectory);
}

export function nextValidationId(stateDirectory: string): number {
  let source = "";
  try {
    source = readFileSync(ledgerPath(stateDirectory), "utf8");
  } catch {
    throw new Error("evidence state is stale or unsupported; validation ledger has an invalid format");
  }
  return sourceLines(source).length + 1;
}

export function appendValidation(stateDirectory: string, record: Omit<ValidationRecord, "id">): void {
  const id = nextValidationId(stateDirectory);
  const line = [
    id,
    record.name,
    record.requirement,
    record.condition,
    record.result,
    record.code,
    basename(record.evidence),
    record.command,
    record.headBefore,
    record.headAfter,
    record.reason,
    record.finalRun,
  ].join("\t");
  appendFileSync(ledgerPath(stateDirectory), `${line}\n`);
}

export function latestValidationStatus(
  stateDirectory: string,
  name: string,
  head: string,
  finalMode: boolean,
): ValidationStatusRecord {
  let latest: ValidationRecord | undefined;
  for (const record of readLedger(stateDirectory)) {
    if (record.name !== name || record.headAfter !== head || (finalMode && record.finalRun !== "yes")) continue;
    if (latest === undefined || record.id > latest.id) latest = record;
  }
  if (latest === undefined) return { status: "missing", reason: "", requirement: "" };
  return { status: latest.result, reason: latest.reason, requirement: latest.requirement };
}

export function finalValidationFailure(stateDirectory: string, head: string): string | undefined {
  const names = new Set<string>();
  for (const record of readLedger(stateDirectory)) {
    if (record.headAfter === head && record.finalRun === "yes") names.add(record.name);
  }
  const orderedNames = [...names].sort((left, right) => Buffer.compare(Buffer.from(left), Buffer.from(right)));
  let found = 0;
  const blockers: string[] = [];
  for (const name of orderedNames) {
    const latest = latestValidationStatus(stateDirectory, name, head, true);
    if (latest.requirement === "informational") continue;
    found += 1;
    const okay =
      (latest.requirement === "required" && latest.status === "passed") ||
      (latest.requirement === "conditional" && latest.status === "passed") ||
      (latest.requirement === "conditional" && latest.status === "not-applicable" && latest.reason !== "");
    if (!okay) blockers.push(`${name} (${latest.status})`);
  }
  if (found === 0) return `final validation is not passing: no required or applicable checks for HEAD ${head}`;
  if (blockers.length > 0) return `final validation is not passing: ${blockers.join(", ")}`;
  return undefined;
}

export function validationSummaryForHead(stateDirectory: string, head: string): "pending" | "passed" | "failed" {
  const finalCount = readLedger(stateDirectory).filter((record) => record.headAfter === head && record.finalRun === "yes").length;
  if (finalCount === 0) return "pending";
  return finalValidationFailure(stateDirectory, head) === undefined ? "passed" : "failed";
}
