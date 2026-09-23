import{Body,Controller,Get,Param,Post}from"@nestjs/common";
import{CollaborationService}from"./collaboration.service";
import{RedisService}from"./../infrastructure/redis.service";
import{AgentTaskMessage}from"./message-bus.service";
import{CurrentUser}from"../auth/current-user.decorator";
import{TaskService}from"../tasks/task.service";
@Controller("collaboration")
export class CollaborationController{
 constructor(private collaboration:CollaborationService,private redis:RedisService,private tasks:TaskService){}
 @Post("tasks")request(@Body()body:AgentTaskMessage,@CurrentUser()user:any){return this.collaboration.requestTask(body,user.employeeId);}
 @Get("tasks/:taskId/results")async results(@Param("taskId")taskId:string,@CurrentUser()user:any){await this.tasks.getForCompany(taskId,user.companyId);return this.redis.readMatching("agent:responses",taskId);}
}