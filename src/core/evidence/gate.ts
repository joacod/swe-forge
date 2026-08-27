import {
  appendFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  realpathSync,
  rmdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import type { Stats } from "node:fs";
import { basename, dirname, join } from "node:path";
import {
  initializeStateCommand,
  setContinuationCommand,
  setDeliveryCheckoutCommand,
  setReviewCommand,
  setValidationCommand,
} from "../../state/mutate";
import { validateStateFile } from "../../state/parse";
import type { RunState } from "../../state/types";
import {
  appendValidation,
  ensureValidationLedger,
  finalValidationFailure,
  nextValidationId,
  validationSummaryForHead,
} from "./ledger";
import { runGit, runProcessToFile, stripTrailingNewlines } from "./process";

export const usage = `Usage:
  scripts/swe-forge-gate preflight --state DIR [--branch BRANCH] [--base REF]
    [--routing-preferred MODE] [--routing-current MODE]
    [--delivery-mode MODE]
  scripts/swe-forge-gate validate --state DIR --name NAME
    [--requirement required|conditional|informational] [--condition TEXT] [--final]
    -- COMMAND [ARGS...]
  scripts/swe-forge-gate record-check-status --state DIR --name NAME
    [--requirement required|conditional|informational] [--condition TEXT]
    --status passed|failed|unavailable|not-applicable [--reason TEXT] [--final]
  scripts/swe-forge-gate review --state DIR --result PASS|CHANGES_REQUIRED
    --source SOURCE [--findings N] [--blocked-by ID...]
  scripts/swe-forge-gate deliver-pr --state DIR

The guard records validation and review evidence against Git HEAD. It never
launches agents, controls external orchestration, pushes, creates a PR,
publishes, deploys, or merges.
`;

export class HelpRequested extends Error {}

export interface GateResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

interface GateContext {
  stateDirectory: string;
  state: RunState;
  checkout: string;
}

function fail(message: string): never {
  throw new Error(message);
}

function optionValue(args: readonly string[], index: number, message: string): string {
  if (index + 1 >= args.length) fail(message);
  return args[index + 1];
}

function rejectControlChars(value: string): void {
  if (value.includes("\t") || value.includes("\n")) fail("values containing tabs or newlines are not supported");
}

function gateStatePath(input: string): string {
  rejectControlChars(input);
  const candidate = input.startsWith("/") ? input : `${process.cwd()}/${input}`;
  let candidateInfo: Stats | undefined;
  try {
    candidateInfo = lstatSync(candidate);
  } catch {
    candidateInfo = undefined;
  }
  if (candidateInfo !== undefined) {
    if (candidateInfo.isDirectory() && !candidateInfo.isSymbolicLink()) return realpathSync(candidate);
    fail(`state path must be a real directory: ${candidate}`);
  }

  const parent = dirname(candidate);
  try {
    const parentInfo = lstatSync(parent);
    if (!parentInfo.isDirectory() || parentInfo.isSymbolicLink()) fail(`state parent must be a real directory: ${parent}`);
    return `${realpathSync(parent)}/${basename(candidate)}`;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("state parent must be a real directory:")) throw error;
    fail(`state parent must be a real directory: ${parent}`);
  }
}

function validatedState(stateDirectory: string): RunState {
  const stateFile = join(stateDirectory, "run-state.yaml");
  let isFile = false;
  try {
    isFile = statSync(stateFile).isFile();
  } catch {
    isFile = false;
  }
  if (!isFile) fail(`state has not been initialized: ${stateDirectory}`);
  return validateStateFile(stateFile).state;
}

function loadContext(stateDirectory: string): GateContext {
  const state = validatedState(stateDirectory);
  const recordedCheckout = state.checkout.path;
  let checkoutIsDirectory = false;
  try {
    checkoutIsDirectory = statSync(recordedCheckout).isDirectory();
  } catch {
    checkoutIsDirectory = false;
  }
  if (!checkoutIsDirectory) fail(`recorded checkout no longer exists: ${recordedCheckout}`);
  let checkout: string;
  try {
    checkout = realpathSync(recordedCheckout);
  } catch {
    fail(`recorded checkout is not accessible: ${recordedCheckout}`);
  }
  return { stateDirectory, state, checkout };
}

