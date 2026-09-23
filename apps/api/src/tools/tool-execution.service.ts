import {ForbiddenException,Injectable}from "@nestjs/common";
import {ApprovalService}from "../approvals/approval.service";
import {AuditService}from "../audit/audit.service";
import {ToolExecutionRepository}from "./tool-execution.repository";
import {ToolPolicyService}from "./tool-policy.service";
import {ToolRequest}from "./tool.types";

@Injectable()
export class ToolExecutionService{
 constructor(private policy:ToolPolicyService,private executions:ToolExecutionRepository,private approvals:ApprovalService,private audit:AuditService){}

 async request(input:ToolRequest){
  const decision=await this.policy.decide(input);
  const execution=await this.executions.create({
   companyId:input.companyId,agentId:input.agentId,action:input.name,resource:input.resource,
   arguments:input.arguments,status:decision.requiresApproval?"WAITING_FOR_HUMAN":"RUNNABLE",
  });
  if(decision.requiresApproval){
   const approval=await this.approvals.request({
    companyId:input.companyId,agentId:input.agentId,taskId:input.taskId,
    action:input.name,reason:input.reason??decision.reason,
   });
   await this.audit.record({companyId:input.companyId,agentId:input.agentId,action:"TOOL_APPROVAL_REQUESTED",resource:input.name,metadata:{executionId:execution.id,approvalId:approval.id}});
   return {status:"WAITING_FOR_HUMAN",execution,approval};
  }
  return this.executeAllowed(input,execution.id);
 }

 async approveAndExecute(executionId:string,approvalId:string,decidedBy:string){
  const execution=await this.executions.get(executionId);
  if(!execution) throw new ForbiddenException("Tool execution not found");
  const approval=await this.approvals.decide(approvalId,decidedBy,"APPROVED");
  if(approval.status!=="APPROVED"||approval.companyId!==execution.companyId) throw new ForbiddenException("Approval mismatch");
  const result={status:"EXECUTED",action:execution.action,resource:execution.resource,arguments:execution.arguments};
  const completed=await this.executions.complete(executionId,"COMPLETED",result);
  await this.audit.record({companyId:execution.companyId,actorId:decidedBy,agentId:execution.agentId,action:"TOOL_EXECUTED",resource:execution.action,metadata:{executionId,approvalId}});
  return {execution:completed,result};
 }

 private async executeAllowed(input:ToolRequest,executionId:string){
  const result={status:"ACCEPTED",action:input.name,resource:input.resource,arguments:input.arguments};
  const completed=await this.executions.complete(executionId,"COMPLETED",result);
  await this.audit.record({companyId:input.companyId,agentId:input.agentId,action:"TOOL_EXECUTED",resource:input.name,metadata:{executionId}});
  return {execution:completed,result};
 }
}
