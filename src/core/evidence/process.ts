import { closeSync, openSync, writeSync } from "node:fs";

export interface ProcessResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export async function runProcess(command: readonly string[], cwd?: string): Promise<ProcessResult> {
  const options = cwd === undefined
    ? { stdout: "pipe" as const, stderr: "pipe" as const }
    : { cwd, stdout: "pipe" as const, stderr: "pipe" as const };
  try {
    const child = Bun.spawn([...command], options);
    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
      child.exited,
    ]);
    return { exitCode, stdout, stderr };
  } catch (error) {
    return { exitCode: 127, stdout: "", stderr: `${error instanceof Error ? error.message : String(error)}\n` };
  }
}

export async function runProcessToFile(command: readonly string[], evidencePath: string, cwd?: string): Promise<number> {
  const descriptor = openSync(evidencePath, "w", 0o600);
  try {
    const options = cwd === undefined
      ? { stdout: descriptor, stderr: descriptor }
      : { cwd, stdout: descriptor, stderr: descriptor };
    try {
      const child = Bun.spawn([...command], options);
      return await child.exited;
    } catch (error) {
      writeSync(descriptor, `${error instanceof Error ? error.message : String(error)}\n`);
      return 127;
    }
  } finally {
    closeSync(descriptor);
  }
}

export async function runGit(checkout: string | undefined, args: readonly string[]): Promise<ProcessResult> {
  return runProcess(checkout === undefined ? ["git", ...args] : ["git", "-C", checkout, ...args]);
}

export function stripTrailingNewlines(value: string): string {
  return value.replace(/\n+$/, "");
}
