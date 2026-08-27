import { spawnSync } from "node:child_process";
import { realpathSync, statSync } from "node:fs";
import { StateError } from "./parse";
import type { Checkout } from "./types";

function gitResult(checkout: string, args: readonly string[]) {
  try {
    return spawnSync("git", ["-C", checkout, ...args], { encoding: "utf8" });
  } catch {
    return undefined;
  }
}

export function gitOutput(checkout: string, args: readonly string[]): string | undefined {
  const result = gitResult(checkout, args);
  if (!result || result.status !== 0) return undefined;
  return result.stdout.trimEnd();
}

export function gitSucceeds(checkout: string, args: readonly string[]): boolean {
  return gitResult(checkout, args)?.status === 0;
}

export function checkoutRootForInit(candidate: string): string {
  try {
    if (!statSync(candidate).isDirectory()) throw new StateError(`checkout does not exist: ${candidate}`);
  } catch (error) {
    if (error instanceof StateError) throw error;
    throw new StateError(`checkout does not exist: ${candidate}`);
  }
  const root = gitOutput(candidate, ["rev-parse", "--show-toplevel"]);
  if (root === undefined) throw new StateError(`not a Git checkout: ${candidate}`);
  return realpathSync(root);
}

export function recordedCheckoutIdentity(checkout: Checkout): void {
  const actualRoot = gitOutput(checkout.path, ["rev-parse", "--show-toplevel"]);
  if (actualRoot === undefined) throw new StateError(`recorded checkout is not a Git checkout: ${checkout.path}`);
  if (actualRoot !== checkout.path) throw new StateError("recorded checkout root does not match the canonical checkout");
  const actualBranch = gitOutput(checkout.path, ["symbolic-ref", "--quiet", "--short", "HEAD"]);
  if (actualBranch === undefined) throw new StateError("recorded checkout is detached");
  if (actualBranch !== checkout.branch) throw new StateError("recorded checkout branch does not match run state");
}

export function recordedHead(checkout: Checkout): string {
  recordedCheckoutIdentity(checkout);
  const actualHead = gitOutput(checkout.path, ["rev-parse", "HEAD"]);
  if (actualHead === undefined) throw new StateError(`recorded checkout is not a Git checkout: ${checkout.path}`);
  return actualHead;
}

export function assertRecordedHead(expected: string, checkout: Checkout): void {
  const actualHead = recordedHead(checkout);
  if (actualHead !== expected) throw new StateError(`candidate HEAD does not match the recorded checkout: ${expected}`);
}

export function checkoutIdentityReason(checkout: Checkout, requestedCheckout: string): string | undefined {
  try {
    if (!statSync(requestedCheckout).isDirectory()) return "checkout unavailable";
  } catch {
    return "checkout unavailable";
  }
  const actualRoot = gitOutput(requestedCheckout, ["rev-parse", "--show-toplevel"]);
  if (actualRoot === undefined) return undefined;
  if (actualRoot !== requestedCheckout) return "checkout root mismatch";
  const actualBranch = gitOutput(requestedCheckout, ["symbolic-ref", "--quiet", "--short", "HEAD"]);
  if (actualBranch === undefined) return "checkout is detached";
  if (actualBranch !== checkout.branch) return "checkout branch mismatch";
  const actualHead = gitOutput(requestedCheckout, ["rev-parse", "HEAD"]);
  if (actualHead !== undefined && checkout.head_sha !== "none" && checkout.head_sha !== "NONE" && checkout.head_sha !== "null") {
    if (actualHead !== checkout.head_sha) return "checkout HEAD mismatch";
  }
  if (checkout.base_sha !== "none" && checkout.base_sha !== "NONE" && checkout.base_sha !== "null") {
    if (!gitSucceeds(requestedCheckout, ["merge-base", "--is-ancestor", checkout.base_sha, "HEAD"])) {
      return "checkout baseline mismatch";
    }
  }
  return undefined;
}
