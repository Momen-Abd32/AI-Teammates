import type { TaskStatus } from "@ai-teammates/types";

export const TASK_STATUSES: readonly TaskStatus[] = [
  "TODO","IN_PROGRESS","WAITING_FOR_AGENT","WAITING_FOR_HUMAN","BLOCKED","COMPLETED","FAILED"
];

export const SENSITIVE_ACTIONS = new Set([
  "production.deploy",
  "secrets.read",
  "repository.delete",
  "user.remove",
  "sandbox.execute"
]);

export function requiresHumanApproval(action:string):boolean {
  return SENSITIVE_ACTIONS.has(action);
}

export function isNonEmpty(value:unknown):value is string {
  return typeof value === "string" && value.trim().length > 0;
}