async function gitText(checkout: string | undefined, args: readonly string[]): Promise<string | undefined> {
  const result = await runGit(checkout, args);
  if (result.exitCode !== 0) return undefined;
  return stripTrailingNewlines(result.stdout);
}

async function requiredGitText(
  checkout: string | undefined,
  args: readonly string[],
  message: string,
): Promise<string> {
  const output = await gitText(checkout, args);
  if (output === undefined) fail(message);
  return output;
}

async function gitSucceeds(checkout: string, args: readonly string[]): Promise<boolean> {
  const result = await runGit(checkout, args);
  return result.exitCode === 0;
}

async function gitRootFromCwd(): Promise<string> {
  const root = await gitText(undefined, ["rev-parse", "--show-toplevel"]);
  if (root === undefined) fail("not inside a Git checkout");
  return root;
}

async function currentBranch(checkout: string): Promise<string> {
  const branch = await gitText(checkout, ["symbolic-ref", "--quiet", "--short", "HEAD"]);
  return branch ?? "";
}

async function remoteDefaultBranch(checkout: string): Promise<string> {
  const remoteHead = await gitText(checkout, ["symbolic-ref", "--quiet", "--short", "refs/remotes/origin/HEAD"]);
  if (remoteHead === undefined) return "";
  const separator = remoteHead.indexOf("/");
  return separator < 0 ? "" : remoteHead.slice(separator + 1);
}

function assertNotProtected(branch: string, remoteDefault: string): void {
  if (branch === "main" || branch === "master") fail(`protected branch is not writable: ${branch}`);
  if (remoteDefault !== "" && branch === remoteDefault) fail(`remote default branch is not writable: ${branch}`);
}

async function statusPorcelain(checkout: string): Promise<string> {
  const status = await gitText(checkout, ["status", "--porcelain=v1", "--untracked-files=all"]);
  if (status === undefined) fail("could not read checkout status");
  return status;
}

async function identitySafe(context: GateContext): Promise<boolean> {
  const actualRoot = await gitText(context.checkout, ["rev-parse", "--show-toplevel"]);
  if (actualRoot !== context.checkout) return false;
  const branch = await currentBranch(context.checkout);
  if (branch === "" || branch !== context.state.checkout.branch) return false;
  const remoteDefault = await remoteDefaultBranch(context.checkout);
  if (branch === "main" || branch === "master") return false;
  if (remoteDefault !== "" && branch === remoteDefault) return false;
  return true;
}

async function assertIdentity(stateDirectory: string): Promise<GateContext> {
  const context = loadContext(stateDirectory);
  if (!(await identitySafe(context))) fail("checkout identity, branch, or protection state changed");
  return context;
}

async function ensureSafeStateLocation(stateDirectory: string, root: string): Promise<void> {
  if (stateDirectory === root) fail("state directory must not be the checkout root");
  const prefix = `${root}/`;
  if (!stateDirectory.startsWith(prefix)) return;
  const relative = stateDirectory.slice(prefix.length);
  if (!(await gitSucceeds(root, ["check-ignore", "-q", "--no-index", relative]))) {
    fail(`state inside checkout must already be ignored: ${stateDirectory}`);
  }
}

async function ensureState(stateDirectory: string): Promise<GateContext> {
  if (stateDirectory === "") fail("--state is required");
  const context = loadContext(stateDirectory);
  for (const obsolete of ["meta.env", "review.env", "run-state.valid"]) {
    if (existsSync(join(stateDirectory, obsolete))) {
      fail(`state contains obsolete persisted data: ${obsolete}; start a fresh state directory`);
    }
  }
  ensureValidationLedger(stateDirectory);
  return context;
}

