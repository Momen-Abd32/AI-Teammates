export type MemoryScope = "PRIVATE" | "PROJECT" | "TEAM" | "COMPANY";
export type TaskStatus = "TODO" | "IN_PROGRESS" | "WAITING_FOR_AGENT" | "WAITING_FOR_HUMAN" | "BLOCKED" | "COMPLETED" | "FAILED";
export type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface TenantContext { companyId: string; employeeId: string; agentId?: string; projectId?: string; }
export interface Agent { id:string; companyId:string; employeeId:string; role:string; permissions:string[]; systemInstructions?:string; }
export interface Task { id:string; companyId:string; projectId?:string; title:string; description:string; status:TaskStatus; assignedAgentId?:string; }
export interface Memory { id:string; companyId:string; agentId:string; scope:MemoryScope; content:string; score?:number; }
export interface Approval { id:string; companyId:string; agentId:string; taskId?:string; action:string; reason:string; status:ApprovalStatus; decidedBy?:string; }
export interface AgentTaskMessage { taskId:string; senderAgentId:string; receiverAgentId:string; companyId:string; projectId?:string; type:"TASK_REQUEST"|"TASK_RESPONSE"; payload:Record<string,unknown>; }
