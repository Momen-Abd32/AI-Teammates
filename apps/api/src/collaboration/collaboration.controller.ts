import{Body,Controller,Get,Param,Post}from"@nestjs/common";
import{CollaborationService}from"./collaboration.service";
import{RedisService}from"../infrastructure/redis.service";
import{AgentTaskMessage}from"./message-bus.service";
import{CurrentUser}from"../auth/current-user.decorator";
import{TaskService}from"../tasks/task.service";
import{MessageRepository}from"./message.repository";

@Controller("collaboration")
export class CollaborationController{
 constructor(private collaboration:CollaborationService,private redis:RedisService,private tasks:TaskService,private messages:MessageRepository){}
 @Post("tasks")
 request(@Body()body:Omit<AgentTaskMessage,"companyId">,@CurrentUser()user:any){
  return this.collaboration.requestTask({...body,companyId:user.companyId},user.employeeId);
 }
 @Get("tasks/:taskId")
 async task(@Param("taskId")taskId:string,@CurrentUser()user:any){
  const task=await this.tasks.getForCompany(taskId,user.companyId);
  const messages=await this.messages.listTask(taskId,user.companyId);
  return {task,messages};
 }
 @Get("tasks/:taskId/results")
 async results(@Param("taskId")taskId:string,@CurrentUser()user:any){
  await this.tasks.getForCompany(taskId,user.companyId);
  return this.redis.readMatching("agent:responses",taskId);
 }
}
