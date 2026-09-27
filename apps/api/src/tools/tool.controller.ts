import{Body,Controller,Get,Param,Post,ForbiddenException}from "@nestjs/common";
import{ModuleRef}from "@nestjs/core";
import{ToolRegistry}from "./tool.registry";
import{ToolExecutionService}from "./tool-execution.service";
import{CurrentUser}from "../auth/current-user.decorator";
import{AgentService}from "../agent/agent.service";
import{ApprovalService}from "../approvals/approval.service";
import{TaskService}from "../tasks/task.service";

@Controller("tools")
export class ToolController{
 constructor(
  private tools:ToolRegistry,
  private executions:ToolExecutionService,
  private moduleRef:ModuleRef,
  private approvals:ApprovalService,
  private tasks:TaskService,
 ){}

 @Get() list(){return this.tools.list();}

 @Post("request")
 async request(
  @Body()b:{agentId:string;taskId?:string;name:string;resource?:string;arguments?:Record<string,unknown>;reason?:string},
  @CurrentUser()user:any,
 ){
  const result=await this.executions.request({
   ...b,
   companyId:user.companyId,
   employeeId:user.employeeId,
   arguments:b.arguments??{},
  });
  if(b.taskId){
   const status=result.status==="WAITING_FOR_HUMAN"?"WAITING_FOR_HUMAN":"IN_PROGRESS";
   await this.tasks.updateStatus(b.taskId,status,user.companyId);
  }
  return result;
 }

 @Post("approve/:executionId/:approvalId")
 async approve(
  @Param("executionId")executionId:string,
  @Param("approvalId")approvalId:string,
  @CurrentUser()user:any,
 ){
  const approval=await this.approvals.find(approvalId,user.companyId);
  if(approval.executionId!==executionId) throw new ForbiddenException("Approval does not belong to this execution");
  const result=await this.executions.approveAndExecute(executionId,approvalId,user.employeeId);
  const agentService=this.moduleRef.get(AgentService,{strict:false});
  if(agentService){
   const resumed=await agentService.resumeAfterApproval(
    executionId,
    approvalId,
    true,
    approval.action,
    result.result,
    user.companyId,
    user.employeeId,
    approval.taskId,
   );
   if(approval.taskId){
    await this.tasks.updateStatus(
     approval.taskId,
     resumed?.status==="COMPLETED"?"COMPLETED":"IN_PROGRESS",
     user.companyId,
    );
   }
   return resumed??result;
  }
  return result;
 }

 @Post("reject/:executionId/:approvalId")
 async reject(
  @Param("executionId")executionId:string,
  @Param("approvalId")approvalId:string,
  @CurrentUser()user:any,
 ){
  const approval=await this.approvals.find(approvalId,user.companyId);
  if(approval.executionId!==executionId) throw new Error("Approval does not belong to this execution");
  const result=await this.executions.reject(executionId,approvalId,user.employeeId);
  const agentService=this.moduleRef.get(AgentService,{strict:false});
  if(agentService){
   const resumed=await agentService.resumeAfterApproval(
    executionId,
    approvalId,
    false,
    approval.action,
    result.execution?.result,
    user.companyId,
    user.employeeId,
    approval.taskId,
   );
   if(approval.taskId) await this.tasks.updateStatus(approval.taskId,"BLOCKED",user.companyId);
   return resumed??result;
  }
  return result;
 }
}
