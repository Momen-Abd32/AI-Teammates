import {Module} from "@nestjs/common";
import {CollaborationController} from "./collaboration.controller";
import {CollaborationService} from "./collaboration.service";
import {MessageBusService} from "./message-bus.service";
import {MessageModule} from "./message.module";
import {OrganizationModule} from "../organization/organization.module";
import {ActivityModule} from "../activity/activity.module";
import {AgentModule} from "../agent/agent.module";
import {TaskModule} from "../tasks/task.module";
import {AgentTaskWorker} from "./agent-task.worker";
@Module({
 imports:[MessageModule,OrganizationModule,ActivityModule,AgentModule,TaskModule],
 controllers:[CollaborationController],
 providers:[MessageBusService,CollaborationService,AgentTaskWorker],
 exports:[MessageBusService,CollaborationService]
})
export class CollaborationModule {}