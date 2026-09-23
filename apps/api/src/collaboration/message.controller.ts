import {Controller,Get,Param} from "@nestjs/common";
import {MessageRepository} from "./message.repository";
@Controller("messages")
export class MessageController {
  constructor(private repo:MessageRepository){}
  @Get("task/:taskId") list(@Param("taskId") taskId:string){return this.repo.listTask(taskId);}
}