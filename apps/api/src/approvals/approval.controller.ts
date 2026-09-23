import {Body,Controller,Get,Param,Patch,Post} from "@nestjs/common";
import {ApprovalService} from "./approval.service";
import {ToolExecutionService} from "../tools/tool-execution.service";
import {CurrentUser} from "../auth/current-user.decorator";

@Controller("approvals")
export class ApprovalController{
 constructor(private readonly approvals:ApprovalService,private readonly executions:ToolExecutionService){}
 @Get("company/:companyId") list(@Param("companyId") companyId:string){return this.approvals.list(companyId);}
 @Post() request(@Body() body:{companyId:string;agentId:string;taskId?:string;action:string;reason:string}){return this.approvals.request(body);}
 @Patch(":id") decide(@Param("id") id:string,@Body() body:{status:"APPROVED"|"REJECTED"},@CurrentUser()user:any){
  const approval=await this.approvals.find(id,user.companyId);
  if(!approval.executionId) return this.approvals.decide(id,user.employeeId,body.status,user.companyId);
  if(body.status==="APPROVED") return this.executions.approveAndExecute(approval.executionId,id,user.employeeId);
  return this.executions.reject(approval.executionId,id,user.employeeId);
 }
}