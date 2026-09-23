import {Module} from "@nestjs/common";
import {CollaborationController} from "./collaboration.controller";
import {CollaborationService} from "./collaboration.service";
import {MessageBusService} from "./message-bus.service";
import {MessageModule} from "./message.module";
import {OrganizationModule} from "../organization/organization.module";
import {ActivityModule} from "../activity/activity.module";
@Module({
 imports:[MessageModule,OrganizationModule,ActivityModule],
 controllers:[CollaborationController],
 providers:[MessageBusService,CollaborationService],
 exports:[MessageBusService,CollaborationService]
})
export class CollaborationModule {}