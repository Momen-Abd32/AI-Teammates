export type MemoryScope = "PRIVATE" | "PROJECT" | "TEAM" | "COMPANY";
export type TaskStatus = "TODO" | "IN_PROGRESS" | "WAITING_FOR_AGENT" | "WAITING_FOR_HUMAN" | "BLOCKED" | "COMPLETED" | "FAILED";

export interface Company { id: string; name: string; }
export interface Employee { id: string; companyId: string; name: string; email: string; role: string; }
export interface Agent { id: string; companyId: string; employeeId: string; role: string; permissions: string[]; }
export interface Memory { id: string; companyId: string; agentId: string; scope: MemoryScope; content: string; }
export interface Task { id: string; companyId: string; projectId?: string; title: string; status: TaskStatus; assignedAgentId?: string; }
