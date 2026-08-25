import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import type { ExtensionAPI } from "@oh-my-pi/pi-coding-agent";

const INVOCATION_MARKER = "The user explicitly invoked SWE Forge through omp.";
const RAW_ARGUMENTS_MARKER = "Raw invocation arguments:";
const CAPABILITY_MARKER = "[SWE-FORGE OMP NATIVE SUBAGENT CAPABILITY]";
const WORKER_CONTEXT =
	"SWE Forge delegated task execution. The task assignment is the canonical worker_briefing/v1 projection. Do not infer routing, scope, permissions, or delivery authority from this context.";
const ACTIVE_STATUSES = new Set(["planning", "running", "reviewing", "repairing"]);
const TOPOLOGIES = new Set(["SOLO", "SUBAGENTS", "ISOLATED"]);
const TERMINAL_STATUSES = new Set(["accepted", "failed"]);
const PROFILE_TO_RESULT = {
	"swe-forge-read-only": "READ_ONLY",
	"swe-forge-writable": "WRITABLE",
	"swe-forge-reviewer": "REVIEW",
} as const;
const PROFILE_EXPECTATIONS = {
	// OMP adds its hidden `yield` return tool to every explicit profile tool list.
	"swe-forge-read-only": { tools: ["read", "grep", "glob"], result: "READ_ONLY" },
	"swe-forge-writable": { tools: ["read", "grep", "glob", "edit", "write", "bash"], result: "WRITABLE" },
	"swe-forge-reviewer": { tools: ["read", "grep", "glob"], result: "REVIEW" },
} as const;
const TASK_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const SHA_PATTERN = "^[0-9A-Fa-f]{40}$";
const MAX_STATE_FILES = 64;
const MAX_STATE_BYTES = 256 * 1024;
const MAX_RESULT_BYTES = 256 * 1024;

type ResultProfile = "READ_ONLY" | "WRITABLE" | "REVIEW";

type ProfileName = keyof typeof PROFILE_TO_RESULT;

interface ActiveRun {
	filePath: string;
	stateId: string;
	updatedAt: number;
	modifiedAt: number;
	status: string;
	currentTopology: string;
	preferredTopology: string;
	deliveryMode: string;
}

interface CapabilityObservation {
	available: boolean;
	reason: string;
	profiles: readonly ProfileName[];
	profileTools: Record<string, readonly string[]>;
	readOnlyParallelSupport: boolean;
	writableConcurrencySupport: false;
	nativeIsolatedSupport: false;
	structuredResults: boolean;
	strictResults: boolean;
}

interface PlannedItem {
	index: number;
	name: string;
	profile: ResultProfile;
	agent: ProfileName;
	task: string;
}

