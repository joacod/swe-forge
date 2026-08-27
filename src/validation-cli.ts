import { join, resolve } from "node:path";
import { runProcess } from "./core/evidence/process";

type Group = "core" | "invocation" | "evidence" | "installer" | "pi" | "omp" | "workers" | "release";
type Check =
  | "syntax"
  | "structural"
  | "selection"
  | "boundary"
  | "invocation"
  | "evidence"
  | "installer"
  | "pi"
  | "omp"
  | "briefing"
  | "results"
  | "release";

type ParseResult = { kind: "help" } | { kind: "selection"; selection: Selection };

interface Selection {
  readonly listOnly: boolean;
  readonly planOnly: boolean;
  readonly parallel: boolean;
  readonly requestedGroups: readonly string[];
  readonly selectedGroups: ReadonlySet<Group>;
  readonly fullRequested: boolean;
}

interface Plan {
  readonly selectedGroups: readonly Group[];
  readonly notRunGroups: readonly Group[];
  readonly selectedChecks: readonly Check[];
  readonly effectiveFull: boolean;
}

interface CheckResult {
  readonly check: Check;
  readonly exitCode: number;
  readonly output: string;
}

const root = resolve(import.meta.dir, "..");
const groupOrder: readonly Group[] = ["core", "invocation", "evidence", "installer", "pi", "omp", "workers", "release"];
const fullGroups: readonly Group[] = ["core", "invocation", "evidence", "installer", "pi", "omp", "workers"];
const prechecks: readonly Check[] = ["syntax", "structural"];

const groupAliases: Readonly<Record<string, Group | "full">> = {
  core: "core",
  structural: "core",
  invocation: "invocation",
  evidence: "evidence",
  state: "evidence",
  installer: "installer",
  pi: "pi",
  "pi-runtime": "pi",
  omp: "omp",
  "omp-runtime": "omp",
  workers: "workers",
  worker: "workers",
  "worker-contracts": "workers",
  release: "release",
  "release-readiness": "release",
  full: "full",
};

const checksByGroup: Readonly<Record<Group, readonly Check[]>> = {
  core: ["syntax", "structural", "selection", "boundary"],
  invocation: ["invocation"],
  evidence: ["evidence"],
  installer: ["installer"],
  pi: ["pi"],
  omp: ["omp"],
  workers: ["briefing", "results"],
  release: ["release"],
};

const checkLabels: Readonly<Record<Check, string>> = {
  syntax: "shell syntax",
  structural: "structural checks",
  selection: "validation selection fixture",
  boundary: "canonical boundary fixture",
  invocation: "invocation parser fixture",
  evidence: "evidence/state fixtures",
  installer: "installer fixture tests",
  pi: "Pi runtime fixture",
  omp: "OMP runtime fixture",
  briefing: "worker briefing fixture",
  results: "worker result fixture",
  release: "release readiness",
};

const shellFiles: readonly string[] = [
  "scripts/swe-forge",
  "scripts/check-swe-forge",
  "scripts/validate-swe-forge",
  "scripts/test-swe-forge",
  "scripts/test-validate-swe-forge",
  "scripts/test-swe-forge-gate",
  "scripts/test-swe-forge-pi",
  "scripts/test-swe-forge-omp",
  "scripts/test-swe-forge-invocation",
  "scripts/test-swe-forge-briefing",
  "scripts/test-swe-forge-results",
  "scripts/check-swe-forge-boundary",
  "scripts/test-swe-forge-boundary",
  "scripts/check-release",
  ".swe-forge/tools/swe-forge-gate",
  ".swe-forge/tools/swe-forge-state",
  ".swe-forge/tools/swe-forge-invocation",
  ".swe-forge/tools/swe-forge-worker-brief",
  ".swe-forge/tools/swe-forge-worker-result",
];

