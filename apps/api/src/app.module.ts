import { Module } from "@nestjs/common";
import { AgentModule } from "./agent/agent.module";
import { SecurityModule } from "./security/security.module";
import { HealthController } from "./health.controller";

@Module({
  imports: [SecurityModule, AgentModule],
  controllers: [HealthController],
})
export class AppModule {}
