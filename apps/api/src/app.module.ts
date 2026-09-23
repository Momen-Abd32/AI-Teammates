import { Module } from "@nestjs/common";
import { AgentModule } from "./agent/agent.module";
import { SecurityModule } from "./security/security.module";
import { HealthController } from "./health.controller";
import { MemoryModule } from "./memory/memory.module";
import { TaskModule } from "./tasks/task.module";

@Module({
  imports: [SecurityModule, AgentModule, MemoryModule, TaskModule],
  controllers: [HealthController],
})
export class AppModule {}