const usage = `Usage:
  scripts/validate-swe-forge [--serial] [GROUP ...]
  scripts/validate-swe-forge [--serial] --group GROUP [--group GROUP ...]
  scripts/validate-swe-forge --plan [GROUP ...]
  scripts/validate-swe-forge --list

With no group, or with \`full\`, run the complete repository validation bundle.
Use more than one group when a change crosses subsystem boundaries. \`release\`
is separate because it checks release-readiness consistency; use \`full release\`
for a release candidate.

Groups:
  core       shell syntax, structural checks, selection fixture, and boundary
  invocation invocation parser fixture
  evidence   executable evidence-gate and run-state fixtures
  installer  installer lifecycle and rollback fixtures
  pi         Pi adapter/runtime fixture
  omp        OMP adapter/runtime fixture
  workers    worker briefing and worker-result contract fixtures
  release    release consistency/readiness check
  full       core, invocation, evidence, installer, pi, omp, and workers

Examples:
  scripts/validate-swe-forge core
  scripts/validate-swe-forge full
  scripts/validate-swe-forge full release

Aliases: structural=core, state=evidence, worker-contracts=workers,
pi-runtime=pi, omp-runtime=omp, and release-readiness=release.

\`--plan\` reports exactly which checks would run without executing them. The
normal report also identifies groups and checks that were not selected.
`;

class ValidationFailure extends Error {}

function fail(message: string): never {
  throw new ValidationFailure(message);
}

function selectGroup(
  name: string,
  selectedGroups: Set<Group>,
  requestedGroups: string[],
): boolean {
  const selected = groupAliases[name];
  if (selected === undefined) fail(`unknown validation group: ${name}`);
  requestedGroups.push(name);
  if (selected === "full") {
    for (const group of fullGroups) selectedGroups.add(group);
    return true;
  }
  selectedGroups.add(selected);
  return false;
}

function parseSelection(args: readonly string[]): ParseResult {
  let listOnly = false;
  let planOnly = false;
  let parallel = true;
  let groupRequested = false;
  let fullRequested = false;
  const requestedGroups: string[] = [];
  const selectedGroups = new Set<Group>();

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    switch (argument) {
      case "--serial":
        parallel = false;
        break;
      case "--list":
        listOnly = true;
        break;
      case "--plan":
        planOnly = true;
        break;
      case "--group":
        if (index + 1 >= args.length) fail("--group requires a group name");
        groupRequested = true;
        fullRequested = selectGroup(args[index + 1], selectedGroups, requestedGroups) || fullRequested;
        index += 1;
        break;
      case "--full":
        groupRequested = true;
        fullRequested = selectGroup("full", selectedGroups, requestedGroups) || fullRequested;
        break;
      case "-h":
      case "--help":
        return { kind: "help" };
      default:
        if (argument.startsWith("--group=")) {
          groupRequested = true;
          fullRequested = selectGroup(argument.slice("--group=".length), selectedGroups, requestedGroups) || fullRequested;
        } else {
          groupRequested = true;
          fullRequested = selectGroup(argument, selectedGroups, requestedGroups) || fullRequested;
        }
        break;
    }
  }

  if (listOnly) {
    if (groupRequested) fail("--list cannot be combined with validation groups");
    if (planOnly) fail("--list cannot be combined with --plan");
    return {
      kind: "selection",
      selection: { listOnly, planOnly, parallel, requestedGroups, selectedGroups, fullRequested },
    };
  }
  if (groupRequested === false) {
    fullRequested = true;
    requestedGroups.push("default (full)");
    for (const group of fullGroups) selectedGroups.add(group);
  }
  return {
    kind: "selection",
    selection: { listOnly, planOnly, parallel, requestedGroups, selectedGroups, fullRequested },
  };
}

function buildPlan(selection: Selection): Plan {
  const selectedGroups = groupOrder.filter((group) => selection.selectedGroups.has(group));
  const notRunGroups = groupOrder.filter((group) => !selection.selectedGroups.has(group));
  const selectedChecks: Check[] = [];
  const seenChecks = new Set<Check>();
  for (const group of selectedGroups) {
    for (const check of checksByGroup[group]) {
      if (!seenChecks.has(check)) {
        seenChecks.add(check);
        selectedChecks.push(check);
      }
    }
  }
  return {
    selectedGroups,
    notRunGroups,
    selectedChecks,
    effectiveFull: fullGroups.every((group) => selection.selectedGroups.has(group)),
  };
}
function reportSelection(selection: Selection, plan: Plan): void {
  process.stdout.write(`Requested validation groups: ${selection.requestedGroups.join(", ")}\n`);
  process.stdout.write(`Selected validation groups: ${plan.selectedGroups.join(", ")}\n`);
  if (plan.effectiveFull) {
    process.stdout.write(
      selection.fullRequested
        ? "Full validation bundle: selected\n"
        : "Full validation bundle: selected via component groups\n",
    );
  } else {
    process.stdout.write("Full validation bundle: not selected\n");
  }
  if (plan.notRunGroups.length === 0) {
    process.stdout.write("Checks not run (groups not selected): none\n");
    return;
  }
  process.stdout.write("Checks not run (groups not selected):\n");
  for (const group of plan.notRunGroups) {
    for (const check of checksByGroup[group]) {
      process.stdout.write(`  NOT RUN: ${checkLabels[check]} (group ${group} was not selected)\n`);
    }
  }
}