function stateMutationArgs(stateFile: string, ...args: string[]): string[] {
  return ["--state", stateFile, ...args];
}

async function syncDeliveryHead(stateDirectory: string, head: string): Promise<void> {
  const state = validatedState(stateDirectory);
  if (state.checkout.head_sha === head) return;
  setDeliveryCheckoutCommand(stateMutationArgs(join(stateDirectory, "run-state.yaml"), "--head-sha", head));
}

function syncValidationState(stateDirectory: string, head: string): void {
  const status = validationSummaryForHead(stateDirectory, head);
  setValidationCommand(
    stateMutationArgs(join(stateDirectory, "run-state.yaml"), "--head-sha", head, "--status", status, "--reference", "validations.tsv"),
  );
}

export async function runPreflight(args: readonly string[]): Promise<GateResult> {
  let stateDirectory = "";
  let expectedBranch = "";
  let baselineRef = "HEAD";
  let deliveryMode = "PR";
  let routingPreferred = "SOLO";
  let routingCurrent = "SOLO";
  let stateReason = "single-checkout implementation";
  let fallbackUsed = "no";

  for (let index = 0; index < args.length; ) {
    const option = args[index];
    switch (option) {
      case "--state":
        stateDirectory = gateStatePath(optionValue(args, index, "--state requires a directory"));
        index += 2;
        break;
      case "--branch":
        expectedBranch = optionValue(args, index, "--branch requires a name");
        rejectControlChars(expectedBranch);
        index += 2;
        break;
      case "--base":
        baselineRef = optionValue(args, index, "--base requires a Git revision");
        rejectControlChars(baselineRef);
        index += 2;
        break;
      case "--delivery-mode":
        deliveryMode = optionValue(args, index, "--delivery-mode requires GUIDED or PR");
        rejectControlChars(deliveryMode);
        index += 2;
        break;
      case "--routing-preferred":
        routingPreferred = optionValue(args, index, "--routing-preferred requires a topology");
        rejectControlChars(routingPreferred);
        index += 2;
        break;
      case "--routing-current":
        routingCurrent = optionValue(args, index, "--routing-current requires a topology");
        rejectControlChars(routingCurrent);
        index += 2;
        break;
      case "--reason":
        stateReason = optionValue(args, index, "--reason requires text");
        rejectControlChars(stateReason);
        index += 2;
        break;
      case "--fallback-used":
        fallbackUsed = optionValue(args, index, "--fallback-used requires text");
        rejectControlChars(fallbackUsed);
        index += 2;
        break;
      case "-h":
      case "--help":
        throw new HelpRequested();
      default:
        fail(`unknown preflight option: ${option}`);
    }
  }

  if (stateDirectory === "") fail("--state is required");
  const checkout = await gitRootFromCwd();
  await ensureSafeStateLocation(stateDirectory, checkout);
  if (existsSync(join(stateDirectory, "run-state.yaml"))) fail(`state is already initialized: ${stateDirectory}`);
  for (const obsolete of ["meta.env", "review.env", "run-state.valid", "validations.tsv"]) {
    if (existsSync(join(stateDirectory, obsolete))) {
      fail(`state contains obsolete persisted data: ${obsolete}; start with a fresh state directory`);
    }
  }

  process.umask(0o077);
  const branch = await currentBranch(checkout);
  if (branch === "") fail("checkout is detached");
  if (expectedBranch !== "" && branch !== expectedBranch) {
    fail(`current branch ${branch} does not match expected branch ${expectedBranch}`);
  }
  const remoteDefault = await remoteDefaultBranch(checkout);
  assertNotProtected(branch, remoteDefault);
  if ((await statusPorcelain(checkout)) !== "") fail("checkout is not clean before writable work");
  const head = await requiredGitText(checkout, ["rev-parse", "HEAD"], "checkout has no commit baseline");
  const baseHead = await requiredGitText(checkout, ["rev-parse", baselineRef], `base revision does not resolve: ${baselineRef}`);
  if (!(await gitSucceeds(checkout, ["merge-base", "--is-ancestor", baseHead, head]))) {
    fail(`base revision is not an ancestor of the current checkout: ${baselineRef}`);
  }

  mkdirSync(stateDirectory, { recursive: true });
  initializeStateCommand([
    "--state",
    stateDirectory,
    "--checkout",
    checkout,
    "--run-id",
    basename(stateDirectory),
    "--baseline-ref",
    baseHead,
    "--delivery-mode",
    deliveryMode,
    "--routing-preferred",
    routingPreferred,
    "--routing-current",
    routingCurrent,
    "--reason",
    stateReason,
    "--fallback-used",
    fallbackUsed,
  ]);
  writeFileSync(join(stateDirectory, "validations.tsv"), "");
  setContinuationCommand([
    "--state",
    join(stateDirectory, "run-state.yaml"),
    "--workflow-active",
    "true",
    "--workflow",
    "ticket",
    "--phase",
    "planning",
    "--step",
    "0",
    "--awaiting",
    "none",
    "--next-action-kind",
    "specify",
    "--next-action-target",
    "working-spec",
    "--safe-boundary",
    "true",
  ]);
  validatedState(stateDirectory);
  return {
    exitCode: 0,
    stdout: `PASS: preflight baseline recorded at ${stateDirectory}\nBASELINE_HEAD: ${baseHead}\nCHECKOUT_HEAD: ${head}\nBRANCH: ${branch}\n`,
    stderr: "",
  };
}

