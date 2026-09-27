import {Module} from "@nestjs/common";
import {MessageController} from "./message.controller";
import {MessageRepository} from "./message.repository";
import {TaskModule} from "../tasks/task.module";
@Module({
  imports:[TaskModule],
  controllers:[MessageController],
  providers:[MessageRepository],
  exports:[MessageRepository]
})
export class MessageModule {}
