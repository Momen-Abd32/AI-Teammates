import {Body,Controller,Get,Param,Patch,Post} from "@nestjs/common";
import {ApprovalService} from "./approval.service";
import {CurrentUser} from "../auth/current-user.decorator";

@Controller("approvals")
export class ApprovalController{
 constructor(private readonly approvals:ApprovalService){}
 @Get("company/:companyId") list(@Param("companyId") companyId:string){return this.approvals.list(companyId);}
 @Post() request(@Body() body:{companyId:string;agentId:string;taskId?:string;action:string;reason:string},@CurrentUser()user:any){
  return this.approvals.request(body,user.employeeId);
 }
 @Patch(":id") decide(@Param("id") id:string,@Body() body:{status:"APPROVED"|"REJECTED"},@CurrentUser()user:any){
  return this.approvals.decide(id,user.employeeId,body.status,user.companyId);
 }
}