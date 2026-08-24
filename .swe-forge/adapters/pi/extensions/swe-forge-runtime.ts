import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const ACTIVE_MARKER = "SWE-FORGE ACTIVE RUN";
const NORMALIZED_INVOCATION_MARKER = "[SWE-FORGE NORMALIZED INVOCATION]";
const INVOCATION_ARGUMENTS_MARKER = "Raw invocation arguments:";
const MAX_INVOCATION_BYTES = 256 * 1024;
const DEFAULT_RESERVE_TOKENS = 16_384;
const COMPACTION_COOLDOWN_MS = 30_000;
const MAX_STATE_FILES = 64;
const MAX_STATE_BYTES = 256 * 1024;
const MAX_FIELD_LENGTH = 160;
const ACTIVE_STATUSES = new Set(["planning", "running", "reviewing", "repairing", "blocked"]);
const TERMINAL_STATUSES = new Set(["accepted", "failed"]);
const RUN_STATE_ENV_VARS = ["SWE_FORGE_RUN_STATE", "SWE_FORGE_STATE"];
const SUBAGENT_TOOL_NAME = "swe_forge_subagent";
const SUBAGENT_PROTOCOL_VERSION = 1;
const SUBAGENT_READ_ONLY_TOOLS = ["read", "grep", "find", "ls"] as const;
const SUBAGENT_WRITABLE_TOOLS = ["read", "grep", "find", "ls", "edit", "write", "bash"] as const;
const SUBAGENT_CAPABILITY_MARKER = "[SWE-FORGE OPTIONAL SUBAGENT CAPABILITY]";

interface SettingsFileSnapshot {
	signature: string;
	settings?: Record<string, any>;
}

interface ReserveCacheEntry {
	global: SettingsFileSnapshot;
	project: SettingsFileSnapshot;
	reserve: number;
}

const reserveCache = new Map<string, ReserveCacheEntry>();

interface NormalizedInvocation {
	raw_arguments: string;
	parsed_ticket: string;
	requested_mode: "AUTO" | "SOLO" | "SUBAGENTS" | "ISOLATED";
	requested_delivery: "DEFAULT" | "GUIDED" | "PR";
	delivery_mode: "GUIDED" | "PR";
	input_status: "COMPLETE" | "EMPTY" | "INCOMPLETE" | "MIGRATION_REQUIRED";
	consumed_tokens: string[];
}

/**
 * Pi-specific runtime bridge for SWE Forge.
 *
 * The canonical workflow remains in the support tree. This extension only
 * translates Pi lifecycle events into capability observations and consumes the
 * small authoritative continuation block in a run-state snapshot.
 */

function readText(filePath: string): string | undefined {
	try {
		return fs.readFileSync(filePath, "utf8");
	} catch {
		return undefined;
	}
}

function readJson(filePath: string): Record<string, any> | undefined {
	const text = readText(filePath);
	if (!text) return undefined;
	try {
		const value = JSON.parse(text);
		return value && typeof value === "object" ? value : undefined;
	} catch {
		return undefined;
	}
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
 * Parse only scalar dotted paths from the deliberately simple run-state YAML.
 * This is not a general YAML parser: rejecting complex or malformed values is
 * safer than guessing workflow state in a continuity hook.
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
		const dotted = [...stack.map((entry) => entry.key), key].join(".");
		const rawValue = match[3];
		if (rawValue === undefined || rawValue.trim() === "") {
			stack.push({ indent, key });
		} else {
			values.set(dotted, unquote(rawValue));
		}
	}
	return values;
}

function stateFile(input: string): string | undefined {
	const candidate = input.trim();
	if (!candidate) return undefined;
	try {
		const stat = fs.statSync(candidate);
		if (stat.isDirectory()) return path.join(candidate, "run-state.yaml");
		if (stat.isFile()) return candidate;
	} catch {
		return undefined;
	}
	return undefined;
}

function canonicalPath(input: string): string {
	try {
		return fs.realpathSync(input);
	} catch {
		return path.resolve(input);
	}
}

function addStatePath(paths: Set<string>, input: string | undefined): void {
	if (!input || paths.size >= MAX_STATE_FILES) return;
	const resolved = stateFile(input);
	if (resolved) paths.add(canonicalPath(resolved));
}

function readPointer(pointer: string): string | undefined {
	const text = readText(pointer)?.trim();
	if (!text) return undefined;
	const firstLine = text.split(/\r?\n/)[0]?.trim();
	if (!firstLine || firstLine.startsWith("#")) return undefined;
	return path.isAbsolute(firstLine) ? firstLine : path.resolve(path.dirname(pointer), firstLine);
}

