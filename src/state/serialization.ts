// Bun.YAML.stringify currently emits compact flow mappings; the established
// state surface is block YAML consumed by existing shell callers, so this
// serializer keeps that canonical byte shape intentionally.
import type { RunState, TaskState } from "./types";

function appendLine(lines: string[], indent: string, key: string, value: string): void {
  lines.push(value === "" ? `${indent}${key}:` : `${indent}${key}: ${value}`);
}

function appendList(lines: string[], indent: string, key: string, values: readonly string[]): void {
  if (values.length === 0) {
    appendLine(lines, indent, key, "[]");
    return;
  }
  lines.push(`${indent}${key}:`);
  for (const value of values) lines.push(`${indent}  - ${value}`);
}

function appendTask(lines: string[], taskId: string, task: TaskState): void {
  appendLine(lines, "  ", `${taskId}`, "");
  appendLine(lines, "    ", "status", task.status);
  appendList(lines, "    ", "dependencies", task.dependencies);
  appendLine(lines, "    ", "accepted_result_ref", task.accepted_result_ref);
}

export function serializeRunState(state: RunState): string {
  const lines: string[] = [];
  appendLine(lines, "", "workflow", state.workflow);
  appendLine(lines, "", "workflow_version", String(state.workflow_version));
  appendLine(lines, "", "schema_version", String(state.schema_version));
  appendLine(lines, "", "run_id", state.run_id);
  appendLine(lines, "", "status", state.status);
  appendLine(lines, "", "delivery_mode", state.delivery_mode);

  lines.push("routing:");
  appendLine(lines, "  ", "preferred", state.routing.preferred);
  appendLine(lines, "  ", "current", state.routing.current);
  appendLine(lines, "  ", "reason", state.routing.reason);
  appendLine(lines, "  ", "fallback", state.routing.fallback);

  lines.push("checkout:");
  appendLine(lines, "  ", "path", state.checkout.path);
  appendLine(lines, "  ", "branch", state.checkout.branch);
  appendLine(lines, "  ", "base_sha", state.checkout.base_sha);
  appendLine(lines, "  ", "head_sha", state.checkout.head_sha);

  lines.push("continuation:");
  appendLine(lines, "  ", "workflow_active", String(state.continuation.workflow_active));
  appendLine(lines, "  ", "workflow", state.continuation.workflow);
  appendLine(lines, "  ", "phase", state.continuation.phase);
  appendLine(lines, "  ", "step", state.continuation.step);
  appendLine(lines, "  ", "awaiting", state.continuation.awaiting);
  lines.push("  next_action:");
  appendLine(lines, "    ", "kind", state.continuation.next_action.kind);
  appendLine(lines, "    ", "target", state.continuation.next_action.target);
  appendList(lines, "    ", "acceptance", state.continuation.next_action.acceptance);
  appendLine(lines, "  ", "safe_boundary", String(state.continuation.safe_boundary));
  appendLine(lines, "  ", "updated_at", state.continuation.updated_at);

  lines.push("validation:");
  appendLine(lines, "  ", "head_sha", state.validation.head_sha);
  appendLine(lines, "  ", "status", state.validation.status);
  appendLine(lines, "  ", "reference", state.validation.reference);

  lines.push("review:");
  appendLine(lines, "  ", "status", state.review.status);
  appendLine(lines, "  ", "reviewed_head", state.review.reviewed_head);
  appendLine(lines, "  ", "repair_used", String(state.review.repair_used));
  appendLine(lines, "  ", "blocked_by", state.review.blocked_by.length === 0 ? "[]" : `[${state.review.blocked_by.join(", ")}]`);

  lines.push("delivery:");
  appendLine(lines, "  ", "status", state.delivery.status);
  appendLine(lines, "  ", "pull_request_ref", state.delivery.pull_request_ref);
  appendLine(lines, "  ", "pr_number", state.delivery.pr_number);
  appendLine(lines, "  ", "pr_state", state.delivery.pr_state);

  if (state.tasks !== undefined) {
    if (Object.keys(state.tasks).length === 0) {
      lines.push("tasks: {}");
    } else {
      lines.push("tasks:");
      for (const [taskId, task] of Object.entries(state.tasks)) appendTask(lines, taskId, task);
    }
  }

  return `${lines.join("\n")}\n`;
}
