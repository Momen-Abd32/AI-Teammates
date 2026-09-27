import{BadRequestException,Body,Controller,Get,Param,Patch,Post}from"@nestjs/common";
import{ApprovalService}from"./approval.service";
import{CurrentUser}from"../auth/current-user.decorator";
import{ToolExecutionService}from"../tools/tool-execution.service";
import{AgentService}from"../agent/agent.service";
import{TaskService}from"../tasks/task.service";

@Controller("approvals")
export class ApprovalController{
 constructor(
  private readonly approvals:ApprovalService,
  private readonly toolExecutions:ToolExecutionService,
  private readonly agents:AgentService,
  private readonly tasks:TaskService,
 ){}
 @Get()
 list(@CurrentUser()user:any){
  return this.approvals.list(user.companyId,user.employeeId,user.role);
 }
 @Post()
 request(@Body() body:{agentId:string;taskId?:string;action:string;reason:string},@CurrentUser()user:any){
  return this.approvals.request({...body,companyId:user.companyId},user.employeeId);
 }
 @Patch(":id")
 async decide(@Param("id")id:string,@Body()body:{status:"APPROVED"|"REJECTED"},@CurrentUser()user:any){
  if(body.status!=="APPROVED"&&body.status!=="REJECTED") throw new BadRequestException("Approval status must be APPROVED or REJECTED");
  const approval=await this.approvals.find(id,user.companyId);
  if(approval.status!=="PENDING") return approval;

  if(!approval.executionId){
   const decided=await this.approvals.decide(id,user.employeeId,body.status,user.companyId);
   if(approval.taskId){
    await this.tasks.updateStatus(
     approval.taskId,
     body.status==="APPROVED"?"IN_PROGRESS":"BLOCKED",
     user.companyId,
    );
   }
   return decided;
  }

  const outcome=body.status==="APPROVED"
   ? await this.toolExecutions.approveAndExecute(approval.executionId,id,user.employeeId)
   : await this.toolExecutions.reject(approval.executionId,id,user.employeeId);

  const resumed=await this.agents.resumeAfterApproval(
   approval.executionId,
   id,
   body.status==="APPROVED",
   approval.action,
   "result" in outcome ? outcome.result : outcome.execution?.result ?? {status:"REJECTED"},
   user.companyId,
   user.employeeId,
   approval.taskId,
  );

  if(approval.taskId){
   const nextStatus=resumed?.status==="COMPLETED"
    ?"COMPLETED"
    :resumed?.status==="REJECTED"
      ?"BLOCKED"
      :"IN_PROGRESS";
   await this.tasks.updateStatus(approval.taskId,nextStatus,user.companyId);
  }

  return {
   approval:await this.approvals.find(id,user.companyId),
   execution:outcome.execution,
   agentRun:resumed,
  };
 }
}