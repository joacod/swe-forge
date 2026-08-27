import { expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const gate = resolve(import.meta.dir, "../.swe-forge/tools/swe-forge-gate");
const stateTool = resolve(import.meta.dir, "../.swe-forge/tools/swe-forge-state");

type ProcessResult = { exitCode: number; stdout: string; stderr: string };

function run(command: readonly string[], cwd?: string): ProcessResult {
  const result = Bun.spawnSync([...command], { cwd, stdout: "pipe", stderr: "pipe" });
  return {
    exitCode: result.exitCode,
    stdout: new TextDecoder().decode(result.stdout),
    stderr: new TextDecoder().decode(result.stderr),
  };
}

function runChecked(command: readonly string[], cwd?: string): ProcessResult {
  const result = run(command, cwd);
  if (result.exitCode !== 0) throw new Error(`${command.join(" ")}\n${result.stdout}${result.stderr}`);
  return result;
}

function makeCheckout(root: string, name: string): string {
  const checkout = join(root, name);
  mkdirSync(checkout, { recursive: true });
  runChecked(["git", "-C", checkout, "init", "-q"]);
  runChecked(["git", "-C", checkout, "config", "user.email", "gate-fixture@example.com"]);
  runChecked(["git", "-C", checkout, "config", "user.name", "Gate Fixture"]);
  writeFileSync(join(checkout, "README.md"), "base\n");
  runChecked(["git", "-C", checkout, "add", "README.md"]);
  runChecked(["git", "-C", checkout, "commit", "-qm", "Initial commit"]);
  runChecked(["git", "-C", checkout, "branch", "-M", "main"]);
  runChecked(["git", "-C", checkout, "checkout", "-qb", "feature"]);
  return checkout;
}

function commit(checkout: string, path: string, content: string, message: string): string {
  writeFileSync(join(checkout, path), content);
  runChecked(["git", "-C", checkout, "add", path]);
  runChecked(["git", "-C", checkout, "commit", "-qm", message]);
  return runChecked(["git", "-C", checkout, "rev-parse", "HEAD"]).stdout.trim();
}

function statePath(root: string, name: string): string {
  const state = join(root, `${name}.state`);
  mkdirSync(state);
  return state;
}

test("gate preserves the clean candidate, validation, review, and delivery path", () => {
  const root = mkdtempSync(join(tmpdir(), "swe-forge-evidence-parity-"));
  const checkout = makeCheckout(root, "success");
  const state = statePath(root, "success");

  const preflight = run([gate, "preflight", "--state", state], checkout);
  expect(preflight.exitCode).toBe(0);
  expect(preflight.stdout).toContain("PASS: preflight baseline recorded at");
  expect(preflight.stdout).toContain("BASELINE_HEAD:");
  expect(preflight.stdout).toContain("CHECKOUT_HEAD:");
  expect(preflight.stdout).toContain("BRANCH: feature");

  const head = commit(checkout, "implementation.txt", "implementation\n", "Implement ticket");
  const validation = run(
    [gate, "validate", "--state", state, "--name", "smoke", "--requirement", "required", "--final", "--", "sh", "-c", "test -f implementation.txt"],
    checkout,
  );
  expect(validation.exitCode).toBe(0);
  expect(validation.stdout).toMatch(/^smoke: passed \(.+validation\.0001\.log\)\n$/);
  expect(readFileSync(join(state, "validations.tsv"), "utf8")).toContain(`smoke\trequired\talways\tpassed`);
  expect(readFileSync(join(state, "run-state.yaml"), "utf8")).toContain(`  head_sha: ${head}`);
  expect(readFileSync(join(state, "run-state.yaml"), "utf8")).toContain("  status: passed");

  const review = run([gate, "review", "--state", state, "--result", "PASS", "--source", "fresh-context"], checkout);
  expect(review).toEqual({ exitCode: 0, stdout: "REVIEW: PASS (0 findings)\n", stderr: "" });

  const delivery = run([gate, "deliver-pr", "--state", state], checkout);
  expect(delivery).toEqual({
    exitCode: 0,
    stdout: `PASS: PR delivery prerequisites\nBRANCH: feature\nHEAD: ${head}\n`,
    stderr: "",
  });
});

test("gate records a failed final validation when the command changes the candidate", () => {
  const root = mkdtempSync(join(tmpdir(), "swe-forge-evidence-binding-"));
  const checkout = makeCheckout(root, "mutation");
  const state = statePath(root, "mutation");
  runChecked([gate, "preflight", "--state", state], checkout);
  commit(checkout, "implementation.txt", "implementation\n", "Implement ticket");

  const validation = run([gate, "validate", "--state", state, "--name", "smoke", "--final", "--", "sh", "-c", "printf changed >>README.md"], checkout);
  expect(validation.exitCode).toBe(1);
  expect(validation.stdout).toMatch(/^smoke: failed \(.+validation\.0001\.log\)\n$/);
  const evidence = readFileSync(join(state, "validation.0001.log"), "utf8");
  expect(evidence).toContain("SWE Forge validation binding failure: command changed the candidate.");
  expect(run(["git", "-C", checkout, "status", "--porcelain"]).stdout).toContain("README.md");
});

test("gate treats required unavailable evidence as a delivery blocker", () => {
  const root = mkdtempSync(join(tmpdir(), "swe-forge-evidence-unavailable-"));
  const checkout = makeCheckout(root, "unavailable");
  const state = statePath(root, "unavailable");
  runChecked([gate, "preflight", "--state", state], checkout);
  commit(checkout, "implementation.txt", "implementation\n", "Implement ticket");

  const recorded = run(
    [gate, "record-check-status", "--state", state, "--name", "smoke", "--requirement", "required", "--status", "unavailable", "--reason", "tool unavailable", "--final"],
    checkout,
  );
  expect(recorded).toEqual({ exitCode: 0, stdout: "PASS: recorded unavailable for smoke\n", stderr: "" });

  const review = run([gate, "review", "--state", state, "--result", "PASS", "--source", "fresh-context"], checkout);
  expect(review.exitCode).toBe(1);
  expect(review.stderr).toContain("PR review requires passing final validation for the current HEAD");
  const delivery = run([gate, "deliver-pr", "--state", state], checkout);
  expect(delivery.exitCode).toBe(1);
  expect(delivery.stderr).toContain("required or applicable final validation is not passing for current HEAD");
});

test("gate permits one localized repair without a second review", () => {
  const root = mkdtempSync(join(tmpdir(), "swe-forge-evidence-repair-"));
  const checkout = makeCheckout(root, "repair");
  const state = statePath(root, "repair");
  runChecked([gate, "preflight", "--state", state], checkout);
  commit(checkout, "implementation.txt", "implementation\n", "Implement ticket");
  runChecked([gate, "validate", "--state", state, "--name", "smoke", "--final", "--", "test", "-f", "implementation.txt"], checkout);

  const review = run([gate, "review", "--state", state, "--result", "CHANGES_REQUIRED", "--source", "fresh-context", "--findings", "1", "--blocked-by", "R1"], checkout);
  expect(review).toEqual({ exitCode: 1, stdout: "REVIEW: CHANGES_REQUIRED (1 findings)\n", stderr: "" });

  commit(checkout, "repair.txt", "repair\n", "Repair reviewed finding");
  const repairedHead = runChecked(["git", "-C", checkout, "rev-parse", "HEAD"]).stdout.trim();
  runChecked([stateTool, "set-review-repair", "--state", state, "--head-sha", repairedHead], checkout);
  runChecked([gate, "validate", "--state", state, "--name", "smoke", "--final", "--", "sh", "-c", "test -f implementation.txt && test -f repair.txt"], checkout);
  expect(run([gate, "deliver-pr", "--state", state], checkout).exitCode).toBe(0);

  const secondReview = run([gate, "review", "--state", state, "--result", "PASS", "--source", "another-review"], checkout);
  expect(secondReview.exitCode).toBe(1);
  expect(secondReview.stderr).toContain("PR review can only start from pending review state");
});

test("gate refuses a concurrent review without deleting its lock", () => {
  const root = mkdtempSync(join(tmpdir(), "swe-forge-evidence-lock-"));
  const checkout = makeCheckout(root, "locked");
  const state = statePath(root, "locked");
  runChecked([gate, "preflight", "--state", state], checkout);
  commit(checkout, "implementation.txt", "implementation\n", "Implement ticket");
  runChecked([gate, "validate", "--state", state, "--name", "smoke", "--final", "--", "test", "-f", "implementation.txt"], checkout);

  const lock = join(state, "review.lock");
  mkdirSync(lock);
  writeFileSync(join(lock, "pid"), "existing-review\n");
  const review = run([gate, "review", "--state", state, "--result", "PASS", "--source", "fresh-context"], checkout);
  expect(review.exitCode).toBe(1);
  expect(review.stderr).toContain("review state is locked by another review activity; retry after it finishes");
  expect(readFileSync(join(lock, "pid"), "utf8")).toBe("existing-review\n");
  rmSync(lock, { recursive: true, force: true });
});
