import {Module} from "@nestjs/common";
import {CollaborationController} from "./collaboration.controller";
import {CollaborationService} from "./collaboration.service";
import {MessageBusService} from "./message-bus.service";
@Module({controllers:[CollaborationController],providers:[MessageBusService,CollaborationService],exports:[MessageBusService,CollaborationService]})
export class CollaborationModule{}