export async function runValidate(args: readonly string[]): Promise<GateResult> {
  let stateDirectory = "";
  let name = "";
  let requirement = "required";
  let condition = "always";
  let finalRun = "no";
  let command: string[] = [];

  for (let index = 0; index < args.length; ) {
    const option = args[index];
    switch (option) {
      case "--state":
        stateDirectory = gateStatePath(optionValue(args, index, "--state requires a directory"));
        index += 2;
        break;
      case "--name":
        name = optionValue(args, index, "--name requires a label");
        index += 2;
        break;
      case "--requirement":
        requirement = optionValue(args, index, "--requirement requires required, conditional, or informational");
        index += 2;
        break;
      case "--condition":
        condition = optionValue(args, index, "--condition requires a value");
        index += 2;
        break;
      case "--final":
        finalRun = "yes";
        index += 1;
        break;
      case "--":
        command = [...args.slice(index + 1)];
        index = args.length;
        break;
      case "-h":
      case "--help":
        throw new HelpRequested();
      default:
        fail(`unknown validate option: ${option}`);
    }
  }

  if (name === "") fail("--name is required");
  if (command.length === 0) fail("a command is required after --");
  rejectControlChars(name);
  rejectControlChars(condition);
  if (requirement !== "required" && requirement !== "conditional" && requirement !== "informational") {
    fail(`invalid validation requirement: ${requirement}`);
  }
  if (requirement === "conditional" && condition === "") fail("conditional checks require a condition");
  await ensureState(stateDirectory);
  const identity = await assertIdentity(stateDirectory);
  const beforeStatus = await statusPorcelain(identity.checkout);
  if (finalRun === "yes" && beforeStatus !== "") fail("final validation requires a clean committed candidate");
  for (const argument of command) rejectControlChars(argument);
  const commandDisplay = command.join(" ");
  const id = nextValidationId(stateDirectory);
  const evidence = join(stateDirectory, `validation.${String(id).padStart(4, "0")}.log`);
  const headBefore = await requiredGitText(identity.checkout, ["rev-parse", "HEAD"], "checkout has no commit baseline");
  const code = await runProcessToFile(command, evidence, identity.checkout);
  const headAfter = await requiredGitText(identity.checkout, ["rev-parse", "HEAD"], "checkout has no commit baseline");
  const afterStatus = await statusPorcelain(identity.checkout);
  let result: "passed" | "failed" = code === 0 ? "passed" : "failed";
  let reason = "";
  if (headBefore !== headAfter || beforeStatus !== afterStatus) {
    result = "failed";
    reason = finalRun === "yes" ? "final validation changed the candidate" : "validation changed the candidate";
    appendFileSync(evidence, "\nSWE Forge validation binding failure: command changed the candidate.\n");
  }
  appendValidation(stateDirectory, {
    name,
    requirement: requirement as "required" | "conditional" | "informational",
    condition,
    result,
    code: String(code),
    evidence,
    command: commandDisplay,
    headBefore,
    headAfter,
    reason,
    finalRun: finalRun as "yes" | "no",
  });
  await syncDeliveryHead(stateDirectory, headAfter);
  syncValidationState(stateDirectory, headAfter);
  return {
    exitCode: result === "passed" ? 0 : 1,
    stdout: `${name}: ${result} (${evidence})\n`,
    stderr: "",
  };
}