function addRunDirectory(paths: Set<string>, directory: string): void {
	try {
		if (!fs.statSync(directory).isDirectory()) return;
		addStatePath(paths, directory);
		for (const entry of fs.readdirSync(directory, { withFileTypes: true }).slice(0, MAX_STATE_FILES)) {
			if (!entry.isDirectory()) continue;
			addStatePath(paths, path.join(directory, entry.name));
		}
	} catch {
		// State discovery is best effort; an unavailable capability is not an error.
	}
}

function discoverStatePaths(cwd: string): Set<string> {
	const paths = new Set<string>();
	for (const variable of RUN_STATE_ENV_VARS) addStatePath(paths, process.env[variable]);

	const projectRuns = path.join(cwd, ".swe-forge", "runs");
	for (const pointerName of ["active", "active-run-state", "current"]) {
		const pointer = path.join(projectRuns, pointerName);
		const target = readPointer(pointer);
		addStatePath(paths, target);
		addStatePath(paths, pointer);
	}
	addRunDirectory(paths, projectRuns);
	addStatePath(paths, path.join(cwd, ".swe-forge", "run-state.yaml"));

	// The normal external location is $TMPDIR/swe-forge/<run-id>/run-state.yaml.
	// Also inspect the temporary directories used by development fixtures, but
	// keep the scan bounded and filter candidates by checkout below.
	const tempRoot = os.tmpdir();
	addRunDirectory(paths, path.join(tempRoot, "swe-forge"));
	try {
		for (const entry of fs.readdirSync(tempRoot, { withFileTypes: true })) {
			if (!entry.isDirectory() || !entry.name.startsWith("swe-forge")) continue;
			addRunDirectory(paths, path.join(tempRoot, entry.name));
			if (paths.size >= MAX_STATE_FILES) break;
		}
	} catch {
		// Unknown temporary-state capability is handled as no active state.
	}
	return paths;
}

function displayValue(values: Map<string, string>, key: string, fallback: string): string {
	const value = values.get(key)?.replace(/[\u0000-\u001f\u007f]/g, " ").trim();
	return value ? value.slice(0, MAX_FIELD_LENGTH) : fallback;
}

