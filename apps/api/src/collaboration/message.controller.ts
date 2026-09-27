import {Controller,Get,Param} from "@nestjs/common";
import {MessageRepository} from "./message.repository";
import {CurrentUser} from "../auth/current-user.decorator";
import {TaskService} from "../tasks/task.service";
@Controller("messages")
export class MessageController {
  constructor(private repo:MessageRepository,private tasks:TaskService){}
  @Get("task/:taskId")
  async list(@Param("taskId") taskId:string,@CurrentUser()user:any){
    await this.tasks.getForCompany(taskId,user.companyId);
    return this.repo.listTask(taskId,user.companyId);
  }
}