export async function runRecordCheckStatus(args: readonly string[]): Promise<GateResult> {
  let stateDirectory = "";
  let name = "";
  let requirement = "required";
  let condition = "always";
  let status = "";
  let reason = "";
  let finalRun = "no";

  for (let index = 0; index < args.length; ) {
    const option = args[index];
    switch (option) {
      case "--state":
        stateDirectory = gateStatePath(optionValue(args, index, "--state requires a directory"));
        index += 2;
        break;
      case "--name":
        name = optionValue(args, index, "--name requires a label");
        index += 2;
        break;
      case "--requirement":
        requirement = optionValue(args, index, "--requirement requires required, conditional, or informational");
        index += 2;
        break;
      case "--condition":
        condition = optionValue(args, index, "--condition requires a value");
        index += 2;
        break;
      case "--status":
        status = optionValue(args, index, "--status requires a value");
        index += 2;
        break;
      case "--reason":
        reason = optionValue(args, index, "--reason requires a value");
        index += 2;
        break;
      case "--final":
        finalRun = "yes";
        index += 1;
        break;
      case "-h":
      case "--help":
        throw new HelpRequested();
      default:
        fail(`unknown record-check-status option: ${option}`);
    }
  }

  await ensureState(stateDirectory);
  const identity = await assertIdentity(stateDirectory);
  if (name === "") fail("--name is required");
  rejectControlChars(name);
  rejectControlChars(condition);
  rejectControlChars(reason);
  if (requirement !== "required" && requirement !== "conditional" && requirement !== "informational") {
    fail(`invalid validation requirement: ${requirement}`);
  }
  if (requirement === "conditional" && condition === "") fail("conditional checks require a condition");
  if (status !== "passed" && status !== "failed" && status !== "unavailable" && status !== "not-applicable") {
    fail(`invalid check status: ${status === "" ? "<missing>" : status}`);
  }
  if ((status === "unavailable" || status === "not-applicable") && reason === "") {
    fail(`${status} check status requires --reason`);
  }
  if (status === "not-applicable" && requirement !== "conditional") {
    fail("only conditional checks may be not-applicable");
  }
  if (finalRun === "yes" && (await statusPorcelain(identity.checkout)) !== "") {
    fail("final validation status requires a clean committed candidate");
  }

  const evidence = join(stateDirectory, `status.${String(nextValidationId(stateDirectory)).padStart(4, "0")}.log`);
  const head = await requiredGitText(identity.checkout, ["rev-parse", "HEAD"], "checkout has no commit baseline");
  writeFileSync(evidence, `recorded status ${status} for ${name}\n`);
  appendValidation(stateDirectory, {
    name,
    requirement: requirement as "required" | "conditional" | "informational",
    condition,
    result: status as "passed" | "failed" | "unavailable" | "not-applicable",
    code: "0",
    evidence,
    command: `record-check-status ${name} ${status}`,
    headBefore: head,
    headAfter: head,
    reason,
    finalRun: finalRun as "yes" | "no",
  });
  await syncDeliveryHead(stateDirectory, head);
  syncValidationState(stateDirectory, head);
  return { exitCode: 0, stdout: `PASS: recorded ${status} for ${name}\n`, stderr: "" };
}

