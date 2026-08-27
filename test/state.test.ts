import { expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const entrypoint = resolve(import.meta.dir, "../.swe-forge/tools/swe-forge-state");
const typedCli = resolve(import.meta.dir, "../src/state-cli.ts");

type ProcessResult = { exitCode: number; stdout: string; stderr: string };

function run(command: readonly string[], cwd?: string): ProcessResult {
  const result = Bun.spawnSync([...command], { cwd, stdout: "pipe", stderr: "pipe" });
  return {
    exitCode: result.exitCode,
    stdout: new TextDecoder().decode(result.stdout),
    stderr: new TextDecoder().decode(result.stderr),
  };
}

function makeCheckout(root: string): { path: string; head: string } {
  const checkout = join(root, "checkout");
  mkdirSync(checkout, { recursive: true });
  for (const args of [
    ["git", "-C", checkout, "init", "-q"],
    ["git", "-C", checkout, "config", "user.email", "state-fixture@example.com"],
    ["git", "-C", checkout, "config", "user.name", "State Fixture"],
  ]) {
    const result = run(args);
    if (result.exitCode !== 0) throw new Error(result.stderr);
  }
  writeFileSync(join(checkout, "base.txt"), "base\n");
  if (run(["git", "-C", checkout, "add", "base.txt"]).exitCode !== 0) throw new Error("git add failed");
  if (run(["git", "-C", checkout, "commit", "-qm", "base"]).exitCode !== 0) throw new Error("git commit failed");
  if (run(["git", "-C", checkout, "branch", "-M", "main"]).exitCode !== 0) throw new Error("git branch failed");
  if (run(["git", "-C", checkout, "checkout", "-qb", "feature"]).exitCode !== 0) throw new Error("git checkout failed");
  const head = execFileSync("git", ["-C", checkout, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  return { path: checkout, head };
}

function canonicalYaml(checkout: string): string {
  return `workflow: swe-forge
workflow_version: 1
schema_version: 5
run_id: fixture-run
status: running
delivery_mode: PR
routing:
  preferred: SOLO
  current: SOLO
  reason: fixture
  fallback: no
checkout:
  path: ${checkout}
  branch: feature
  base_sha: none
  head_sha: none
continuation:
  workflow_active: true
  workflow: ticket
  phase: implementation
  step: 1
  awaiting: none
  next_action:
    kind: implement
    target: fixture
    acceptance: []
  safe_boundary: true
  updated_at: 2040-01-01T00:00:00Z
validation:
  head_sha: none
  status: pending
  reference: validations.tsv
review:
  status: pending
  reviewed_head: none
  repair_used: false
  blocked_by: []
delivery:
  status: pending
  pull_request_ref: none
  pr_number: none
  pr_state: none
`;
}

test("typed inspection preserves the established semantic projection", () => {
  const root = mkdtempSync(join(tmpdir(), "swe-forge-state-parity-"));
  const checkout = makeCheckout(root);
  const statePath = join(root, "state", "run-state.yaml");
  mkdirSync(join(root, "state"));
  writeFileSync(statePath, canonicalYaml(checkout.path));

  const entrypointResult = run([entrypoint, "inspect", "--state", statePath, "--checkout", checkout.path]);
  const typedResult = run(["bun", typedCli, "inspect", "--state", statePath, "--checkout", checkout.path]);
  expect(typedResult).toEqual(entrypointResult);
  expect(JSON.parse(typedResult.stdout).active).toBe(true);
});

test("typed routing mutation preserves canonical serialization", () => {
  const root = mkdtempSync(join(tmpdir(), "swe-forge-state-mutation-"));
  const checkout = makeCheckout(root);
  const source = join(root, "source.yaml");
  writeFileSync(source, canonicalYaml(checkout.path));
  const entrypointState = join(root, "entrypoint");
  const typedState = join(root, "typed");
  mkdirSync(entrypointState);
  mkdirSync(typedState);
  cpSync(source, join(entrypointState, "run-state.yaml"));
  cpSync(source, join(typedState, "run-state.yaml"));

  const args = ["set-routing", "--state", "STATE", "--preferred", "SUBAGENTS", "--current", "SUBAGENTS", "--reason", "route reason", "--fallback-used", "fallback"];
  const entrypointResult = run([entrypoint, ...args.map((value) => (value === "STATE" ? entrypointState : value))]);
  const typedResult = run(["bun", typedCli, ...args.map((value) => (value === "STATE" ? typedState : value))]);
  expect(entrypointResult.exitCode).toBe(0);
  expect(typedResult.exitCode).toBe(0);
  expect(readFileSync(join(typedState, "run-state.yaml"), "utf8")).toBe(readFileSync(join(entrypointState, "run-state.yaml"), "utf8"));
});

test("Bun YAML parser boundaries remain rejected", () => {
  const root = mkdtempSync(join(tmpdir(), "swe-forge-state-boundary-"));
  const checkout = makeCheckout(root);
  const fixtures = [
    canonicalYaml(checkout.path).replace("workflow: swe-forge", "workflow: 'swe-forge'"),
    `${canonicalYaml(checkout.path)}---\nworkflow: other\n`,
    canonicalYaml(checkout.path).replace("workflow: swe-forge", "workflow: &workflow swe-forge"),
    canonicalYaml(checkout.path).replace("workflow: swe-forge", "workflow: !!str swe-forge"),
    canonicalYaml(checkout.path).replace("target: fixture", "target: |\n      fixture"),
  ];
  for (const [index, fixture] of fixtures.entries()) {
    const statePath = join(root, `invalid-${index}`, "run-state.yaml");
    mkdirSync(join(root, `invalid-${index}`));
    writeFileSync(statePath, fixture);
    const entrypointResult = run([entrypoint, "validate", "--state", statePath]);
    const typedResult = run(["bun", typedCli, "validate", "--state", statePath]);
    if (index < 4) expect(entrypointResult.exitCode).not.toBe(0);
    expect(typedResult.exitCode).not.toBe(0);
  }
});

test("accepts block acceptance lists and preserves projection bounds", () => {
  const root = mkdtempSync(join(tmpdir(), "swe-forge-state-acceptance-"));
  const checkout = makeCheckout(root);
  const checks = Array.from({ length: 10 }, (_, index) => `      - ${String(index)}-${"x".repeat(200)}`).join("\n");
  const statePath = join(root, "state", "run-state.yaml");
  mkdirSync(join(root, "state"));
  writeFileSync(statePath, canonicalYaml(checkout.path).replace("    acceptance: []", `    acceptance:\n${checks}`));
  const result = run([entrypoint, "inspect", "--state", statePath, "--checkout", checkout.path]);
  expect(result.exitCode).toBe(0);
  const projection = JSON.parse(result.stdout);
  expect(projection.active).toBe(true);
  expect(projection.continuation.next_action.acceptance).toHaveLength(8);
  expect(projection.continuation.next_action.acceptance[0]).toHaveLength(160);
});

test("set-continuation serializes bounded acceptance checks", () => {
  const root = mkdtempSync(join(tmpdir(), "swe-forge-state-continuation-"));
  const checkout = makeCheckout(root);
  const stateDirectory = join(root, "state");
  mkdirSync(stateDirectory);
  writeFileSync(join(stateDirectory, "run-state.yaml"), canonicalYaml(checkout.path));
  const mutation = run([
    entrypoint,
    "set-continuation",
    "--state",
    stateDirectory,
    "--workflow-active",
    "true",
    "--workflow",
    "ticket",
    "--phase",
    "implementation",
    "--step",
    "2",
    "--awaiting",
    "none",
    "--next-action-kind",
    "implement",
    "--next-action-target",
    "fixture",
    "--acceptance",
    "first check",
    "--acceptance",
    "second check",
    "--safe-boundary",
    "true",
  ]);
  expect(mutation.exitCode).toBe(0);
  expect(run([entrypoint, "validate", "--state", stateDirectory]).exitCode).toBe(0);
  const inspection = run([entrypoint, "inspect", "--state", stateDirectory, "--checkout", checkout.path]);
  expect(JSON.parse(inspection.stdout).continuation.next_action.acceptance).toEqual(["first check", "second check"]);
});

test("omits ambiguous active candidates sharing a run fence", () => {
  const root = mkdtempSync(join(tmpdir(), "swe-forge-state-fence-"));
  const checkout = makeCheckout(root);
  const first = join(root, "first", "run-state.yaml");
  const second = join(root, "second", "run-state.yaml");
  mkdirSync(join(root, "first"));
  mkdirSync(join(root, "second"));
  writeFileSync(first, canonicalYaml(checkout.path));
  writeFileSync(second, canonicalYaml(checkout.path).replace("2040-01-01T00:00:00Z", "2041-01-01T00:00:00Z"));
  const result = run([
    entrypoint,
    "resolve-active",
    "--checkout",
    checkout.path,
    "--candidate",
    first,
    "--candidate",
    second,
    "--all",
  ]);
  expect(result.exitCode).toBe(0);
  expect(JSON.parse(result.stdout).states).toEqual([]);
});
