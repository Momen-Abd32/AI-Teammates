import{BadRequestException,Body,Controller,Get,Param,Patch,Post}from"@nestjs/common";
import{ApprovalService}from"./approval.service";
import{CurrentUser}from"../auth/current-user.decorator";
import{ToolExecutionService}from"../tools/tool-execution.service";
import{AgentService}from"../agent/agent.service";
import{TaskService}from"../tasks/task.service";
import{CollaborationService}from"../collaboration/collaboration.service";

@Controller("approvals")
export class ApprovalController{
 constructor(private readonly approvals:ApprovalService,private readonly toolExecutions:ToolExecutionService,private readonly agents:AgentService,private readonly tasks:TaskService,private readonly collaboration:CollaborationService){}
 @Get()list(@CurrentUser()user:any){return this.approvals.list(user.companyId,user.employeeId,user.role);}
 @Post()request(@Body()body:{agentId:string;taskId?:string;action:string;reason:string},@CurrentUser()user:any){return this.approvals.request({...body,companyId:user.companyId},user.employeeId);}
 @Patch(":id")
 async decide(@Param(":id")id:string,@Body()body:{status:"APPROVED"|"REJECTED"},@CurrentUser()user:any){
  if(body.status!=="APPROVED"&&body.status!=="REJECTED")throw new BadRequestException("Approval status must be APPROVED or REJECTED");
  const approval=await this.approvals.find(id,user.companyId);
  if(approval.status!=="PENDING")return approval;
  if(!approval.executionId){
   const decided=await this.approvals.decide(id,user.employeeId,body.status,user.companyId);
   if(approval.taskId)await this.tasks.updateStatus(approval.taskId,body.status==="APPROVED"?"IN_PROGRESS":"BLOCKED",user.companyId);
   return decided;
  }
  const outcome=body.status==="APPROVED"?await this.toolExecutions.approveAndExecute(approval.executionId,id,user.employeeId):await this.toolExecutions.reject(approval.executionId,id,user.employeeId);
  const approvedExecution=body.status==="APPROVED"&&outcome.execution?.status==="COMPLETED";
  const resumed=await this.agents.resumeAfterApproval(approval.executionId,id,approvedExecution,approval.action,"result"in outcome?outcome.result:outcome.execution?.result??{status:"REJECTED"},user.companyId,user.employeeId,approval.taskId);
  let delegatedCompletion:null|{task:any;message?:any;conversationId?:string}=null;
  if(approval.taskId){
   const resumedStatus=(resumed as {status?:string}|null)?.status;
   if(resumedStatus==="COMPLETED"){
    const response=typeof(resumed as {response?:unknown})?.response==="string"?(resumed as {response:string}).response:"Delegated agent completed the task without a user-facing response.";
    delegatedCompletion=await this.collaboration.completeDelegatedRun({taskId:approval.taskId,companyId:user.companyId,employeeId:user.employeeId,response,status:"COMPLETED"});
   }else if(resumedStatus==="REJECTED")await this.tasks.updateStatus(approval.taskId,"BLOCKED",user.companyId);
   else await this.tasks.updateStatus(approval.taskId,"IN_PROGRESS",user.companyId);
  }
  return{approval:await this.approvals.find(id,user.companyId),execution:outcome.execution,agentRun:resumed,delegatedCompletion};
 }
}