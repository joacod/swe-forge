import { existsSync, mkdirSync, renameSync, rmSync, rmdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { parseStateText, readState, stateFile, StateError } from "./parse";
import { serializeRunState } from "./serialization";
import type { RunState } from "./types";

function lockPathFor(statePath: string): string {
  return `${dirname(statePath)}/.run-state.lock`;
}

function removeLock(lockPath: string): void {
  try {
    rmSync(`${lockPath}/pid`, { force: true });
    rmdirSync(lockPath);
  } catch {
    // A failed cleanup must not hide the command's original result.
  }
}

export function withStateLock<T>(statePath: string, action: () => T): T {
  const lockPath = lockPathFor(statePath);
  try {
    mkdirSync(lockPath);
  } catch {
    throw new StateError("run state is being mutated by another activity; retry after it finishes");
  }
  try {
    writeFileSync(`${lockPath}/pid`, `${process.pid}\n`, { encoding: "utf8", mode: 0o600 });
    return action();
  } finally {
    removeLock(lockPath);
  }
}

export function atomicallyReplaceState(statePath: string, state: RunState): void {
  const serialized = serializeRunState(state);
  parseStateText(serialized);
  const temporaryPath = `${statePath}.tmp.${process.pid}`;
  try {
    writeFileSync(temporaryPath, serialized, { encoding: "utf8", mode: 0o600 });
    renameSync(temporaryPath, statePath);
  } catch (error) {
    rmSync(temporaryPath, { force: true });
    if (error instanceof StateError) throw error;
    throw new StateError(`could not atomically replace run state: ${statePath}`);
  }
}

export function updateState(
  stateInput: string,
  update: (state: RunState, statePath: string) => RunState,
): string {
  const statePath = stateFile(stateInput);
  return withStateLock(statePath, () => {
    const current = readState(statePath).state;
    const next = update(current, statePath);
    atomicallyReplaceState(statePath, next);
    return statePath;
  });
}

export function initializeState(statePath: string, state: RunState): string {
  return withStateLock(statePath, () => {
    if (existsSync(statePath)) throw new StateError(`run state is already initialized: ${statePath}`);
    atomicallyReplaceState(statePath, state);
    return statePath;
  });
}
