import { Module } from "@nestjs/common";
import { AgentModule } from "./agent/agent.module";
import { SecurityModule } from "./security/security.module";
import { HealthController } from "./health.controller";
import { MemoryModule } from "./memory/memory.module";

@Module({
  imports: [SecurityModule, AgentModule, MemoryModule],
  controllers: [HealthController],
})
export class AppModule {}