function numberOrUndefined(value: string | undefined): number | undefined {
	if (!value || value === "unknown" || value === "none") return undefined;
	const parsed = Number(value);
	return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

function boolValue(value: string | undefined): boolean | undefined {
	if (value === "true") return true;
	if (value === "false") return false;
	return undefined;
}

function stateMatchesCwd(values: Map<string, string>, cwd: string): boolean {
	const project = canonicalPath(cwd);
	const paths = [values.get("invocation_checkout.path"), values.get("delivery_checkout.path")].filter(
		(value): value is string => Boolean(value),
	);
	return paths.some((value) => canonicalPath(value) === project);
}

interface ActiveRun {
	filePath: string;
	stateId: string;
	updatedAt: number;
	modifiedAt: number;
	status: string;
	workflowActive: boolean;
	preferredTopology: string;
	currentTopology: string;
	deliveryMode: string;
	phase: string;
	step: string;
	awaiting: string;
	nextActionKind: string;
	nextActionTarget: string;
	expectedContextTokens?: number;
	safeBoundary: boolean;
	projectedPressure: string;
	contextStatus: string;
	prNumber: string;
	prState: string;
}

function parseActiveRun(filePath: string, cwd: string): ActiveRun | undefined {
	try {
		if (fs.statSync(filePath).size > MAX_STATE_BYTES) return undefined;
	} catch {
		return undefined;
	}
	const text = readText(filePath);
	if (!text) return undefined;
	const values = parseScalarYaml(text);
	if (values.get("workflow") !== "swe-forge" || !stateMatchesCwd(values, cwd)) return undefined;
	if (currentStateError(values)) return undefined;

	const status = values.get("status") ?? "unknown";
	if (!ACTIVE_STATUSES.has(status) && !TERMINAL_STATUSES.has(status)) return undefined;
	const workflowActive = boolValue(values.get("continuation.workflow_active"));
	if (workflowActive !== true || TERMINAL_STATUSES.has(status)) return undefined;

	const recordedTime = values.get("continuation.updated_at");
	if (!recordedTime) return undefined;
	const updatedAt = Date.parse(recordedTime);
	if (!Number.isFinite(updatedAt)) return undefined;

	let modifiedAt: number;
	try {
		modifiedAt = fs.statSync(filePath).mtimeMs;
	} catch {
		return undefined;
	}

	const stateId = displayValue(values, "run_id", path.basename(path.dirname(filePath)));
	return {
		filePath,
		stateId,
		updatedAt,
		modifiedAt,
		status,
		workflowActive,
		preferredTopology: displayValue(values, "routing.preferred", "unknown"),
		currentTopology: displayValue(values, "routing.current", "unknown"),
		deliveryMode: displayValue(values, "delivery_mode", "unknown"),
		phase: displayValue(values, "continuation.phase", "unknown"),
		step: displayValue(values, "continuation.step", "none"),
		awaiting: displayValue(values, "continuation.awaiting", "none"),
		nextActionKind: displayValue(values, "continuation.next_action.kind", "none"),
		nextActionTarget: displayValue(values, "continuation.next_action.target", "none"),
		expectedContextTokens: numberOrUndefined(values.get("continuation.next_action.expected_context_tokens")),
		safeBoundary: boolValue(values.get("continuation.safe_boundary")) ?? false,
		projectedPressure: displayValue(values, "routing.context_value.projected_pressure", "unknown"),
		contextStatus: displayValue(values, "context.status", "unknown"),
		prNumber: displayValue(values, "continuation.delivery.pr_number", "none"),
		prState: displayValue(values, "continuation.delivery.pr_state", "none"),
	};
}

function resolveActiveRuns(cwd: string): ActiveRun[] {
	const candidates = Array.from(discoverStatePaths(cwd))
		.map((filePath) => parseActiveRun(filePath, cwd))
		.filter((run): run is ActiveRun => Boolean(run));
	candidates.sort(
		(left, right) =>
			right.updatedAt - left.updatedAt || right.modifiedAt - left.modifiedAt || left.filePath.localeCompare(right.filePath),
	);
	return candidates;
}

interface SubagentToolObservation {
	available: boolean;
	status: "available" | "configured-but-inactive" | "unavailable";
}

interface SubagentCapabilitiesRecord {
	readonly protocolVersion?: unknown;
	readonly packageVersion?: unknown;
	readonly pi?: unknown;
	readonly isolation?: unknown;
	readonly trust?: unknown;
	readonly sweForge?: unknown;
	readonly roles?: unknown;
	readonly availableProfiles?: unknown;
	readonly profileTools?: unknown;
	readonly compatibilityErrors?: unknown;
	readonly readOnlyParallelSupport?: unknown;
	readonly writableConcurrencySupport?: unknown;
	readonly nestedDelegationSupport?: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringArray(value: unknown): readonly string[] | undefined {
	if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) return undefined;
	return value as readonly string[];
}

function sameToolSet(left: readonly string[], right: readonly string[]): boolean {
	return left.length === right.length && left.every((tool) => right.includes(tool));
}

function observeSubagentTool(pi: any): SubagentToolObservation {
	try {
		if (typeof pi.getAllTools !== "function") {
			return { available: false, status: "unavailable" };
		}
		const allTools = pi.getAllTools();
		const configured = Array.isArray(allTools) && allTools.some((tool) => tool?.name === SUBAGENT_TOOL_NAME);
		if (!configured) return { available: false, status: "unavailable" };
		if (typeof pi.getActiveTools !== "function") {
			return { available: true, status: "available" };
		}
		const activeTools = pi.getActiveTools();
		const active = Array.isArray(activeTools) && activeTools.includes(SUBAGENT_TOOL_NAME);
		return active
			? { available: true, status: "available" }
			: { available: false, status: "configured-but-inactive" };
	} catch {
		return { available: false, status: "unavailable" };
	}
}

function topology(value: string): string {
	return value.trim().toUpperCase();
}

function currentStateError(values: Map<string, string>): string | undefined {
	if (values.get("schema_version") !== "3") return "unsupported run-state schema";
	if (values.has("preferred_mode") || values.has("execution_mode")) {
		return "run-state contains removed routing fields";
	}
	const topologyFields = ["routing.initial", "routing.preferred", "routing.selected", "routing.current"];
	for (const field of topologyFields) {
		const value = values.get(field);
		if (!value || !["SOLO", "SUBAGENTS", "ISOLATED"].includes(topology(value))) {
			return `missing or malformed ${field}`;
		}
	}
	const deliveryMode = values.get("delivery_mode");
	if (!deliveryMode || !["GUIDED", "PR"].includes(deliveryMode)) return "missing or malformed delivery_mode";
	const workflowActive = boolValue(values.get("continuation.workflow_active"));
	if (workflowActive === undefined) return "missing or malformed continuation.workflow_active";
	if (boolValue(values.get("continuation.safe_boundary")) === undefined) return "missing or malformed continuation.safe_boundary";
	if (!values.get("continuation.updated_at") || !Number.isFinite(Date.parse(values.get("continuation.updated_at")!))) {
		return "missing or malformed continuation.updated_at";
	}
	const projection = values.get("continuation.delivery.mode");
	if (projection === undefined || projection !== deliveryMode) {
		return "continuation.delivery.mode does not match delivery_mode";
	}
	return undefined;
}

function subagentRoutingFallbackReason(run: ActiveRun | undefined, current: string): string {
	if (!run) {
		return [
			"Canonical routing is UNKNOWN because no active, checkout-matching SWE-Forge run-state is discoverable.",
			"Use the existing SOLO/sequential fallback.",
			"Capability discovery may proceed, but before action=run persist a complete active schema-v3 run-state with routing.current: SUBAGENTS and request action=capabilities again.",
			"The worker briefing does not establish canonical routing.",
		].join(" ");
	}
	if (current === "UNKNOWN") {
		return [
			"Canonical routing is UNKNOWN because the active SWE-Forge run-state does not expose a usable current topology.",
			"Use the existing SOLO/sequential fallback until routing.current is persisted as SUBAGENTS.",
		].join(" ");
	}
	return `Canonical routing selected ${current}; use the existing SOLO/sequential fallback rather than delegation.`;
}

function extractInvocationArguments(prompt: unknown): string | undefined {
	if (typeof prompt !== "string") return undefined;
	const marker = prompt.indexOf(INVOCATION_ARGUMENTS_MARKER);
	if (marker < 0) return undefined;
	let start = marker + INVOCATION_ARGUMENTS_MARKER.length;
	if (prompt.startsWith("\r\n", start)) start += 2;
	else if (prompt[start] === "\n" || prompt[start] === "\r") start += 1;
	else if (prompt[start] === " ") start += 1;
	return prompt.slice(start);
}

function invocationParserPath(): string | undefined {
	const sourceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
	const candidates = [
		path.join(os.homedir(), ".pi", "agent", "swe-forge", ".swe-forge", "tools", "swe-forge-invocation"),
		path.join(sourceRoot, ".swe-forge", "tools", "swe-forge-invocation"),
	];
	for (const candidate of candidates) {
		try {
			if (fs.statSync(candidate).isFile()) return candidate;
		} catch {
			// A missing installation falls back to the canonical SOLO/bootstrap path.
		}
	}
	return undefined;
}

function normalizedInvocation(value: unknown, rawArguments: string): NormalizedInvocation | undefined {
	if (!isRecord(value) || value.raw_arguments !== rawArguments || typeof value.parsed_ticket !== "string") {
		return undefined;
	}
	const requestedMode = value.requested_mode;
	const requestedDelivery = value.requested_delivery;
	const deliveryMode = value.delivery_mode;
	const inputStatus = value.input_status;
	const consumedTokens = value.consumed_tokens;
	if (
		(requestedMode !== "AUTO" && requestedMode !== "SOLO" && requestedMode !== "SUBAGENTS" && requestedMode !== "ISOLATED") ||
		(requestedDelivery !== "DEFAULT" && requestedDelivery !== "GUIDED" && requestedDelivery !== "PR") ||
		(deliveryMode !== "GUIDED" && deliveryMode !== "PR") ||
		(inputStatus !== "COMPLETE" &&
			inputStatus !== "EMPTY" &&
			inputStatus !== "INCOMPLETE" &&
			inputStatus !== "MIGRATION_REQUIRED") ||
		!Array.isArray(consumedTokens) ||
		!consumedTokens.every((token) => typeof token === "string")
	) {
		return undefined;
	}
	return {
		raw_arguments: rawArguments,
		parsed_ticket: value.parsed_ticket,
		requested_mode: requestedMode,
		requested_delivery: requestedDelivery,
		delivery_mode: deliveryMode,
		input_status: inputStatus,
		consumed_tokens: [...consumedTokens],
	};
}

async function parseInvocation(pi: any, rawArguments: string): Promise<NormalizedInvocation | undefined> {
	if (Buffer.byteLength(rawArguments, "utf8") > MAX_INVOCATION_BYTES) return undefined;
	const parser = invocationParserPath();
	if (!parser || typeof pi.exec !== "function") return undefined;
	try {
		const result = await pi.exec(parser, ["parse", "--raw-arguments", rawArguments], { timeout: 5000 });
		if (result?.code !== 0 || typeof result.stdout !== "string") return undefined;
		return normalizedInvocation(JSON.parse(result.stdout.trim()), rawArguments);
	} catch {
		return undefined;
	}
}

function invocationFactsPrompt(invocation: NormalizedInvocation): string {
	return [
		NORMALIZED_INVOCATION_MARKER,
		JSON.stringify(invocation),
		"The shared parser produced these invocation facts. Do not reinterpret command syntax; use requested_mode and requested_delivery as requests, and make automatic topology/provider decisions from the software task and canonical policy.",
	].join("\n");
}

function isSWEForgeInvocation(prompt: unknown): boolean {
	return (
		typeof prompt === "string" &&
		(prompt.includes("The user explicitly invoked SWE Forge through Pi.") ||
			extractInvocationArguments(prompt) !== undefined)
	);
}

function subagentCapabilityPrompt(observation: SubagentToolObservation, run: ActiveRun | undefined): string {
	const current = run ? topology(run.currentTopology) : "UNKNOWN";
	const preferred = run ? topology(run.preferredTopology) : "UNKNOWN";
	return [
		SUBAGENT_CAPABILITY_MARKER,
		`swe_forge_subagent tool observed by the Pi adapter: ${observation.status}.`,
		`current topology: ${current} (preferred: ${preferred})`,
		"Canonical routing owns whether to use this shared-checkout capability; use it only for one bounded SUBAGENTS task.",
		"Call action=capabilities first and require the requested role and READ_ONLY/WRITABLE profile before action=run.",
		"With UNKNOWN topology, capabilities is discovery only: persist matching active schema-v3 state with routing.current: SUBAGENTS before action=run, then renegotiate.",
		"Pass only the canonical worker_briefing projection to action=run. Missing or incompatible capability falls back to SOLO/sequential; never use it for ISOLATED work.",
	].join("\n");
}

function capabilityRecord(value: unknown): SubagentCapabilitiesRecord | undefined {
	return isRecord(value) ? (value as SubagentCapabilitiesRecord) : undefined;
}

function validateCapabilities(value: unknown, role?: unknown, profile?: unknown): string | undefined {
	const capabilities = capabilityRecord(value);
	if (!capabilities) return "capabilities response was not an object";
	if (capabilities.protocolVersion !== SUBAGENT_PROTOCOL_VERSION) return "unsupported subagent protocol version";
	if (
		!isRecord(capabilities.pi) ||
		typeof capabilities.pi.compatibilityRange !== "string" ||
		capabilities.pi.versionVerification !== "before_execution"
	) {
		return "capabilities response did not advertise Pi compatibility verification";
	}
	if (
		!isRecord(capabilities.isolation) ||
		capabilities.isolation.contextIsolation !== true ||
		capabilities.isolation.processIsolation !== true ||
		capabilities.isolation.filesystemIsolation !== false ||
		capabilities.isolation.osSandbox !== false
	) {
		return "subagent isolation semantics are incompatible";
	}
	if (
		!isRecord(capabilities.trust) ||
		capabilities.trust.workerPermissions !== "user_os_permissions" ||
		capabilities.trust.sandbox !== false
	) {
		return "subagent trust semantics are incompatible";
	}
	if (
		capabilities.readOnlyParallelSupport !== true ||
		capabilities.writableConcurrencySupport !== false ||
		capabilities.nestedDelegationSupport !== false
	) {
		return "subagent concurrency or recursion semantics are incompatible";
	}
	const errors = Array.isArray(capabilities.compatibilityErrors) ? capabilities.compatibilityErrors : undefined;
	if (errors === undefined) return "capabilities response omitted compatibilityErrors";
	if (errors.length > 0) return "subagent compatibility negotiation reported errors";
	if (!isRecord(capabilities.sweForge) || capabilities.sweForge.installed !== true) {
		return "canonical SWE-Forge installation is unavailable";
	}
	if (role !== undefined) {
		const roles = stringArray(capabilities.roles);
		if (!roles?.includes(String(role))) return `canonical role is not advertised: ${String(role)}`;
	}
	if (profile !== undefined) {
		if (profile !== "READ_ONLY" && profile !== "WRITABLE") return "requested profile is not supported";
		const profiles = stringArray(capabilities.availableProfiles);
		if (!profiles?.includes(profile)) return `requested profile is not advertised: ${String(profile)}`;
		if (!isRecord(capabilities.profileTools)) return "capabilities response omitted profile tools";
		const advertised = stringArray(capabilities.profileTools[profile]);
		const expected = profile === "READ_ONLY" ? SUBAGENT_READ_ONLY_TOOLS : SUBAGENT_WRITABLE_TOOLS;
		if (!advertised || !sameToolSet(advertised, expected)) {
			return `requested ${String(profile)} tool profile is incompatible`;
		}
	}
	return undefined;
}

function continuityPrompt(run: ActiveRun): string {
	const pr = run.prNumber !== "none" ? `\nPR: #${run.prNumber} ${run.prState}` : "";
	const mergeHint =
		run.deliveryMode === "PR" && (run.awaiting === "user_merge" || run.nextActionKind === "verify_and_sync_merge")
			? "\nworkflow shorthand: merged -> /git-sync merged"
			: "";
	return [
		`[${ACTIVE_MARKER}]`,
		`workflow: ticket | topology: ${run.currentTopology} (preferred: ${run.preferredTopology}) | delivery: ${run.deliveryMode}`,
		`phase: ${run.phase} | step: ${run.step} | awaiting: ${run.awaiting}`,
		`next_action: ${run.nextActionKind} -> ${run.nextActionTarget}`,
		`run_state: ${run.stateId}${pr}${mergeHint}`,
		"Authoritative continuation is the current run-state snapshot; do not use a lossy summary to invent a phase or repeat a completed action.",
	].join("\n");
}

function appendRuntimeEntry(pi: any, event: string, run: ActiveRun | undefined, details: Record<string, any> = {}): void {
	if (typeof pi.appendEntry !== "function") return;
	try {
		pi.appendEntry("swe-forge-runtime", {
			event,
			state: run?.stateId ?? "none",
			timestamp: new Date().toISOString(),
			...details,
		});
	} catch {
		// Session observability is optional and never replaces run state.
	}
}

function settingsSnapshot(filePath: string): SettingsFileSnapshot {
	try {
		const stat = fs.statSync(filePath);
		if (!stat.isFile()) return { signature: "missing" };
		return {
			signature: `${stat.mtimeMs}:${stat.size}`,
			settings: readJson(filePath),
		};
	} catch {
		return { signature: "missing" };
	}
}

function validReserve(value: unknown): number | undefined {
	return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : undefined;
}

function configuredReserveTokens(cwd: string, projectTrusted: boolean): number {
	const home = os.homedir();
	const globalPath = path.join(home, ".pi", "agent", "settings.json");
	const projectPath = path.join(cwd, ".pi", "settings.json");
	const global = settingsSnapshot(globalPath);
	const project: SettingsFileSnapshot = projectTrusted ? settingsSnapshot(projectPath) : { signature: "untrusted" };
	const cacheKey = `${canonicalPath(cwd)}|${canonicalPath(home)}|${projectTrusted ? "trusted" : "untrusted"}`;
	const cached = reserveCache.get(cacheKey);
	if (cached && cached.global.signature === global.signature && cached.project.signature === project.signature) {
		return cached.reserve;
	}

	// ExtensionContext does not expose Pi's SettingsManager. Keep this adapter
	// dependency-free and mirror its documented deep-merge precedence locally.
	// Ignore malformed or unusable values at each level so a settings problem
	// cannot stop the Forge workflow or replace a safe lower-precedence value.
	const projectReserve = validReserve(project.settings?.compaction?.reserveTokens);
	const globalReserve = validReserve(global.settings?.compaction?.reserveTokens);
	const reserve = projectReserve ?? globalReserve ?? DEFAULT_RESERVE_TOKENS;
	reserveCache.set(cacheKey, { global, project, reserve });
	return reserve;
}

function projectSettingsTrusted(ctx: any): boolean {
	if (typeof ctx.isProjectTrusted !== "function") return true;
	try {
		return ctx.isProjectTrusted() !== false;
	} catch {
		return false;
	}
}

function compactionReason(
	run: ActiveRun,
	usage: { tokens: number | null; contextWindow: number },
	cwd: string,
	projectTrusted: boolean,
): string | undefined {
	if (!run.safeBoundary || !Number.isFinite(usage.contextWindow) || usage.contextWindow <= 0) return undefined;

	const runtimeStatus = run.contextStatus.trim().toLowerCase();
	// Overflow and an explicit compacting state belong to Pi's native recovery
	// lifecycle. Forge must not compete with either one.
	if (runtimeStatus === "overflow" || runtimeStatus === "compacting") return undefined;

	const reserve = configuredReserveTokens(cwd, projectTrusted);
	const expected = run.expectedContextTokens;
	// A reliable near-limit state is stronger than an absent estimate. It is
	// intentionally not reduced to a reserve comparison.
	if (runtimeStatus === "near-limit") {
		const remaining = usage.tokens === null ? "unknown" : Math.max(0, usage.contextWindow - usage.tokens);
		return `runtime_status=near-limit remaining=${remaining} reserve=${reserve} expected_next=${expected ?? "unknown"}`;
	}

	if (usage.tokens !== null && Number.isFinite(usage.tokens)) {
		const remaining = usage.contextWindow - usage.tokens;
		if (expected !== undefined) {
			// A known next-step requirement improves headroom without overriding a
			// reliable host pressure signal handled above.
			if (remaining > reserve + expected) return undefined;
			return `remaining=${Math.max(0, remaining)} reserve=${reserve} expected_next=${expected}`;
		}
	}

	// Projected pressure is planning evidence, not host telemetry. Without a
	// reliable near-limit signal or a known headroom shortfall, it cannot by
	// itself justify discarding conversation context.
	return undefined;
}

export default function sweForgeRuntime(pi: any) {
	let activeRun: ActiveRun | undefined;
	let activeRunVersion = "none";
	let supersededRunIds = new Set<string>();
	let negotiatedSubagentCapabilities: unknown;
	let invocationActive = false;
	let parsedInvocationPrompt: string | undefined;
	let parsedInvocationAttempted = false;
	let parsedInvocation: NormalizedInvocation | undefined;
	let compactionInFlight = false;
	let lastCompactionAt = 0;
	let lastCompactionState = "";

	const refresh = (cwd: string, freshInvocation = false): ActiveRun | undefined => {
		const discoveredRuns = resolveActiveRuns(cwd);
		if (freshInvocation) {
			// Fence every run at the fresh-invocation boundary. Keep this in refresh
			// so every startup hook ignores those stale runs until a different run_id
			// appears.
			supersededRunIds = new Set(discoveredRuns.map((run) => run.stateId));
		}
		const discovered = discoveredRuns.find((run) => !supersededRunIds.has(run.stateId));
		if (discovered && supersededRunIds.size > 0) supersededRunIds.clear();
		activeRun = discovered;
		const nextVersion = activeRun
			? `${activeRun.filePath}:${activeRun.stateId}:${topology(activeRun.currentTopology)}:${topology(activeRun.preferredTopology)}`
			: "none";
		if (nextVersion !== activeRunVersion) {
			activeRunVersion = nextVersion;
			negotiatedSubagentCapabilities = undefined;
		}
		return activeRun;
	};

	const on = (event: string, handler: (payload: any, ctx: any) => any): void => {
		try {
			pi.on(event, handler);
		} catch {
			// Older Pi versions may not expose every lifecycle event. The core
			// remains safe because this adapter is capability-negotiated.
		}
	};

	on("session_start", (_event, ctx) => {
		refresh(ctx.cwd);
	});

	on("before_agent_start", async (event, ctx) => {
		const explicitInvocation = isSWEForgeInvocation(event.prompt);
		const run = refresh(ctx.cwd, explicitInvocation);
		invocationActive = Boolean(run) || explicitInvocation;
		const blocks: string[] = [];
		if (explicitInvocation && !event.systemPrompt?.includes(NORMALIZED_INVOCATION_MARKER)) {
			const rawArguments = extractInvocationArguments(event.prompt);
			if (rawArguments !== undefined) {
				if (!parsedInvocationAttempted || parsedInvocationPrompt !== event.prompt) {
					parsedInvocationAttempted = true;
					parsedInvocationPrompt = event.prompt;
					parsedInvocation = await parseInvocation(pi, rawArguments);
				}
				if (parsedInvocation) blocks.push(invocationFactsPrompt(parsedInvocation));
			}
		}
		if (run && !event.systemPrompt?.includes(`[${ACTIVE_MARKER}]`)) blocks.push(continuityPrompt(run));
		const subagent = observeSubagentTool(pi);
		if (
			run &&
			invocationActive &&
			subagent.available &&
			(topology(run.currentTopology) === "SUBAGENTS" || topology(run.preferredTopology) === "SUBAGENTS") &&
			!event.systemPrompt?.includes(SUBAGENT_CAPABILITY_MARKER)
		) {
			blocks.push(subagentCapabilityPrompt(subagent, run));
		}
		if (blocks.length === 0) return undefined;
		return { systemPrompt: `${event.systemPrompt}\n\n${blocks.join("\n\n")}` };
	});

	on("tool_call", (event, ctx) => {
		if (event.toolName !== SUBAGENT_TOOL_NAME) return undefined;
		const run = refresh(ctx.cwd);
		const input = isRecord(event.input) ? event.input : {};
		const action = input.action;
		const observation = observeSubagentTool(pi);
		const current = run ? topology(run.currentTopology) : "UNKNOWN";
		const preferred = run ? topology(run.preferredTopology) : "UNKNOWN";

		if (!invocationActive) {
			return {
				block: true,
				reason: "swe_forge_subagent is only available during an explicitly invoked SWE-Forge run; use the normal workflow instead.",
			};
		}
		if (current === "ISOLATED") {
			return {
				block: true,
				reason: "SWE-Forge ISOLATED work cannot use the shared-checkout swe_forge_subagent primitive.",
			};
		}
		if (action !== "capabilities" && action !== "run") {
			return { block: true, reason: "The SWE-Forge subagent action must be capabilities or run." };
		}
		if (!observation.available) {
			return {
				block: true,
				reason: `The optional swe_forge_subagent capability is ${observation.status}; use the existing SOLO/sequential fallback.`,
			};
		}
		if (action === "capabilities") {
			if (run && current !== "SUBAGENTS" && preferred !== "SUBAGENTS") {
				return {
					block: true,
					reason: subagentRoutingFallbackReason(run, current),
				};
			}
			return undefined;
		}
		if (current !== "SUBAGENTS") {
			return {
				block: true,
				reason: subagentRoutingFallbackReason(run, current),
			};
		}
		const capabilityError = validateCapabilities(negotiatedSubagentCapabilities, input.role, input.profile);
		if (capabilityError) {
			return {
				block: true,
				reason: `Subagent capability negotiation is incomplete or incompatible: ${capabilityError}. Call action=capabilities first or use the canonical fallback.`,
			};
		}
		if (typeof input.workerBriefing !== "string" || input.workerBriefing.trim().length === 0) {
			return {
				block: true,
				reason: "A non-empty workerBriefing worker_briefing/v1 projection is required for subagent execution.",
			};
		}
		if (input.expectedOutputContract !== "result" && input.expectedOutputContract !== "review") {
			return { block: true, reason: "The expected canonical output contract must be result or review." };
		}
		return undefined;
	});

	on("tool_result", (event, ctx) => {
		if (event.toolName !== SUBAGENT_TOOL_NAME || !isRecord(event.input)) return undefined;
		const run = refresh(ctx.cwd);
		if (event.input.action === "capabilities") {
			const error = event.isError ? "capability tool returned an error" : validateCapabilities(event.details);
			negotiatedSubagentCapabilities = error ? undefined : event.details;
			appendRuntimeEntry(pi, "subagent_capabilities_observed", run, {
				available: !error,
				protocol_version: capabilityRecord(event.details)?.protocolVersion ?? "unknown",
				reason: error ?? "negotiated",
			});
			return undefined;
		}
		if (event.input.action === "run") {
			const details = isRecord(event.details) ? event.details : undefined;
			const validation = details && isRecord(details.validation) ? details.validation : undefined;
			appendRuntimeEntry(pi, "subagent_run_observed", run, {
				status: event.isError ? "failed" : validation?.status ?? "completed",
				role: event.input.role ?? "unknown",
				profile: event.input.profile ?? "unknown",
			});
		}
		return undefined;
	});

	on("input", async (event, ctx) => {
		if (event.source === "extension" || event.text?.trim().toLowerCase() !== "merged") return undefined;
		const run = refresh(ctx.cwd);
		if (!run || run.deliveryMode !== "PR") return undefined;
		const awaitingMerge = run.awaiting === "user_merge" || run.nextActionKind === "verify_and_sync_merge";
		if (!awaitingMerge) return undefined;
		return { action: "transform", text: "/git-sync merged" };
	});

	on("session_before_compact", (event, ctx) => {
		activeRun = refresh(ctx.cwd);
		compactionInFlight = true;
		if (activeRun) {
			lastCompactionAt = Date.now();
			lastCompactionState = `${activeRun.filePath}:${activeRun.updatedAt}:${activeRun.modifiedAt}`;
		}
		appendRuntimeEntry(pi, "compaction_started", activeRun, {
			reason: event?.reason ?? "unknown",
			willRetry: event?.willRetry ?? false,
		});
	});

	on("session_compact", (event, ctx) => {
		compactionInFlight = false;
		activeRun = refresh(ctx.cwd);
		appendRuntimeEntry(pi, "compaction_completed", activeRun, {
			reason: event?.reason ?? "unknown",
			willRetry: event?.willRetry ?? false,
		});
	});

	on("agent_settled", (_event, ctx) => {
		const run = refresh(ctx.cwd);
		if (!run || compactionInFlight || ctx.hasPendingMessages?.()) return;
		if (typeof ctx.getContextUsage !== "function" || typeof ctx.compact !== "function") return;
		const usage = ctx.getContextUsage();
		if (!usage) return;
		const reason = compactionReason(run, usage, ctx.cwd, projectSettingsTrusted(ctx));
		const stateVersion = `${run.filePath}:${run.updatedAt}:${run.modifiedAt}`;
		if (
			!reason ||
			stateVersion === lastCompactionState ||
			Date.now() - lastCompactionAt < COMPACTION_COOLDOWN_MS
		) return;

		lastCompactionAt = Date.now();
		lastCompactionState = stateVersion;
		compactionInFlight = true;
		appendRuntimeEntry(pi, "proactive_compaction_requested", run, {
			reason,
			tokens: usage.tokens,
			contextWindow: usage.contextWindow,
		});
		try {
			ctx.compact({
				customInstructions:
					"Preserve the active SWE-Forge continuation as a reminder only. The external run-state is authoritative. Do not invent delivery state or repeat completed actions; after compaction, re-read run state and Git before continuing.",
				onComplete: () => {
					compactionInFlight = false;
				},
				onError: () => {
					compactionInFlight = false;
				},
			});
		} catch {
			compactionInFlight = false;
		}
	});
}
