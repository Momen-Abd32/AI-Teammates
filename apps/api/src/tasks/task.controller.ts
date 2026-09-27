import{Body,Controller,Get,Param,Patch,Post}from"@nestjs/common";
import{TaskService}from"./task.service";
import{TaskStatus}from"../domain";
import{CurrentUser}from"../auth/current-user.decorator";

@Controller("tasks")
export class TaskController{
 constructor(private tasks:TaskService){}
 @Get() list(@CurrentUser()user:any){return this.tasks.list(user.companyId)}
 @Get(":id") get(@Param("id")id:string,@CurrentUser()user:any){return this.tasks.getForCompany(id,user.companyId)}
 @Post() create(@Body()b:{title:string;description?:string;projectId?:string;assignedAgentId?:string},@CurrentUser()user:any){
  return this.tasks.create({companyId:user.companyId,title:b.title,description:b.description??"",projectId:b.projectId,assignedAgentId:b.assignedAgentId});
 }
 @Patch(":id/status") status(@Param("id")id:string,@Body()b:{status:TaskStatus},@CurrentUser()user:any){return this.tasks.updateStatus(id,b.status,user.companyId)}
}