function commandForCheck(check: Check): readonly string[] {
  switch (check) {
    case "syntax":
      return ["sh", "-n", ...shellFiles.map((relative) => join(root, relative))];
    case "structural":
      return [join(root, "scripts/check-swe-forge")];
    case "selection":
      return [join(root, "scripts/test-validate-swe-forge")];
    case "boundary":
      return [join(root, "scripts/test-swe-forge-boundary")];
    case "invocation":
      return [join(root, "scripts/test-swe-forge-invocation")];
    case "evidence":
      return [join(root, "scripts/test-swe-forge-gate")];
    case "installer":
      return [join(root, "scripts/test-swe-forge")];
    case "pi":
      return [join(root, "scripts/test-swe-forge-pi")];
    case "omp":
      return [join(root, "scripts/test-swe-forge-omp")];
    case "briefing":
      return [join(root, "scripts/test-swe-forge-briefing")];
    case "results":
      return [join(root, "scripts/test-swe-forge-results")];
    case "release":
      return [join(root, "scripts/check-release"), "prepare", "--allow-dirty"];
  }
}

async function runCheck(check: Check): Promise<CheckResult> {
  const result = await runProcess(commandForCheck(check), root);
  return { check, exitCode: result.exitCode, output: `${result.stdout}${result.stderr}` };
}

function reportCheck(result: CheckResult): boolean {
  const label = checkLabels[result.check];
  if (result.exitCode === 0) {
    process.stdout.write(`${result.output.startsWith("SKIP:") ? "SKIP" : "PASS"}: ${label}\n`);
    if (result.output !== "") process.stdout.write(result.output);
    return true;
  }
  process.stderr.write(`FAIL: ${label} (exit ${result.exitCode})\n`);
  if (result.output !== "") process.stderr.write(result.output);
  return false;
}

async function runPlan(selection: Selection, plan: Plan): Promise<number> {
  const reported = new Set<Check>();
  for (const check of prechecks) {
    if (!plan.selectedChecks.includes(check)) continue;
    const result = await runCheck(check);
    if (!reportCheck(result)) return 1;
    reported.add(check);
  }

  const remaining = plan.selectedChecks.filter((check) => !reported.has(check));
  const results: CheckResult[] = [];
  if (selection.parallel) {
    results.push(...await Promise.all(remaining.map((check) => runCheck(check))));
  } else {
    for (const check of remaining) results.push(await runCheck(check));
  }

  let failures = 0;
  for (const result of results) {
    if (!reportCheck(result)) failures += 1;
  }
  if (failures > 0) {
    process.stderr.write(`FAIL: ${failures} validation suite(s) failed\n`);
    return 1;
  }
  process.stdout.write("PASS: SWE Forge validation batch\n");
  return 0;
}

export async function runValidationCli(args: readonly string[] = process.argv.slice(2)): Promise<number> {
  try {
    const parsed = parseSelection(args);
    if (parsed.kind === "help") {
      process.stdout.write(usage);
      return 0;
    }
    const selection = parsed.selection;
    if (selection.listOnly) {
      process.stdout.write(usage);
      return 0;
    }
    const plan = buildPlan(selection);
    reportSelection(selection, plan);
    if (selection.planOnly) {
      process.stdout.write("Checks to run:\n");
      for (const check of plan.selectedChecks) process.stdout.write(`  RUN: ${checkLabels[check]}\n`);
      return 0;
    }
    return await runPlan(selection, plan);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`validation batch failure: ${message}\n`);
    return 2;
  }
}

if (import.meta.main) process.exitCode = await runValidationCli();
