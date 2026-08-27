import { inspectStateData, resolveActiveStates, serializeProjection } from "./state/inspect";
import { absolutePath, StateError, validateStateFile } from "./state/parse";
import {
  initializeStateCommand,
  setContinuationCommand,
  setDeliveryCheckoutCommand,
  setPullRequestCommand,
  setReviewCommand,
  setReviewRepairCommand,
  setRoutingCommand,
  setValidationCommand,
} from "./state/mutate";

const usage = `Usage:
  swe-forge-state validate --state FILE|DIRECTORY
  swe-forge-state inspect --state FILE|DIRECTORY --checkout PATH
  swe-forge-state resolve-active --checkout PATH \\
    [--candidate FILE|DIRECTORY ...] [--all]
  swe-forge-state init --state DIRECTORY [--checkout PATH] [options]
  swe-forge-state set-routing --state FILE|DIRECTORY \\
    --preferred TOPOLOGY --current TOPOLOGY --reason TEXT \\
    --fallback-used TEXT
  swe-forge-state set-continuation --state FILE|DIRECTORY [options]
  swe-forge-state set-delivery-checkout --state FILE|DIRECTORY --head-sha SHA
  swe-forge-state set-validation --state FILE|DIRECTORY \\
    --head-sha SHA --status pending|passed|failed --reference REF
  swe-forge-state set-review --state FILE|DIRECTORY \\
    --head-sha SHA --result PASS|CHANGES_REQUIRED [--blocked-by ID...]
  swe-forge-state set-review-repair --state FILE|DIRECTORY --head-sha SHA
  swe-forge-state set-pull-request --state FILE|DIRECTORY --url URL

\`inspect\` and \`resolve-active\` expose the validated semantic run-state
projection as deterministic JSON. Candidate discovery remains the caller's
responsibility; this helper owns validation, eligibility, and ordering.
\`init\` creates the current schema-v5 state from actual checkout facts and
semantic routing and delivery input. \`set-continuation\` owns its timestamp.
\`set-delivery-checkout\`, \`set-validation\`, \`set-review\`,
\`set-review-repair\`, and \`set-pull-request\` own purpose-specific updates. All
write operations are serialized per state, validated before atomic replacement,
and never migrate stale state.
`;

function failMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function commandHasHelp(args: readonly string[]): boolean {
  return args.some((value) => value === "-h" || value === "--help");
}

function runValidate(args: readonly string[]): string {
  let state = "";
  for (let index = 0; index < args.length; ) {
    const option = args[index];
    if (option === "--state") {
      if (index + 1 >= args.length) throw new StateError("--state requires a file or directory");
      state = args[index + 1];
      index += 2;
      continue;
    }
    throw new StateError(`unknown validate option: ${option}`);
  }
  if (state === "") throw new StateError("--state is required");
  const result = validateStateFile(state);
  return `PASS: schema-v5 run state is structurally valid: ${result.path}`;
}

function runInspect(args: readonly string[]): string {
  let state = "";
  let checkout = "";
  for (let index = 0; index < args.length; ) {
    const option = args[index];
    if (option === "--state") {
      if (index + 1 >= args.length) throw new StateError("--state requires a file or directory");
      state = args[index + 1];
      index += 2;
      continue;
    }
    if (option === "--checkout") {
      if (index + 1 >= args.length) throw new StateError("--checkout requires a path");
      checkout = args[index + 1];
      index += 2;
      continue;
    }
    throw new StateError(`unknown inspect option: ${option}`);
  }
  if (state === "") throw new StateError("inspect requires --state");
  if (checkout === "") throw new StateError("inspect requires --checkout");
  return serializeProjection(inspectStateData(state, checkout).projection);
}

function runResolveActive(args: readonly string[]): string {
  let checkout = "";
  let includeAll = false;
  const candidates: string[] = [];
  for (let index = 0; index < args.length; ) {
    const option = args[index];
    if (option === "--checkout") {
      if (index + 1 >= args.length) throw new StateError("--checkout requires a path");
      checkout = args[index + 1];
      index += 2;
      continue;
    }
    if (option === "--candidate") {
      if (index + 1 >= args.length) throw new StateError("--candidate requires a file or directory");
      absolutePath(args[index + 1]);
      candidates.push(args[index + 1]);
      index += 2;
      continue;
    }
    if (option === "--all") {
      includeAll = true;
      index += 1;
      continue;
    }
    throw new StateError(`unknown resolve-active option: ${option}`);
  }
  if (checkout === "") throw new StateError("resolve-active requires --checkout");
  return serializeProjection(resolveActiveStates(checkout, candidates, includeAll));
}

export async function runStateCli(args: readonly string[] = process.argv.slice(2)): Promise<number> {
  if (args.length === 0) {
    process.stderr.write(usage);
    return 2;
  }
  const command = args[0];
  if (command === "-h" || command === "--help") {
    process.stdout.write(usage);
    return 0;
  }
  const commandArgs = args.slice(1);
  const knownCommands = new Set([
    "validate",
    "inspect",
    "resolve-active",
    "init",
    "set-routing",
    "set-continuation",
    "set-delivery-checkout",
    "set-validation",
    "set-review",
    "set-review-repair",
    "set-pull-request",
  ]);
  if (!knownCommands.has(command)) {
    process.stderr.write(`FAIL: unknown command: ${command}\n`);
    return 1;
  }
  if (commandHasHelp(commandArgs)) {
    process.stdout.write(usage);
    return 0;
  }
  try {
    let output: string;
    switch (command) {
      case "validate":
        output = runValidate(commandArgs);
        break;
      case "inspect":
        output = runInspect(commandArgs);
        break;
      case "resolve-active":
        output = runResolveActive(commandArgs);
        break;
      case "init":
        output = `PASS: schema-v5 run state initialized: ${initializeStateCommand(commandArgs)}`;
        break;
      case "set-routing":
        output = `PASS: routing updated: ${setRoutingCommand(commandArgs)}`;
        break;
      case "set-continuation":
        output = `PASS: continuation updated: ${setContinuationCommand(commandArgs)}`;
        break;
      case "set-delivery-checkout":
        output = `PASS: checkout head updated: ${setDeliveryCheckoutCommand(commandArgs)}`;
        break;
      case "set-validation":
        output = `PASS: validation updated: ${setValidationCommand(commandArgs)}`;
        break;
      case "set-review": {
        const result = setReviewCommand(commandArgs);
        output = `PASS: review recorded: ${result.result}`;
        break;
      }
      case "set-review-repair":
        output = `PASS: review repair recorded: ${setReviewRepairCommand(commandArgs)}`;
        break;
      case "set-pull-request":
        output = `PASS: pull-request completion recorded: ${setPullRequestCommand(commandArgs)}`;
        break;
      default:
        throw new StateError(`unknown command: ${command}`);
    }
    process.stdout.write(`${output}\n`);
    return 0;
  } catch (error) {
    process.stderr.write(`FAIL: ${failMessage(error)}\n`);
    return 1;
  }
}

if (import.meta.main) process.exitCode = await runStateCli();
