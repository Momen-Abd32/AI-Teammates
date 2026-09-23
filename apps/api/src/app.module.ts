import { Module } from "@nestjs/common";
import { AgentModule } from "./agent/agent.module";
import { SecurityModule } from "./security/security.module";

@Module({ imports: [SecurityModule, AgentModule] })
export class AppModule {}