async function reviewCandidateReady(context: GateContext, candidateHead: string): Promise<void> {
  if (context.state.delivery_mode !== "PR") return;
  if ((await statusPorcelain(context.checkout)) !== "") fail("PR review requires a clean committed candidate");
  if (finalValidationFailure(context.stateDirectory, candidateHead) !== undefined) {
    fail("PR review requires passing final validation for the current HEAD");
  }
  if (context.state.review.status !== "pending") fail("PR review can only start from pending review state");
}

function acquireReviewLock(stateDirectory: string): string {
  const lockPath = join(stateDirectory, "review.lock");
  let acquired = false;
  try {
    mkdirSync(lockPath);
    acquired = true;
    writeFileSync(join(lockPath, "pid"), `${process.pid}\n`, { encoding: "utf8", mode: 0o600 });
  } catch {
    if (acquired) {
      try {
        rmSync(join(lockPath, "pid"), { force: true });
        rmdirSync(lockPath);
      } catch {
        // A failed cleanup must not hide the lock acquisition failure.
      }
    }
    fail("review state is locked by another review activity; retry after it finishes");
  }
  return lockPath;
}

function releaseReviewLock(lockPath: string): void {
  try {
    rmSync(join(lockPath, "pid"), { force: true });
    rmdirSync(lockPath);
  } catch {
    // A failed cleanup must not hide the command's original result.
  }
}

export async function runReview(args: readonly string[]): Promise<GateResult> {
  let stateDirectory = "";
  let result = "";
  let source = "";
  let findings = "0";
  const blockedBy: string[] = [];

  for (let index = 0; index < args.length; ) {
    const option = args[index];
    switch (option) {
      case "--state":
        stateDirectory = gateStatePath(optionValue(args, index, "--state requires a directory"));
        index += 2;
        break;
      case "--result":
        result = optionValue(args, index, "--result requires PASS or CHANGES_REQUIRED");
        index += 2;
        break;
      case "--source":
        source = optionValue(args, index, "--source requires a review source");
        index += 2;
        break;
      case "--findings":
        findings = optionValue(args, index, "--findings requires a non-negative integer");
        index += 2;
        break;
      case "--blocked-by": {
        const id = optionValue(args, index, "--blocked-by requires a finding ID");
        rejectControlChars(id);
        if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(id)) fail(`invalid blocked finding ID: ${id}`);
        blockedBy.push(id);
        index += 2;
        break;
      }
      case "-h":
      case "--help":
        throw new HelpRequested();
      default:
        fail(`unknown review option: ${option}`);
    }
  }

  if (result !== "PASS" && result !== "CHANGES_REQUIRED") fail(`invalid review result: ${result === "" ? "<missing>" : result}`);
  if (source === "") fail("--source is required");
  rejectControlChars(source);
  if (!/^\d+$/.test(findings)) fail("findings must be a non-negative integer");
  if (result === "CHANGES_REQUIRED" && Number(findings) === 0) {
    fail("CHANGES_REQUIRED review must report at least one finding");
  }
  if (result === "CHANGES_REQUIRED" && blockedBy.length === 0) {
    fail("CHANGES_REQUIRED review must identify at least one blocking finding");
  }

  if (stateDirectory === "") fail("--state is required");
  const lockPath = acquireReviewLock(stateDirectory);
  try {
    const context = await ensureState(stateDirectory);
    const identity = await assertIdentity(stateDirectory);
    const head = await requiredGitText(identity.checkout, ["rev-parse", "HEAD"], "checkout has no commit baseline");
    await reviewCandidateReady(context, head);
    await syncDeliveryHead(stateDirectory, head);
    const stateArgs = stateMutationArgs(join(stateDirectory, "run-state.yaml"), "--head-sha", head, "--result", result);
    for (const id of blockedBy) stateArgs.push("--blocked-by", id);
    setReviewCommand(stateArgs);
    return { exitCode: result === "PASS" ? 0 : 1, stdout: `REVIEW: ${result} (${findings} findings)\n`, stderr: "" };
  } finally {
    releaseReviewLock(lockPath);
  }
}

