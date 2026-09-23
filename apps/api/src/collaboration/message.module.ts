import {Module} from "@nestjs/common";
import {MessageController} from "./message.controller";
import {MessageRepository} from "./message.repository";
@Module({controllers:[MessageController],providers:[MessageRepository],exports:[MessageRepository]})
export class MessageModule {}