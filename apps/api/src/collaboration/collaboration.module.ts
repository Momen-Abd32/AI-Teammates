import {Module} from "@nestjs/common";
import {CollaborationController} from "./collaboration.controller";
import {CollaborationService} from "./collaboration.service";
import {MessageBusService} from "./message-bus.service";
import {MessageModule} from "./message.module";
@Module({
 imports:[MessageModule],
 controllers:[CollaborationController],
 providers:[MessageBusService,CollaborationService],
 exports:[MessageBusService,CollaborationService]
})
export class CollaborationModule {}