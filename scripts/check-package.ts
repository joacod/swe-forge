import { resolve } from "node:path";

interface PackedFile {
  readonly path?: unknown;
}

interface PackReport {
  readonly name?: unknown;
  readonly version?: unknown;
  readonly files?: readonly PackedFile[];
}

const expectedName = "swe-forge";
const expectedVersion = (await Bun.file(new URL("../VERSION", import.meta.url)).text()).split("\n")[0] ?? "";

function fail(message: string): never {
  throw new Error(`package check failure: ${message}`);
}

const result = Bun.spawnSync(["npm", "pack", "--dry-run", "--json"], {
  cwd: resolve(import.meta.dir, ".."),
  stdout: "pipe",
  stderr: "pipe",
});
if (result.exitCode !== 0) {
  fail(new TextDecoder().decode(result.stderr).trim() || "npm pack --dry-run failed");
}

let report: PackReport;
try {
  const parsed = JSON.parse(new TextDecoder().decode(result.stdout)) as unknown;
  if (!Array.isArray(parsed) || parsed.length !== 1 || typeof parsed[0] !== "object" || parsed[0] === null) {
    fail("npm pack returned an unexpected report");
  }
  report = parsed[0] as PackReport;
} catch (error) {
  fail(`npm pack returned invalid JSON: ${error instanceof Error ? error.message : String(error)}`);
}

if (report.name !== expectedName) fail(`package name is not ${expectedName}`);
if (report.version !== expectedVersion) fail("package version does not match VERSION");
if (!Array.isArray(report.files) || report.files.length === 0) fail("package has no files");

const forbiddenPrefixes = [
  "build/",
  "coverage/",
  "test/",
  ".swe-forge/runs/",
  ".swe-forge/.runs/",
  ".swe-forge/generated/",
  "node_modules/",
];
for (const file of report.files) {
  if (typeof file.path !== "string") fail("package report contains a file without a path");
  if (forbiddenPrefixes.some((prefix) => file.path.startsWith(prefix))) {
    fail(`package contains excluded local output: ${file.path}`);
  }
  if (file.path !== "scripts/swe-forge" && file.path.startsWith("scripts/")) {
    fail(`package contains repository-only script: ${file.path}`);
  }
}

process.stdout.write(`PASS: package contents (${report.files.length} files; no local state or repository-only scripts)\n`);