async function checkFinalState(stateDirectory: string): Promise<GateResult> {
  const initial = await ensureState(stateDirectory);
  const blockers: string[] = [];
  if (!(await identitySafe(initial))) blockers.push("checkout identity, branch, or protection state is not safe");
  const status = await statusPorcelain(initial.checkout);
  if (status !== "") blockers.push("checkout is dirty");
  const currentState = validatedState(stateDirectory);
  const currentHead = await requiredGitText(initial.checkout, ["rev-parse", "HEAD"], "checkout has no commit baseline");
  if (!(await gitSucceeds(initial.checkout, ["merge-base", "--is-ancestor", currentState.checkout.base_sha, currentHead]))) {
    blockers.push("current HEAD is not based on the recorded baseline");
  }
  if (finalValidationFailure(stateDirectory, currentHead) !== undefined) {
    blockers.push("required or applicable final validation is not passing for current HEAD");
  }
  const validationState = validatedState(stateDirectory).validation;
  if (validationState.head_sha !== currentHead) blockers.push("validation state is not for current HEAD");
  if (validationState.status !== "passed") {
    blockers.push(`validation state does not record a passing final candidate: ${validationState.status}`);
  }

  const review = validatedState(stateDirectory).review;
  switch (review.status) {
    case "pass":
      if (review.repair_used) blockers.push("review PASS cannot record a repair");
      if (review.reviewed_head !== currentHead) blockers.push("review evidence is not for current HEAD");
      break;
    case "repaired":
      if (currentState.delivery_mode !== "PR") blockers.push("review repair is only supported for PR delivery");
      if (!review.repair_used) blockers.push("repaired review state lacks repair evidence");
      if (review.blocked_by.length !== 1) blockers.push("repaired review state must retain one blocking finding");
      if (review.reviewed_head === currentHead) blockers.push("review repair did not produce a new candidate");
      if (!(await gitSucceeds(initial.checkout, ["cat-file", "-e", `${review.reviewed_head}^{commit}`]))) {
        blockers.push("review evidence references a missing commit");
      }
      if (!(await gitSucceeds(initial.checkout, ["merge-base", "--is-ancestor", review.reviewed_head, currentHead]))) {
        blockers.push("repaired candidate is not based on the reviewed HEAD");
      }
      break;
    case "changes-required":
      blockers.push("review has unresolved findings");
      break;
    default:
      blockers.push(`canonical review state does not permit delivery: ${review.status}`);
      break;
  }

  if (blockers.length > 0) {
    return { exitCode: 1, stdout: "", stderr: blockers.map((blocker) => `BLOCKED: ${blocker}\n`).join("") };
  }
  return { exitCode: 0, stdout: "", stderr: "" };
}

export async function runDeliverPr(args: readonly string[]): Promise<GateResult> {
  let stateDirectory = "";
  for (let index = 0; index < args.length; ) {
    const option = args[index];
    switch (option) {
      case "--state":
        stateDirectory = gateStatePath(optionValue(args, index, "--state requires a directory"));
        index += 2;
        break;
      case "-h":
      case "--help":
        throw new HelpRequested();
      default:
        fail(`unknown deliver-pr option: ${option}`);
    }
  }
  if (stateDirectory === "") fail("--state is required");
  const context = await ensureState(stateDirectory);
  if (context.state.delivery_mode !== "PR") fail("deliver-pr is only valid in PR mode");
  const finalState = await checkFinalState(stateDirectory);
  if (finalState.exitCode !== 0) return finalState;
  const branch = await currentBranch(context.checkout);
  const head = await requiredGitText(context.checkout, ["rev-parse", "HEAD"], "checkout has no commit baseline");
  return {
    exitCode: 0,
    stdout: `PASS: PR delivery prerequisites\nBRANCH: ${branch}\nHEAD: ${head}\n`,
    stderr: "",
  };
}
