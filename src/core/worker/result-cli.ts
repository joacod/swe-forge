import { loadJson } from "./json";
import { fail } from "./helpers";
import { resultSchema, validateResult, type ResultProfile } from "./result";

const USAGE = [
  "Usage:",
  "  swe-forge-worker-result schema --profile PROFILE [--task-id ID]",
  "  swe-forge-worker-result validate --profile READ_ONLY|WRITABLE \\",
  "    [--task-id ID] --result FILE|-",
  "",
  "schema emits the direct JSON Schema for one canonical result profile.",
  "validate accepts that same JSON object from a file or stdin. JSON is also the",
  "text fallback for hosts without native structured-output support; no second",
  "encoding is used.",
  "",
].join("\n") + "\n";

const TASK_ID = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

class HelpRequested extends Error {}

interface ParsedOptions {
  readonly profile: string | undefined;
  readonly taskId: string | undefined;
  readonly result: string | undefined;
}

function optionValue(arguments_: readonly string[], index: number, option: string): string {
  if (index + 1 >= arguments_.length) fail(`${option} requires a value`);
  return arguments_[index + 1];
}

function parseOptions(arguments_: readonly string[], command: string): ParsedOptions {
  let profile: string | undefined;
  let taskId: string | undefined;
  let result: string | undefined;
  let index = 0;
  while (index < arguments_.length) {
    const option = arguments_[index];
    if (option === "--profile" || option === "--task-id" || option === "--task" || option === "--result") {
      const value = optionValue(arguments_, index, option);
      if (option === "--profile") profile = value;
      else if (option === "--task-id" || option === "--task") taskId = value;
      else {
        if (result !== undefined) fail("result input was specified more than once");
        result = value;
      }
      index += 2;
      continue;
    }
    if (command === "validate" && !option.startsWith("-")) {
      if (result !== undefined) fail("result input was specified more than once");
      result = option;
      index += 1;
      continue;
    }
    if (option === "-h" || option === "--help") throw new HelpRequested();
    fail(`unknown ${command} option: ${option}`);
  }
  return { profile, taskId, result };
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function runWorkerResultCli(args: readonly string[] = process.argv.slice(2)): number {
  if (args.length === 0) {
    process.stdout.write(USAGE);
    return 2;
  }
  if (args[0] === "-h" || args[0] === "--help") {
    process.stdout.write(USAGE);
    return 0;
  }

  try {
    const command = args[0];
    if (command !== "schema" && command !== "validate") fail(`unknown operation: ${command}`);
    const options = parseOptions(args.slice(1), command);
    if (options.profile !== "READ_ONLY" && options.profile !== "WRITABLE" && options.profile !== "REVIEW") {
      fail("a valid --profile is required");
    }
    if (options.taskId !== undefined && !TASK_ID.test(options.taskId)) fail("task ID contains unsupported characters");
    const profile = options.profile as ResultProfile;

    if (command === "schema") {
      if (profile === "REVIEW" && options.taskId !== undefined) fail("REVIEW schema does not accept --task-id");
      if (profile !== "REVIEW" && options.taskId === undefined) fail("ordinary schema requires --task-id");
      process.stdout.write(`${JSON.stringify(resultSchema(profile, options.taskId), null, 2)}\n`);
      return 0;
    }
    if (profile === "REVIEW") fail("REVIEW results use contracts/review.md; validate its dedicated contract");
    if (options.result === undefined) fail("validate requires --result FILE|-");
    const validated = validateResult(loadJson(options.result, "result"), profile, options.taskId);
    process.stdout.write(
      `${JSON.stringify({
        schema: "worker-result/v1",
        valid: true,
        profile,
        status: validated.status,
        task_id: validated.taskId,
      })}\n`,
    );
    return 0;
  } catch (error) {
    if (error instanceof HelpRequested) {
      process.stdout.write(USAGE);
      return 0;
    }
    process.stderr.write(`FAIL: ${errorText(error)}\n`);
    return 1;
  }
}

if (import.meta.main) process.exitCode = runWorkerResultCli();
