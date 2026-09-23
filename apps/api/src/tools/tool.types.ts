export type ToolDefinition={
 name:string;
 description:string;
 permission:string;
 sensitive:boolean;
 requiresApproval:boolean;
};

export type ToolRequest={
 companyId:string;
 employeeId:string;
 agentId:string;
 taskId?:string;
 name:string;
 resource?:string;
 arguments:Record<string,unknown>;
 reason?:string;
};

export type ToolDecision={
 allowed:boolean;
 requiresApproval:boolean;
 reason:string;
};