interface PendingTaskCall {
	items: PlannedItem[];
	runId: string;
	writable: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function canonicalPath(value: string): string {
	try {
		return fs.realpathSync(value);
	} catch {
		return path.resolve(value);
	}
}

function samePath(left: string, right: string): boolean {
	return canonicalPath(left) === canonicalPath(right);
}

function safeScalar(value: unknown): string | undefined {
	if (typeof value === "string") return value;
	if (typeof value === "number" || typeof value === "boolean") return String(value);
	return undefined;
}

function cleanReason(value: unknown, fallback: string): string {
	const text = safeScalar(value)?.replace(/[\u0000-\u001f\u007f]/g, " ").trim();
	return text ? text.slice(0, 240) : fallback;
}

function unquote(value: string): string {
	let result = value.trim();
	const comment = result.search(/\s+#/);
	if (comment >= 0) result = result.slice(0, comment).trim();
	if ((result.startsWith("\"") && result.endsWith("\"")) || (result.startsWith("'") && result.endsWith("'"))) {
		result = result.slice(1, -1);
	}
	return result;
}

/**
 * This is only the scalar lookup needed to identify canonical state. It is not
 * a worker-brief parser and does not replace the canonical state validator.
 */
function parseScalarYaml(text: string): Map<string, string> {
	const values = new Map<string, string>();
	const stack: Array<{ indent: number; key: string }> = [];
	for (const line of text.split(/\r?\n/)) {
		if (!line.trim() || line.trimStart().startsWith("#") || /^\s*-/.test(line)) continue;
		const match = line.match(/^(\s*)([A-Za-z0-9_-]+):(?:\s*(.*))?$/);
		if (!match) continue;
		const indent = match[1].replace(/\t/g, "  ").length;
		const key = match[2];
		while (stack.length > 0 && stack[stack.length - 1].indent >= indent) stack.pop();
		const dotted = [...stack.map(entry => entry.key), key].join(".");
		const rawValue = match[3];
		if (rawValue === undefined || rawValue.trim() === "") stack.push({ indent, key });
		else values.set(dotted, unquote(rawValue));
	}
	return values;
}

function readFile(filePath: string): string | undefined {
	try {
		return fs.readFileSync(filePath, "utf8");
	} catch {
		return undefined;
	}
}

function activeAgentDir(pi: any): string {
	try {
		const fromRuntime = pi.pi?.getAgentDir?.();
		if (typeof fromRuntime === "string" && fromRuntime.trim()) return canonicalPath(fromRuntime);
	} catch {
		// Fall through to the documented OMP environment/default.
	}
	const configured = process.env.PI_CODING_AGENT_DIR;
	if (configured?.trim()) return canonicalPath(configured);
	return canonicalPath(path.join(os.homedir(), ".omp", "agent"));
}

function canonicalToolPath(pi: any, name: string): string {
	return path.join(activeAgentDir(pi), "swe-forge", ".swe-forge", "tools", name);
}

function executableFile(filePath: string): boolean {
	try {
		return fs.statSync(filePath).isFile() && (fs.statSync(filePath).mode & 0o111) !== 0;
	} catch {
		return false;
	}
}

function addStateCandidate(candidates: Set<string>, value: string | undefined): void {
	if (!value || candidates.size >= MAX_STATE_FILES) return;
	const trimmed = value.trim();
	if (!trimmed) return;
	try {
		const stat = fs.statSync(trimmed);
		const filePath = stat.isDirectory() ? path.join(trimmed, "run-state.yaml") : trimmed;
		if (fs.statSync(filePath).isFile()) candidates.add(canonicalPath(filePath));
	} catch {
		// A missing pointer is a safe unavailable capability.
	}
}

function readPointer(pointer: string): string | undefined {
	const content = readFile(pointer)?.trim();
	if (!content) return undefined;
	const firstLine = content.split(/\r?\n/, 1)[0]?.trim();
	if (!firstLine || firstLine.startsWith("#")) return undefined;
	return path.isAbsolute(firstLine) ? firstLine : path.resolve(path.dirname(pointer), firstLine);
}

function discoverStatePaths(cwd: string): Set<string> {
	const candidates = new Set<string>();
	for (const variable of ["SWE_FORGE_RUN_STATE", "SWE_FORGE_STATE"]) addStateCandidate(candidates, process.env[variable]);

	const projectRuns = path.join(cwd, ".swe-forge", "runs");
	for (const pointerName of ["active", "active-run-state", "current"]) {
		const pointer = path.join(projectRuns, pointerName);
		addStateCandidate(candidates, readPointer(pointer));
	}
	addStateCandidate(candidates, path.join(cwd, ".swe-forge", "run-state.yaml"));
	try {
		for (const entry of fs.readdirSync(projectRuns, { withFileTypes: true })) {
			if (entry.isDirectory()) addStateCandidate(candidates, path.join(projectRuns, entry.name));
			if (candidates.size >= MAX_STATE_FILES) break;
		}
	} catch {
		// Project-local run state is optional.
	}

	const externalRoot = path.join(os.tmpdir(), "swe-forge");
	try {
		for (const entry of fs.readdirSync(externalRoot, { withFileTypes: true })) {
			if (entry.isDirectory()) addStateCandidate(candidates, path.join(externalRoot, entry.name));
			if (candidates.size >= MAX_STATE_FILES) break;
		}
	} catch {
		// External run state is optional; the explicit env path remains supported.
	}
	return candidates;
}

function stateMatchesCheckout(values: Map<string, string>, cwd: string): boolean {
	const invocation = values.get("invocation_checkout.path");
	const delivery = values.get("delivery_checkout.path");
	return Boolean(invocation && delivery && samePath(invocation, cwd) && samePath(delivery, cwd));
}

function parseActiveRun(filePath: string, cwd: string): ActiveRun | undefined {
	try {
		if (fs.statSync(filePath).size > MAX_STATE_BYTES) return undefined;
	} catch {
		return undefined;
	}
	const text = readFile(filePath);
	if (!text) return undefined;
	const values = parseScalarYaml(text);
	if (values.get("workflow") !== "swe-forge" || values.get("schema_version") !== "3") return undefined;
	if (!stateMatchesCheckout(values, cwd)) return undefined;
	const status = values.get("status") ?? "unknown";
	if (!ACTIVE_STATUSES.has(status) || TERMINAL_STATUSES.has(status)) return undefined;
	if (values.get("continuation.workflow_active") !== "true") return undefined;
	const updatedAt = Date.parse(values.get("continuation.updated_at") ?? "");
	if (!Number.isFinite(updatedAt)) return undefined;
	const currentTopology = values.get("routing.current")?.trim().toUpperCase() ?? "";
	const preferredTopology = values.get("routing.preferred")?.trim().toUpperCase() ?? "";
	if (!TOPOLOGIES.has(currentTopology) || !TOPOLOGIES.has(preferredTopology)) return undefined;
	const deliveryMode = values.get("delivery_mode") ?? "";
	if ((deliveryMode !== "GUIDED" && deliveryMode !== "PR") || values.get("continuation.delivery.mode") !== deliveryMode) {
		return undefined;
	}
	let modifiedAt = 0;
	try {
		modifiedAt = fs.statSync(filePath).mtimeMs;
	} catch {
		return undefined;
	}
	return {
		filePath,
		stateId: values.get("run_id") ?? path.basename(path.dirname(filePath)),
		updatedAt,
		modifiedAt,
		status,
		currentTopology,
		preferredTopology,
		deliveryMode,
	};
}

function discoverActiveRuns(cwd: string): ActiveRun[] {
	return [...discoverStatePaths(cwd)]
		.map(filePath => parseActiveRun(filePath, cwd))
		.filter((run): run is ActiveRun => Boolean(run))
		.sort((left, right) => right.updatedAt - left.updatedAt || right.modifiedAt - left.modifiedAt);
}

function parseFrontmatter(text: string): Map<string, string> {
	const result = new Map<string, string>();
	if (!text.startsWith("---")) return result;
	const end = text.indexOf("\n---", 3);
	if (end < 0) return result;
	for (const line of text.slice(3, end).split(/\r?\n/)) {
		const separator = line.indexOf(":");
		if (separator < 0) continue;
		result.set(line.slice(0, separator).trim(), unquote(line.slice(separator + 1)));
	}
	return result;
}

function parseList(value: string | undefined): string[] {
	if (!value) return [];
	const trimmed = value.trim();
	if (trimmed === "[]") return [];
	if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
		try {
			const parsed = JSON.parse(trimmed);
			if (Array.isArray(parsed) && parsed.every(item => typeof item === "string")) return parsed;
		} catch {
			return [];
		}
	}
	return trimmed
		.split(",")
		.map(item => item.trim())
		.filter(Boolean);
}

function projectProfileShadowed(cwd: string, profile: ProfileName): boolean {
	let current = canonicalPath(cwd);
	for (;;) {
		if (fs.existsSync(path.join(current, ".omp", "agents", `${profile}.md`))) return true;
		const parent = path.dirname(current);
		if (parent === current) return false;
		current = parent;
	}
}

function inspectProfiles(pi: any, cwd: string): { ok: boolean; reason: string; profileTools: Record<string, readonly string[]> } {
	const agentDir = activeAgentDir(pi);
	const profileTools: Record<string, readonly string[]> = {};
	for (const [profile, expected] of Object.entries(PROFILE_EXPECTATIONS) as Array<[
		ProfileName,
		(typeof PROFILE_EXPECTATIONS)[ProfileName],
	]>) {
		if (projectProfileShadowed(cwd, profile)) {
			return { ok: false, reason: `project agent definition shadows confined profile ${profile}`, profileTools };
		}
		const profilePath = path.join(agentDir, "agents", `${profile}.md`);
		const content = readFile(profilePath);
		if (!content) return { ok: false, reason: `confined profile is not installed: ${profile}`, profileTools };
		const fields = parseFrontmatter(content);
		const tools = parseList(fields.get("tools"));
		const toolSetMatches = tools.length === expected.tools.length && expected.tools.every(tool => tools.includes(tool));
		if (fields.get("name") !== profile || !toolSetMatches || tools.includes("task")) {
			return { ok: false, reason: `confined profile ${profile} has incompatible tools`, profileTools };
		}
		if (fields.get("spawns") !== "[]" || fields.get("blocking") !== "true") {
			return { ok: false, reason: `confined profile ${profile} does not disable recursion and block for result collection`, profileTools };
		}
		profileTools[profile] = [...tools, "yield"];
	}
	return { ok: true, reason: "confined user profiles observed", profileTools };
}

function observeCapability(pi: any, cwd: string): CapabilityObservation {
	const unavailable = (reason: string): CapabilityObservation => ({
		available: false,
		reason,
		profiles: [],
		profileTools: {},
		readOnlyParallelSupport: false,
		writableConcurrencySupport: false,
		nativeIsolatedSupport: false,
		structuredResults: false,
		strictResults: false,
	});
	try {
		if (typeof pi.getAllTools !== "function" || typeof pi.getActiveTools !== "function") {
			return unavailable("current OMP ExtensionAPI does not expose active tool discovery");
		}
		const allTools = pi.getAllTools();
		const taskTool = Array.isArray(allTools) ? allTools.find((tool: any) => tool?.name === "task") : undefined;
		if (!taskTool) return unavailable("native OMP task tool is not present");
		if (!pi.getActiveTools().includes("task")) return unavailable("native OMP task tool is configured but inactive");
		if (taskTool.sourceInfo?.source && taskTool.sourceInfo.source !== "builtin") {
			return unavailable("the active task tool is not the native OMP builtin");
		}
		const description = String(taskTool.description ?? "").toLowerCase();
		const missing = ["tasks", "context", "outputschema", "schemamode"].filter(token => !description.includes(token));
		if (missing.length > 0) return unavailable(`native task surface is missing ${missing.join(", ")}`);
		for (const toolName of ["swe-forge-worker-brief", "swe-forge-worker-result", "swe-forge-state"]) {
			if (!executableFile(canonicalToolPath(pi, toolName))) {
				return unavailable(`canonical ${toolName} tool is unavailable from the active OMP support root`);
			}
		}
		const profiles = inspectProfiles(pi, cwd);
		if (!profiles.ok) return unavailable(profiles.reason);
		return {
			available: true,
			reason: "native task, batch, strict structured output, canonical validators, and confined user profiles observed",
			profiles: Object.keys(PROFILE_TO_RESULT) as ProfileName[],
			profileTools: profiles.profileTools,
			readOnlyParallelSupport: true,
			writableConcurrencySupport: false,
			nativeIsolatedSupport: false,
			structuredResults: true,
			strictResults: true,
		};
	} catch (error) {
		return unavailable(`native OMP capability observation failed: ${cleanReason(error, "unknown observation error")}`);
	}
}

function capabilityPrompt(observation: CapabilityObservation, run: ActiveRun | undefined): string {
	const topology = run?.currentTopology ?? "UNKNOWN";
	const lines = [
		CAPABILITY_MARKER,
		`OMP native task capability: ${observation.available ? "available" : "unavailable"}.`,
		`capability evidence: ${observation.reason}.`,
		`canonical routing.current: ${topology}.`,
		"Canonical routing remains the owner of topology selection; this adapter never changes SOLO, SUBAGENTS, or ISOLATED.",
	];
	if (observation.available) {
		lines.push(
			"For a selected shared-checkout SUBAGENTS run, use the native `task` tool, not a SWE Forge executor clone.",
			"Use agent=swe-forge-read-only for READ_ONLY, agent=swe-forge-writable for WRITABLE, and agent=swe-forge-reviewer for REVIEW.",
			"Pass the validated canonical worker_briefing/v1 projection unchanged as each native task item's `task` assignment.",
			"The adapter supplies the translated canonical worker-result JSON Schema with schemaMode=strict and validates the returned result canonically.",
			"Independent read-only items may use one native task.batch; writable shared-checkout items must be one sequential item at a time.",
			"Never set native task isolation: OMP isolation is not SWE Forge ISOLATED support in this adapter.",
			"Headless workers have no interactive approval boundary; rely on the confined profile, bounded brief, no task recursion, and root-owned delivery authorization.",
		);
	} else {
		lines.push("Do not call the native task tool for SWE Forge delegation; use the visible SOLO/sequential fallback.");
	}
	if (!run) {
		lines.push("This explicit-invocation observation is discovery only. Persist a valid checkout-matching schema-v3 run-state with routing.current: SUBAGENTS before delegation.");
	} else if (topology !== "SUBAGENTS") {
		lines.push(`The current canonical topology is ${topology}; native shared-checkout delegation is not authorized for this run.`);
	}
	return lines.join("\n");
}

function outputSchemaFor(profile: ResultProfile, taskId: string): Record<string, unknown> {
	const nullableArray = (items: Record<string, unknown>): Record<string, unknown> => ({
		anyOf: [{ type: "array", items }, { type: "null" }],
	});
	const stringArray = { type: "array", items: { type: "string" }, minItems: 1 };
	const common: Record<string, Record<string, unknown>> = {
		RESULT_PROFILE: { type: "string", enum: [profile] },
		STATUS: { type: "string", enum: ["DONE", "BLOCKED", "FAILED"] },
		TASK_ID: { type: "string", const: taskId },
		FINDINGS: stringArray,
		EVIDENCE: stringArray,
		RISKS: nullableArray({ type: "string" }),
		RECOMMENDED_ACTION: nullableArray({ type: "string" }),
	};
	if (profile === "READ_ONLY") {
		return { type: "object", properties: common, required: Object.keys(common), additionalProperties: false };
	}
	if (profile === "WRITABLE") {
		const validationItem = {
			type: "object",
			properties: {
				command: { type: "string", minLength: 1 },
				requirement: { type: "string", enum: ["required", "conditional", "informational"] },
				condition: { type: "string", minLength: 1 },
				applies: { type: "boolean" },
				result: { type: "string", enum: ["passed", "failed", "unavailable", "not-applicable"] },
				evidence: { type: "string", minLength: 1 },
			},
			required: ["command", "requirement", "condition", "applies", "result", "evidence"],
			additionalProperties: false,
		};
		const writable = {
			...common,
			BASE_SHA: { type: "string", pattern: SHA_PATTERN },
			HEAD_SHA: { anyOf: [{ type: "string", pattern: SHA_PATTERN }, { type: "string", const: "none" }] },
			BRANCH: { type: "string", minLength: 1 },
			WORKTREE: { type: "string", minLength: 1 },
			FILES_CHANGED: stringArray,
			GIT_STATE: stringArray,
			DELIVERABLE_COMMITS: nullableArray({ type: "string" }),
			VALIDATION: { type: "array", items: validationItem, minItems: 1 },
			SCOPE_EXCEPTIONS: nullableArray({ type: "string" }),
		};
		return { type: "object", properties: writable, required: Object.keys(writable), additionalProperties: false };
	}
	return {
		type: "object",
		properties: {
			status: { type: "string", enum: ["PASS", "CHANGES_REQUIRED"] },
			scope: { type: "object", additionalProperties: true },
			review_focus: { type: "object", additionalProperties: true },
			findings: { type: "array", items: { type: "object", additionalProperties: true } },
			deferred_followups: { type: "array", items: { type: "object", additionalProperties: true } },
			isolated_evidence: { type: "object", additionalProperties: true },
		},
		required: ["status", "scope", "review_focus", "findings", "deferred_followups", "isolated_evidence"],
		additionalProperties: false,
	};
}

function profileForAgent(agent: unknown): ResultProfile | undefined {
	return typeof agent === "string" && Object.hasOwn(PROFILE_TO_RESULT, agent)
		? PROFILE_TO_RESULT[agent as ProfileName]
		: undefined;
}

function textHasUnsafeCharacters(value: string): boolean {
	return /[\r\n\t\u0000-\u001f\u007f]/.test(value);
}

function appendScalar(lines: string[], name: string, value: unknown): boolean {
	const text = safeScalar(value);
	if (text === undefined || textHasUnsafeCharacters(text) || text.length === 0) return false;
	lines.push(`${name}: ${text}`);
	return true;
}

function appendList(lines: string[], name: string, value: unknown, required: boolean): boolean {
	if (value === null || value === undefined) return !required;
	if (!Array.isArray(value)) return false;
	if (value.length === 0) return !required;
	if (!value.every(item => typeof item === "string" && !textHasUnsafeCharacters(item) && item.length > 0)) return false;
	lines.push(`${name}:`);
	for (const item of value) lines.push(`- ${item}`);
	return true;
}

function appendValidation(lines: string[], value: unknown): boolean {
	if (!Array.isArray(value) || value.length === 0) return false;
	lines.push("VALIDATION:");
	for (const item of value) {
		if (!isRecord(item)) return false;
		const command = safeScalar(item.command);
		const requirement = safeScalar(item.requirement);
		const condition = safeScalar(item.condition);
		const result = safeScalar(item.result);
		const evidence = safeScalar(item.evidence);
		if (
			![command, requirement, condition, result, evidence].every(
				field => field !== undefined && field.length > 0 && !textHasUnsafeCharacters(field),
			) ||
			(typeof item.applies !== "boolean" && item.applies !== "true" && item.applies !== "false")
		) {
			return false;
		}
		lines.push(`- command: ${command}`);
		lines.push(`  requirement: ${requirement}`);
		lines.push(`  condition: ${condition}`);
		lines.push(`  applies: ${String(item.applies)}`);
		lines.push(`  result: ${result}`);
		lines.push(`  evidence: ${evidence}`);
	}
	return true;
}

function serializeOrdinaryResult(data: unknown, profile: "READ_ONLY" | "WRITABLE", taskId: string): string | undefined {
	if (!isRecord(data) || data.RESULT_PROFILE !== profile || data.TASK_ID !== taskId) return undefined;
	const lines: string[] = [];
	if (!appendScalar(lines, "RESULT_PROFILE", data.RESULT_PROFILE)) return undefined;
	if (!appendScalar(lines, "STATUS", data.STATUS)) return undefined;
	if (!appendScalar(lines, "TASK_ID", data.TASK_ID)) return undefined;
	if (profile === "WRITABLE") {
		for (const name of ["BASE_SHA", "HEAD_SHA", "BRANCH", "WORKTREE"]) {
			if (!appendScalar(lines, name, data[name])) return undefined;
		}
		if (!appendList(lines, "FILES_CHANGED", data.FILES_CHANGED, true)) return undefined;
		if (!appendList(lines, "GIT_STATE", data.GIT_STATE, true)) return undefined;
		if (!appendValidation(lines, data.VALIDATION)) return undefined;
		if (!appendList(lines, "DELIVERABLE_COMMITS", data.DELIVERABLE_COMMITS, false)) return undefined;
		if (!appendList(lines, "SCOPE_EXCEPTIONS", data.SCOPE_EXCEPTIONS, false)) return undefined;
	}
	if (!appendList(lines, "FINDINGS", data.FINDINGS, true)) return undefined;
	if (!appendList(lines, "EVIDENCE", data.EVIDENCE, true)) return undefined;
	if (!appendList(lines, "RISKS", data.RISKS, false)) return undefined;
	if (!appendList(lines, "RECOMMENDED_ACTION", data.RECOMMENDED_ACTION, false)) return undefined;
	return `${lines.join("\n")}\n`;
}

function reviewShapeIsValid(data: unknown): boolean {
	return (
		isRecord(data) &&
		(data.status === "PASS" || data.status === "CHANGES_REQUIRED") &&
		isRecord(data.scope) &&
		isRecord(data.review_focus) &&
		Array.isArray(data.findings) &&
		Array.isArray(data.deferred_followups) &&
		isRecord(data.isolated_evidence)
	);
}

async function executeCanonical(pi: any, command: string, args: string[], timeout = 5000): Promise<{ ok: boolean; detail: string }> {
	try {
		const result = await pi.exec(command, args, { timeout });
		const detail = cleanReason(result?.stderr || result?.stdout, "canonical command failed");
		return { ok: result?.code === 0, detail };
	} catch (error) {
		return { ok: false, detail: cleanReason(error, "canonical command could not be executed") };
	}
}

async function validateBrief(pi: any, briefing: string): Promise<{ ok: boolean; detail: string }> {
	const validator = canonicalToolPath(pi, "swe-forge-worker-brief");
	let directory: string | undefined;
	try {
		directory = fs.mkdtempSync(path.join(os.tmpdir(), "swe-forge-omp-brief-"));
		const filePath = path.join(directory, "worker-brief.yaml");
		fs.writeFileSync(filePath, briefing, { encoding: "utf8", mode: 0o600 });
		return await executeCanonical(pi, validator, ["validate", "--brief", filePath]);
	} catch (error) {
		return { ok: false, detail: cleanReason(error, "canonical worker brief validator failed") };
	} finally {
		if (directory) {
			try {
				fs.rmSync(directory, { recursive: true, force: true });
			} catch {
				// Temporary validation material is best-effort cleanup only.
			}
		}
	}
}

async function validateResult(
	pi: any,
	data: unknown,
	profile: "READ_ONLY" | "WRITABLE",
	taskId: string,
): Promise<{ ok: boolean; detail: string }> {
	const serialized = serializeOrdinaryResult(data, profile, taskId);
	if (serialized === undefined || Buffer.byteLength(serialized, "utf8") > MAX_RESULT_BYTES) {
		return { ok: false, detail: "native structured data does not map to the canonical result contract" };
	}
	const validator = canonicalToolPath(pi, "swe-forge-worker-result");
	let directory: string | undefined;
	try {
		directory = fs.mkdtempSync(path.join(os.tmpdir(), "swe-forge-omp-result-"));
		const filePath = path.join(directory, "worker-result.txt");
		fs.writeFileSync(filePath, serialized, { encoding: "utf8", mode: 0o600 });
		return await executeCanonical(pi, validator, ["validate", "--profile", profile, "--task-id", taskId, "--result", filePath]);
	} catch (error) {
		return { ok: false, detail: cleanReason(error, "canonical worker result validator failed") };
	} finally {
		if (directory) {
			try {
				fs.rmSync(directory, { recursive: true, force: true });
			} catch {
				// Temporary validation material is best-effort cleanup only.
			}
		}
	}
}

function nativeItems(input: Record<string, unknown>): { batch: boolean; items: Array<Record<string, unknown>> } | { error: string } {
	if (Array.isArray(input.tasks)) {
		if (Object.hasOwn(input, "task")) return { error: "native batch input may not also contain top-level task" };
		if (input.tasks.length === 0 || !input.tasks.every(isRecord)) return { error: "native task batch must contain non-empty task items" };
		return { batch: true, items: input.tasks };
	}
	if (typeof input.task === "string") return { batch: false, items: [input] };
	return { error: "native task input has no task assignment" };
}

function briefContract(briefing: string): { profile: ResultProfile; writeAccess: "read-only" | "read-write" } | undefined {
	const profile = briefing.match(/\n\s{4}profile:\s*['"]?(READ_ONLY|WRITABLE|REVIEW)['"]?\s*\n/)?.[1] as ResultProfile | undefined;
	const writeAccess = briefing.match(/\n\s{4}write_access:\s*['"]?(read-only|read-write)['"]?\s*\n/)?.[1] as
		| "read-only"
		| "read-write"
		| undefined;
	return profile && writeAccess ? { profile, writeAccess } : undefined;
}

async function prepareTaskInput(
	pi: any,
	cwd: string,
	input: Record<string, unknown>,
): Promise<{ ok: true; input: Record<string, unknown>; items: PlannedItem[] } | { ok: false; reason: string }> {
	if (input.isolated === true) return { ok: false, reason: "native OMP task isolation is not SWE Forge ISOLATED support; use the canonical fallback/provider" };
	const shape = nativeItems(input);
	if ("error" in shape) return { ok: false, reason: shape.error };
	const planned: PlannedItem[] = [];
	const nextItems: Array<Record<string, unknown>> = [];
	for (const [index, item] of shape.items.entries()) {
		if (item.isolated === true) {
			return { ok: false, reason: "native OMP task isolation is not SWE Forge ISOLATED support; use the canonical fallback/provider" };
		}
		const name = typeof item.name === "string" ? item.name.trim() : "";
		if (!TASK_ID_PATTERN.test(name)) return { ok: false, reason: `native task item ${index + 1} needs a canonical task name` };
		const agent = item.agent;
		const profile = profileForAgent(agent);
		if (!profile || !Object.hasOwn(PROFILE_EXPECTATIONS, agent as ProfileName)) {
			return { ok: false, reason: "native task item must select an installed SWE Forge confined profile" };
		}
		const task = item.task;
		if (typeof task !== "string" || task.trim().length === 0) return { ok: false, reason: `native task item ${name} has no assignment` };
		const brief = await validateBrief(pi, task);
		if (!brief.ok) return { ok: false, reason: `canonical worker briefing validation failed for ${name}: ${brief.detail}` };
		const contract = briefContract(task);
		const expectedWriteAccess = profile === "WRITABLE" ? "read-write" : "read-only";
		if (!contract || contract.profile !== profile || contract.writeAccess !== expectedWriteAccess) {
			return { ok: false, reason: `canonical worker briefing profile does not match confined OMP profile ${agent}` };
		}
		planned.push({ index, name, profile, agent: agent as ProfileName, task });
		nextItems.push({ ...item, outputSchema: outputSchemaFor(profile, name), schemaMode: "strict" });
	}
	const hasWritable = planned.some(item => item.profile === "WRITABLE");
	if (shape.batch && planned.length > 1 && hasWritable) {
		return { ok: false, reason: "shared-checkout writable SWE Forge workers must be launched sequentially, never in one native batch" };
	}
	if (shape.batch) {
		return {
			ok: true,
			input: { ...input, context: WORKER_CONTEXT, tasks: nextItems },
			items: planned,
		};
	}
	const next = { ...input, ...nextItems[0], task: planned[0]!.task };
	if (Object.hasOwn(next, "context")) next.context = WORKER_CONTEXT;
	return { ok: true, input: next, items: planned };
}

function appendRuntimeEntry(pi: any, event: string, run: ActiveRun | undefined, details: Record<string, unknown> = {}): void {
	try {
		if (typeof pi.appendEntry !== "function") return;
		pi.appendEntry("swe-forge-omp-runtime", {
			event,
			state: run?.stateId ?? "none",
			timestamp: new Date().toISOString(),
			...details,
		});
	} catch {
		// Runtime observability is optional and never replaces canonical state.
	}
}

export default function sweForgeRuntime(pi: ExtensionAPI): void {
	let invocationActive = false;
	let fencedRunIds = new Set<string>();
	let activeRun: ActiveRun | undefined;
	let pending = new Map<string, PendingTaskCall>();
	let writableInFlight = false;

	const refresh = (cwd: string, freshInvocation = false): ActiveRun | undefined => {
		const runs = discoverActiveRuns(cwd);
		if (freshInvocation) fencedRunIds = new Set(runs.map(run => run.stateId));
		const selected = runs.find(run => !fencedRunIds.has(run.stateId));
		if (selected && fencedRunIds.size > 0) fencedRunIds.clear();
		activeRun = selected;
		return selected;
	};

	pi.on("before_agent_start", (event, ctx) => {
		const explicit = event.prompt.includes(INVOCATION_MARKER) || event.prompt.includes(RAW_ARGUMENTS_MARKER);
		if (!explicit) return;
		invocationActive = true;
		const run = refresh(ctx.cwd, true);
		const observation = observeCapability(pi, ctx.cwd);
		if (event.systemPrompt.some(part => part.includes(CAPABILITY_MARKER))) return;
		return { systemPrompt: [...event.systemPrompt, capabilityPrompt(observation, run)] };
	});

	pi.on("tool_call", async (event, ctx) => {
		if (event.toolName !== "task" || !invocationActive) return;
		const run = refresh(ctx.cwd);
		if (!run) {
			return {
				block: true,
				reason: "OMP native delegation refused: no active checkout-matching schema-v3 SWE Forge run-state is discoverable. Use SOLO/sequential fallback; a worker brief cannot establish routing authority.",
			};
		}
		if (run.currentTopology !== "SUBAGENTS") {
			return {
				block: true,
				reason: `OMP native delegation refused: canonical routing.current is ${run.currentTopology}, not SUBAGENTS. Use the existing SOLO/sequential fallback.`,
			};
		}
		const observation = observeCapability(pi, ctx.cwd);
		if (!observation.available) {
			return { block: true, reason: `OMP native delegation capability is incompatible: ${observation.reason}. Use SOLO/sequential fallback.` };
		}
		const stateValidation = await executeCanonical(pi, canonicalToolPath(pi, "swe-forge-state"), ["validate", "--state", run.filePath]);
		if (!stateValidation.ok) {
			return { block: true, reason: `Canonical run-state validation failed: ${stateValidation.detail}. Use SOLO/sequential fallback.` };
		}
		const input = isRecord(event.input) ? event.input : {};
		const prepared = await prepareTaskInput(pi, ctx.cwd, input);
		if (!prepared.ok) return { block: true, reason: `${prepared.reason}. Use SOLO/sequential fallback.` };
		const writable = prepared.items.some(item => item.profile === "WRITABLE");
		if (writable && writableInFlight) {
			return {
				block: true,
				reason: "a shared-checkout writable SWE Forge worker is already running; wait for its result before launching another",
			};
		}
		if (writable) writableInFlight = true;
		pending.set(event.toolCallId, { items: prepared.items, runId: run.stateId, writable });
		appendRuntimeEntry(pi, "native_task_prepared", run, {
			items: prepared.items.length,
			read_only_batch: prepared.items.length > 1,
			profiles: prepared.items.map(item => item.agent),
		});
		return { input: prepared.input };
	});

	pi.on("tool_result", async (event, _ctx) => {
		if (event.toolName !== "task" || !invocationActive) return;
		const call = pending.get(event.toolCallId);
		if (!call) return;
		pending.delete(event.toolCallId);
		if (event.isError) {
			if (call.writable) writableInFlight = false;
			appendRuntimeEntry(pi, "native_task_failed", activeRun, { reason: "native task returned an error" });
			return;
		}
		const details = isRecord(event.details) ? event.details : {};
		const results = Array.isArray(details.results) ? details.results : [];
		if (results.length !== call.items.length) {
			if (call.writable) writableInFlight = false;
			const reason = "native task did not return one blocking structured result per bounded assignment";
			appendRuntimeEntry(pi, "native_task_rejected", activeRun, { reason });
			return {
				isError: true,
				content: [{ type: "text", text: `SWE Forge OMP delegation rejected: ${reason}. Use SOLO/sequential fallback.` }],
				details: { ...details, sweForge: { schema: "worker-result/v1", status: "invalid", reason } },
			};
		}
		const validations: Array<Record<string, unknown>> = [];
		for (const [index, planned] of call.items.entries()) {
			const result = isRecord(results[index]) ? results[index] : {};
			const structured = isRecord(result.structuredOutput) ? result.structuredOutput : undefined;
			const data = structured?.data;
			let validation: { ok: boolean; detail: string };
			if (result.exitCode !== 0 || structured?.status !== "valid" || structured?.mode !== "strict") {
				validation = { ok: false, detail: "native task result was not a valid strict structured completion" };
			} else if (planned.profile === "REVIEW") {
				validation = reviewShapeIsValid(data)
					? { ok: true, detail: "review contract shape checked; root review contract remains authoritative" }
					: { ok: false, detail: "native review data does not satisfy the canonical review contract shape" };
			} else {
				validation = await validateResult(pi, data, planned.profile, planned.name);
			}
			validations.push({ task_id: planned.name, profile: planned.profile, status: validation.ok ? "valid" : "invalid", detail: validation.detail });
			if (!validation.ok) {
				if (call.writable) writableInFlight = false;
				const reason = `${planned.name}: ${validation.detail}`;
				appendRuntimeEntry(pi, "native_task_rejected", activeRun, { reason });
				return {
					isError: true,
					content: [{ type: "text", text: `SWE Forge OMP delegation rejected: ${reason}. Worker output remains untrusted; use SOLO/sequential fallback.` }],
					details: {
						...details,
						sweForge: { schema: "worker-result/v1", status: "invalid", results: validations },
					},
				};
			}
		}
		if (call.writable) writableInFlight = false;
		appendRuntimeEntry(pi, "native_task_validated", activeRun, { results: validations.length });
		return { details: { ...details, sweForge: { schema: "worker-result/v1", status: "valid", results: validations } } };
	});
}
