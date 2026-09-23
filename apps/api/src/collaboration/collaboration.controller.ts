import {Body,Controller,Post} from "@nestjs/common";
import {CollaborationService} from "./collaboration.service";
import {AgentTaskMessage} from "./message-bus.service";
@Controller("collaboration")
export class CollaborationController{
 constructor(private readonly collaboration:CollaborationService){}
 @Post("tasks") requestTask(@Body() body:AgentTaskMessage){return this.collaboration.requestTask(body);}
}