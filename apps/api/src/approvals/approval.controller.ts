import{Body,Controller,Get,Param,Patch,Post}from"@nestjs/common";
import{ApprovalService}from"./approval.service";
import{CurrentUser}from"../auth/current-user.decorator";

@Controller("approvals")
export class ApprovalController{
 constructor(private readonly approvals:ApprovalService){}
 @Get()
 list(@CurrentUser()user:any){
  return this.approvals.list(user.companyId,user.employeeId,user.role);
 }
 @Post()
 request(@Body() body:{agentId:string;taskId?:string;action:string;reason:string},@CurrentUser()user:any){
  return this.approvals.request({...body,companyId:user.companyId},user.employeeId);
 }
 @Patch(":id")
 decide(@Param("id") id:string,@Body() body:{status:"APPROVED"|"REJECTED"},@CurrentUser()user:any){
  return this.approvals.decide(id,user.employeeId,body.status,user.companyId);
 }
}