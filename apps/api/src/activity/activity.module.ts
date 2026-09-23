import {Module} from "@nestjs/common";
import {ActivityEventService} from "./activity.event.service";
import {ActivityGateway} from "./activity.gateway";
import {AuthModule} from "../auth/auth.module";

@Module({imports:[AuthModule],providers:[ActivityEventService,ActivityGateway],exports:[ActivityEventService]})
export class ActivityModule {}
